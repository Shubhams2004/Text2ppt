import pptxgen from 'pptxgenjs';
import {
  BulletElement,
  QuoteElement,
  SlideElement,
  SubtitleElement,
  TextElement,
  ThemeColors,
} from '../models/presentation';
import { ContentBox, LayoutTypography } from './layoutSystem';

export interface ElementRenderContext {
  typography: LayoutTypography;
  theme: ThemeColors;
  contentBox: ContentBox;
}

/**
 * Text paragraph renderer
 * Produces native, editable PowerPoint paragraph runs with calculated spacing
 */
export function renderTextElement(
  element: TextElement,
  context: ElementRenderContext
): pptxgen.TextProps {
  const { typography, theme } = context;

  return {
    text: element.content,
    options: {
      bullet: false,
      fontSize: typography.fontSize,
      color: theme.bodyHex,
      fontFace: 'Arial',
      paraSpaceAfter: typography.paraSpaceAfter,
      lineSpacingMultiple: typography.lineSpacingMultiple,
      breakLine: true,
    },
  };
}

/**
 * Bullet point renderer
 * Produces native PowerPoint bullet items where supported by PptxGenJS (not character prefixes)
 */
export function renderBulletElement(
  element: BulletElement,
  context: ElementRenderContext
): pptxgen.TextProps {
  const { typography, theme } = context;

  return {
    text: element.content,
    options: {
      bullet: true,
      fontSize: typography.bulletFontSize,
      color: theme.bodyHex,
      fontFace: 'Arial',
      paraSpaceAfter: typography.bulletSpaceAfter,
      lineSpacingMultiple: typography.lineSpacingMultiple,
      breakLine: true,
    },
  };
}

/**
 * Subtitle element renderer
 */
export function renderSubtitleElement(
  element: SubtitleElement,
  context: ElementRenderContext
): pptxgen.TextProps {
  const { typography, theme } = context;

  return {
    text: element.content,
    options: {
      bullet: false,
      fontSize: typography.subtitleFontSize,
      bold: true,
      color: theme.accentHex,
      fontFace: 'Arial',
      paraSpaceAfter: typography.paraSpaceAfter,
      lineSpacingMultiple: typography.lineSpacingMultiple,
      breakLine: true,
    },
  };
}

/**
 * Quote element renderer
 */
export function renderQuoteElement(
  element: QuoteElement,
  context: ElementRenderContext
): pptxgen.TextProps {
  const { typography, theme } = context;

  return {
    text: `“${element.content}”`,
    options: {
      bullet: false,
      italic: true,
      fontSize: typography.fontSize,
      color: theme.accentHex,
      fontFace: 'Georgia',
      paraSpaceAfter: typography.paraSpaceAfter,
      lineSpacingMultiple: typography.lineSpacingMultiple,
      breakLine: true,
    },
  };
}

/**
 * Modular element renderer registry
 * Allows future elements (images, tables, charts, shapes) to add their own rendering functions.
 */
export type ElementRendererFn = (
  element: SlideElement,
  context: ElementRenderContext
) => pptxgen.TextProps;

export const ELEMENT_RENDERERS: Record<string, ElementRendererFn> = {
  text: (el, ctx) => renderTextElement(el as TextElement, ctx),
  bullet: (el, ctx) => renderBulletElement(el as BulletElement, ctx),
  subtitle: (el, ctx) => renderSubtitleElement(el as SubtitleElement, ctx),
  quote: (el, ctx) => renderQuoteElement(el as QuoteElement, ctx),
};

/**
 * Renders any slide element using the registered element renderer
 */
export function renderSlideElement(
  element: SlideElement,
  context: ElementRenderContext
): pptxgen.TextProps {
  const renderer = ELEMENT_RENDERERS[element.type];
  if (renderer) {
    return renderer(element, context);
  }

  // Graceful fallback for any future or unrecognized elements
  return renderTextElement(
    {
      id: element.id,
      type: 'text',
      content: element.content,
      line: element.line,
    },
    context
  );
}
