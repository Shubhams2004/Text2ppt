import { jsPDF } from 'jspdf';
import { Presentation, Slide, SlideElement } from '../models/presentation';
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
    doc.setFillColor(theme.bgHex.startsWith('#') ? theme.bgHex : `#${theme.bgHex}`);
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

  // 4. Standard body content
  const nonImageElements = slideData.elements.filter((el) => el.type !== 'image');
  if (!layout.body.isEmpty && nonImageElements.length > 0) {
    renderPdfContentFlow(
      doc,
      nonImageElements,
      layout.body.bounds,
      layout.body.typography,
      theme
    );
  }
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
    const cleanName = `${sanitizeFileName(rawName)}.pdf`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      doc.save(cleanName);
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
