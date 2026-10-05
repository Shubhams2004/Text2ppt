import {
  BaseSlideElement,
  BulletElement,
  ImageElement,
  ParseResult,
  Presentation,
  QuoteElement,
  Slide,
  SlideElement,
  SlideLayout,
  SubtitleElement,
  TextElement,
  ValidationIssue,
} from '../models/presentation';
import { parsePresentation } from './presentationParser';
import { parseSimpleText } from './simpleTextParser';

export interface BatchPresentationItem {
  id: string;
  batchIndex: number; // 0-indexed
  headerLabel: string; // e.g., "Presentation 1"
  startLine: number; // 1-indexed line number in batch source
  endLine: number; // 1-indexed line number where this presentation ends
  rawContent: string; // the raw text chunk for this presentation
  presentation: Presentation;
  issues: ValidationIssue[];
  hasErrors: boolean;
}

export interface BatchParseResult {
  items: BatchPresentationItem[];
  issues: ValidationIssue[];
  hasErrors: boolean;
  totalPresentations: number;
  validCount: number;
  errorCount: number;
}

/**
 * Regex to detect presentation boundaries in batch text:
 * Tolerates:
 * - PRESENTATION: 1
 * - PRESENTATION 1
 * - Presentation: 1
 * - Presentation 1
 * - === PRESENTATION 1 ===
 * - --- PRESENTATION 1 ---
 * - PRESENTATION: Title
 */
const BATCH_HEADER_REGEX =
  /^\s*(?:={3,}|-{3,})?\s*PRESENTATION(?:\s*:\s*|\s+)([^\r\n]+?)\s*(?:={3,}|-{3,})?$/i;

/**
 * Explicit title line: TITLE: <title> or Title: <title>
 */
const TITLE_LINE_REGEX = /^\s*(?:TITLE|PRESENTATION_TITLE)\s*:\s*(.+)$/i;

/**
 * Explicit slide line: SLIDE: <title> or Slide: <title>
 */
const SLIDE_LINE_REGEX = /^\s*(?:SLIDE|HEADING)\s*:\s*(.*)$/i;

/**
 * Explicit text line: TEXT: <content> or Text: <content>
 */
const TEXT_LINE_REGEX = /^\s*(?:TEXT|P|PARAGRAPH)\s*:\s*(.*)$/i;

/**
 * Explicit bullet marker or BULLET: line
 */
const BULLET_LINE_REGEX = /^\s*(?:BULLET)\s*:\s*(.*)$/i;
const BULLETS_SECTION_REGEX = /^\s*(?:BULLETS|POINTS)\s*:\s*$/i;

/**
 * Standard bullet list markers
 */
const BULLET_MARKER_REGEX = /^\s*(?:[-•·*+–—]|\d+[.)])\s+(.*)$/u;

/**
 * Layout line: LAYOUT: <layout>
 */
const LAYOUT_LINE_REGEX = /^\s*LAYOUT\s*:\s*(.+)$/i;

/**
 * Image line: IMAGE: <path>
 */
const IMAGE_LINE_REGEX = /^\s*IMAGE\s*:\s*(.+)$/i;

/**
 * Parses a raw batch chunk into a strongly-typed Presentation model.
 */
function parseSingleBatchChunk(
  rawChunk: string,
  startLine: number,
  batchIndex: number,
  fallbackLabel: string
): { presentation: Presentation; issues: ValidationIssue[]; hasErrors: boolean } {
  const issues: ValidationIssue[] = [];
  const lines = rawChunk.split(/\r?\n/);

  // Check if chunk is empty or purely whitespace
  const nonBlankLines = lines.filter((l) => l.trim().length > 0);
  if (nonBlankLines.length === 0) {
    issues.push({
      line: startLine,
      code: 'EMPTY_PRESENTATION',
      message: `Presentation ${batchIndex + 1} is empty. Provide a title and at least one slide.`,
      severity: 'error',
      suggestion: 'Example:\nTITLE: My Presentation\n\nSLIDE: Intro\nTEXT: Welcome...',
    });

    return {
      presentation: {
        title: fallbackLabel,
        theme: 'modern',
        slides: [],
      },
      issues,
      hasErrors: true,
    };
  }

  // Check if chunk consists solely of DSL syntax: presentation "..." / slide "..."
  const isPureDsl = lines.some((l) => /^\s*presentation\s+["']/i.test(l));
  if (isPureDsl) {
    const dslResult = parsePresentation(rawChunk);
    // Remap issue line numbers to absolute line numbers
    const mappedIssues = dslResult.issues.map((iss) => ({
      ...iss,
      line: startLine + iss.line - 1,
      message: `[Presentation ${batchIndex + 1}] ${iss.message}`,
    }));

    return {
      presentation: dslResult.presentation,
      issues: mappedIssues,
      hasErrors: dslResult.hasErrors,
    };
  }

  // Check if chunk has NO labeled keywords (like SLIDE:, TEXT:, BULLETS:)
  const hasLabeledKeywords = lines.some((l) =>
    /^\s*(?:SLIDE|TEXT|BULLETS|TITLE)\s*:/i.test(l)
  );

  if (!hasLabeledKeywords) {
    // Parse using Simple Text parser
    const simpleResult = parseSimpleText(rawChunk);
    const mappedIssues = simpleResult.issues.map((iss) => ({
      ...iss,
      line: startLine + iss.line - 1,
      message: `[Presentation ${batchIndex + 1}] ${iss.message}`,
    }));

    return {
      presentation: simpleResult.presentation,
      issues: mappedIssues,
      hasErrors: simpleResult.hasErrors,
    };
  }

  // Parse structured batch format (TITLE:, SLIDE:, TEXT:, BULLETS:)
  let presentationTitle = '';
  let presentationTitleLine = startLine;
  const slides: Slide[] = [];
  let currentSlide: Slide | null = null;
  let elementCounter = 0;

  // Track multiline paragraph accumulation
  let pendingTextLines: string[] = [];
  let pendingTextStartLine = 0;

  const flushPendingText = () => {
    if (pendingTextLines.length === 0 || !currentSlide) return;

    elementCounter++;
    const textContent = pendingTextLines.join('\n').trim();
    if (textContent) {
      const textEl: TextElement = {
        id: `el-${elementCounter}`,
        type: 'text',
        content: textContent,
        line: pendingTextStartLine,
      };
      currentSlide.elements.push(textEl);
    }

    pendingTextLines = [];
    pendingTextStartLine = 0;
  };

  const createSlide = (title: string, lineNum: number) => {
    flushPendingText();
    const cleanTitle = title.trim();

    const slide: Slide = {
      id: `slide-${slides.length + 1}`,
      index: slides.length,
      title: cleanTitle || `Slide ${slides.length + 1}`,
      line: lineNum,
      elements: [],
    };
    slides.push(slide);
    currentSlide = slide;
    return slide;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const absLine = startLine + i;

    // Blank line indicates boundary between elements
    if (!trimmed) {
      flushPendingText();
      continue;
    }

    // Skip redundant Presentation header inside the chunk if encountered
    if (BATCH_HEADER_REGEX.test(trimmed)) {
      continue;
    }

    // Title line: TITLE: <title>
    const titleMatch = trimmed.match(TITLE_LINE_REGEX);
    if (titleMatch) {
      presentationTitle = titleMatch[1].trim();
      presentationTitleLine = absLine;
      continue;
    }

    // Slide line: SLIDE: <title>
    const slideMatch = trimmed.match(SLIDE_LINE_REGEX);
    if (slideMatch) {
      const slideTitle = slideMatch[1].trim() || `Slide ${slides.length + 1}`;
      createSlide(slideTitle, absLine);
      continue;
    }

    // Layout line: LAYOUT: <layout>
    const layoutMatch = trimmed.match(LAYOUT_LINE_REGEX);
    if (layoutMatch) {
      flushPendingText();
      const targetSlide = slides.length > 0 ? slides[slides.length - 1] : null;
      if (targetSlide) {
        targetSlide.layout = layoutMatch[1].trim().toLowerCase() as SlideLayout;
      }
      continue;
    }

    // Image line: IMAGE: <path>
    const imageMatch = trimmed.match(IMAGE_LINE_REGEX);
    if (imageMatch) {
      flushPendingText();
      if (!currentSlide) {
        createSlide(presentationTitle || fallbackLabel, absLine);
      }
      elementCounter++;
      const imageEl: ImageElement = {
        id: `el-${elementCounter}`,
        type: 'image',
        content: imageMatch[1].trim(),
        src: imageMatch[1].trim(),
        line: absLine,
      };
      currentSlide!.elements.push(imageEl);
      continue;
    }

    // Section header: BULLETS: (skip the header line itself)
    if (BULLETS_SECTION_REGEX.test(trimmed)) {
      flushPendingText();
      continue;
    }

    // Bullet line: BULLET: <content> or "- <content>", "• <content>", etc.
    const explicitBulletMatch = trimmed.match(BULLET_LINE_REGEX);
    const standardBulletMatch = trimmed.match(BULLET_MARKER_REGEX);
    if (explicitBulletMatch || standardBulletMatch) {
      flushPendingText();

      if (!currentSlide) {
        createSlide(presentationTitle || fallbackLabel, absLine);
      }

      const bulletText = explicitBulletMatch
        ? explicitBulletMatch[1].trim()
        : standardBulletMatch![1].trim();

      elementCounter++;
      const bulletEl: BulletElement = {
        id: `el-${elementCounter}`,
        type: 'bullet',
        content: bulletText,
        line: absLine,
      };
      currentSlide!.elements.push(bulletEl);
      continue;
    }

    // Explicit Text line: TEXT: <content>
    const textMatch = trimmed.match(TEXT_LINE_REGEX);
    if (textMatch) {
      flushPendingText();
      if (!currentSlide) {
        createSlide(presentationTitle || fallbackLabel, absLine);
      }
      elementCounter++;
      const textEl: TextElement = {
        id: `el-${elementCounter}`,
        type: 'text',
        content: textMatch[1].trim(),
        line: absLine,
      };
      currentSlide!.elements.push(textEl);
      continue;
    }

    // Unlabeled text under current slide
    if (!currentSlide) {
      createSlide(presentationTitle || fallbackLabel, absLine);
    }

    if (pendingTextLines.length === 0) {
      pendingTextStartLine = absLine;
    }
    pendingTextLines.push(trimmed);
  }

  flushPendingText();

  // Validate title presence
  if (!presentationTitle) {
    if (slides.length > 0 && slides[0].title) {
      presentationTitle = slides[0].title;
    } else {
      presentationTitle = fallbackLabel;
    }
    issues.push({
      line: startLine,
      code: 'MISSING_TITLE',
      message: `[Presentation ${batchIndex + 1}] Missing TITLE declaration. Defaulting to '${presentationTitle}'.`,
      severity: 'warning',
      suggestion: `Add 'TITLE: ${presentationTitle}' at the top of Presentation ${batchIndex + 1}.`,
    });
  }

  // Validate empty presentation
  if (slides.length === 0) {
    issues.push({
      line: startLine,
      code: 'EMPTY_PRESENTATION',
      message: `[Presentation ${batchIndex + 1}] Presentation has no slides. Add at least one SLIDE.`,
      severity: 'error',
      suggestion: 'Add:\nSLIDE: Slide Title\nTEXT: Content...',
    });
  }

  // Validate slides with no content
  slides.forEach((slide) => {
    if (slide.elements.length === 0) {
      issues.push({
        line: slide.line,
        code: 'EMPTY_SLIDE',
        message: `[Presentation ${batchIndex + 1}] Line ${slide.line}: Slide '${slide.title}' has no text or bullet points.`,
        severity: 'warning',
        suggestion: `Add bullets or text below '${slide.title}'.`,
      });
    }
  });

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    presentation: {
      title: presentationTitle,
      theme: 'modern',
      slides,
    },
    issues,
    hasErrors,
  };
}

/**
 * Splits batch text into separate presentation chunks and parses each into a PresentationModel.
 */
export function parseBatchPresentations(batchText: string): BatchParseResult {
  const globalIssues: ValidationIssue[] = [];
  const lines = batchText.split(/\r?\n/);

  // 1. Check for empty input
  if (lines.filter((l) => l.trim().length > 0).length === 0) {
    globalIssues.push({
      line: 1,
      code: 'EMPTY_PRESENTATION',
      message: 'Batch input is empty. Paste multiple presentation blocks.',
      severity: 'error',
      suggestion: 'Example:\nPRESENTATION: 1\nTITLE: First Deck\n\nSLIDE: Overview\n- Key point\n\nPRESENTATION: 2\nTITLE: Second Deck\n\nSLIDE: Intro\n- Point',
    });

    return {
      items: [],
      issues: globalIssues,
      hasErrors: true,
      totalPresentations: 0,
      validCount: 0,
      errorCount: 0,
    };
  }

  // 2. Identify presentation split boundaries
  interface ChunkBoundary {
    startLine: number; // 1-indexed
    label: string;
    lineIndex: number;
  }

  const boundaries: ChunkBoundary[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const absLine = i + 1;

    // Check if line matches presentation header
    // Avoid false positives: text, bullets, quotes must not match
    const isBullet = BULLET_MARKER_REGEX.test(trimmed) || /^(?:BULLET|BULLETS)\s*:/i.test(trimmed);
    const isText = /^(?:TEXT|QUOTE|SUBTITLE|IMAGE)\s*:/i.test(trimmed);
    if (isBullet || isText) {
      continue;
    }

    const match = trimmed.match(BATCH_HEADER_REGEX);
    if (match) {
      const headerArg = match[1].trim();
      const label = isNaN(Number(headerArg))
        ? `Presentation ${boundaries.length + 1}: ${headerArg}`
        : `Presentation ${headerArg}`;

      boundaries.push({
        startLine: absLine,
        label,
        lineIndex: i,
      });
    } else if (/^\s*presentation\s+["']/i.test(trimmed)) {
      // Also support multiple standard Code2PPT DSL presentation declarations
      boundaries.push({
        startLine: absLine,
        label: `Presentation ${boundaries.length + 1}`,
        lineIndex: i,
      });
    }
  }

  // If no boundaries found, treat the whole text as a single presentation
  if (boundaries.length === 0) {
    boundaries.push({
      startLine: 1,
      label: 'Presentation 1',
      lineIndex: 0,
    });
  } else if (boundaries[0].lineIndex > 0) {
    // If there is content before the first boundary that is not empty
    const prefixLines = lines.slice(0, boundaries[0].lineIndex);
    if (prefixLines.some((l) => l.trim().length > 0)) {
      boundaries.unshift({
        startLine: 1,
        label: 'Presentation 1',
        lineIndex: 0,
      });
    }
  }

  // 3. Slice text into chunks and parse each
  const items: BatchPresentationItem[] = [];

  for (let b = 0; b < boundaries.length; b++) {
    const boundary = boundaries[b];
    const nextBoundary = boundaries[b + 1];

    const startIdx = boundary.lineIndex;
    const endIdx = nextBoundary ? nextBoundary.lineIndex : lines.length;

    const chunkLines = lines.slice(startIdx, endIdx);
    const rawChunk = chunkLines.join('\n');
    const startLine = boundary.startLine;
    const endLine = startIdx + chunkLines.length;

    const { presentation, issues, hasErrors } = parseSingleBatchChunk(
      rawChunk,
      startLine,
      b,
      boundary.label
    );

    items.push({
      id: `batch-${b + 1}`,
      batchIndex: b,
      headerLabel: boundary.label,
      startLine,
      endLine,
      rawContent: rawChunk,
      presentation,
      issues,
      hasErrors,
    });
  }

  const validCount = items.filter((it) => !it.hasErrors).length;
  const errorCount = items.filter((it) => it.hasErrors).length;
  const hasErrors = errorCount > 0 || globalIssues.some((i) => i.severity === 'error');

  return {
    items,
    issues: globalIssues,
    hasErrors,
    totalPresentations: items.length,
    validCount,
    errorCount,
  };
}

/**
 * Re-serializes a list of BatchPresentationItems back to a single batch text string.
 * Used when presentations are reordered or removed.
 */
export function serializeBatchPresentations(items: BatchPresentationItem[]): string {
  return items
    .map((item, idx) => {
      // Clean previous header if present to re-number cleanly
      const lines = item.rawContent.split(/\r?\n/);
      const filteredLines = lines.filter((l) => !BATCH_HEADER_REGEX.test(l.trim()));
      return `PRESENTATION: ${idx + 1}\n${filteredLines.join('\n').trim()}`;
    })
    .join('\n\n');
}
