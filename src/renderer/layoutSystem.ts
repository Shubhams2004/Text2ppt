import { ImageElement, Slide, SlideElement, SlideLayout } from '../models/presentation';

/**
 * Slide geometry specifications (16:9 widescreen: 10 x 5.625 inches)
 */
export interface SlideGeometry {
  width: number;
  height: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  safeArea: ContentBox;
}

export interface ContentBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutTypography {
  fontSize: number;
  bulletFontSize: number;
  subtitleFontSize: number;
  paraSpaceAfter: number;
  bulletSpaceAfter: number;
  lineSpacingMultiple: number;
  densityLevel: 'sparse' | 'standard' | 'dense' | 'overflow-compact';
}

export interface ComputedTitleLayout {
  text: string;
  fontSize: number;
  bounds: ContentBox;
  isLongTitle: boolean;
  lineCount: number;
}

export interface ComputedElementLayout {
  element: SlideElement;
  index: number;
  bounds: ContentBox;
  estimatedLines: number;
  isBullet: boolean;
  fontSize: number;
  paraSpaceAfter: number;
  lineSpacingMultiple: number;
}

export interface ColumnLayout {
  bounds: ContentBox;
  elements: ComputedElementLayout[];
  typography: LayoutTypography;
  totalEstimatedHeight: number;
}

export interface ImageRegionLayout {
  bounds: ContentBox;
  fittedBounds?: ContentBox;
  label: string;
  image?: ImageElement;
  hasImage: boolean;
}

/**
 * Calculates contained aspect-ratio bounding box inside target bounds
 * preventing overflow and preserving natural proportions.
 */
export function calculateFittedImageBounds(
  targetBounds: ContentBox,
  imageWidth: number = 4,
  imageHeight: number = 3
): ContentBox {
  const targetAspect = targetBounds.w / targetBounds.h;
  const imageAspect = imageWidth / imageHeight;

  let fittedW = targetBounds.w;
  let fittedH = targetBounds.h;

  if (imageAspect > targetAspect) {
    fittedW = targetBounds.w;
    fittedH = targetBounds.w / imageAspect;
  } else {
    fittedH = targetBounds.h;
    fittedW = targetBounds.h * imageAspect;
  }

  const fittedX = targetBounds.x + (targetBounds.w - fittedW) / 2;
  const fittedY = targetBounds.y + (targetBounds.h - fittedH) / 2;

  return {
    x: Number(fittedX.toFixed(3)),
    y: Number(fittedY.toFixed(3)),
    w: Number(fittedW.toFixed(3)),
    h: Number(fittedH.toFixed(3)),
  };
}

export interface ComputedSlideLayout {
  slideId: string;
  slideIndex: number;
  layoutType: SlideLayout;
  isCoverSlide: boolean;
  geometry: SlideGeometry;
  header: {
    show: boolean;
    title: ComputedTitleLayout;
    accentBar: ContentBox;
    dividerY: number;
  };
  body: {
    bounds: ContentBox;
    typography: LayoutTypography;
    elements: ComputedElementLayout[];
    totalEstimatedHeight: number;
    availableHeight: number;
    isOverflowing: boolean;
    overflowRatio: number;
    isEmpty: boolean;
  };
  twoColumn?: {
    column1: ColumnLayout;
    column2: ColumnLayout;
  };
  imageRegion?: ImageRegionLayout;
  footer: {
    show: boolean;
    titleBox: ContentBox;
    pageBox: ContentBox;
  };
}

/**
 * Default 16:9 widescreen slide geometry (10 x 5.625 inches)
 */
export const DEFAULT_GEOMETRY: SlideGeometry = {
  width: 10.0,
  height: 5.625,
  margins: {
    top: 0.5,
    bottom: 0.5,
    left: 0.8,
    right: 0.8,
  },
  safeArea: {
    x: 0.8,
    y: 0.5,
    w: 8.4,
    h: 4.625,
  },
};

/**
 * Calculates adaptive title typography and bounding box based on title length
 */
export function computeTitleLayout(title: string): ComputedTitleLayout {
  const cleanTitle = title || 'Untitled Slide';
  const len = cleanTitle.length;

  if (len > 80) {
    // Very long title: wrap cleanly at 18pt font
    return {
      text: cleanTitle,
      fontSize: 18,
      bounds: {
        x: 1.05,
        y: 0.35,
        w: 8.15,
        h: 0.95,
      },
      isLongTitle: true,
      lineCount: 2,
    };
  }

  if (len > 45) {
    // Medium-long title: 20pt font
    return {
      text: cleanTitle,
      fontSize: 20,
      bounds: {
        x: 1.05,
        y: 0.4,
        w: 8.15,
        h: 0.85,
      },
      isLongTitle: true,
      lineCount: 2,
    };
  }

  // Standard short title: 24pt font
  return {
    text: cleanTitle,
    fontSize: 24,
    bounds: {
      x: 1.05,
      y: 0.45,
      w: 8.15,
      h: 0.75,
    },
    isLongTitle: false,
    lineCount: 1,
  };
}

/**
 * Computes characters per line based on font size and target width
 */
function getCharsPerLine(fontSize: number, widthInches: number = 8.4): number {
  const ratio = widthInches / 8.4;
  if (fontSize >= 18) return Math.floor(60 * ratio);
  if (fontSize >= 16) return Math.floor(72 * ratio);
  if (fontSize >= 14) return Math.floor(82 * ratio);
  if (fontSize >= 12) return Math.floor(96 * ratio);
  return Math.floor(108 * ratio);
}

/**
 * Computes baseline typography options by content density tier
 */
export function computeAdaptiveTypography(
  elementCount: number,
  totalCharacters: number,
  isHalfWidth: boolean = false
): LayoutTypography {
  const densityMultiplier = isHalfWidth ? 1.6 : 1.0;
  const effectiveChars = totalCharacters * densityMultiplier;

  // Density level 1: Sparse / Short content
  if (elementCount <= 2 && effectiveChars < 150) {
    return {
      fontSize: isHalfWidth ? 16 : 18,
      bulletFontSize: isHalfWidth ? 16 : 18,
      subtitleFontSize: 15,
      paraSpaceAfter: 16,
      bulletSpaceAfter: 12,
      lineSpacingMultiple: 1.25,
      densityLevel: 'sparse',
    };
  }

  // Density level 2: Standard presentation slide
  if (elementCount <= 5 && effectiveChars < 450) {
    return {
      fontSize: isHalfWidth ? 15 : 16,
      bulletFontSize: isHalfWidth ? 15 : 16,
      subtitleFontSize: 14,
      paraSpaceAfter: 12,
      bulletSpaceAfter: 8,
      lineSpacingMultiple: 1.2,
      densityLevel: 'standard',
    };
  }

  // Density level 3: Dense / Detailed slide
  if (elementCount <= 8 && effectiveChars < 850) {
    return {
      fontSize: 14,
      bulletFontSize: 14,
      subtitleFontSize: 12,
      paraSpaceAfter: 8,
      bulletSpaceAfter: 6,
      lineSpacingMultiple: 1.15,
      densityLevel: 'dense',
    };
  }

  // Density level 4: Very long text / High item count
  return {
    fontSize: 12,
    bulletFontSize: 12,
    subtitleFontSize: 11,
    paraSpaceAfter: 5,
    bulletSpaceAfter: 4,
    lineSpacingMultiple: 1.1,
    densityLevel: 'overflow-compact',
  };
}

/**
 * Estimates the vertical height required by an element at a given font size
 */
function estimateElementHeight(
  content: string,
  fontSize: number,
  paraSpaceAfterPt: number,
  widthInches: number = 8.4
): { heightInches: number; lineCount: number } {
  const charsPerLine = getCharsPerLine(fontSize, widthInches);
  const lineCount = Math.max(1, Math.ceil((content?.length || 0) / charsPerLine));
  const lineHeightInches = (fontSize * 1.25) / 72;
  const spacingInches = paraSpaceAfterPt / 72;
  const heightInches = lineCount * lineHeightInches + spacingInches;
  return { heightInches, lineCount };
}

/**
 * Helper to compute layout for a list of elements in a bounding box
 */
function layoutElementList(
  elements: SlideElement[],
  bounds: ContentBox,
  isHalfWidth: boolean = false
): {
  elements: ComputedElementLayout[];
  typography: LayoutTypography;
  totalEstimatedHeight: number;
} {
  const totalCharacters = elements.reduce((acc, el) => acc + (el.content?.length || 0), 0);
  let typography = computeAdaptiveTypography(elements.length, totalCharacters, isHalfWidth);

  const fontTiers: LayoutTypography[] = [
    typography,
    {
      fontSize: 14,
      bulletFontSize: 14,
      subtitleFontSize: 12,
      paraSpaceAfter: 8,
      bulletSpaceAfter: 6,
      lineSpacingMultiple: 1.15,
      densityLevel: 'dense',
    },
    {
      fontSize: 12,
      bulletFontSize: 12,
      subtitleFontSize: 11,
      paraSpaceAfter: 5,
      bulletSpaceAfter: 4,
      lineSpacingMultiple: 1.1,
      densityLevel: 'overflow-compact',
    },
    {
      fontSize: 11,
      bulletFontSize: 11,
      subtitleFontSize: 10,
      paraSpaceAfter: 4,
      bulletSpaceAfter: 3,
      lineSpacingMultiple: 1.05,
      densityLevel: 'overflow-compact',
    },
  ];

  let totalEstimatedHeight = 0;
  for (const tier of fontTiers) {
    let estimatedSum = 0;
    for (const el of elements) {
      const space = el.type === 'bullet' ? tier.bulletSpaceAfter : tier.paraSpaceAfter;
      const size = el.type === 'bullet' ? tier.bulletFontSize : tier.fontSize;
      const { heightInches } = estimateElementHeight(el.content, size, space, bounds.w);
      estimatedSum += heightInches;
    }

    if (estimatedSum <= bounds.h || tier === fontTiers[fontTiers.length - 1]) {
      typography = tier;
      totalEstimatedHeight = estimatedSum;
      break;
    }
  }

  const computedElements: ComputedElementLayout[] = [];
  let currentY = bounds.y;

  elements.forEach((el, index) => {
    const isBullet = el.type === 'bullet';
    const currentFontSize = isBullet ? typography.bulletFontSize : typography.fontSize;
    const currentSpace = isBullet ? typography.bulletSpaceAfter : typography.paraSpaceAfter;
    const { heightInches, lineCount } = estimateElementHeight(
      el.content,
      currentFontSize,
      currentSpace,
      bounds.w
    );

    const maxY = bounds.y + bounds.h;
    const clampedY = Math.min(currentY, maxY - 0.2);
    const clampedH = Math.min(heightInches, maxY - clampedY);

    computedElements.push({
      element: el,
      index,
      bounds: {
        x: bounds.x,
        y: clampedY,
        w: bounds.w,
        h: Math.max(0.2, clampedH),
      },
      estimatedLines: lineCount,
      isBullet,
      fontSize: currentFontSize,
      paraSpaceAfter: currentSpace,
      lineSpacingMultiple: typography.lineSpacingMultiple,
    });

    currentY += heightInches;
  });

  return { elements: computedElements, typography, totalEstimatedHeight };
}

/**
 * Computes a deterministic layout for an entire slide based on its layout property
 */
export function computeSlideLayout(
  slide: Slide,
  slideIndex: number = 0,
  totalSlides: number = 1,
  presentationTitle: string = 'Code2PPT'
): ComputedSlideLayout {
  const geometry = DEFAULT_GEOMETRY;
  const isFirstSlide = slideIndex === 0;

  const imageElements = slide.elements.filter((el): el is ImageElement => el.type === 'image');
  const nonImageElements = slide.elements.filter((el) => el.type !== 'image');
  const primaryImage = imageElements[0];

  // Resolve layout type: if explicitly provided, use it; otherwise default automatically
  let layoutType: SlideLayout = slide.layout || 'title-content';

  // Backward compatibility: If no layout is specified on first slide with intro text, use title/cover layout
  const isAutomaticCover =
    !slide.layout &&
    isFirstSlide &&
    slide.elements.length > 0 &&
    slide.elements.length <= 3 &&
    slide.elements.every((el) => el.type === 'text' || el.type === 'subtitle');

  if (isAutomaticCover) {
    layoutType = 'title';
  } else if (!slide.layout && primaryImage) {
    // If an image was placed on a slide without an explicit layout, choose text-image
    layoutType = 'text-image';
  }

  const isCoverSlide = layoutType === 'title';

  // 1. Title / Cover Slide Layout
  if (layoutType === 'title') {
    const isLong = slide.title.length > 50;
    const bodyBounds: ContentBox = {
      x: 0.8,
      y: isLong ? 3.6 : 3.3,
      w: 8.4,
      h: 1.7,
    };
    const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
      slide.elements,
      bodyBounds
    );

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'title',
      isCoverSlide: true,
      geometry,
      header: {
        show: false,
        title: {
          text: slide.title,
          fontSize: isLong ? 28 : 36,
          bounds: { x: 0.8, y: 1.8, w: 8.4, h: isLong ? 1.7 : 1.4 },
          isLongTitle: isLong,
          lineCount: isLong ? 2 : 1,
        },
        accentBar: { x: 0.8, y: 1.5, w: 1.5, h: 0.08 },
        dividerY: 0,
      },
      body: {
        bounds: bodyBounds,
        typography,
        elements: computedElements,
        totalEstimatedHeight,
        availableHeight: 1.7,
        isOverflowing: false,
        overflowRatio: 1.0,
        isEmpty: slide.elements.length === 0,
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: 5.15, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: 5.15, w: 2.0, h: 0.35 },
      },
    };
  }

  // 2. Blank Slide Layout
  if (layoutType === 'blank') {
    const bodyBounds: ContentBox = {
      x: 0.8,
      y: 0.8,
      w: 8.4,
      h: 4.2,
    };
    const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
      slide.elements,
      bodyBounds
    );

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'blank',
      isCoverSlide: false,
      geometry,
      header: {
        show: false,
        title: {
          text: slide.title,
          fontSize: 24,
          bounds: { x: 0.8, y: 0.5, w: 8.4, h: 0.6 },
          isLongTitle: false,
          lineCount: 1,
        },
        accentBar: { x: 0, y: 0, w: 0, h: 0 },
        dividerY: 0,
      },
      body: {
        bounds: bodyBounds,
        typography,
        elements: computedElements,
        totalEstimatedHeight,
        availableHeight: 4.2,
        isOverflowing: totalEstimatedHeight > 4.2,
        overflowRatio: totalEstimatedHeight / 4.2,
        isEmpty: slide.elements.length === 0,
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: 5.15, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: 5.15, w: 2.0, h: 0.35 },
      },
    };
  }

  // Header geometry for standard layouts
  const titleLayout = computeTitleLayout(slide.title);
  const dividerY = titleLayout.isLongTitle ? 1.35 : 1.25;
  const contentStartY = titleLayout.isLongTitle ? 1.52 : 1.45;
  const footerStartY = 5.15;
  const availableContentHeight = Math.max(1.0, footerStartY - contentStartY - 0.1);

  // 3. Two-Column Layout
  if (layoutType === 'two-column') {
    const colWidth = 4.0;
    const colGap = 0.4;
    const col1Bounds: ContentBox = {
      x: 0.8,
      y: contentStartY,
      w: colWidth,
      h: availableContentHeight,
    };
    const col2Bounds: ContentBox = {
      x: 0.8 + colWidth + colGap,
      y: contentStartY,
      w: colWidth,
      h: availableContentHeight,
    };

    const half = Math.ceil(slide.elements.length / 2);
    const col1Elements = slide.elements.slice(0, half);
    const col2Elements = slide.elements.slice(half);

    const col1Result = layoutElementList(col1Elements, col1Bounds, true);
    const col2Result = layoutElementList(col2Elements, col2Bounds, true);

    const allComputed = [...col1Result.elements, ...col2Result.elements];
    const maxColHeight = Math.max(col1Result.totalEstimatedHeight, col2Result.totalEstimatedHeight);

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'two-column',
      isCoverSlide: false,
      geometry,
      header: {
        show: true,
        title: titleLayout,
        accentBar: { x: 0.8, y: 0.5, w: 0.12, h: titleLayout.isLongTitle ? 0.75 : 0.65 },
        dividerY,
      },
      body: {
        bounds: { x: 0.8, y: contentStartY, w: 8.4, h: availableContentHeight },
        typography: col1Result.typography,
        elements: allComputed,
        totalEstimatedHeight: maxColHeight,
        availableHeight: availableContentHeight,
        isOverflowing: maxColHeight > availableContentHeight,
        overflowRatio: maxColHeight / availableContentHeight,
        isEmpty: slide.elements.length === 0,
      },
      twoColumn: {
        column1: {
          bounds: col1Bounds,
          elements: col1Result.elements,
          typography: col1Result.typography,
          totalEstimatedHeight: col1Result.totalEstimatedHeight,
        },
        column2: {
          bounds: col2Bounds,
          elements: col2Result.elements,
          typography: col2Result.typography,
          totalEstimatedHeight: col2Result.totalEstimatedHeight,
        },
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: footerStartY, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: footerStartY, w: 2.0, h: 0.35 },
      },
    };
  }

  // 4. Text-Image Layout (Text on left, Image on right)
  if (layoutType === 'text-image') {
    const textBounds: ContentBox = {
      x: 0.8,
      y: contentStartY,
      w: 4.4,
      h: availableContentHeight,
    };
    const imageBounds: ContentBox = {
      x: 5.5,
      y: contentStartY,
      w: 3.7,
      h: availableContentHeight,
    };

    const fittedBounds = calculateFittedImageBounds(imageBounds);

    const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
      nonImageElements,
      textBounds,
      true
    );

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'text-image',
      isCoverSlide: false,
      geometry,
      header: {
        show: true,
        title: titleLayout,
        accentBar: { x: 0.8, y: 0.5, w: 0.12, h: titleLayout.isLongTitle ? 0.75 : 0.65 },
        dividerY,
      },
      body: {
        bounds: textBounds,
        typography,
        elements: computedElements,
        totalEstimatedHeight,
        availableHeight: availableContentHeight,
        isOverflowing: totalEstimatedHeight > availableContentHeight,
        overflowRatio: totalEstimatedHeight / availableContentHeight,
        isEmpty: nonImageElements.length === 0,
      },
      imageRegion: {
        bounds: imageBounds,
        fittedBounds,
        label: primaryImage ? 'Image' : 'Image Area',
        image: primaryImage,
        hasImage: Boolean(primaryImage),
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: footerStartY, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: footerStartY, w: 2.0, h: 0.35 },
      },
    };
  }

  // 5. Image-Text Layout (Image on left, Text on right)
  if (layoutType === 'image-text') {
    const imageBounds: ContentBox = {
      x: 0.8,
      y: contentStartY,
      w: 3.7,
      h: availableContentHeight,
    };
    const textBounds: ContentBox = {
      x: 4.8,
      y: contentStartY,
      w: 4.4,
      h: availableContentHeight,
    };

    const fittedBounds = calculateFittedImageBounds(imageBounds);

    const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
      nonImageElements,
      textBounds,
      true
    );

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'image-text',
      isCoverSlide: false,
      geometry,
      header: {
        show: true,
        title: titleLayout,
        accentBar: { x: 0.8, y: 0.5, w: 0.12, h: titleLayout.isLongTitle ? 0.75 : 0.65 },
        dividerY,
      },
      body: {
        bounds: textBounds,
        typography,
        elements: computedElements,
        totalEstimatedHeight,
        availableHeight: availableContentHeight,
        isOverflowing: totalEstimatedHeight > availableContentHeight,
        overflowRatio: totalEstimatedHeight / availableContentHeight,
        isEmpty: nonImageElements.length === 0,
      },
      imageRegion: {
        bounds: imageBounds,
        fittedBounds,
        label: primaryImage ? 'Image' : 'Image Area',
        image: primaryImage,
        hasImage: Boolean(primaryImage),
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: footerStartY, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: footerStartY, w: 2.0, h: 0.35 },
      },
    };
  }

  // 6. Full-Image Layout
  if (layoutType === 'full-image') {
    const imageBounds: ContentBox = {
      x: 0.8,
      y: 1.15,
      w: 8.4,
      h: 3.85,
    };

    const fittedBounds = calculateFittedImageBounds(imageBounds, 16, 9);

    const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
      nonImageElements,
      { x: 0.8, y: 4.3, w: 8.4, h: 0.7 }
    );

    return {
      slideId: slide.id,
      slideIndex,
      layoutType: 'full-image',
      isCoverSlide: false,
      geometry,
      header: {
        show: true,
        title: titleLayout,
        accentBar: { x: 0.8, y: 0.45, w: 0.12, h: 0.55 },
        dividerY: 1.05,
      },
      body: {
        bounds: { x: 0.8, y: 4.3, w: 8.4, h: 0.7 },
        typography,
        elements: computedElements,
        totalEstimatedHeight,
        availableHeight: 0.7,
        isOverflowing: false,
        overflowRatio: 1.0,
        isEmpty: nonImageElements.length === 0,
      },
      imageRegion: {
        bounds: imageBounds,
        fittedBounds,
        label: primaryImage ? 'Hero Image' : 'Full Image Area',
        image: primaryImage,
        hasImage: Boolean(primaryImage),
      },
      footer: {
        show: true,
        titleBox: { x: 0.8, y: footerStartY, w: 6.0, h: 0.35 },
        pageBox: { x: 7.2, y: footerStartY, w: 2.0, h: 0.35 },
      },
    };
  }

  // 7. Standard Title-Content Layout (Default)
  const contentBounds: ContentBox = {
    x: 0.8,
    y: contentStartY,
    w: 8.4,
    h: availableContentHeight,
  };
  const { elements: computedElements, typography, totalEstimatedHeight } = layoutElementList(
    nonImageElements,
    contentBounds
  );

  return {
    slideId: slide.id,
    slideIndex,
    layoutType: 'title-content',
    isCoverSlide: false,
    geometry,
    header: {
      show: true,
      title: titleLayout,
      accentBar: { x: 0.8, y: 0.5, w: 0.12, h: titleLayout.isLongTitle ? 0.75 : 0.65 },
      dividerY,
    },
    body: {
      bounds: contentBounds,
      typography,
      elements: computedElements,
      totalEstimatedHeight,
      availableHeight: availableContentHeight,
      isOverflowing: totalEstimatedHeight > availableContentHeight,
      overflowRatio: totalEstimatedHeight / availableContentHeight,
      isEmpty: slide.elements.length === 0,
    },
    footer: {
      show: true,
      titleBox: { x: 0.8, y: footerStartY, w: 6.0, h: 0.35 },
      pageBox: { x: 7.2, y: footerStartY, w: 2.0, h: 0.35 },
    },
  };
}

/**
 * Standard configuration object matching previous API for backward compatibility
 */
export const DEFAULT_LAYOUT_CONFIG = {
  dimensions: { width: 10.0, height: 5.625 },
  margins: { top: 0.5, bottom: 0.5, left: 0.8, right: 0.8 },
  titleBox: { x: 1.05, y: 0.45, w: 8.15, h: 0.75 },
  accentBarBox: { x: 0.8, y: 0.5, w: 0.12, h: 0.65 },
  dividerLine: { x: 0.8, y: 1.25, w: 8.4 },
  contentBox: { x: 0.8, y: 1.45, w: 8.4, h: 3.55 },
  footerBox: {
    titleBox: { x: 0.8, y: 5.15, w: 6.0, h: 0.35 },
    pageBox: { x: 7.2, y: 5.15, w: 2.0, h: 0.35 },
  },
  titleSlide: {
    accentBox: { x: 0.8, y: 1.5, w: 1.5, h: 0.08 },
    titleBox: { x: 0.8, y: 1.8, w: 8.4, h: 1.4 },
    contentBox: { x: 0.8, y: 3.3, w: 8.4, h: 1.7 },
  },
};
