import {
  ChartElement,
  ChartType,
  ImageElement,
  ParseResult,
  Presentation,
  ShapeElement,
  ShapeType,
  Slide,
  SlideElement,
  SlideLayout,
  SlideTransition,
  TableElement,
  ThemeId,
  TransitionDirection,
  TransitionSpeed,
  TransitionStyle,
  VALID_SLIDE_LAYOUTS,
  VALID_TRANSITION_STYLES,
  ValidationIssue,
} from '../models/presentation';
import { isJavaScriptOrPptxCode } from './jsToDslConverter';
import { countPresentationDeclarations, parseBatchPresentations } from './batchParser';
import { isQualityCleanRequested, cleanPresentationModel } from '../utils/contentQuality';

export interface ExtractedToken {
  rawKeyword: string;
  keyword: string;
  argument: string;
  layout?: string;
  dir?: string;
  speed?: string;
  duration?: number;
  link?: string;
  fill?: string;
  stroke?: string;
  data?: string;
  headers?: string;
  rows?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rot?: number;
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number;
  strokeWidth?: number;
  opacity?: number;
  fit?: 'contain' | 'cover' | 'fill';
  title?: string;
  hasQuotes: boolean;
  unclosedQuote: boolean;
  missingQuotes: boolean;
  rawLine: string;
}

/**
 * Extracts the keyword and argument from a line of presentation DSL.
 * Detects whether quotes are present, missing, or unclosed, and extracts optional layout.
 */
export function extractKeywordAndArgument(line: string): ExtractedToken | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Split on first whitespace
  const firstSpaceIdx = trimmed.search(/\s/);
  if (firstSpaceIdx === -1) {
    // Only a keyword with no argument
    let kw = trimmed.toLowerCase().replace(/:+$/, '');
    if (kw === 'title') kw = 'presentation';
    else if (kw === 'bullets') kw = 'bullet';
    return {
      rawKeyword: trimmed,
      keyword: kw,
      argument: '',
      hasQuotes: false,
      unclosedQuote: false,
      missingQuotes: false,
      rawLine: line,
    };
  }

  const rawKeyword = trimmed.slice(0, firstSpaceIdx);
  let keyword = rawKeyword.toLowerCase().replace(/:+$/, '');
  if (keyword === 'title') {
    keyword = 'presentation';
  } else if (keyword === 'bullets') {
    keyword = 'bullet';
  }
  const rest = trimmed.slice(firstSpaceIdx).trim();

  if (!rest) {
    return {
      rawKeyword,
      keyword,
      argument: '',
      hasQuotes: false,
      unclosedQuote: false,
      missingQuotes: false,
      rawLine: line,
    };
  }

  // Handle slide command with optional layout attribute, e.g. slide "Title" layout="two-column"
  if (keyword === 'slide') {
    let layoutVal: string | undefined;
    const layoutMatch = rest.match(/\blayout\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
    let titlePart = rest;
    if (layoutMatch) {
      layoutVal = layoutMatch[1] ?? layoutMatch[2] ?? layoutMatch[3];
      titlePart = rest.replace(layoutMatch[0], '').trim();
    }

    if (!titlePart) {
      return {
        rawKeyword,
        keyword,
        argument: '',
        layout: layoutVal,
        hasQuotes: false,
        unclosedQuote: false,
        missingQuotes: false,
        rawLine: line,
      };
    }

    const firstChar = titlePart[0];
    const lastChar = titlePart[titlePart.length - 1];

    if ((firstChar === '"' || firstChar === "'") && titlePart.length >= 2 && lastChar === firstChar) {
      return {
        rawKeyword,
        keyword,
        argument: titlePart.slice(1, -1),
        layout: layoutVal,
        hasQuotes: true,
        unclosedQuote: false,
        missingQuotes: false,
        rawLine: line,
      };
    }

    if (firstChar === '"' || firstChar === "'") {
      return {
        rawKeyword,
        keyword,
        argument: titlePart.slice(1),
        layout: layoutVal,
        hasQuotes: false,
        unclosedQuote: true,
        missingQuotes: false,
        rawLine: line,
      };
    }

    return {
      rawKeyword,
      keyword,
      argument: titlePart,
      layout: layoutVal,
      hasQuotes: false,
      unclosedQuote: false,
      missingQuotes: true,
      rawLine: line,
    };
  }

  // Handle transition command with optional attributes, e.g. transition "push" dir="left" speed="slow"
  if (keyword === 'transition') {
    let dirVal: string | undefined;
    const dirMatch = rest.match(/\b(?:dir|direction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
    let working = rest;
    if (dirMatch) {
      dirVal = dirMatch[1] ?? dirMatch[2] ?? dirMatch[3];
      working = working.replace(dirMatch[0], '').trim();
    }

    let speedVal: string | undefined;
    const speedMatch = working.match(/\b(?:speed|spd)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
    if (speedMatch) {
      speedVal = speedMatch[1] ?? speedMatch[2] ?? speedMatch[3];
      working = working.replace(speedMatch[0], '').trim();
    }

    let durVal: number | undefined;
    const durMatch = working.match(/\bduration\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
    if (durMatch) {
      const parsedDur = parseFloat(durMatch[1] ?? durMatch[2] ?? durMatch[3]);
      if (!isNaN(parsedDur)) durVal = parsedDur;
      working = working.replace(durMatch[0], '').trim();
    }

    let styleVal: string | undefined;
    const styleMatch = working.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
    if (styleMatch) {
      styleVal = styleMatch[1] ?? styleMatch[2] ?? styleMatch[3];
      working = working.replace(styleMatch[0], '').trim();
    }

    const stylePart = styleVal !== undefined ? styleVal : working;
    if (!stylePart) {
      return {
        rawKeyword,
        keyword,
        argument: '',
        dir: dirVal,
        speed: speedVal,
        duration: durVal,
        hasQuotes: false,
        unclosedQuote: false,
        missingQuotes: false,
        rawLine: line,
      };
    }

    const firstChar = stylePart[0];
    const lastChar = stylePart[stylePart.length - 1];

    if ((firstChar === '"' || firstChar === "'") && stylePart.length >= 2 && lastChar === firstChar) {
      return {
        rawKeyword,
        keyword,
        argument: stylePart.slice(1, -1),
        dir: dirVal,
        speed: speedVal,
        duration: durVal,
        hasQuotes: true,
        unclosedQuote: false,
        missingQuotes: false,
        rawLine: line,
      };
    }

    if (firstChar === '"' || firstChar === "'") {
      return {
        rawKeyword,
        keyword,
        argument: stylePart.slice(1),
        dir: dirVal,
        speed: speedVal,
        duration: durVal,
        hasQuotes: false,
        unclosedQuote: true,
        missingQuotes: false,
        rawLine: line,
      };
    }

    return {
      rawKeyword,
      keyword,
      argument: stylePart,
      dir: dirVal,
      speed: speedVal,
      duration: durVal,
      hasQuotes: false,
      unclosedQuote: false,
      missingQuotes: false,
      rawLine: line,
    };
  }

  let working = rest;

  let linkVal: string | undefined;
  const linkMatch = working.match(/\b(?:link|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (linkMatch) {
    linkVal = linkMatch[1] ?? linkMatch[2] ?? linkMatch[3];
    working = working.replace(linkMatch[0], '').trim();
  }

  let fillVal: string | undefined;
  const fillMatch = working.match(/\b(?:fill|fillcolor|bg)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (fillMatch) {
    fillVal = fillMatch[1] ?? fillMatch[2] ?? fillMatch[3];
    working = working.replace(fillMatch[0], '').trim();
  }

  let strokeVal: string | undefined;
  const strokeMatch = working.match(/\b(?:stroke|strokecolor|border)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (strokeMatch) {
    strokeVal = strokeMatch[1] ?? strokeMatch[2] ?? strokeMatch[3];
    working = working.replace(strokeMatch[0], '').trim();
  }

  let dataVal: string | undefined;
  const dataMatch = working.match(/\bdata\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (dataMatch) {
    dataVal = dataMatch[1] ?? dataMatch[2] ?? dataMatch[3];
    working = working.replace(dataMatch[0], '').trim();
  }

  let headersVal: string | undefined;
  const headersMatch = working.match(/\bheaders\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (headersMatch) {
    headersVal = headersMatch[1] ?? headersMatch[2] ?? headersMatch[3];
    working = working.replace(headersMatch[0], '').trim();
  }

  let rowsVal: string | undefined;
  const rowsMatch = working.match(/\brows\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (rowsMatch) {
    rowsVal = rowsMatch[1] ?? rowsMatch[2] ?? rowsMatch[3];
    working = working.replace(rowsMatch[0], '').trim();
  }

  let xVal: number | undefined;
  const xMatch = working.match(/\bx\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (xMatch) {
    const parsed = parseFloat(xMatch[1] ?? xMatch[2] ?? xMatch[3]);
    if (!isNaN(parsed)) xVal = parsed;
    working = working.replace(xMatch[0], '').trim();
  }

  let yVal: number | undefined;
  const yMatch = working.match(/\by\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (yMatch) {
    const parsed = parseFloat(yMatch[1] ?? yMatch[2] ?? yMatch[3]);
    if (!isNaN(parsed)) yVal = parsed;
    working = working.replace(yMatch[0], '').trim();
  }

  let wVal: number | undefined;
  const wMatch = working.match(/\bw\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (wMatch) {
    const parsed = parseFloat(wMatch[1] ?? wMatch[2] ?? wMatch[3]);
    if (!isNaN(parsed)) wVal = parsed;
    working = working.replace(wMatch[0], '').trim();
  }

  let hVal: number | undefined;
  const hMatch = working.match(/\bh\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (hMatch) {
    const parsed = parseFloat(hMatch[1] ?? hMatch[2] ?? hMatch[3]);
    if (!isNaN(parsed)) hVal = parsed;
    working = working.replace(hMatch[0], '').trim();
  }

  let rotVal: number | undefined;
  const rotMatch = working.match(/\b(?:rot|rotation)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (rotMatch) {
    const parsed = parseFloat(rotMatch[1] ?? rotMatch[2] ?? rotMatch[3]);
    if (!isNaN(parsed)) rotVal = parsed;
    working = working.replace(rotMatch[0], '').trim();
  }

  let fontVal: string | undefined;
  const fontMatch = working.match(/\b(?:font|fontFamily)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (fontMatch) {
    fontVal = fontMatch[1] ?? fontMatch[2] ?? fontMatch[3];
    working = working.replace(fontMatch[0], '').trim();
  }

  let sizeVal: number | undefined;
  const sizeMatch = working.match(/\b(?:size|fontSize)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (sizeMatch) {
    const parsed = parseFloat(sizeMatch[1] ?? sizeMatch[2] ?? sizeMatch[3]);
    if (!isNaN(parsed)) sizeVal = parsed;
    working = working.replace(sizeMatch[0], '').trim();
  }

  let boldVal: boolean | undefined;
  const boldMatch = working.match(/\bbold\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (boldMatch) {
    const raw = (boldMatch[1] ?? boldMatch[2] ?? boldMatch[3]).toLowerCase();
    boldVal = raw === 'true' || raw === '1' || raw === 'yes';
    working = working.replace(boldMatch[0], '').trim();
  }

  let italicVal: boolean | undefined;
  const italicMatch = working.match(/\bitalic\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (italicMatch) {
    const raw = (italicMatch[1] ?? italicMatch[2] ?? italicMatch[3]).toLowerCase();
    italicVal = raw === 'true' || raw === '1' || raw === 'yes';
    working = working.replace(italicMatch[0], '').trim();
  }

  let underlineVal: boolean | undefined;
  const underlineMatch = working.match(/\bunderline\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (underlineMatch) {
    const raw = (underlineMatch[1] ?? underlineMatch[2] ?? underlineMatch[3]).toLowerCase();
    underlineVal = raw === 'true' || raw === '1' || raw === 'yes';
    working = working.replace(underlineMatch[0], '').trim();
  }

  let colorVal: string | undefined;
  const colorMatch = working.match(/\bcolor\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (colorMatch) {
    colorVal = colorMatch[1] ?? colorMatch[2] ?? colorMatch[3];
    working = working.replace(colorMatch[0], '').trim();
  }

  let alignVal: 'left' | 'center' | 'right' | 'justify' | undefined;
  const alignMatch = working.match(/\balign\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (alignMatch) {
    const raw = (alignMatch[1] ?? alignMatch[2] ?? alignMatch[3]).toLowerCase();
    if (raw === 'left' || raw === 'center' || raw === 'right' || raw === 'justify') {
      alignVal = raw;
    }
    working = working.replace(alignMatch[0], '').trim();
  }

  let lineSpacingVal: number | undefined;
  const lineSpacingMatch = working.match(/\blineSpacing\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (lineSpacingMatch) {
    const parsed = parseFloat(lineSpacingMatch[1] ?? lineSpacingMatch[2] ?? lineSpacingMatch[3]);
    if (!isNaN(parsed)) lineSpacingVal = parsed;
    working = working.replace(lineSpacingMatch[0], '').trim();
  }

  let strokeWidthVal: number | undefined;
  const strokeWidthMatch = working.match(/\bstrokeWidth\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (strokeWidthMatch) {
    const parsed = parseFloat(strokeWidthMatch[1] ?? strokeWidthMatch[2] ?? strokeWidthMatch[3]);
    if (!isNaN(parsed)) strokeWidthVal = parsed;
    working = working.replace(strokeWidthMatch[0], '').trim();
  }

  let opacityVal: number | undefined;
  const opacityMatch = working.match(/\bopacity\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (opacityMatch) {
    const parsed = parseFloat(opacityMatch[1] ?? opacityMatch[2] ?? opacityMatch[3]);
    if (!isNaN(parsed)) opacityVal = parsed;
    working = working.replace(opacityMatch[0], '').trim();
  }

  let fitVal: 'contain' | 'cover' | 'fill' | undefined;
  const fitMatch = working.match(/\bfit\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (fitMatch) {
    const raw = (fitMatch[1] ?? fitMatch[2] ?? fitMatch[3]).toLowerCase();
    if (raw === 'contain' || raw === 'cover' || raw === 'fill') {
      fitVal = raw;
    }
    working = working.replace(fitMatch[0], '').trim();
  }

  let titleVal: string | undefined;
  const titleMatch = working.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/i);
  if (titleMatch) {
    titleVal = titleMatch[1] ?? titleMatch[2] ?? titleMatch[3];
    working = working.replace(titleMatch[0], '').trim();
  }

  const tokenProps = {
    link: linkVal,
    fill: fillVal,
    stroke: strokeVal,
    data: dataVal,
    headers: headersVal,
    rows: rowsVal,
    x: xVal,
    y: yVal,
    w: wVal,
    h: hVal,
    rot: rotVal,
    font: fontVal,
    size: sizeVal,
    bold: boldVal,
    italic: italicVal,
    underline: underlineVal,
    color: colorVal,
    align: alignVal,
    lineSpacing: lineSpacingVal,
    strokeWidth: strokeWidthVal,
    opacity: opacityVal,
    fit: fitVal,
    title: titleVal,
  };

  const firstChar = working[0];
  const lastChar = working[working.length - 1];

  // Properly quoted string (supports double or single quotes)
  if ((firstChar === '"' || firstChar === "'") && working.length >= 2 && lastChar === firstChar) {
    return {
      rawKeyword,
      keyword,
      argument: working.slice(1, -1),
      ...tokenProps,
      hasQuotes: true,
      unclosedQuote: false,
      missingQuotes: false,
      rawLine: line,
    };
  }

  // Unclosed quote (starts with quote but does not end with quote)
  if (firstChar === '"' || firstChar === "'") {
    return {
      rawKeyword,
      keyword,
      argument: working.slice(1),
      ...tokenProps,
      hasQuotes: false,
      unclosedQuote: true,
      missingQuotes: false,
      rawLine: line,
    };
  }

  // Unquoted argument
  return {
    rawKeyword,
    keyword,
    argument: working,
    ...tokenProps,
    hasQuotes: false,
    unclosedQuote: false,
    missingQuotes: true,
    rawLine: line,
  };
}

/**
 * Copies extracted visual, typography, and positioning attributes from token onto SlideElement
 */
function applyTokenAttributes(el: SlideElement, token: ExtractedToken) {
  if (token.x !== undefined) el.x = token.x;
  if (token.y !== undefined) el.y = token.y;
  if (token.w !== undefined) el.w = token.w;
  if (token.h !== undefined) el.h = token.h;
  if (token.rot !== undefined) el.rotation = token.rot;
  if (token.font) el.fontFamily = token.font;
  if (token.size !== undefined) el.fontSize = token.size;
  if (token.bold !== undefined) el.bold = token.bold;
  if (token.italic !== undefined) el.italic = token.italic;
  if (token.underline !== undefined) el.underline = token.underline;
  if (token.color) el.color = token.color;
  if (token.align) el.align = token.align;
  if (token.lineSpacing !== undefined) el.lineSpacing = token.lineSpacing;
  if (token.link) el.link = token.link;
  if (el.type === 'image' && token.fit) {
    (el as ImageElement).fit = token.fit;
  }
  if (el.type === 'shape') {
    const s = el as ShapeElement;
    if (token.strokeWidth !== undefined) s.strokeWidth = token.strokeWidth;
    if (token.opacity !== undefined) s.opacity = token.opacity;
  }
}

/**
 * Parses presentation DSL code into a deterministic, typed Presentation AST
 */
export function parsePresentation(code: string): ParseResult {
  // Automatic routing: if input contains multiple presentation declarations, process all of them
  const presentationCount = countPresentationDeclarations(code);
  if (presentationCount > 1) {
    const batchResult = parseBatchPresentations(code);
    return {
      presentation: batchResult.items[0]?.presentation || {
        title: 'Untitled Presentation',
        theme: 'modern',
        slides: [],
      },
      issues: batchResult.issues,
      hasErrors: batchResult.hasErrors,
      isMultiPresentation: true,
      totalPresentations: batchResult.totalPresentations,
      presentations: batchResult.items.map((it) => it.presentation),
      batchItems: batchResult.items,
    };
  }

  const lines = code.split(/\r?\n/);
  const issues: ValidationIssue[] = [];

  // Check if raw JavaScript / PptxGenJS was pasted
  const isJs = isJavaScriptOrPptxCode(code);
  if (isJs) {
    issues.push({
      line: 1,
      code: 'JAVASCRIPT_DETECTED',
      message: 'Detected JavaScript / PptxGenJS script instead of Code2PPT syntax.',
      severity: 'error',
      suggestion: 'Click "Convert to Code2PPT" at the top of the editor to automatically convert your JavaScript into Code2PPT format.',
    });
  }

  let presentationTitle = 'Untitled Presentation';
  let presentationTheme: ThemeId = 'modern';
  let presentationTransition: SlideTransition | undefined = undefined;
  let hasPresentationDeclaration = false;
  const slides: Slide[] = [];
  let currentSlide: Slide | null = null;
  let elementCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
      continue;
    }

    // Check if line is a bullet item starting with -, •, *, +, or number
    const bulletMarkerMatch = trimmed.match(/^\s*(?:[-•·*+–—]|\d+[.)])\s+(.*)$/u);
    if (bulletMarkerMatch) {
      if (!currentSlide) {
        currentSlide = {
          id: `slide-${slides.length + 1}`,
          index: slides.length,
          title: presentationTitle || 'Key Points',
          line: lineNum,
          elements: [],
        };
        slides.push(currentSlide);
      }
      elementCounter++;
      currentSlide.elements.push({
        id: `el-${elementCounter}`,
        type: 'bullet',
        content: bulletMarkerMatch[1].trim(),
        line: lineNum,
      });
      continue;
    }

    // Section headers like BULLETS: or POINTS:
    if (/^\s*(?:BULLETS|POINTS)\s*:?\s*$/i.test(trimmed)) {
      continue;
    }

    // Presentation number declaration like "PRESENTATION: 1" or "DECK: 1"
    const deckHeaderMatch = trimmed.match(
      /^(?:PRESENTATION|DECK)(?:\s*:\s*|\s+)(?:#\s*)?(\d+)(?:\s*[:.-]\s*(.*))?$/i
    );
    if (deckHeaderMatch) {
      hasPresentationDeclaration = true;
      if (
        deckHeaderMatch[2]?.trim() &&
        (!presentationTitle || presentationTitle === 'Untitled Presentation')
      ) {
        presentationTitle = deckHeaderMatch[2].trim();
      }
      continue;
    }

    const token = extractKeywordAndArgument(rawLine);
    if (!token) continue;

    const { keyword, argument, hasQuotes, unclosedQuote, missingQuotes } = token;

    // Check for unclosed quote
    if (unclosedQuote) {
      issues.push({
        line: lineNum,
        code: 'UNCLOSED_QUOTE',
        message: `Line ${lineNum}: Unclosed quotation mark for '${keyword}'.`,
        severity: 'error',
        suggestion: `Close the quote at the end of the line: ${keyword} "${argument}"`,
      });
    }

    // Check for missing quotes when an argument is provided
    if (missingQuotes && argument && keyword !== 'theme' && keyword !== 'transition') {
      issues.push({
        line: lineNum,
        code: 'MISSING_QUOTES',
        message: `Line ${lineNum}: Missing quotes around value for '${keyword}'.`,
        severity: 'warning',
        suggestion: `Enclose value in double quotes: ${keyword} "${argument}"`,
      });
    }

    switch (keyword) {
      case 'presentation':
      case 'title': {
        hasPresentationDeclaration = true;
        if (!argument) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'presentation' command requires a title.`,
            severity: 'error',
            suggestion: `Example: presentation "My Presentation"`,
          });
        } else {
          presentationTitle = argument;
        }
        break;
      }

      case 'theme': {
        const normalized = argument.toLowerCase().replace(/['"]/g, '').trim();
        const validThemes: ThemeId[] = ['modern', 'ocean', 'emerald', 'sunset', 'dark'];
        if (validThemes.includes(normalized as ThemeId)) {
          presentationTheme = normalized as ThemeId;
        } else {
          issues.push({
            line: lineNum,
            code: 'UNKNOWN_THEME',
            message: `Line ${lineNum}: Unknown theme '${argument}'. Available themes: modern, ocean, emerald, sunset, dark.`,
            severity: 'warning',
            suggestion: `Defaulting to '${presentationTheme}'.`,
          });
        }
        break;
      }

      case 'transition': {
        const rawArg = argument.trim().toLowerCase();
        if (!rawArg) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'transition' command requires a transition style (e.g., 'fade', 'push').`,
            severity: 'error',
            suggestion: `Example: transition "fade" or transition "push" dir="left"`,
          });
          break;
        }

        let baseStyle = rawArg;
        let derivedDir: TransitionDirection | undefined = token.dir as TransitionDirection | undefined;

        // Compound style check: push-left, push-right, wipe-up, etc.
        const compoundMatch = baseStyle.match(/^(push|wipe|cover|pull)-([a-z]+)$/i);
        if (compoundMatch) {
          baseStyle = compoundMatch[1].toLowerCase();
          derivedDir = compoundMatch[2].toLowerCase() as TransitionDirection;
        }

        // Normalize aliases
        if (baseStyle === 'slide') baseStyle = 'push';
        else if (baseStyle === 'crossfade' || baseStyle === 'smooth') baseStyle = 'fade';
        else if (baseStyle === 'checkerboard') baseStyle = 'checker';
        else if (baseStyle === 'uncover') baseStyle = 'pull';
        else if (baseStyle === 'off' || baseStyle === 'false') baseStyle = 'none';

        if (!VALID_TRANSITION_STYLES.includes(baseStyle as TransitionStyle)) {
          issues.push({
            line: lineNum,
            code: 'INVALID_TRANSITION',
            message: `Line ${lineNum}: Unsupported transition style '${argument}'. Supported styles: ${VALID_TRANSITION_STYLES.join(', ')}.`,
            severity: 'error',
            suggestion: `Available transitions: fade, push, wipe, split, cut, zoom, dissolve, blinds, checker, circle, diamond, comb, cover, pull, wheel, newsflash, none.`,
          });
          break;
        }

        // Normalize direction
        let normDir: TransitionDirection | undefined = undefined;
        if (derivedDir) {
          const rawDir = String(derivedDir).toLowerCase();
          if (rawDir === 'left' || rawDir === 'l') normDir = 'left';
          else if (rawDir === 'right' || rawDir === 'r') normDir = 'right';
          else if (rawDir === 'up' || rawDir === 'u') normDir = 'up';
          else if (rawDir === 'down' || rawDir === 'd') normDir = 'down';
          else if (rawDir === 'horz' || rawDir === 'horizontal') normDir = 'horz';
          else if (rawDir === 'vert' || rawDir === 'vertical') normDir = 'vert';
          else if (rawDir === 'in') normDir = 'in';
          else if (rawDir === 'out') normDir = 'out';
        }

        // Normalize speed
        let normSpeed: TransitionSpeed | undefined = undefined;
        if (token.speed) {
          const rawSpeed = token.speed.toLowerCase();
          if (rawSpeed === 'slow') normSpeed = 'slow';
          else if (rawSpeed === 'fast') normSpeed = 'fast';
          else if (rawSpeed === 'med' || rawSpeed === 'medium') normSpeed = 'med';
        }

        const transitionObj: SlideTransition = {
          style: baseStyle as TransitionStyle,
          direction: normDir,
          speed: normSpeed,
          duration: token.duration,
        };

        if (currentSlide) {
          currentSlide.transition = transitionObj;
        } else {
          presentationTransition = transitionObj;
        }
        break;
      }

      case 'slide': {
        if (!argument) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'slide' command requires a title.`,
            severity: 'warning',
            suggestion: `Example: slide "Introduction"`,
          });
        }

        let parsedLayout: SlideLayout | undefined = undefined;
        if (token.layout !== undefined) {
          const normLayout = token.layout.toLowerCase() as SlideLayout;
          if (VALID_SLIDE_LAYOUTS.includes(normLayout)) {
            parsedLayout = normLayout;
          } else {
            issues.push({
              line: lineNum,
              code: 'INVALID_LAYOUT',
              message: `Line ${lineNum}: Unsupported layout '${token.layout}'. Supported layouts: ${VALID_SLIDE_LAYOUTS.join(', ')}.`,
              severity: 'error',
              suggestion: `Supported layouts: title, title-content, two-column, text-image, image-text, full-image, blank.`,
            });
          }
        }

        const slideIndex = slides.length;
        const newSlide: Slide = {
          id: `slide-${slideIndex + 1}`,
          index: slideIndex,
          title: argument || `Slide ${slideIndex + 1}`,
          line: lineNum,
          layout: parsedLayout,
          elements: [],
        };
        slides.push(newSlide);
        currentSlide = newSlide;
        break;
      }

      case 'layout': {
        const rawArg = argument ? argument.trim().replace(/^["']|["']$/g, '') : '';
        const normLayout = rawArg.toLowerCase() as SlideLayout;

        if (!rawArg) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'layout' command requires a layout type.`,
            severity: 'warning',
            suggestion: `Example: layout "two-column" or layout "full-image". Supported layouts: ${VALID_SLIDE_LAYOUTS.join(', ')}.`,
          });
          break;
        }

        if (!VALID_SLIDE_LAYOUTS.includes(normLayout)) {
          issues.push({
            line: lineNum,
            code: 'INVALID_LAYOUT',
            message: `Line ${lineNum}: Unsupported layout '${rawArg}'. Supported layouts: ${VALID_SLIDE_LAYOUTS.join(', ')}.`,
            severity: 'error',
            suggestion: `Supported layouts: ${VALID_SLIDE_LAYOUTS.join(', ')}.`,
          });
          break;
        }

        if (!currentSlide) {
          // If layout appears before any slide, create the initial slide with this layout
          const slideIndex = slides.length;
          const newSlide: Slide = {
            id: `slide-${slideIndex + 1}`,
            index: slideIndex,
            title: presentationTitle ? `${presentationTitle}` : `Slide ${slideIndex + 1}`,
            line: lineNum,
            layout: normLayout,
            elements: [],
          };
          slides.push(newSlide);
          currentSlide = newSlide;
        } else {
          currentSlide.layout = normLayout;
        }
        break;
      }

      case 'text':
      case 'p':
      case 'paragraph': {
        if (!currentSlide) {
          // Content appears before any slide
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'text' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });

          // Create fallback slide so preview doesn't break
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Introduction',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        if (!argument) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'text' command is empty.`,
            severity: 'warning',
            suggestion: `Example: text "Paragraph content here."`,
          });
        } else {
          elementCounter++;
          const textEl: SlideElement = {
            id: `el-${elementCounter}`,
            type: 'text',
            content: argument,
            line: lineNum,
          };
          applyTokenAttributes(textEl, token);
          currentSlide.elements.push(textEl);
        }
        break;
      }

      case 'bullet':
      case 'item':
      case 'point': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'bullet' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });

          // Create fallback slide so preview doesn't break
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Key Points',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        if (!argument) {
          issues.push({
            line: lineNum,
            code: 'MISSING_ARGUMENT',
            message: `Line ${lineNum}: 'bullet' command is empty.`,
            severity: 'warning',
            suggestion: `Example: bullet "Point description"`,
          });
        } else {
          elementCounter++;
          const bulletEl: SlideElement = {
            id: `el-${elementCounter}`,
            type: 'bullet',
            content: argument,
            line: lineNum,
          };
          applyTokenAttributes(bulletEl, token);
          currentSlide.elements.push(bulletEl);
        }
        break;
      }

      case 'subtitle': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'subtitle' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });

          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Introduction',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        elementCounter++;
        const subtitleEl: SlideElement = {
          id: `el-${elementCounter}`,
          type: 'subtitle',
          content: argument,
          line: lineNum,
        };
        applyTokenAttributes(subtitleEl, token);
        currentSlide.elements.push(subtitleEl);
        break;
      }

      case 'quote': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'quote' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });

          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: 'Quote',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        elementCounter++;
        const quoteEl: SlideElement = {
          id: `el-${elementCounter}`,
          type: 'quote',
          content: argument,
          line: lineNum,
        };
        applyTokenAttributes(quoteEl, token);
        currentSlide.elements.push(quoteEl);
        break;
      }

      case 'image':
      case 'img': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'image' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });

          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Visual Slide',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        const trimmedArg = argument.trim();
        if (!trimmedArg) {
          issues.push({
            line: lineNum,
            code: 'MISSING_IMAGE_PATH',
            message: `Line ${lineNum}: 'image' command requires an image path or URL.`,
            severity: 'error',
            suggestion: `Example: image "photo.png" or image "https://example.com/image.jpg"`,
          });
        } else {
          // Check for valid image extensions or formats
          const isUrl = /^https?:\/\//i.test(trimmedArg);
          const isDataUri = /^data:image\//i.test(trimmedArg);
          const validExtensions = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;
          const hasValidExt = validExtensions.test(trimmedArg);

          if (!isUrl && !isDataUri && !hasValidExt && !trimmedArg.includes('.')) {
            issues.push({
              line: lineNum,
              code: 'INVALID_IMAGE_PATH',
              message: `Line ${lineNum}: Image path '${trimmedArg}' is missing a valid image file extension (.png, .jpg, .webp, .svg).`,
              severity: 'warning',
              suggestion: `Specify an image format extension, e.g. "${trimmedArg}.png"`,
            });
          }

          elementCounter++;
          const imageEl: ImageElement = {
            id: `el-${elementCounter}`,
            type: 'image',
            content: trimmedArg,
            src: trimmedArg,
            url: trimmedArg,
            line: lineNum,
            fit: token.fit || 'contain',
          };
          applyTokenAttributes(imageEl, token);
          currentSlide.elements.push(imageEl);
        }
        break;
      }

      case 'shape': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'shape' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Slide',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        const rawShapeType = (argument || 'rect').toLowerCase().trim();
        let shapeType: ShapeType = 'rect';
        if (rawShapeType.includes('round') || rawShapeType === 'rounded-rect' || rawShapeType === 'round-rect') {
          shapeType = 'round-rect';
        } else if (rawShapeType.includes('circle')) {
          shapeType = 'circle';
        } else if (rawShapeType.includes('ellipse')) {
          shapeType = 'ellipse';
        } else if (rawShapeType.includes('arrow')) {
          shapeType = 'arrow';
        } else if (rawShapeType.includes('line')) {
          shapeType = 'line';
        } else if (rawShapeType.includes('triangle')) {
          shapeType = 'triangle';
        } else if (rawShapeType.includes('star')) {
          shapeType = 'star';
        }

        elementCounter++;
        const shapeEl: ShapeElement = {
          id: `el-${elementCounter}`,
          type: 'shape',
          content: shapeType,
          shapeType,
          fillColor: token.fill,
          fillHex: token.fill ? token.fill.replace('#', '') : undefined,
          strokeColor: token.stroke,
          strokeHex: token.stroke ? token.stroke.replace('#', '') : undefined,
          strokeWidth: token.strokeWidth,
          opacity: token.opacity,
          link: token.link,
          line: lineNum,
        };
        applyTokenAttributes(shapeEl, token);
        currentSlide.elements.push(shapeEl);
        break;
      }

      case 'table': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'table' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Slide',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        let headers: string[] = [];
        let rows: string[][] = [];

        if (token.headers || token.rows) {
          if (token.headers) {
            headers = token.headers.split(',').map((h) => h.trim());
          }
          if (token.rows) {
            rows = token.rows
              .split(';')
              .map((r) => r.split(',').map((cell) => cell.trim()))
              .filter((r) => r.length > 0 && r.some((c) => c.length > 0));
          }
        } else if (argument) {
          const parsedRows = argument
            .split(';')
            .map((r) => r.split(',').map((cell) => cell.trim()))
            .filter((r) => r.length > 0 && r.some((c) => c.length > 0));

          if (parsedRows.length > 1) {
            headers = parsedRows[0];
            rows = parsedRows.slice(1);
          } else if (parsedRows.length === 1) {
            headers = parsedRows[0];
            rows = [];
          }
        }

        if (headers.length === 0) {
          headers = ['Column 1', 'Column 2'];
          rows = [['Item 1', 'Item 2']];
        }

        elementCounter++;
        const tableEl: TableElement = {
          id: `el-${elementCounter}`,
          type: 'table',
          content: 'Table',
          headers,
          rows,
          line: lineNum,
        };
        applyTokenAttributes(tableEl, token);
        currentSlide.elements.push(tableEl);
        break;
      }

      case 'chart': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: Content 'chart' found before any 'slide'. You must define a slide first.`,
            severity: 'error',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Slide',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }

        const rawType = (argument || 'bar').toLowerCase().trim();
        let chartType: ChartType = 'bar';
        if (rawType.includes('pie')) chartType = 'pie';
        else if (rawType.includes('doughnut') || rawType.includes('donut')) chartType = 'doughnut';
        else if (rawType.includes('line')) chartType = 'line';
        else if (rawType.includes('area')) chartType = 'area';
        else if (rawType.includes('col') || rawType.includes('column')) chartType = 'column';

        const dataItems: Array<{ label: string; value: number }> = [];
        const dataStr = token.data || (argument.includes(':') ? argument : '');

        if (dataStr) {
          const entries = dataStr.split(/[,;]/);
          for (const entry of entries) {
            const [k, v] = entry.split(/[:=]/);
            if (k && v) {
              const valNum = parseFloat(v.trim());
              if (!isNaN(valNum)) {
                dataItems.push({ label: k.trim(), value: valNum });
              }
            }
          }
        }

        if (dataItems.length === 0) {
          dataItems.push(
            { label: 'Category A', value: 30 },
            { label: 'Category B', value: 50 },
            { label: 'Category C', value: 20 }
          );
        }

        elementCounter++;
        const chartEl: ChartElement = {
          id: `el-${elementCounter}`,
          type: 'chart',
          content: `${chartType} chart`,
          chartType,
          data: dataItems,
          title: token.data ? argument : (token.title || undefined),
          line: lineNum,
        };
        applyTokenAttributes(chartEl, token);
        currentSlide.elements.push(chartEl);
        break;
      }

      case 'notes':
      case 'note': {
        if (!currentSlide) {
          issues.push({
            line: lineNum,
            code: 'CONTENT_BEFORE_SLIDE',
            message: `Line ${lineNum}: 'notes' found before any 'slide'. You must define a slide first.`,
            severity: 'warning',
            suggestion: `Add a 'slide "Title"' command before line ${lineNum}.`,
          });
        } else {
          currentSlide.notes = argument;
        }
        break;
      }

      case 'background':
      case 'bg': {
        if (currentSlide) {
          currentSlide.background = argument;
        }
        break;
      }

      case 'link': {
        if (!currentSlide) {
          currentSlide = {
            id: `slide-${slides.length + 1}`,
            index: slides.length,
            title: presentationTitle || 'Slide',
            line: lineNum,
            elements: [],
          };
          slides.push(currentSlide);
        }
        elementCounter++;
        currentSlide.elements.push({
          id: `el-${elementCounter}`,
          type: 'text',
          content: argument,
          link: argument,
          line: lineNum,
        });
        break;
      }

      default: {
        // Never silently ignore unknown commands
        issues.push({
          line: lineNum,
          code: 'INVALID_COMMAND',
          message: isJs
            ? `Line ${lineNum}: JavaScript statement '${token.rawKeyword}' is not valid Code2PPT syntax.`
            : `Line ${lineNum}: Unknown command '${token.rawKeyword}'.`,
          severity: 'error',
          suggestion: isJs
            ? `Use presentation, slide, bullet, or text commands instead.`
            : `Supported commands: presentation, slide, text, bullet, subtitle, quote, image, layout, theme, transition, shape, table, chart, notes, background.`,
        });
        break;
      }
    }
  }

  // Apply presentation-level transition to slides that did not specify their own transition
  if (presentationTransition) {
    for (const slide of slides) {
      if (!slide.transition) {
        slide.transition = { ...presentationTransition };
      }
    }
  }

  // Check for missing presentation declaration
  if (!hasPresentationDeclaration && slides.length > 0) {
    issues.push({
      line: 1,
      code: 'MISSING_PRESENTATION_DECLARATION',
      message: 'Missing presentation declaration: No `presentation "Title"` found at the top.',
      severity: 'warning',
      suggestion: 'Add `presentation "My Presentation"` at line 1.',
    });
  }

  // Check for empty slides
  for (const slide of slides) {
    if (slide.elements.length === 0) {
      issues.push({
        line: slide.line,
        code: 'EMPTY_SLIDE',
        message: `Line ${slide.line}: Slide "${slide.title}" has no content elements.`,
        severity: 'warning',
        suggestion: `Add text or bullet points under slide "${slide.title}".`,
      });
    }
  }

  // Check for empty presentation
  if (slides.length === 0) {
    issues.push({
      line: 1,
      code: 'EMPTY_PRESENTATION',
      message: 'Empty presentation: No slides defined. Add at least one slide with `slide "Title"`.',
      severity: 'error',
      suggestion: 'slide "Welcome"\ntext "My first slide"',
    });
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  let presentation: Presentation = {
    title: presentationTitle,
    theme: presentationTheme,
    transition: presentationTransition,
    slides,
  };

  if (isQualityCleanRequested(code)) {
    const cleaned = cleanPresentationModel(presentation);
    presentation = cleaned.presentation;
  }

  return {
    presentation,
    issues,
    hasErrors,
  };
}
