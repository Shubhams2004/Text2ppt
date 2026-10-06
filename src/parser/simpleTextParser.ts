import {
  BulletElement,
  ParseResult,
  Presentation,
  Slide,
  SlideElement,
  TextElement,
  ValidationIssue,
} from '../models/presentation';

/**
 * Recognized bullet markers:
 * - Hyphen-minus: -
 * - Unicode bullet: • (\u2022)
 * - Middle dot: · (\u00B7)
 * - Asterisk: *
 * - Plus: +
 * - En/Em dash: – / —
 * - Numbered bullet: 1. or 1)
 */
const BULLET_REGEX = /^\s*(?:[-•·*+–—]|\d+[.)])\s+(.*)$/u;

/**
 * Explicit presentation title prefixes
 */
const TITLE_PREFIX_REGEX = /^(?:title|presentation)\s*:\s*(.+)$/i;

/**
 * Explicit slide prefixes:
 * - Slide: <title>
 * - Slide 1: <title>
 * - Slide 1
 * - Heading: <title>
 */
const SLIDE_PREFIX_REGEX =
  /^(?:slide|heading)(?:\s+\d+\s*[:.-]|\s*:\s*|\s+\d+\s*$|\s+)(.*)$/i;

/**
 * Markdown heading prefixes
 */
const MD_H1_REGEX = /^#\s+(.+)$/;
const MD_H2_REGEX = /^#{2,3}\s+(.+)$/;

/**
 * Parses freeform Simple Text into a strongly-typed Code2PPT Presentation model.
 * Fully compatible with the existing Layout Engine and PPTX Renderer.
 */
export function parseSimpleText(rawText: string): ParseResult {
  const issues: ValidationIssue[] = [];
  const lines = rawText.split(/\r?\n/);

  // 1. Validate empty input
  const nonBlankLines = lines.filter((l) => l.trim().length > 0);
  if (nonBlankLines.length === 0) {
    issues.push({
      line: 1,
      code: 'EMPTY_PRESENTATION',
      message: 'Presentation text is empty. Provide a title and at least one slide section.',
      severity: 'error',
      suggestion: 'Example:\nTitle: My Presentation\n\nSlide Title\n- Bullet point 1\n- Bullet point 2',
    });

    return {
      presentation: {
        title: 'Untitled Presentation',
        theme: 'modern',
        slides: [],
      },
      issues,
      hasErrors: true,
    };
  }

  // 2. Validate ambiguous/invalid input consisting solely of symbols/punctuation
  const alphanumericChars = rawText.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, '');
  if (alphanumericChars.length === 0) {
    issues.push({
      line: 1,
      code: 'INVALID_COMMAND',
      message: 'Input contains no legible title or slide text.',
      severity: 'error',
      suggestion: 'Type a slide title and bullet points starting with "-" or "•".',
    });

    return {
      presentation: {
        title: 'Untitled Presentation',
        theme: 'modern',
        slides: [],
      },
      issues,
      hasErrors: true,
    };
  }

  let presentationTitle = '';
  let presentationTitleLine = 1;
  let firstHeadingFound = false;

  // First pass: detect explicit presentation title on early lines
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const titleMatch = trimmed.match(TITLE_PREFIX_REGEX);
    if (titleMatch) {
      const candidate = titleMatch[1].trim();
      // If it's a batch deck number like "1", look ahead for an explicit TITLE: line
      if (/^\d+$/.test(candidate) && /^presentation\s*:/i.test(trimmed)) {
        continue;
      }
      presentationTitle = candidate;
      presentationTitleLine = i + 1;
      break;
    }

    const mdMatch = trimmed.match(MD_H1_REGEX);
    if (mdMatch) {
      presentationTitle = mdMatch[1].trim();
      presentationTitleLine = i + 1;
      break;
    }

    // If we encounter a bullet before any title declaration, stop scanning
    if (BULLET_REGEX.test(trimmed)) {
      break;
    }
  }

  const slides: Slide[] = [];
  let currentSlide: Slide | null = null;
  let elementCounter = 0;

  // Buffer for multiline paragraph accumulation
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
    const cleanTitle = title.replace(/[:]+$/, '').trim();

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

  // 3. Line-by-line parsing
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const lineNum = i + 1;

    // Blank line indicates a boundary between paragraphs or slide sections
    if (!trimmed) {
      flushPendingText();
      continue;
    }

    // Skip redundant Presentation batch header: PRESENTATION: 1
    if (/^\s*presentation(?:\s*:\s*|\s+)\d+$/i.test(trimmed)) {
      continue;
    }

    // Skip section header: BULLETS:
    if (/^\s*(?:bullets|points)\s*:\s*$/i.test(trimmed)) {
      flushPendingText();
      continue;
    }

    // Skip explicit presentation title line if already captured
    if (lineNum === presentationTitleLine && presentationTitle) {
      const isTitlePrefix = TITLE_PREFIX_REGEX.test(trimmed) || MD_H1_REGEX.test(trimmed);
      if (isTitlePrefix) {
        continue;
      }
    }

    // Check for explicit slide prefix: "Slide: ...", "Slide 1: ...", or "## ..."
    const explicitSlideMatch = trimmed.match(SLIDE_PREFIX_REGEX) || trimmed.match(MD_H2_REGEX);
    if (explicitSlideMatch) {
      let slideTitle = explicitSlideMatch[1].replace(/^["']|["']$/g, '').trim();
      if (!slideTitle) {
        const numMatch = trimmed.match(/^\s*(?:slide|heading)\s+(\d+)/i);
        slideTitle = numMatch ? `Slide ${numMatch[1]}` : `Slide ${slides.length + 1}`;
      }
      createSlide(slideTitle, lineNum);
      firstHeadingFound = true;
      continue;
    }

    // Check for bullet item
    const bulletMatch = trimmed.match(BULLET_REGEX);
    if (bulletMatch) {
      flushPendingText();

      // If bullet appears before any slide, create an initial slide automatically
      if (!currentSlide) {
        const fallbackTitle = presentationTitle || 'Overview';
        createSlide(fallbackTitle, lineNum);
        firstHeadingFound = true;
      }

      const bulletContent = bulletMatch[1].trim();
      elementCounter++;
      const bulletEl: BulletElement = {
        id: `el-${elementCounter}`,
        type: 'bullet',
        content: bulletContent,
        line: lineNum,
      };
      currentSlide!.elements.push(bulletEl);
      continue;
    }

    // It's not a bullet point. Is it a slide heading or paragraph text?
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const nextLineIsBullet = BULLET_REGEX.test(nextLine);

    // If no presentation title was explicitly declared and this is the first non-empty line
    if (!presentationTitle && !firstHeadingFound) {
      // If followed by a blank line and subsequent headings exist, treat this first line as presentation title
      if (!prevLine && (!nextLine || nextLineIsBullet)) {
        // If followed by bullet, this first line is the slide heading
        presentationTitle = trimmed;
        createSlide(trimmed, lineNum);
        firstHeadingFound = true;
        continue;
      } else if (!prevLine && !nextLine) {
        // Standalone first line before blank line -> Presentation Title
        presentationTitle = trimmed;
        presentationTitleLine = lineNum;
        continue;
      }
    }

    // Heuristics for Standalone Slide Heading:
    // 1. First heading after presentation title
    // 2. Preceded by empty line AND followed by a bullet
    // 3. Line ends with a colon (e.g. "Key Benefits:")
    // 4. Preceded by empty line AND current slide already has content elements AND line is short (< 80 chars) without terminal period
    const isPrecededByBlank = i === 0 || !prevLine;
    const endsWithColon = /:\s*$/.test(trimmed);
    const lastSlide = slides.length > 0 ? slides[slides.length - 1] : null;
    const looksLikeHeading =
      isPrecededByBlank &&
      (nextLineIsBullet ||
        endsWithColon ||
        (lastSlide !== null && lastSlide.elements.length > 0 && trimmed.length < 80 && !/[.!?]$/.test(trimmed)) ||
        !firstHeadingFound);

    if (looksLikeHeading) {
      createSlide(trimmed, lineNum);
      firstHeadingFound = true;
      continue;
    }

    // Otherwise, treat as normal paragraph text under current slide
    if (!currentSlide) {
      const fallbackTitle = presentationTitle || trimmed;
      createSlide(fallbackTitle, lineNum);
      firstHeadingFound = true;
    }

    if (pendingTextLines.length === 0) {
      pendingTextStartLine = lineNum;
    }
    let textLine = trimmed;
    if (/^(?:text|p|paragraph)\s*:\s*/i.test(textLine)) {
      textLine = textLine.replace(/^(?:text|p|paragraph)\s*:\s*/i, '').trim();
    }
    pendingTextLines.push(textLine);
  }

  // Flush any remaining text buffer
  flushPendingText();

  // Final presentation title fallback
  if (!presentationTitle) {
    if (slides.length > 0) {
      presentationTitle = slides[0].title;
    } else {
      presentationTitle = 'Code2PPT Presentation';
    }
  }

  // Check for slides with no content
  slides.forEach((slide) => {
    if (slide.elements.length === 0) {
      issues.push({
        line: slide.line,
        code: 'EMPTY_SLIDE',
        message: `Line ${slide.line}: Slide '${slide.title}' has no text or bullet points.`,
        severity: 'warning',
        suggestion: `Add bullets or text below '${slide.title}'.`,
      });
    }
  });

  // Verify we produced at least one slide
  if (slides.length === 0) {
    issues.push({
      line: 1,
      code: 'EMPTY_PRESENTATION',
      message: 'No slide sections could be recognized from the text.',
      severity: 'error',
      suggestion: 'Write a slide heading followed by bullet points starting with "-".',
    });
  }

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
