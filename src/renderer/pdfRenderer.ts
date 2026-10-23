import { jsPDF } from 'jspdf';
import {
  ChartElement,
  ImageElement,
  Presentation,
  ShapeElement,
  Slide,
  SlideElement,
  TableElement,
} from '../models/presentation';
import { getTheme, THEMES } from '../themes/presentationThemes';
import {
  autoPaginatePresentation,
  computeSlideLayout,
  ComputedSlideLayout,
  ContentBox,
} from './layoutSystem';
import { sanitizeFileName, ExportOptions } from './pptxRenderer';

/**
 * Builds a vector jsPDF instance representing the presentation in 16:9 widescreen slides (10 x 5.625 inches)
 */
export function buildPdfPresentation(
  presentation: Presentation,
  options: ExportOptions = {}
): jsPDF {
  // Auto-paginate presentation so overflowing slides are automatically assigned to next slides
  const paginated = autoPaginatePresentation(presentation);
  const theme = THEMES[paginated.theme] || getTheme(paginated.theme);

  // 16:9 widescreen format: 10 inches width by 5.625 inches height
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'in',
    format: [10, 5.625],
    compress: true,
  });

  const totalSlides = paginated.slides.length;

  if (totalSlides === 0) {
    // Return empty single-slide document
    return doc;
  }

  paginated.slides.forEach((slideData: Slide, index: number) => {
    if (index > 0) {
      doc.addPage([10, 5.625], 'landscape');
    }

    // Slide background fill
    let bg = theme.bgHex;
    if (slideData.background && slideData.background.startsWith('#')) {
      bg = slideData.background;
    }
    doc.setFillColor(bg.startsWith('#') ? bg : `#${bg}`);
    doc.rect(0, 0, 10, 5.625, 'F');

    // Compute deterministic layout for this slide
    const layout = computeSlideLayout(
      slideData,
      index,
      totalSlides,
      paginated.title
    );

    if (layout.layoutType === 'title') {
      renderPdfCoverSlide(doc, slideData, theme, layout);
    } else {
      renderPdfSlideWithLayout(doc, slideData, theme, layout);
    }

    // Slide footer (title & numbering)
    if (options.includeSlideNumbers !== false && layout.footer.show) {
      renderPdfFooter(doc, paginated.title, index + 1, totalSlides, layout, theme);
    }
  });

  return doc;
}

/**
 * Cover / Title Slide renderer for PDF
 */
function renderPdfCoverSlide(
  doc: jsPDF,
  slideData: Slide,
  theme: ReturnType<typeof getTheme>,
  layout: ComputedSlideLayout
) {
  const isLong = slideData.title.length > 50;

  // Accent decorative bar
  doc.setFillColor(theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`);
  doc.rect(0.8, 1.5, 1.5, 0.08, 'F');

  // Title
  doc.setTextColor(theme.titleHex.startsWith('#') ? theme.titleHex : `#${theme.titleHex}`);
  doc.setFont('helvetica', 'bold');
  const titleFontSize = isLong ? 28 : 36;
  doc.setFontSize(titleFontSize);

  const titleLines = doc.splitTextToSize(slideData.title, 8.4);
  doc.text(titleLines, 0.8, 2.15);

  // Subtitle / Elements
  if (slideData.elements.length > 0) {
    let curY = isLong ? 3.7 : 3.3;
    slideData.elements.forEach((el) => {
      const isSub = el.type === 'subtitle';
      const color = isSub ? theme.accentHex : theme.bodyHex;
      doc.setTextColor(color.startsWith('#') ? color : `#${color}`);
      doc.setFont('helvetica', isSub ? 'bold' : 'normal');
      doc.setFontSize(isSub ? 16 : 18);

      const lines = doc.splitTextToSize(el.content, 8.4);
      doc.text(lines, 0.8, curY);
      const lineHeightInches = ((isSub ? 16 : 18) * 1.3) / 72;
      curY += lines.length * lineHeightInches + 0.18;
    });
  }
}

/**
 * Standard slide renderer with layout for PDF
 */
function renderPdfSlideWithLayout(
  doc: jsPDF,
  slideData: Slide,
  theme: ReturnType<typeof getTheme>,
  layout: ComputedSlideLayout
) {
  const { header } = layout;

  // 1. Header (accent bar, title, divider)
  if (header.show) {
    // Accent indicator bar
    doc.setFillColor(theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`);
    doc.rect(header.accentBar.x, header.accentBar.y, header.accentBar.w, header.accentBar.h, 'F');

    // Title
    doc.setTextColor(theme.titleHex.startsWith('#') ? theme.titleHex : `#${theme.titleHex}`);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(header.title.fontSize);

    // Adjust baseline for vertical centering in header title box
    const titleBaselineY = header.title.bounds.y + header.title.bounds.h * 0.72;
    const titleLines = doc.splitTextToSize(header.title.text, header.title.bounds.w);
    doc.text(titleLines, header.title.bounds.x, titleBaselineY);

    // Divider line
    if (header.dividerY > 0) {
      const dividerColor = theme.border.startsWith('#') ? theme.border : `#${theme.border}`;
      doc.setDrawColor(dividerColor);
      doc.setLineWidth(0.015);
      doc.line(0.8, header.dividerY, 9.2, header.dividerY);
    }
  }

  // 2. Image Region
  if (layout.imageRegion) {
    renderPdfImageRegion(doc, layout.imageRegion, theme);
  }

  // 3. Two-Column content
  if (layout.layoutType === 'two-column' && layout.twoColumn) {
    const { column1, column2 } = layout.twoColumn;

    if (column1.elements.length > 0) {
      renderPdfContentFlow(
        doc,
        column1.elements.map((e) => e.element),
        column1.bounds,
        column1.typography,
        theme
      );
    }

    if (column2.elements.length > 0) {
      renderPdfContentFlow(
        doc,
        column2.elements.map((e) => e.element),
        column2.bounds,
        column2.typography,
        theme
      );
    }
    return;
  }

  // 4. Standard body text content
  const textElements = slideData.elements.filter(
    (el) => el.type !== 'image' && el.type !== 'shape' && el.type !== 'table' && el.type !== 'chart'
  );
  const explicitTextElements = textElements.filter((el) => el.x !== undefined && el.y !== undefined);
  const flowTextElements = textElements.filter((el) => el.x === undefined || el.y === undefined);

  if (!layout.body.isEmpty && flowTextElements.length > 0) {
    renderPdfContentFlow(
      doc,
      flowTextElements,
      layout.body.bounds,
      layout.body.typography,
      theme
    );
  }

  // Render explicitly positioned text elements directly
  explicitTextElements.forEach((el) => {
    const x = el.x!;
    const y = el.y!;
    const w = el.w ?? 4.0;
    const fontSize = el.fontSize || layout.body.typography.fontSize;
    doc.setFontSize(fontSize);
    const fontStyle = el.bold && el.italic ? 'bolditalic' : el.bold ? 'bold' : el.italic ? 'italic' : 'normal';
    doc.setFont('helvetica', fontStyle);
    const color = el.color || theme.bodyHex;
    doc.setTextColor(color.startsWith('#') ? color : `#${color}`);
    const lines = doc.splitTextToSize(el.content, w);
    doc.text(lines, x, y + (fontSize / 72) * 0.95);
  });

  // Render explicitly positioned images
  const explicitImageElements = slideData.elements.filter(
    (el): el is ImageElement => el.type === 'image' && el.x !== undefined && el.y !== undefined
  );
  explicitImageElements.forEach((img) => {
    try {
      const src = img.src || img.url || img.content;
      if (!src) return;
      const x = img.x!;
      const y = img.y!;
      const w = img.w ?? 4.0;
      const h = img.h ?? 3.0;

      if (src.startsWith('data:image/')) {
        let format = 'PNG';
        if (src.includes('image/jpeg')) format = 'JPEG';
        else if (src.includes('image/webp')) format = 'WEBP';
        doc.addImage(src, format, x, y, w, h);
      } else {
        // Fallback placeholder box if external URL
        const bg = theme.isDark ? '#1E293B' : '#F8FAFC';
        doc.setFillColor(bg);
        doc.rect(x, y, w, h, 'FD');
        doc.setFontSize(10);
        doc.setTextColor('#94A3B8');
        doc.text(img.alt || 'Image', x + w / 2, y + h / 2, { align: 'center' });
      }
    } catch (err) {
      console.warn('Could not add explicit image to PDF:', err);
    }
  });

  // 5. Render Shapes
  const shapeElements = slideData.elements.filter((el): el is ShapeElement => el.type === 'shape');
  shapeElements.forEach((shapeEl, idx) => {
    const fallbackBounds = {
      x: layout.body.bounds.x + idx * 1.5,
      y: layout.body.bounds.y + (textElements.length > 0 ? 2.0 : 0.2),
      w: 2.2,
      h: 1.4,
    };
    renderPdfShapeElement(doc, shapeEl, theme, fallbackBounds);
  });

  // 6. Render Tables
  const tableElements = slideData.elements.filter((el): el is TableElement => el.type === 'table');
  tableElements.forEach((tableEl) => {
    const fallbackBounds = {
      x: layout.body.bounds.x,
      y: layout.body.bounds.y + (textElements.length > 0 ? 1.6 : 0.1),
      w: layout.body.bounds.w,
      h: Math.min(3.6, layout.body.bounds.h),
    };
    renderPdfTableElement(doc, tableEl, theme, fallbackBounds);
  });

  // 7. Render Charts
  const chartElements = slideData.elements.filter((el): el is ChartElement => el.type === 'chart');
  chartElements.forEach((chartEl) => {
    const fallbackBounds = {
      x: layout.body.bounds.x,
      y: layout.body.bounds.y + (textElements.length > 0 ? 1.6 : 0.1),
      w: Math.min(6.5, layout.body.bounds.w),
      h: Math.min(3.4, layout.body.bounds.h),
    };
    renderPdfChartElement(doc, chartEl, theme, fallbackBounds);
  });
}

/**
 * Renders vector shapes in PDF
 */
function renderPdfShapeElement(
  doc: jsPDF,
  element: ShapeElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? fallbackBounds.w;
  const h = element.h ?? fallbackBounds.h;

  const fillHex =
    element.fillHex ||
    (element.fillColor ? element.fillColor : theme.accentHex);
  const strokeHex =
    element.strokeHex ||
    (element.strokeColor ? element.strokeColor : theme.border);
  const strokeWidth = element.strokeWidth !== undefined ? element.strokeWidth * 0.015 : 0.015;

  const validFill = fillHex.startsWith('#') ? fillHex : `#${fillHex}`;
  const validStroke = strokeHex.startsWith('#') ? strokeHex : `#${strokeHex}`;

  doc.setFillColor(validFill);
  doc.setDrawColor(validStroke);
  doc.setLineWidth(strokeWidth);

  switch (element.shapeType) {
    case 'round-rect':
      doc.roundedRect(x, y, w, h, 0.08, 0.08, 'FD');
      break;
    case 'circle':
    case 'ellipse': {
      const rx = w / 2;
      const ry = h / 2;
      doc.ellipse(x + rx, y + ry, rx, ry, 'FD');
      break;
    }
    case 'line':
      doc.line(x, y + h / 2, x + w, y + h / 2);
      break;
    case 'triangle':
      doc.triangle(x + w / 2, y, x, y + h, x + w, y + h, 'FD');
      break;
    case 'arrow': {
      const shaftH = h * 0.4;
      const shaftY = y + (h - shaftH) / 2;
      const headW = w * 0.35;
      doc.rect(x, shaftY, w - headW, shaftH, 'FD');
      doc.triangle(x + w - headW, y, x + w - headW, y + h, x + w, y + h / 2, 'FD');
      break;
    }
    case 'star': {
      // 5-point star rendered with 2 overlapping triangles
      doc.triangle(x + w / 2, y, x, y + h * 0.75, x + w, y + h * 0.75, 'FD');
      doc.triangle(x + w / 2, y + h, x, y + h * 0.25, x + w, y + h * 0.25, 'FD');
      break;
    }
    case 'rect':
    default:
      doc.rect(x, y, w, h, 'FD');
      break;
  }
}

/**
 * Renders data tables in PDF
 */
function renderPdfTableElement(
  doc: jsPDF,
  element: TableElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? Math.min(8.4, fallbackBounds.w);
  const headers = element.headers || ['Column 1', 'Column 2'];
  const rows = element.rows || [];
  const colCount = Math.max(1, headers.length);
  const colWidth = w / colCount;
  const headerHeight = 0.38;
  const rowHeight = 0.32;

  // Header background
  const headerBg = theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`;
  doc.setFillColor(headerBg);
  doc.rect(x, y, w, headerHeight, 'F');

  // Header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor('#FFFFFF');
  headers.forEach((hText, colIdx) => {
    const cellX = x + colIdx * colWidth + 0.08;
    const cellY = y + headerHeight * 0.7;
    const truncated = doc.splitTextToSize(hText, colWidth - 0.16)[0] || hText;
    doc.text(truncated, cellX, cellY);
  });

  // Rows
  const borderColor = theme.border.startsWith('#') ? theme.border : `#${theme.border}`;
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.01);

  rows.forEach((row, rowIdx) => {
    const rowY = y + headerHeight + rowIdx * rowHeight;
    // Alternating fill
    const rowBg = rowIdx % 2 === 0 ? (theme.isDark ? '#1E293B' : '#FFFFFF') : (theme.isDark ? '#0F172A' : '#F8FAFC');
    doc.setFillColor(rowBg);
    doc.rect(x, rowY, w, rowHeight, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const textCol = theme.bodyHex.startsWith('#') ? theme.bodyHex : `#${theme.bodyHex}`;
    doc.setTextColor(textCol);

    row.forEach((cellText, colIdx) => {
      const cellX = x + colIdx * colWidth + 0.08;
      const cellY = rowY + rowHeight * 0.7;
      const truncated = doc.splitTextToSize(cellText, colWidth - 0.16)[0] || cellText;
      doc.text(truncated, cellX, cellY);
    });
  });

  // Table outer border
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.015);
  doc.rect(x, y, w, headerHeight + rows.length * rowHeight, 'S');
}

/**
 * Renders data charts in PDF
 */
function renderPdfChartElement(
  doc: jsPDF,
  element: ChartElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? Math.min(6.5, fallbackBounds.w);
  const h = element.h ?? Math.min(3.4, fallbackBounds.h);

  // Background frame
  const bg = theme.isDark ? '#1E293B' : '#F8FAFC';
  doc.setFillColor(bg);
  const border = theme.border.startsWith('#') ? theme.border : `#${theme.border}`;
  doc.setDrawColor(border);
  doc.setLineWidth(0.015);
  doc.roundedRect(x, y, w, h, 0.08, 0.08, 'FD');

  // Chart Title
  let contentTop = y + 0.25;
  if (element.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const titleCol = theme.titleHex.startsWith('#') ? theme.titleHex : `#${theme.titleHex}`;
    doc.setTextColor(titleCol);
    doc.text(element.title, x + 0.2, contentTop);
    contentTop += 0.25;
  }

  const data = element.data || [];
  if (data.length === 0) return;

  const chartAreaX = x + 0.4;
  const chartAreaY = contentTop;
  const chartAreaW = w - 0.8;
  const chartAreaH = h - (contentTop - y) - 0.4;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const palette = [
    theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`,
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
  ];

  // Render Bar / Column Chart
  const barCount = data.length;
  const barSpacing = chartAreaW / barCount;
  const barWidth = barSpacing * 0.6;

  data.forEach((item, idx) => {
    const barX = chartAreaX + idx * barSpacing + (barSpacing - barWidth) / 2;
    const barHeight = Math.max(0.05, (item.value / maxVal) * (chartAreaH - 0.3));
    const barY = chartAreaY + chartAreaH - barHeight;

    const barColor = palette[idx % palette.length];
    doc.setFillColor(barColor);
    doc.rect(barX, barY, barWidth, barHeight, 'F');

    // Label under bar
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#94A3B8');
    const labelLines = doc.splitTextToSize(item.label, barSpacing);
    doc.text(labelLines[0] || item.label, barX + barWidth / 2, chartAreaY + chartAreaH + 0.15, {
      align: 'center',
    });

    // Value above bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const valCol = theme.titleHex.startsWith('#') ? theme.titleHex : `#${theme.titleHex}`;
    doc.setTextColor(valCol);
    doc.text(String(item.value), barX + barWidth / 2, barY - 0.05, { align: 'center' });
  });

  // Base axis line
  doc.setDrawColor('#94A3B8');
  doc.setLineWidth(0.01);
  doc.line(chartAreaX, chartAreaY + chartAreaH, chartAreaX + chartAreaW, chartAreaY + chartAreaH);
}

/**
 * Sequential text and bullet flow renderer for a bounded ContentBox in PDF
 */
function renderPdfContentFlow(
  doc: jsPDF,
  elements: SlideElement[],
  bounds: ContentBox,
  typography: ComputedSlideLayout['body']['typography'],
  theme: ReturnType<typeof getTheme>
) {
  let curY = bounds.y + (typography.fontSize / 72) * 0.95;

  elements.forEach((el) => {
    if (el.type === 'bullet') {
      const fontSize = typography.bulletFontSize;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(theme.bodyHex.startsWith('#') ? theme.bodyHex : `#${theme.bodyHex}`);

      // Draw bullet disc dot or character
      const bulletX = bounds.x + 0.08;
      const textX = bounds.x + 0.28;
      const textWidth = bounds.w - 0.28;

      // Draw subtle decorative bullet circle or bullet char
      doc.setFillColor(theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`);
      const bulletRadius = 0.025;
      doc.circle(bulletX + 0.04, curY - (fontSize / 72) * 0.3, bulletRadius, 'F');

      const lines = doc.splitTextToSize(el.content, textWidth);
      doc.text(lines, textX, curY);

      const lineHeightInches = (fontSize * typography.lineSpacingMultiple) / 72;
      const spaceAfterInches = typography.bulletSpaceAfter / 72;
      curY += lines.length * lineHeightInches + spaceAfterInches;
    } else if (el.type === 'subtitle') {
      const fontSize = typography.subtitleFontSize;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`);

      const lines = doc.splitTextToSize(el.content, bounds.w);
      doc.text(lines, bounds.x, curY);

      const lineHeightInches = (fontSize * typography.lineSpacingMultiple) / 72;
      const spaceAfterInches = typography.paraSpaceAfter / 72;
      curY += lines.length * lineHeightInches + spaceAfterInches;
    } else if (el.type === 'quote') {
      const fontSize = typography.fontSize;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(theme.accentHex.startsWith('#') ? theme.accentHex : `#${theme.accentHex}`);

      const quoteText = `“${el.content}”`;
      const lines = doc.splitTextToSize(quoteText, bounds.w - 0.2);
      doc.text(lines, bounds.x + 0.1, curY);

      const lineHeightInches = (fontSize * typography.lineSpacingMultiple) / 72;
      const spaceAfterInches = typography.paraSpaceAfter / 72;
      curY += lines.length * lineHeightInches + spaceAfterInches;
    } else {
      // Regular text paragraph
      const fontSize = typography.fontSize;
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(theme.bodyHex.startsWith('#') ? theme.bodyHex : `#${theme.bodyHex}`);

      const lines = doc.splitTextToSize(el.content, bounds.w);
      doc.text(lines, bounds.x, curY);

      const lineHeightInches = (fontSize * typography.lineSpacingMultiple) / 72;
      const spaceAfterInches = typography.paraSpaceAfter / 72;
      curY += lines.length * lineHeightInches + spaceAfterInches;
    }
  });
}

/**
 * Image region renderer in PDF
 */
function renderPdfImageRegion(
  doc: jsPDF,
  imageRegion: NonNullable<ComputedSlideLayout['imageRegion']>,
  theme: ReturnType<typeof getTheme>
) {
  const { bounds, fittedBounds, image, hasImage, label } = imageRegion;
  const drawBounds = fittedBounds || bounds;

  if (hasImage && image && image.src) {
    try {
      const src = image.src;
      const isDataUri = src.startsWith('data:image/');
      let format = 'PNG';
      if (src.includes('image/jpeg') || src.includes('.jpg') || src.includes('.jpeg')) {
        format = 'JPEG';
      } else if (src.includes('image/webp') || src.includes('.webp')) {
        format = 'WEBP';
      }

      if (isDataUri) {
        doc.addImage(src, format, drawBounds.x, drawBounds.y, drawBounds.w, drawBounds.h);
        return;
      }
    } catch (err) {
      console.warn('Could not add image directly to PDF, using placeholder:', err);
    }
  }

  // Placeholder frame
  const bg = theme.isDark ? '#1E293B' : '#F8FAFC';
  doc.setFillColor(bg);
  const border = theme.border.startsWith('#') ? theme.border : `#${theme.border}`;
  doc.setDrawColor(border);
  doc.setLineWidth(0.015);
  doc.rect(bounds.x, bounds.y, bounds.w, bounds.h, 'FD');

  doc.setTextColor('#94A3B8');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const text = label || 'Image Placeholder';
  const textY = bounds.y + bounds.h / 2 + 0.05;
  doc.text(text, bounds.x + bounds.w / 2, textY, { align: 'center' });
}

/**
 * Footer renderer for PDF slides
 */
function renderPdfFooter(
  doc: jsPDF,
  presentationTitle: string,
  slideNumber: number,
  totalSlides: number,
  layout: ComputedSlideLayout,
  theme: ReturnType<typeof getTheme>
) {
  const { footer } = layout;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#94A3B8');

  // Title on left
  const titleY = footer.titleBox.y + footer.titleBox.h * 0.8;
  doc.text(presentationTitle || 'Code2PPT', footer.titleBox.x, titleY);

  // Slide number on right
  const pageY = footer.pageBox.y + footer.pageBox.h * 0.8;
  const pageText = `Slide ${slideNumber} of ${totalSlides}`;
  doc.text(pageText, footer.pageBox.x + footer.pageBox.w, pageY, { align: 'right' });
}

/**
 * Normalizes a PDF file name to always end in a single .pdf extension,
 * stripping any unintended .zip, .pdf.zip, or repeated extensions.
 */
export function formatPdfFileName(name: string): string {
  let clean = sanitizeFileName(name);
  clean = clean.replace(/\.pdf\.zip$/i, '');
  clean = clean.replace(/\.zip$/i, '');
  clean = clean.replace(/(\.pdf)+$/i, '');
  clean = clean.replace(/\.pptx$/i, '');
  clean = clean.trim();
  if (!clean) clean = 'presentation';
  return `${clean}.pdf`;
}

/**
 * Exports presentation to PDF format and triggers browser download
 */
export async function exportToPdfFile(
  presentation: Presentation,
  options: ExportOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const paginated = autoPaginatePresentation(presentation);
    const doc = buildPdfPresentation(paginated, options);
    const rawName = options.fileName || paginated.title || 'presentation';
    const cleanName = formatPdfFileName(rawName);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const rawBlob = doc.output('blob');
      const pdfBlob =
        rawBlob.type === 'application/pdf'
          ? rawBlob
          : new Blob([rawBlob], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    }

    return { success: true, fileName: cleanName };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Code2PPT PDF export failed:', err);
    return {
      success: false,
      fileName: 'presentation.pdf',
      error: errorMessage || 'Failed to export PDF file',
    };
  }
}
