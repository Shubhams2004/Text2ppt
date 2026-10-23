import {
  Presentation,
  Slide,
  SlideElement,
  ShapeElement,
  TableElement,
  ChartElement,
  ImageElement,
} from '../models/presentation';

/**
 * Formats a number with up to 2 decimal places, removing unnecessary trailing zeros.
 */
function fmtNum(n: number | undefined): string {
  if (n === undefined || isNaN(n)) return '';
  return Number(n.toFixed(2)).toString();
}

/**
 * Escapes quotes in string arguments
 */
function escapeQuote(s: string): string {
  return (s || '').replace(/"/g, '\\"');
}

/**
 * Formats common spatial and styling attributes for any slide element
 */
function formatElementAttributes(el: SlideElement): string {
  const attrs: string[] = [];

  if (el.x !== undefined) attrs.push(`x=${fmtNum(el.x)}`);
  if (el.y !== undefined) attrs.push(`y=${fmtNum(el.y)}`);
  if (el.w !== undefined) attrs.push(`w=${fmtNum(el.w)}`);
  if (el.h !== undefined) attrs.push(`h=${fmtNum(el.h)}`);
  if (el.rotation !== undefined && el.rotation !== 0) attrs.push(`rot=${fmtNum(el.rotation)}`);

  if (el.fontFamily) attrs.push(`font="${escapeQuote(el.fontFamily)}"`);
  if (el.fontSize !== undefined) attrs.push(`size=${fmtNum(el.fontSize)}`);
  if (el.bold !== undefined) attrs.push(`bold=${el.bold}`);
  if (el.italic !== undefined) attrs.push(`italic=${el.italic}`);
  if (el.underline !== undefined) attrs.push(`underline=${el.underline}`);
  if (el.color) attrs.push(`color="${escapeQuote(el.color)}"`);
  if (el.align) attrs.push(`align="${el.align}"`);
  if (el.lineSpacing !== undefined) attrs.push(`lineSpacing=${fmtNum(el.lineSpacing)}`);
  if (el.link) attrs.push(`link="${escapeQuote(el.link)}"`);

  return attrs.length > 0 ? ' ' + attrs.join(' ') : '';
}

/**
 * Serializes a single slide element to DSL markup
 */
export function serializeSlideElement(el: SlideElement): string {
  const commonAttrs = formatElementAttributes(el);

  switch (el.type) {
    case 'text':
      return `  text "${escapeQuote(el.content)}"${commonAttrs}`;

    case 'bullet':
      return `  bullet "${escapeQuote(el.content)}"${commonAttrs}`;

    case 'subtitle':
      return `  subtitle "${escapeQuote(el.content)}"${commonAttrs}`;

    case 'quote':
      return `  quote "${escapeQuote(el.content)}"${commonAttrs}`;

    case 'image': {
      const img = el as ImageElement;
      const fitAttr = img.fit ? ` fit="${img.fit}"` : '';
      const srcVal = img.src || img.url || el.content;
      return `  image "${escapeQuote(srcVal)}"${fitAttr}${commonAttrs}`;
    }

    case 'shape': {
      const shape = el as ShapeElement;
      const shapeAttrs: string[] = [];
      if (shape.fillColor || shape.fillHex) {
        shapeAttrs.push(`fill="${escapeQuote(shape.fillColor || '#' + shape.fillHex)}"`);
      }
      if (shape.strokeColor || shape.strokeHex) {
        shapeAttrs.push(`stroke="${escapeQuote(shape.strokeColor || '#' + shape.strokeHex)}"`);
      }
      if (shape.strokeWidth !== undefined) {
        shapeAttrs.push(`strokeWidth=${fmtNum(shape.strokeWidth)}`);
      }
      if (shape.opacity !== undefined && shape.opacity < 1) {
        shapeAttrs.push(`opacity=${fmtNum(shape.opacity)}`);
      }
      const extra = shapeAttrs.length > 0 ? ' ' + shapeAttrs.join(' ') : '';
      return `  shape "${shape.shapeType || el.content || 'rect'}"${extra}${commonAttrs}`;
    }

    case 'table': {
      const table = el as TableElement;
      const headersAttr =
        table.headers && table.headers.length > 0
          ? ` headers="${escapeQuote(table.headers.join(','))}"`
          : '';
      const rowsAttr =
        table.rows && table.rows.length > 0
          ? ` rows="${escapeQuote(table.rows.map((r) => r.join(',')).join('|'))}"`
          : '';
      return `  table "${escapeQuote(el.content || 'Table')}"${headersAttr}${rowsAttr}${commonAttrs}`;
    }

    case 'chart': {
      const chart = el as ChartElement;
      const titleAttr = chart.title ? ` title="${escapeQuote(chart.title)}"` : '';
      const dataAttr =
        chart.data && chart.data.length > 0
          ? ` data="${escapeQuote(chart.data.map((d) => `${d.label}:${d.value}`).join(','))}"`
          : '';
      return `  chart "${chart.chartType || 'bar'}"${titleAttr}${dataAttr}${commonAttrs}`;
    }

    default:
      return `  text "${escapeQuote((el as SlideElement).content || '')}"${commonAttrs}`;
  }
}

/**
 * Serializes a single Slide into Code2PPT DSL lines
 */
export function serializeSlide(slide: Slide): string {
  const lines: string[] = [];

  let slideDecl = `slide "${escapeQuote(slide.title || 'Untitled Slide')}"`;
  if (slide.layout && slide.layout !== 'title-content') {
    slideDecl += ` layout="${slide.layout}"`;
  }
  lines.push(slideDecl);

  if (slide.transition && slide.transition.style !== 'none') {
    let trans = `  transition "${slide.transition.style}"`;
    if (slide.transition.direction) trans += ` dir="${slide.transition.direction}"`;
    if (slide.transition.speed) trans += ` speed="${slide.transition.speed}"`;
    if (slide.transition.duration) trans += ` duration=${slide.transition.duration}`;
    lines.push(trans);
  }

  if (slide.background) {
    lines.push(`  background "${escapeQuote(slide.background)}"`);
  }

  if (slide.notes) {
    lines.push(`  notes "${escapeQuote(slide.notes)}"`);
  }

  for (const el of slide.elements) {
    lines.push(serializeSlideElement(el));
  }

  return lines.join('\n');
}

/**
 * Serializes a complete Presentation model into Code2PPT DSL code.
 */
export function serializePresentation(presentation: Presentation): string {
  const parts: string[] = [];

  // Presentation header
  parts.push(`presentation "${escapeQuote(presentation.title || 'Untitled Presentation')}"`);
  parts.push(`theme "${presentation.theme || 'modern'}"`);

  if (presentation.transition && presentation.transition.style !== 'none') {
    let trans = `transition "${presentation.transition.style}"`;
    if (presentation.transition.direction) trans += ` dir="${presentation.transition.direction}"`;
    if (presentation.transition.speed) trans += ` speed="${presentation.transition.speed}"`;
    parts.push(trans);
  }

  parts.push(''); // blank line

  // Slides
  for (const slide of presentation.slides) {
    parts.push(serializeSlide(slide));
    parts.push(''); // blank line between slides
  }

  return parts.join('\n').trim() + '\n';
}
