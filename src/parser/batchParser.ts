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

export interface MatchHeaderResult {
  isHeader: boolean;
  label: string;
  title: string;
}

/**
 * Robust detection of presentation boundaries in batch text.
 * Tolerates:
 * - PRESENTATION: 1, PRESENTATION 1, Presentation 1
 * - PRESENTATION: 3, PRESENTATION 3, Presentation 3
 * - PRESENTATION, PRESENTATION:, Presentation:
 * - PRESENTATION 3:, PRESENTATION #3, PRESENTATION: #3
 * - Markdown headings: # PRESENTATION 1, ## PRESENTATION 2, ### PRESENTATION 3
 * - Markdown bold/italics: **PRESENTATION: 1**, **PRESENTATION 3**
 * - Numbered/bullet lists: 1. PRESENTATION: 1, - PRESENTATION: 1, 3. PRESENTATION: 3
 * - Banners: === PRESENTATION 1 ===, --- PRESENTATION 2 ---, *** PRESENTATION 3 ***
 * - Deck syntax: DECK: 1, DECK 2, DECK: 3
 * - Code2PPT DSL: presentation "Deck Title"
 */
export function matchBatchHeader(
  line: string,
  boundaryCount: number = 0
): MatchHeaderResult | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Labeled slide elements are not presentation headers
  if (/^(?:TEXT|QUOTE|SUBTITLE|IMAGE|SLIDE|TITLE|HEADING|LAYOUT)\s*:/i.test(trimmed)) {
    return null;
  }

  // Check if line was formatted as a bullet list
  const isListBullet = /^(?:[-*•]|\d+[.)])\s+/u.test(trimmed);

  // Strip leading decorations: markdown headers (#..#), list bullets, dividers (===, ---, ***), markdown bold/italics (**, __, *)
  let clean = trimmed.replace(
    /^(?:#{1,6}\s+|={3,}\s*|-{3,}\s*|\*{3,}\s*|\*{1,2}|_{1,2}|(?:[-*•]|\d+[.)])\s+)+/i,
    ''
  );
  // Strip trailing decorations: banners, markdown bold/italics, headers, or spaces
  clean = clean.replace(/(?:\*{1,2}|_{1,2}|={3,}|-{3,}|\*{3,}|#{1,6}|\s)+$/i, '').trim();

  // Code2PPT DSL presentation declaration: presentation "Title" or presentation 'Title'
  const dslMatch = clean.match(/^presentation\s+["']([^"']+)["']$/i);
  if (dslMatch) {
    const dslTitle = dslMatch[1].trim();
    return {
      isHeader: true,
      label: `Presentation ${boundaryCount + 1}`,
      title: dslTitle,
    };
  }

  // Match PRESENTATION or DECK keyword
  const match = clean.match(/^(PRESENTATION|DECK)(?:(\s*[:.-]\s*)|(\s+)|$)(.*)$/i);
  if (!match) return null;

  const sep = match[2];
  const rest = (match[4] || '').trim();

  // If there is no separator and there is text following, verify that it's a number, quotes, or deck identifier
  // This prevents normal sentences like "Presentation skills are important" from being treated as a declaration
  if (!sep && rest) {
    const isNumberedOrQuoted =
      /^(?:#\s*)?\d+(?:\b|[:.-])/.test(rest) || /^["']/.test(rest);
    if (!isNumberedOrQuoted) {
      return null;
    }
  }

  // If this line was formatted as a bullet list item, only accept if it has a colon/separator, a number, or is explicit header
  if (isListBullet) {
    const hasColonOrSep = Boolean(sep);
    const hasNumber = /^(?:#\s*)?\d+/.test(rest);
    const isExplicitCaps = /^(?:PRESENTATION|DECK)$/i.test(clean);
    if (!hasColonOrSep && !hasNumber && !isExplicitCaps) {
      return null;
    }
  }

  const rawArg = rest.replace(/^["']|["']$/g, '').trim();
  const numMatch = rawArg.match(/^(?:#\s*)?(\d+)(?:\s*[:.-]\s*(.*))?$/);
  if (numMatch) {
    const deckNum = numMatch[1];
    const restTitle = (numMatch[2] || '').trim();
    return {
      isHeader: true,
      label: `Presentation ${deckNum}`,
      title: restTitle,
    };
  }

  return {
    isHeader: true,
    label: rawArg
      ? `Presentation ${boundaryCount + 1}: ${rawArg}`
      : `Presentation ${boundaryCount + 1}`,
    title: rawArg,
  };
}

/**
 * Counts the number of presentation declarations in an input.
 * Avoids false positives from the word "presentation" inside normal text.
 */
export function countPresentationDeclarations(text: string): number {
  if (!text || !text.trim()) return 0;
  const lines = text.split(/\r?\n/);
  let count = 0;
  for (const line of lines) {
    if (matchBatchHeader(line, count)) {
      count++;
    }
  }
  return count;
}

/**
 * Legacy regex for backward compatibility.
 */
export const BATCH_HEADER_REGEX =
  /^\s*(?:#{1,6}\s+|={3,}\s*|-{3,}\s*|\*{3,}\s*|\*{1,2}|_{1,2}|(?:[-*•]|\d+[.)])\s+)?\s*(?:PRESENTATION|DECK)(?:\s*[:.-]\s*|\s+(?:\d+|["'].*?["']|#\d+|$)|$)(.*?)(?:\*{1,2}|_{1,2}|={3,}|-{3,}|\*{3,}|#{1,6})?\s*$/i;

/**
 * Explicit title line: TITLE: <title> or Title: <title>
 */
const TITLE_LINE_REGEX = /^\s*(?:TITLE|PRESENTATION_TITLE)(?:\s*:\s*|\s+)(.+)$/i;

/**
 * Explicit slide line:
 * - SLIDE: <title>
 * - SLIDE 1: <title>
 * - SLIDE 1 - <title>
 * - SLIDE 1
 * - SLIDE <title>
 * - HEADING: <title>
 * - HEADING <title>
 */
const SLIDE_LINE_REGEX =
  /^\s*(?:SLIDE|HEADING)(?:\s+\d+\s*[:.-]|\s*:\s*|\s+\d+\s*$|\s+)(.*)$/i;

/**
 * Explicit text line: TEXT: <content> or Text: <content>
 */
const TEXT_LINE_REGEX = /^\s*(?:TEXT|P|PARAGRAPH)(?:\s*:\s*|\s+)(.*)$/i;

/**
 * Explicit bullet marker or BULLET: line
 */
const BULLET_LINE_REGEX = /^\s*(?:BULLET)(?:\s*:\s*|\s+)(.*)$/i;
const BULLETS_SECTION_REGEX = /^\s*(?:BULLETS|POINTS)(?:\s*:\s*|\s*$)/i;

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
  fallbackLabel: string,
  initialTitle?: string
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
  let presentationTitle = initialTitle?.trim() || '';
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

    // Skip Presentation / Deck header inside the chunk if encountered
    const headerCheck = matchBatchHeader(rawLine, batchIndex);
    if (headerCheck) {
      if (!presentationTitle && headerCheck.title) {
        presentationTitle = headerCheck.title;
        presentationTitleLine = absLine;
      }
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
      let slideTitle = slideMatch[1].replace(/^["']|["']$/g, '').trim();
      if (!slideTitle) {
        const numMatch = trimmed.match(/^\s*(?:SLIDE|HEADING)\s+(\d+)/i);
        slideTitle = numMatch ? `Slide ${numMatch[1]}` : `Slide ${slides.length + 1}`;
      }
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
    initialTitle?: string;
  }

  const boundaries: ChunkBoundary[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const absLine = i + 1;

    const header = matchBatchHeader(rawLine, boundaries.length);
    if (header) {
      boundaries.push({
        startLine: absLine,
        label: header.label,
        lineIndex: i,
        initialTitle: header.title,
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

  const presentationCount = boundaries.length;

  // Hard limit: Maximum 20 presentations per batch
  if (presentationCount > 20) {
    const errorLine = boundaries[20]?.startLine || 1;
    globalIssues.push({
      line: errorLine,
      code: 'BATCH_LIMIT_EXCEEDED',
      message: `Maximum 20 presentations per batch. Found ${presentationCount}. Please reduce the batch to 20 or fewer.`,
      severity: 'error',
      suggestion: 'Please reduce the batch to 20 or fewer presentations.',
    });

    return {
      items: [],
      issues: globalIssues,
      hasErrors: true,
      totalPresentations: presentationCount,
      validCount: 0,
      errorCount: presentationCount,
    };
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
      boundary.label,
      boundary.initialTitle
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
      const filteredLines = lines.filter((l) => !matchBatchHeader(l));
      return `PRESENTATION: ${idx + 1}\n${filteredLines.join('\n').trim()}`;
    })
    .join('\n\n');
}
