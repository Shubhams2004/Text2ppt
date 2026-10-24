/**
 * Code2PPT Studio - Presentation Quality Validators (Level 2 Phase 1)
 *
 * Implements client-side presentation quality validation:
 * 1. WCAG 2.1 Color Contrast Ratio checks (4.5:1 for normal text, 3:1 for large text).
 * 2. Spatial Overlap checks (detecting colliding bounding boxes, ignoring edge touch
 *    and intentional text-on-shape/card containment).
 * 3. Broken Image Asset checks (malformed data URIs, empty sources, invalid protocols,
 *    without network requests or blocking offline URLs).
 */

import {
  Presentation,
  Slide,
  SlideElement,
  ShapeElement,
  ImageElement,
  ValidationIssue,
  ThemeColors,
} from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { computeSlideLayout, DEFAULT_GEOMETRY } from '../renderer/layoutSystem';

// ============================================================================
// 1. WCAG 2.1 Color Luminance & Contrast Ratio Calculations
// ============================================================================

export interface RGB {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
}

/**
 * Standard CSS color names lookup for common fallback colors
 */
const NAMED_COLORS: Record<string, RGB> = {
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  lightgray: { r: 211, g: 211, b: 211 },
  darkgray: { r: 169, g: 169, b: 169 },
  slate: { r: 100, g: 116, b: 139 },
};

/**
 * Parses hex (#fff, #ffffff, #ffffffff, ffffff), rgb(r, g, b), or rgba(r, g, b, a) strings into RGB.
 * Returns null if the color cannot be reliably determined.
 */
export function parseColorToRgb(colorStr?: string): RGB | null {
  if (!colorStr) return null;
  const clean = colorStr.trim().toLowerCase();

  if (clean === 'transparent') return null;
  if (NAMED_COLORS[clean]) return NAMED_COLORS[clean];

  // Hex format: with or without leading hash
  const hexMatch = clean.match(/^#?([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const raw = hexMatch[1];
    if (raw.length === 3) {
      return {
        r: parseInt(raw[0] + raw[0], 16),
        g: parseInt(raw[1] + raw[1], 16),
        b: parseInt(raw[2] + raw[2], 16),
      };
    }
    if (raw.length === 6 || raw.length === 8) {
      return {
        r: parseInt(raw.substring(0, 2), 16),
        g: parseInt(raw.substring(2, 4), 16),
        b: parseInt(raw.substring(4, 6), 16),
      };
    }
  }

  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgbMatch = clean.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return {
      r: Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))),
      g: Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))),
      b: Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))),
    };
  }

  return null;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where each channel is linearised:
 *   c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
 */
export function calculateRelativeLuminance(color: RGB | string): number | null {
  const rgb = typeof color === 'string' ? parseColorToRgb(color) : color;
  if (!rgb) return null;

  const linearize = (channel255: number): number => {
    const s = channel255 / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const r = linearize(rgb.r);
  const g = linearize(rgb.g);
  const b = linearize(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors:
 * (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter luminance.
 * Returns null if either color cannot be determined reliably.
 */
export function calculateContrastRatio(
  colorA: string | RGB,
  colorB: string | RGB
): number | null {
  const lumA = calculateRelativeLuminance(colorA);
  const lumB = calculateRelativeLuminance(colorB);

  if (lumA === null || lumB === null) return null;

  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Determines whether text qualifies as WCAG "large text":
 * - Font size >= 18 pt (or 24 px)
 * - Font size >= 14 pt (or 18.66 px) and bold
 */
export function isLargeText(
  fontSizePt: number | undefined,
  isBold: boolean = false,
  elementType?: string
): boolean {
  if (elementType === 'title') return true;
  const size = fontSizePt ?? (elementType === 'subtitle' ? 16 : 14);
  if (size >= 18) return true;
  if (size >= 14 && isBold) return true;
  return false;
}

// ============================================================================
// 2. Element Geometry & Spatial Overlap Calculations
// ============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Resolves deterministic bounding box in inches for any element on a 10 x 5.625 inch slide.
 */
export function resolveElementBounds(
  element: SlideElement,
  slide: Slide,
  index: number
): BoundingBox {
  // If explicitly positioned, use exact geometry
  if (element.x !== undefined && element.y !== undefined) {
    return {
      x: element.x,
      y: element.y,
      w: element.w !== undefined ? element.w : element.type === 'shape' ? 2.5 : element.type === 'image' ? 4.0 : 4.5,
      h: element.h !== undefined ? element.h : element.type === 'shape' ? 1.5 : element.type === 'image' ? 3.0 : 1.2,
    };
  }

  // Otherwise, use computed layout system geometry
  const computedLayout = computeSlideLayout(slide, slide.index || 0, 1, 'Presentation');
  const layoutEl = computedLayout.body.elements.find((e) => e.element.id === element.id);

  if (layoutEl) {
    return {
      x: Number(layoutEl.bounds.x.toFixed(2)),
      y: Number(layoutEl.bounds.y.toFixed(2)),
      w: Number(layoutEl.bounds.w.toFixed(2)),
      h: Number(Math.max(0.6, layoutEl.bounds.h).toFixed(2)),
    };
  }

  if (element.type === 'image') {
    const ib = computedLayout.imageRegion?.fittedBounds || computedLayout.imageRegion?.bounds;
    if (ib) {
      return {
        x: Number(ib.x.toFixed(2)),
        y: Number(ib.y.toFixed(2)),
        w: Number(ib.w.toFixed(2)),
        h: Number(ib.h.toFixed(2)),
      };
    }
    return { x: 5.2, y: 1.5, w: 4.0, h: 3.0 };
  }

  if (element.type === 'shape') {
    return {
      x: Number((computedLayout.body.bounds.x + (index % 3) * 2.8).toFixed(2)),
      y: Number((computedLayout.body.bounds.y + 1.2).toFixed(2)),
      w: 2.4,
      h: 1.5,
    };
  }

  if (element.type === 'table' || element.type === 'chart') {
    return {
      x: Number(computedLayout.body.bounds.x.toFixed(2)),
      y: Number((computedLayout.body.bounds.y + 1.0).toFixed(2)),
      w: Number(computedLayout.body.bounds.w.toFixed(2)),
      h: 2.8,
    };
  }

  return {
    x: Number(computedLayout.body.bounds.x.toFixed(2)),
    y: Number((computedLayout.body.bounds.y + index * 0.9).toFixed(2)),
    w: Number(computedLayout.body.bounds.w.toFixed(2)),
    h: 0.9,
  };
}

/**
 * Computes axis-aligned conservative bounding box for a potentially rotated element.
 */
export function getRotatedAABB(box: BoundingBox, rotationDeg: number = 0): BoundingBox {
  if (!rotationDeg || rotationDeg % 360 === 0) {
    return box;
  }

  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;

  const newW = box.w * cos + box.h * sin;
  const newH = box.w * sin + box.h * cos;

  return {
    x: Number((cx - newW / 2).toFixed(2)),
    y: Number((cy - newH / 2).toFixed(2)),
    w: Number(newW.toFixed(2)),
    h: Number(newH.toFixed(2)),
  };
}

/**
 * Checks whether an element is intentionally contained within a background card shape.
 */
export function isIntentionalCardContainment(
  shapeBox: BoundingBox,
  elementBox: BoundingBox
): boolean {
  // Check if element box is predominantly within the shape box
  const pad = 0.15; // tolerance in inches
  const isContained =
    elementBox.x >= shapeBox.x - pad &&
    elementBox.y >= shapeBox.y - pad &&
    elementBox.x + elementBox.w <= shapeBox.x + shapeBox.w + pad &&
    elementBox.y + elementBox.h <= shapeBox.y + shapeBox.h + pad;

  if (isContained) return true;

  // Check overlap area ratio relative to element's area
  const xOverlap = Math.max(
    0,
    Math.min(shapeBox.x + shapeBox.w, elementBox.x + elementBox.w) -
      Math.max(shapeBox.x, elementBox.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(shapeBox.y + shapeBox.h, elementBox.y + elementBox.h) -
      Math.max(shapeBox.y, elementBox.y)
  );
  const overlapArea = xOverlap * yOverlap;
  const elArea = elementBox.w * elementBox.h;

  if (elArea > 0 && overlapArea / elArea >= 0.7) {
    return true; // Over 70% contained within background card
  }

  return false;
}

// ============================================================================
// 3. Validation Logic per Slide
// ============================================================================

/**
 * Validates WCAG color contrast on a slide.
 */
export function validateSlideContrast(
  slide: Slide,
  theme: ThemeColors,
  slideIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slideBg = slide.background || theme.bgColor;

  // 1. Check slide title against slide background
  if (slide.title && slide.title.trim().length > 0) {
    const titleColor = theme.titleColor;
    const ratio = calculateContrastRatio(titleColor, slideBg);
    const threshold = 3.0; // Slide titles are large text >= 18pt

    if (ratio !== null && ratio < threshold) {
      issues.push({
        line: slide.line,
        code: 'LOW_CONTRAST',
        severity: 'warning',
        message: `Low contrast on Slide ${slideIndex + 1}: Slide title "${slide.title.slice(0, 30)}" has contrast ratio ${ratio.toFixed(2)}:1 against background, below WCAG recommendation (${threshold}:1).`,
        suggestion: `Adjust title color or slide background for clearer readability.`,
      });
    }
  }

  // 2. Check each text-bearing element
  slide.elements.forEach((el, elIdx) => {
    if (el.type !== 'text' && el.type !== 'bullet' && el.type !== 'subtitle' && el.type !== 'quote') {
      return;
    }

    if (!el.content || el.content.trim().length === 0) return;

    // Determine effective text color
    const textColor =
      el.color ||
      (el.type === 'subtitle' ? theme.accentColor : theme.bodyColor);

    // Determine effective background color:
    // Check if element is positioned over an earlier shape acting as a card
    const elBox = resolveElementBounds(el, slide, elIdx);
    let effectiveBg = slideBg;

    for (let i = 0; i < elIdx; i++) {
      const prevEl = slide.elements[i];
      if (prevEl.type === 'shape') {
        const shape = prevEl as ShapeElement;
        const shapeFill = shape.fillColor || (shape.fillHex ? `#${shape.fillHex}` : undefined);
        if (shapeFill) {
          const shapeBox = resolveElementBounds(shape, slide, i);
          if (isIntentionalCardContainment(shapeBox, elBox)) {
            effectiveBg = shapeFill;
            break;
          }
        }
      }
    }

    const ratio = calculateContrastRatio(textColor, effectiveBg);
    if (ratio === null) return; // Cannot be determined reliably, do not guess

    const isLarge = isLargeText(el.fontSize, el.bold || el.type === 'subtitle', el.type);
    const threshold = isLarge ? 3.0 : 4.5;

    if (ratio < threshold) {
      const preview = el.content.length > 28 ? el.content.substring(0, 28) + '...' : el.content;
      issues.push({
        line: el.line || slide.line,
        code: 'LOW_CONTRAST',
        severity: 'warning',
        message: `Low contrast on Slide ${slideIndex + 1}: Text "${preview}" has contrast ratio ${ratio.toFixed(2)}:1 with background, below WCAG ${isLarge ? 'large-text' : 'normal-text'} recommendation (${threshold}:1).`,
        suggestion: `Increase contrast by adjusting text color to a darker shade or background to a lighter shade.`,
      });
    }
  });

  return issues;
}

/**
 * Validates spatial overlaps between elements on a slide.
 */
export function validateSlideOverlap(
  slide: Slide,
  slideIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const elements = slide.elements;
  const count = elements.length;

  if (count < 2) return issues;

  // Resolve geometries for all elements
  const boxes = elements.map((el, i) => resolveElementBounds(el, slide, i));
  const rotatedBoxes = elements.map((el, i) => getRotatedAABB(boxes[i], el.rotation));

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const elA = elements[i];
      const elB = elements[j];

      // If both elements are non-explicit flow text elements, layoutSystem flows them sequentially
      const aIsExplicit = elA.x !== undefined && elA.y !== undefined;
      const bIsExplicit = elB.x !== undefined && elB.y !== undefined;
      const isBothFlowText =
        !aIsExplicit &&
        !bIsExplicit &&
        (elA.type === 'text' || elA.type === 'bullet' || elA.type === 'subtitle') &&
        (elB.type === 'text' || elB.type === 'bullet' || elB.type === 'subtitle');

      if (isBothFlowText) {
        continue;
      }

      // Check intentional containment: if element A is a shape rendered before element B,
      // and element B is placed inside element A (like a card or callout), skip warning
      if (elA.type === 'shape' && isIntentionalCardContainment(boxes[i], boxes[j])) {
        continue;
      }
      if (elB.type === 'shape' && isIntentionalCardContainment(boxes[j], boxes[i])) {
        continue;
      }

      const boxA = rotatedBoxes[i];
      const boxB = rotatedBoxes[j];

      const xOverlap = Math.max(0, Math.min(boxA.x + boxA.w, boxB.x + boxB.w) - Math.max(boxA.x, boxB.x));
      const yOverlap = Math.max(0, Math.min(boxA.y + boxA.h, boxB.y + boxB.h) - Math.max(boxA.y, boxB.y));
      const overlapArea = xOverlap * yOverlap;

      // Avoid warnings for zero-area intersections and negligible edge contact
      if (xOverlap < 0.05 || yOverlap < 0.05 || overlapArea < 0.02) {
        continue;
      }

      // If either object has non-orthogonal rotation, require conservative overlap margin
      const hasArbitraryRotation =
        (elA.rotation !== undefined && elA.rotation % 90 !== 0) ||
        (elB.rotation !== undefined && elB.rotation % 90 !== 0);

      if (hasArbitraryRotation && overlapArea < 0.08) {
        // Conservative handling: do not flag small boundary corner touch
        continue;
      }

      const labelA = elA.content?.trim()
        ? `"${elA.content.length > 32 ? elA.content.slice(0, 32) + '...' : elA.content}"`
        : `${elA.type} element`;
      const labelB = elB.content?.trim()
        ? `"${elB.content.length > 32 ? elB.content.slice(0, 32) + '...' : elB.content}"`
        : `${elB.type} element`;

      issues.push({
        line: elB.line || elA.line || slide.line,
        code: 'SPATIAL_OVERLAP',
        severity: 'warning',
        message: `Spatial overlap on Slide ${slideIndex + 1}: ${labelA} overlaps with ${labelB} (${overlapArea.toFixed(2)} sq in intersection).`,
        suggestion: `Reposition or resize one of the elements to prevent overlapping content.`,
      });
    }
  }

  return issues;
}

/**
 * Validates image elements on a slide.
 */
export function validateSlideImages(
  slide: Slide,
  slideIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  slide.elements.forEach((el) => {
    if (el.type !== 'image') return;
    const img = el as ImageElement;
    const src = img.src || (img as any).url || img.content;

    // 1. Missing or empty source
    if (!src || src.trim().length === 0) {
      issues.push({
        line: el.line || slide.line,
        code: 'BROKEN_IMAGE',
        severity: 'warning',
        message: `Empty image source on Slide ${slideIndex + 1}.`,
        suggestion: `Provide an image data URI or URL.`,
      });
      return;
    }

    const trimmed = src.trim();

    // 2. Data URI validation
    if (trimmed.startsWith('data:')) {
      if (!trimmed.startsWith('data:image/')) {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Malformed data URI on Slide ${slideIndex + 1}: expected an image MIME type (e.g. data:image/png).`,
          suggestion: `Ensure data URI begins with data:image/png, data:image/jpeg, or data:image/webp.`,
        });
        return;
      }

      const commaIdx = trimmed.indexOf(',');
      if (commaIdx === -1) {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Malformed image data URI on Slide ${slideIndex + 1}: missing base64 separator.`,
          suggestion: `Ensure the data URI includes ';base64,' before image payload.`,
        });
        return;
      }

      const header = trimmed.substring(0, commaIdx);
      const payload = trimmed.substring(commaIdx + 1).trim();

      if (!header.includes(';base64')) {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Malformed image data URI on Slide ${slideIndex + 1}: expected base64 encoding.`,
          suggestion: `Ensure data URI specifies ';base64,' encoding.`,
        });
        return;
      }

      if (payload.length === 0) {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Malformed image data URI on Slide ${slideIndex + 1}: empty payload.`,
          suggestion: `Provide valid base64 image data.`,
        });
        return;
      }

      // Check base64 character validity and length
      const validBase64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
      if (!validBase64Regex.test(payload) || payload.length % 4 === 1) {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Malformed image data URI on Slide ${slideIndex + 1}: invalid base64 encoding characters or padding.`,
          suggestion: `Check the base64 string for corrupted or invalid characters.`,
        });
        return;
      }

      return;
    }

    // 3. Unsupported protocols
    if (trimmed.startsWith('file://') || trimmed.startsWith('ftp://')) {
      issues.push({
        line: el.line || slide.line,
        code: 'BROKEN_IMAGE',
        severity: 'warning',
        message: `Unsupported image protocol on Slide ${slideIndex + 1}: "${trimmed}". Local file references cannot be loaded in browser.`,
        suggestion: `Use HTTPS URLs or upload image directly as base64 data URI.`,
      });
      return;
    }

    // 4. External URL validation (without network requests)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (!parsed.hostname || parsed.hostname.length === 0) {
          issues.push({
            line: el.line || slide.line,
            code: 'BROKEN_IMAGE',
            severity: 'warning',
            message: `Invalid image URL on Slide ${slideIndex + 1}: missing valid host.`,
            suggestion: `Provide a valid HTTP or HTTPS image URL.`,
          });
        }
      } catch {
        issues.push({
          line: el.line || slide.line,
          code: 'BROKEN_IMAGE',
          severity: 'warning',
          message: `Invalid image URL syntax on Slide ${slideIndex + 1}: "${trimmed}".`,
          suggestion: `Check image URL formatting.`,
        });
      }
      return;
    }

    // 5. Check for invalid non-image local paths or extensions
    const invalidExtensions = ['.exe', '.dll', '.sh', '.bat', '.txt', '.pdf', '.docx', '.zip'];
    const lowerTrimmed = trimmed.toLowerCase();
    if (invalidExtensions.some((ext) => lowerTrimmed.endsWith(ext))) {
      issues.push({
        line: el.line || slide.line,
        code: 'BROKEN_IMAGE',
        severity: 'warning',
        message: `Non-image file reference on Slide ${slideIndex + 1}: "${trimmed}".`,
        suggestion: `Use standard image formats (.png, .jpg, .webp, .svg).`,
      });
    }
  });

  return issues;
}

/**
 * Validates all presentation quality checks across all slides.
 * Returns non-blocking ValidationIssue array with severity 'warning'.
 */
export function validatePresentationQuality(
  presentation: Presentation,
  theme?: ThemeColors
): ValidationIssue[] {
  const resolvedTheme = theme || THEMES[presentation.theme] || THEMES.modern;
  const allIssues: ValidationIssue[] = [];

  presentation.slides.forEach((slide, idx) => {
    // 1. WCAG Contrast
    const contrastIssues = validateSlideContrast(slide, resolvedTheme, idx);
    allIssues.push(...contrastIssues);

    // 2. Spatial Overlap
    const overlapIssues = validateSlideOverlap(slide, idx);
    allIssues.push(...overlapIssues);

    // 3. Broken Image Assets
    const imageIssues = validateSlideImages(slide, idx);
    allIssues.push(...imageIssues);
  });

  return allIssues;
}
