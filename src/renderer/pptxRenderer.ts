import pptxgen from 'pptxgenjs';
import JSZip from 'jszip';
import {
  ChartElement,
  ImageElement,
  Presentation,
  ShapeElement,
  Slide,
  SlideTransition,
  TableElement,
} from '../models/presentation';
import { getTheme, THEMES } from '../themes/presentationThemes';
import {
  autoPaginatePresentation,
  computeSlideLayout,
  ComputedSlideLayout,
  DEFAULT_LAYOUT_CONFIG,
} from './layoutSystem';
import { renderSlideElement } from './elementRenderers';

export interface ExportOptions {
  fileName?: string;
  includeSlideNumbers?: boolean;
}

export const PPTX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

/**
 * Sanitizes file names for cross-platform file systems
 */
export function sanitizeFileName(name: string): string {
  const sanitized = name.trim().replace(/[/\\?%*:|"<>]/g, '_');
  return sanitized.length > 0 ? sanitized : 'presentation';
}

/**
 * Normalizes a presentation file name to always end in a single .pptx extension,
 * stripping any unintended .zip, .pptx.zip, or repeated extensions.
 */
export function formatPptxFileName(name: string): string {
  let clean = sanitizeFileName(name);
  clean = clean.replace(/\.pptx\.zip$/i, '');
  clean = clean.replace(/\.zip$/i, '');
  clean = clean.replace(/(\.pptx)+$/i, '');
  clean = clean.trim();
  if (!clean) clean = 'presentation';
  return `${clean}.pptx`;
}

/**
 * Generates OpenXML transition element for PowerPoint PPTX based on transition settings
 */
export function buildTransitionXml(transition?: SlideTransition): string {
  if (!transition || transition.style === 'none') {
    return '';
  }

  const speedAttr = transition.speed ? ` spd="${transition.speed}"` : '';
  const dir = transition.direction;

  let effectXml = '';
  switch (transition.style) {
    case 'fade':
      effectXml = '<p:fade/>';
      break;

    case 'push': {
      const pDir =
        dir === 'right' || dir === 'r'
          ? 'r'
          : dir === 'up' || dir === 'u'
          ? 'u'
          : dir === 'down' || dir === 'd'
          ? 'd'
          : 'l';
      effectXml = `<p:push dir="${pDir}"/>`;
      break;
    }

    case 'wipe': {
      const pDir =
        dir === 'left' || dir === 'l'
          ? 'l'
          : dir === 'up' || dir === 'u'
          ? 'u'
          : dir === 'down' || dir === 'd'
          ? 'd'
          : 'r';
      effectXml = `<p:wipe dir="${pDir}"/>`;
      break;
    }

    case 'split': {
      const orient = dir === 'vert' || dir === 'vertical' ? 'vert' : 'horz';
      const splitDir = dir === 'in' ? 'in' : 'out';
      effectXml = `<p:split orient="${orient}" dir="${splitDir}"/>`;
      break;
    }

    case 'cut':
      effectXml = '<p:cut/>';
      break;

    case 'zoom': {
      const zDir = dir === 'out' ? 'out' : 'in';
      effectXml = `<p:zoom dir="${zDir}"/>`;
      break;
    }

    case 'dissolve':
      effectXml = '<p:dissolve/>';
      break;

    case 'blinds': {
      const orient = dir === 'vert' || dir === 'vertical' ? 'vert' : 'horz';
      effectXml = `<p:blinds orient="${orient}"/>`;
      break;
    }

    case 'checker': {
      const cDir = dir === 'vert' || dir === 'vertical' ? 'vert' : 'horz';
      effectXml = `<p:checker dir="${cDir}"/>`;
      break;
    }

    case 'circle':
      effectXml = '<p:circle/>';
      break;

    case 'diamond':
      effectXml = '<p:diamond/>';
      break;

    case 'comb': {
      const orient = dir === 'vert' || dir === 'vertical' ? 'vert' : 'horz';
      effectXml = `<p:comb orient="${orient}"/>`;
      break;
    }

    case 'cover': {
      const pDir =
        dir === 'right' || dir === 'r'
          ? 'r'
          : dir === 'up' || dir === 'u'
          ? 'u'
          : dir === 'down' || dir === 'd'
          ? 'd'
          : 'l';
      effectXml = `<p:cover dir="${pDir}"/>`;
      break;
    }

    case 'pull': {
      const pDir =
        dir === 'right' || dir === 'r'
          ? 'r'
          : dir === 'up' || dir === 'u'
          ? 'u'
          : dir === 'down' || dir === 'd'
          ? 'd'
          : 'l';
      effectXml = `<p:pull dir="${pDir}"/>`;
      break;
    }

    case 'wheel':
      effectXml = '<p:wheel spokes="4"/>';
      break;

    case 'newsflash':
      effectXml = '<p:newsflash/>';
      break;

    default:
      effectXml = '<p:fade/>';
      break;
  }

  return `<p:transition${speedAttr} advClick="1">${effectXml}</p:transition>`;
}

/**
 * Injects OpenXML transition XML into slide XML adhering to OpenXML schema order
 */
export function injectTransitionIntoSlideXml(
  slideXml: string,
  transitionXml: string
): string {
  if (!transitionXml) return slideXml;
  if (slideXml.includes('<p:transition')) {
    return slideXml.replace(/<p:transition[\s\S]*?<\/p:transition>/, transitionXml);
  }
  if (slideXml.includes('<p:timing>')) {
    return slideXml.replace('<p:timing>', `${transitionXml}<p:timing>`);
  }
  return slideXml.replace('</p:sld>', `${transitionXml}</p:sld>`);
}

/**
 * Applies slide transitions to all slides within the PPTX JSZip bundle
 */
export async function applyTransitionsToPptxZip(
  zip: JSZip,
  presentation: Presentation
): Promise<JSZip> {
  const slides = presentation.slides;
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const transition = slide.transition || presentation.transition;
    if (transition && transition.style !== 'none') {
      const slidePath = `ppt/slides/slide${i + 1}.xml`;
      const file = zip.file(slidePath);
      if (file) {
        const xml = await file.async('string');
        const transitionXml = buildTransitionXml(transition);
        const updatedXml = injectTransitionIntoSlideXml(xml, transitionXml);
        zip.file(slidePath, updatedXml);
      }
    }
  }
  return zip;
}

/**
 * Renders a typed presentation model into a PptxGenJS presentation instance
 * using the layout engine for deterministic positioning, typography, and layout geometry.
 */
export function buildPptxPresentation(
  presentation: Presentation,
  options: ExportOptions = {}
): pptxgen {
  // Auto-paginate presentation so overflowing slides are automatically assigned to next slides
  // without text compression or deletion
  const paginated = autoPaginatePresentation(presentation);
  const pres = new pptxgen();
  const theme = THEMES[paginated.theme] || getTheme(paginated.theme);

  // Configure 16:9 widescreen presentation layout (10 x 5.625 inches)
  pres.layout = 'LAYOUT_16x9';
  pres.title = paginated.title || 'Code2PPT Presentation';
  pres.author = 'Code2PPT';
  pres.company = 'Code2PPT';
  pres.subject = paginated.title;

  const totalSlides = paginated.slides.length;

  paginated.slides.forEach((slideData: Slide, index: number) => {
    const slide = pres.addSlide();

    // Slide background
    slide.background = { color: theme.bgHex };

    // Compute deterministic layout for this slide
    const layout = computeSlideLayout(
      slideData,
      index,
      totalSlides,
      paginated.title
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
      renderFooter(slide, paginated.title, index + 1, totalSlides, layout);
    }
  });

  // Augment pres.exportPresentation to seamlessly inject transitions into PPTX OpenXML slides
  const origExport = (pres as any).exportPresentation?.bind(pres);
  if (origExport) {
    (pres as any).exportPresentation = async function (props: any) {
      const isNode =
        typeof process !== 'undefined' &&
        !!process.versions?.node &&
        process.release?.name === 'node';
      const reqOutputType = props?.outputType;
      const intermediateType = isNode ? 'nodebuffer' : 'arraybuffer';

      const rawData = await origExport({
        ...props,
        outputType: intermediateType,
      });

      const hasAnyTransition =
        (paginated.transition && paginated.transition.style !== 'none') ||
        paginated.slides.some(
          (s) => s.transition && s.transition.style !== 'none'
        );

      if (!hasAnyTransition) {
        if (!reqOutputType || reqOutputType === intermediateType) {
          return rawData;
        }
        if (reqOutputType === 'blob') {
          return new Blob([rawData], { type: PPTX_MIME_TYPE });
        }
        const zip = await JSZip.loadAsync(rawData);
        return await zip.generateAsync({
          type: reqOutputType,
          mimeType: PPTX_MIME_TYPE,
          compression: props?.compression ? 'DEFLATE' : 'STORE',
        });
      }

      const zip = await JSZip.loadAsync(rawData);
      await applyTransitionsToPptxZip(zip, paginated);

      if (reqOutputType === 'blob') {
        const buf = await zip.generateAsync({
          type: 'arraybuffer',
          compression: props?.compression ? 'DEFLATE' : 'STORE',
        });
        return new Blob([buf], { type: PPTX_MIME_TYPE });
      }

      return await zip.generateAsync({
        type: reqOutputType || (isNode ? 'nodebuffer' : 'blob'),
        mimeType: PPTX_MIME_TYPE,
        compression: props?.compression ? 'DEFLATE' : 'STORE',
      });
    };
  }

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

  // Speaker notes
  if (slideData.notes) {
    slide.addNotes(slideData.notes);
  }

  // Custom slide background
  if (slideData.background) {
    if (slideData.background.startsWith('#')) {
      slide.background = { fill: slideData.background.replace('#', '') };
    } else if (slideData.background.startsWith('http') || slideData.background.startsWith('data:image/')) {
      slide.background = { path: slideData.background };
    }
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

  // 4. Default / Standard body text content
  const textElements = slideData.elements.filter(
    (el) => el.type !== 'image' && el.type !== 'shape' && el.type !== 'table' && el.type !== 'chart'
  );

  const explicitTextElements = textElements.filter(
    (el) => el.x !== undefined && el.y !== undefined
  );
  const flowTextElements = textElements.filter(
    (el) => el.x === undefined || el.y === undefined
  );

  if (!layout.body.isEmpty && flowTextElements.length > 0) {
    const context = {
      typography: layout.body.typography,
      theme,
      contentBox: layout.body.bounds,
    };

    const textPropsArray: pptxgen.TextProps[] = flowTextElements.map((element) =>
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

  // Render explicitly positioned text elements directly
  explicitTextElements.forEach((el) => {
    const x = el.x!;
    const y = el.y!;
    const w = el.w ?? 4.0;
    const h = el.h ?? 1.0;
    const color = el.color ? el.color.replace('#', '') : theme.bodyHex;
    const fontFace = el.fontFamily || 'Arial';
    const fontSize = el.fontSize || layout.body.typography.fontSize;
    const bold = el.bold !== undefined ? el.bold : el.type === 'subtitle';
    const italic = el.italic !== undefined ? el.italic : el.type === 'quote';
    const underline = el.underline ? { style: 'sng' as const } : undefined;
    const align = (el.align || 'left') as 'left' | 'center' | 'right' | 'justify';

    slide.addText(el.content, {
      x,
      y,
      w,
      h,
      rotate: el.rotation,
      fontFace,
      fontSize,
      bold,
      italic,
      underline,
      color,
      align,
      lineSpacingMultiple: el.lineSpacing || 1.15,
      bullet: el.type === 'bullet',
      hyperlink: el.link ? { url: el.link } : undefined,
      valign: 'top',
    });
  });

  // Render explicitly positioned image elements
  const explicitImageElements = slideData.elements.filter(
    (el): el is ImageElement => el.type === 'image' && el.x !== undefined && el.y !== undefined
  );
  explicitImageElements.forEach((img) => {
    try {
      const src = img.src || img.url || img.content;
      if (!src) return;
      const isDataUri = src.startsWith('data:image/');
      const x = img.x!;
      const y = img.y!;
      const w = img.w ?? 4.0;
      const h = img.h ?? 3.0;

      if (isDataUri) {
        slide.addImage({ data: src, x, y, w, h, rotate: img.rotation });
      } else {
        slide.addImage({ path: src, x, y, w, h, rotate: img.rotation });
      }
    } catch (err) {
      console.warn('Could not add explicit image to PPTX:', err);
    }
  });

  // 5. Render Native PowerPoint Shapes
  const shapeElements = slideData.elements.filter((el): el is ShapeElement => el.type === 'shape');
  shapeElements.forEach((shapeEl, idx) => {
    const defaultBounds = {
      x: layout.body.bounds.x + idx * 1.5,
      y: layout.body.bounds.y + (textElements.length > 0 ? 2.0 : 0.2),
      w: 2.2,
      h: 1.4,
    };
    renderShapeElement(pres, slide, shapeEl, theme, defaultBounds);
  });

  // 6. Render Native PowerPoint Tables
  const tableElements = slideData.elements.filter((el): el is TableElement => el.type === 'table');
  tableElements.forEach((tableEl) => {
    const defaultBounds = {
      x: layout.body.bounds.x,
      y: layout.body.bounds.y + (textElements.length > 0 ? 1.6 : 0.1),
      w: layout.body.bounds.w,
      h: Math.min(3.6, layout.body.bounds.h),
    };
    renderTableElement(pres, slide, tableEl, theme, defaultBounds);
  });

  // 7. Render Native PowerPoint Charts
  const chartElements = slideData.elements.filter((el): el is ChartElement => el.type === 'chart');
  chartElements.forEach((chartEl) => {
    const defaultBounds = {
      x: layout.body.bounds.x,
      y: layout.body.bounds.y + (textElements.length > 0 ? 1.6 : 0.1),
      w: Math.min(6.5, layout.body.bounds.w),
      h: Math.min(3.4, layout.body.bounds.h),
    };
    renderChartElement(pres, slide, chartEl, theme, defaultBounds);
  });
}

function renderShapeElement(
  pres: pptxgen,
  slide: pptxgen.Slide,
  element: ShapeElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? fallbackBounds.w;
  const h = element.h ?? fallbackBounds.h;

  let shapeType = pres.ShapeType.rect;
  switch (element.shapeType) {
    case 'round-rect':
      shapeType = pres.ShapeType.roundRect;
      break;
    case 'circle':
    case 'ellipse':
      shapeType = pres.ShapeType.ellipse;
      break;
    case 'line':
      shapeType = pres.ShapeType.line;
      break;
    case 'arrow':
      shapeType = pres.ShapeType.rightArrow;
      break;
    case 'triangle':
      shapeType = pres.ShapeType.triangle;
      break;
    case 'star':
      shapeType = pres.ShapeType.star5;
      break;
    default:
      shapeType = pres.ShapeType.rect;
      break;
  }

  const fillHex =
    element.fillHex ||
    (element.fillColor ? element.fillColor.replace('#', '') : theme.accentHex);
  const strokeHex =
    element.strokeHex ||
    (element.strokeColor ? element.strokeColor.replace('#', '') : theme.border.replace('#', ''));
  const strokeWidth = element.strokeWidth !== undefined ? element.strokeWidth : 1;

  const transparency =
    element.opacity !== undefined
      ? Math.round((1 - Math.max(0, Math.min(1, element.opacity))) * 100)
      : undefined;

  slide.addShape(shapeType, {
    x,
    y,
    w,
    h,
    rotate: element.rotation,
    fill: { color: fillHex, transparency },
    line: { color: strokeHex, width: strokeWidth },
    hyperlink: element.link ? { url: element.link } : undefined,
  });
}

function renderTableElement(
  pres: pptxgen,
  slide: pptxgen.Slide,
  element: TableElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? Math.min(8.4, fallbackBounds.w);
  const h = element.h ?? Math.min(3.5, fallbackBounds.h);

  const headerRow = element.headers.map((hText) => ({
    text: hText,
    options: {
      fill: { color: theme.accentHex },
      color: 'FFFFFF',
      bold: true,
      align: 'center' as const,
      fontSize: 12,
    },
  }));

  const dataRows = (element.rows || []).map((row) =>
    row.map((cellText) => ({
      text: cellText,
      options: {
        color: theme.bodyHex,
        align: 'left' as const,
        fontSize: 11,
      },
    }))
  );

  const tableData = [headerRow, ...dataRows];
  const colCount = Math.max(1, element.headers.length);
  const colWidth = w / colCount;

  slide.addTable(tableData, {
    x,
    y,
    w,
    h,
    colW: Array(colCount).fill(colWidth),
    border: { pt: 1, color: theme.border.replace('#', '') },
    fill: { color: theme.cardBg.replace('#', '') },
  });
}

function renderChartElement(
  pres: pptxgen,
  slide: pptxgen.Slide,
  element: ChartElement,
  theme: ReturnType<typeof getTheme>,
  fallbackBounds: { x: number; y: number; w: number; h: number }
) {
  const x = element.x ?? fallbackBounds.x;
  const y = element.y ?? fallbackBounds.y;
  const w = element.w ?? Math.min(6.5, fallbackBounds.w);
  const h = element.h ?? Math.min(3.5, fallbackBounds.h);

  let pptxChartType = pres.ChartType.bar;
  switch (element.chartType) {
    case 'pie':
      pptxChartType = pres.ChartType.pie;
      break;
    case 'doughnut':
      pptxChartType = pres.ChartType.doughnut;
      break;
    case 'line':
      pptxChartType = pres.ChartType.line;
      break;
    case 'area':
      pptxChartType = pres.ChartType.area;
      break;
    case 'column':
    case 'bar':
    default:
      pptxChartType = pres.ChartType.bar;
      break;
  }

  const labels = element.data.map((d) => d.label);
  const values = element.data.map((d) => d.value);

  const chartData = [
    {
      name: element.title || 'Data',
      labels,
      values,
    },
  ];

  slide.addChart(pptxChartType, chartData, {
    x,
    y,
    w,
    h,
    showTitle: !!element.title,
    title: element.title,
    showLegend: true,
    legendPos: 'b',
    chartColors: [theme.accentHex, theme.titleHex, '10B981', 'F59E0B', '6366F1', 'EC4899'],
  });
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
    const paginated = autoPaginatePresentation(presentation);
    const pres = buildPptxPresentation(paginated, options);
    const rawName = options.fileName || paginated.title || 'presentation';
    const cleanName = formatPptxFileName(rawName);

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // In browser / iframe environment:
      // Produce an ArrayBuffer and construct a Blob with strict PowerPoint OOXML MIME type.
      // This guarantees browser download handlers never append .zip to the .pptx filename.
      const arrayBuffer = (await pres.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: PPTX_MIME_TYPE });
      const blobUrl = window.URL.createObjectURL(blob);
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
    } else {
      // In Node.js environment
      await pres.writeFile({ fileName: cleanName });
    }

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

/**
 * Bundles multiple presentations into a single .zip archive containing individual .pptx files.
 * The archive is strictly named with .zip and each presentation inside is a valid .pptx file.
 */
export async function exportBatchToZipFile(
  items: { presentation: Presentation }[],
  options: { zipFileName?: string } = {}
): Promise<{ success: boolean; fileName: string; error?: string }> {
  try {
    const rawZipName = options.zipFileName || 'presentations_bundle';
    let cleanZipName = sanitizeFileName(rawZipName)
      .replace(/\.pptx\.zip$/i, '')
      .replace(/\.zip$/i, '')
      .trim();
    if (!cleanZipName) cleanZipName = 'presentations_bundle';
    cleanZipName = `${cleanZipName}.zip`;

    const zip = new JSZip();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.presentation || item.presentation.slides.length === 0) continue;
      const pres = buildPptxPresentation(item.presentation);
      const fileName = formatPptxFileName(
        item.presentation.title || `presentation_${i + 1}`
      );
      const isNode =
        typeof process !== 'undefined' &&
        !!process.versions?.node &&
        process.release?.name === 'node';
      const outputType = isNode ? 'nodebuffer' : 'arraybuffer';
      const fileData = await pres.write({ outputType });
      zip.file(fileName, fileData);
    }

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/zip',
        compression: 'DEFLATE',
      });
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = cleanZipName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) {
          a.parentNode.removeChild(a);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } else {
      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      const { promises: fs } = await import('node:fs');
      await fs.writeFile(cleanZipName, buffer);
    }

    return { success: true, fileName: cleanZipName };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      fileName: 'presentations_bundle.zip',
      error: errorMessage || 'Failed to export batch zip archive',
    };
  }
}
