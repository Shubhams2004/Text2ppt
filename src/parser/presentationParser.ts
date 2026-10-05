import {
  ImageElement,
  ParseResult,
  Presentation,
  Slide,
  SlideElement,
  SlideLayout,
  ThemeId,
  VALID_SLIDE_LAYOUTS,
  ValidationIssue,
} from '../models/presentation';
import { isJavaScriptOrPptxCode } from './jsToDslConverter';

export interface ExtractedToken {
  rawKeyword: string;
  keyword: string;
  argument: string;
  layout?: string;
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
    return {
      rawKeyword: trimmed,
      keyword: trimmed.toLowerCase(),
      argument: '',
      hasQuotes: false,
      unclosedQuote: false,
      missingQuotes: false,
      rawLine: line,
    };
  }

  const rawKeyword = trimmed.slice(0, firstSpaceIdx);
  const keyword = rawKeyword.toLowerCase();
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

  const firstChar = rest[0];
  const lastChar = rest[rest.length - 1];

  // Properly quoted string (supports double or single quotes)
  if ((firstChar === '"' || firstChar === "'") && rest.length >= 2 && lastChar === firstChar) {
    return {
      rawKeyword,
      keyword,
      argument: rest.slice(1, -1),
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
      argument: rest.slice(1),
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
    argument: rest,
    hasQuotes: false,
    unclosedQuote: false,
    missingQuotes: true,
    rawLine: line,
  };
}

/**
 * Parses presentation DSL code into a deterministic, typed Presentation AST
 */
export function parsePresentation(code: string): ParseResult {
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
    if (missingQuotes && argument && keyword !== 'theme') {
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
        currentSlide.elements.push({
          id: `el-${elementCounter}`,
          type: 'subtitle',
          content: argument,
          line: lineNum,
        });
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
        currentSlide.elements.push({
          id: `el-${elementCounter}`,
          type: 'quote',
          content: argument,
          line: lineNum,
        });
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
          };
          currentSlide.elements.push(imageEl);
        }
        break;
      }

      // Extensible cases for future commands
      case 'table':
      case 'chart':
      case 'shape': {
        issues.push({
          line: lineNum,
          code: 'INVALID_COMMAND',
          message: `Line ${lineNum}: Command '${keyword}' is reserved for future extensions.`,
          severity: 'error',
          suggestion: `Supported commands: presentation, slide, text, bullet, subtitle, quote, image, theme.`,
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
            : `Supported commands: presentation, slide, text, bullet, subtitle, quote, theme.`,
        });
        break;
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

  return {
    presentation: {
      title: presentationTitle,
      theme: presentationTheme,
      slides,
    },
    issues,
    hasErrors,
  };
}
