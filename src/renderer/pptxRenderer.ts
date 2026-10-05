import pptxgen from 'pptxgenjs';
import { Presentation, Slide } from '../models/presentation';
import { getTheme, THEMES } from '../themes/presentationThemes';
import {
  computeSlideLayout,
  ComputedSlideLayout,
  DEFAULT_LAYOUT_CONFIG,
} from './layoutSystem';
import { renderSlideElement } from './elementRenderers';

export interface ExportOptions {
  fileName?: string;
  includeSlideNumbers?: boolean;
}

/**
 * Sanitizes file names for cross-platform file systems
 */
export function sanitizeFileName(name: string): string {
  const sanitized = name.trim().replace(/[/\\?%*:|"<>]/g, '_');
  return sanitized.length > 0 ? sanitized : 'presentation';
}

/**
 * Renders a typed presentation model into a PptxGenJS presentation instance
 * using the layout engine for deterministic positioning, typography, and layout geometry.
 */
export function buildPptxPresentation(
  presentation: Presentation,
  options: ExportOptions = {}
): pptxgen {
  const pres = new pptxgen();
  const theme = THEMES[presentation.theme] || getTheme(presentation.theme);

  // Configure 16:9 widescreen presentation layout (10 x 5.625 inches)
  pres.layout = 'LAYOUT_16x9';
  pres.title = presentation.title || 'Code2PPT Presentation';
  pres.author = 'Code2PPT';
  pres.company = 'Code2PPT';
  pres.subject = presentation.title;

  const totalSlides = presentation.slides.length;

  presentation.slides.forEach((slideData: Slide, index: number) => {
    const slide = pres.addSlide();

    // Slide background
    slide.background = { color: theme.bgHex };

    // Compute deterministic layout for this slide
    const layout = computeSlideLayout(
      slideData,
      index,
      totalSlides,
      presentation.title
    );

    if (layout.layoutType === 'title') {
      // Cover Slide Layout
      renderCoverSlide(pres, slide, slideData, theme, layout);
    } else {
      // Standard Slide Layout with layout-specific rendering
      renderSlideWithLayout(pres, slide, slideData, theme, layout);
    }

    // Slide footer (preserves presentation title & slide numbering)
    if (options.includeSlideNumbers !== false && layout.footer.show) {
      renderFooter(slide, presentation.title, index + 1, totalSlides, layout);
    }
  });

  return pres;
}

/**
 * Renders the Cover / Title Slide
 */
function renderCoverSlide(
  pres: pptxgen,
  slide: pptxgen.Slide,
  slideData: Slide,
  theme: ReturnType<typeof getTheme>,
  layout: ComputedSlideLayout
) {
  const isLong = slideData.title.length > 50;

  // Accent decorative bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0.8,
    y: 1.5,
    w: 1.5,
    h: 0.08,
    fill: { color: theme.accentHex },
    line: { color: theme.accentHex, width: 0 },
  });

  // Slide Title (editable PowerPoint text)
  slide.addText(slideData.title, {
    x: 0.8,
    y: 1.8,
    w: 8.4,
    h: isLong ? 1.8 : 1.4,
    fontSize: isLong ? 28 : 36,
    bold: true,
    color: theme.titleHex,
    fontFace: 'Arial',
    valign: 'top',
    breakLine: true,
  });

  // Subtitle / Intro text elements (editable PowerPoint text)
  if (slideData.elements.length > 0) {
    const textBlocks: pptxgen.TextProps[] = slideData.elements.map((el) => ({
      text: el.content,
      options: {
        fontSize: el.type === 'subtitle' ? 16 : 18,
        color: el.type === 'subtitle' ? theme.accentHex : theme.bodyHex,
        bold: el.type === 'subtitle',
        fontFace: 'Arial',
        breakLine: true,
        paraSpaceAfter: 12,
      },
    }));

    slide.addText(textBlocks, {
      x: 0.8,
      y: isLong ? 3.7 : 3.3,
      w: 8.4,
      h: 1.6,
      valign: 'top',
    });
  }
}

/**
 * Renders a Slide according to its computed layout structure:
 * title-content, two-column, text-image, image-text, full-image, or blank
 */
function renderSlideWithLayout(
  pres: pptxgen,
  slide: pptxgen.Slide,
  slideData: Slide,
  theme: ReturnType<typeof getTheme>,
  layout: ComputedSlideLayout
) {
  const { header } = layout;

  // 1. Header (accent bar, title, divider) for layouts that show headers
  if (header.show) {
    // Accent indicator bar
    slide.addShape(pres.ShapeType.rect, {
      x: header.accentBar.x,
      y: header.accentBar.y,
      w: header.accentBar.w,
      h: header.accentBar.h,
      fill: { color: theme.accentHex },
      line: { color: theme.accentHex, width: 0 },
    });

    // Slide Title (editable PowerPoint text)
    slide.addText(header.title.text, {
      x: header.title.bounds.x,
      y: header.title.bounds.y,
      w: header.title.bounds.w,
      h: header.title.bounds.h,
      fontSize: header.title.fontSize,
      bold: true,
      color: theme.titleHex,
      fontFace: 'Arial',
      valign: 'middle',
    });

    // Subtle horizontal divider line
    if (header.dividerY > 0) {
      slide.addShape(pres.ShapeType.line, {
        x: 0.8,
        y: header.dividerY,
        w: 8.4,
        h: 0,
        line: { color: theme.border.replace('#', ''), width: 1 },
      });
    }
  }

  // 2. Render Image Region if layout includes one
  if (layout.imageRegion) {
    renderImageRegion(pres, slide, layout.imageRegion, theme);
  }

  // 3. Render Two-Column content if two-column layout
  if (layout.layoutType === 'two-column' && layout.twoColumn) {
    const { column1, column2 } = layout.twoColumn;

    if (column1.elements.length > 0) {
      const col1Props: pptxgen.TextProps[] = column1.elements.map((item) =>
        renderSlideElement(item.element, {
          typography: column1.typography,
          theme,
          contentBox: column1.bounds,
        })
      );
      slide.addText(col1Props, {
        x: column1.bounds.x,
        y: column1.bounds.y,
        w: column1.bounds.w,
        h: column1.bounds.h,
        valign: 'top',
      });
    }

    if (column2.elements.length > 0) {
      const col2Props: pptxgen.TextProps[] = column2.elements.map((item) =>
        renderSlideElement(item.element, {
          typography: column2.typography,
          theme,
          contentBox: column2.bounds,
        })
      );
      slide.addText(col2Props, {
        x: column2.bounds.x,
        y: column2.bounds.y,
        w: column2.bounds.w,
        h: column2.bounds.h,
        valign: 'top',
      });
    }
    return;
  }

  // 4. Default / Standard body content (filter out image elements from text flow)
  const nonImageElements = slideData.elements.filter((el) => el.type !== 'image');
  if (!layout.body.isEmpty && nonImageElements.length > 0) {
    const context = {
      typography: layout.body.typography,
      theme,
      contentBox: layout.body.bounds,
    };

    const textPropsArray: pptxgen.TextProps[] = nonImageElements.map((element) =>
      renderSlideElement(element, context)
    );

    slide.addText(textPropsArray, {
      x: layout.body.bounds.x,
      y: layout.body.bounds.y,
      w: layout.body.bounds.w,
      h: layout.body.bounds.h,
      valign: 'top',
    });
  }
}

/**
 * Renders an image element or placeholder frame into the slide
 */
function renderImageRegion(
  pres: pptxgen,
  slide: pptxgen.Slide,
  imageRegion: NonNullable<ComputedSlideLayout['imageRegion']>,
  theme: ReturnType<typeof getTheme>
) {
  const { bounds, fittedBounds, image, hasImage, label } = imageRegion;
  const drawBounds = fittedBounds || bounds;

  if (hasImage && image && image.src) {
    try {
      const src = image.src;
      const isDataUri = src.startsWith('data:image/');

      if (isDataUri) {
        slide.addImage({
          data: src,
          x: drawBounds.x,
          y: drawBounds.y,
          w: drawBounds.w,
          h: drawBounds.h,
        });
      } else {
        slide.addImage({
          path: src,
          x: drawBounds.x,
          y: drawBounds.y,
          w: drawBounds.w,
          h: drawBounds.h,
        });
      }
      return;
    } catch (err) {
      console.warn('Could not add image directly to PPTX, using fallback placeholder:', err);
    }
  }

  // Fallback or explicit placeholder when no image is provided or if loading failed
  renderImagePlaceholder(
    pres,
    slide,
    bounds,
    hasImage && image ? `Image: ${image.src}` : label,
    theme
  );
}

/**
 * Renders an image placeholder frame for image-related layouts
 */
function renderImagePlaceholder(
  pres: pptxgen,
  slide: pptxgen.Slide,
  bounds: { x: number; y: number; w: number; h: number },
  label: string,
  theme: ReturnType<typeof getTheme>
) {
  // Placeholder box frame
  slide.addShape(pres.ShapeType.roundRect, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    fill: { color: theme.isDark ? '1E293B' : 'F8FAFC' },
    line: { color: theme.border.replace('#', ''), width: 1.5, dashType: 'dash' },
    rectRadius: 0.08,
  });

  // Placeholder label text
  slide.addText(label || 'Image Placeholder', {
    x: bounds.x,
    y: bounds.y + bounds.h / 2 - 0.25,
    w: bounds.w,
    h: 0.5,
    fontSize: 13,
    color: '94A3B8',
    fontFace: 'Arial',
    align: 'center',
    valign: 'middle',
  });
}

/**
 * Renders slide footer with document title and slide numbering
 */
function renderFooter(
  slide: pptxgen.Slide,
  presentationTitle: string,
  slideNumber: number,
  totalSlides: number,
  layout: ComputedSlideLayout
) {
  const { footer } = layout;

  // Left: Presentation title
  slide.addText(presentationTitle || 'Code2PPT', {
    x: footer.titleBox.x,
    y: footer.titleBox.y,
    w: footer.titleBox.w,
    h: footer.titleBox.h,
    fontSize: 10,
    color: '94A3B8',
    fontFace: 'Arial',
    valign: 'bottom',
    align: 'left',
  });

  // Right: Slide number
  slide.addText(`Slide ${slideNumber} of ${totalSlides}`, {
    x: footer.pageBox.x,
    y: footer.pageBox.y,
    w: footer.pageBox.w,
    h: footer.pageBox.h,
    fontSize: 10,
    color: '94A3B8',
    fontFace: 'Arial',
    valign: 'bottom',
    align: 'right',
  });
}

/**
 * Exports presentation to PPTX and initiates browser download
 */
export async function exportToPptxFile(
  presentation: Presentation,
  options: ExportOptions = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const pres = buildPptxPresentation(presentation, options);
    const rawName = options.fileName || presentation.title || 'presentation';
    const cleanName = `${sanitizeFileName(rawName)}.pptx`;

    // In browser environments, writeFile initiates the native download
    await pres.writeFile({ fileName: cleanName });

    return { success: true, fileName: cleanName };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Code2PPT export failed:', err);
    return {
      success: false,
      fileName: 'presentation.pptx',
      error: errorMessage || 'Failed to export PPTX file',
    };
  }
}
