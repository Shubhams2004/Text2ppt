import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  isLargeText,
  parseColorToRgb,
  validateSlideContrast,
  validateSlideOverlap,
  validateSlideImages,
  validatePresentationQuality,
} from './qualityValidators';
import { Presentation, Slide, SlideElement, ShapeElement, ImageElement } from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { buildPptxPresentation } from '../renderer/pptxRenderer';

describe('Level 2 Phase 1: Presentation Quality Validators', () => {
  // ==========================================================================
  // 1. WCAG Relative Luminance & Contrast Ratio Calculations
  // ==========================================================================
  describe('WCAG Luminance & Contrast Ratio', () => {
    it('calculates expected luminance values for pure white, pure black, and mid tones', () => {
      const whiteLum = calculateRelativeLuminance('#FFFFFF');
      const blackLum = calculateRelativeLuminance('#000000');

      assert.ok(whiteLum !== null);
      assert.ok(blackLum !== null);
      assert.equal(Math.round(whiteLum * 100) / 100, 1);
      assert.equal(blackLum, 0);

      // Mid slate color
      const midLum = calculateRelativeLuminance('#64748B');
      assert.ok(midLum !== null);
      assert.ok(midLum > 0 && midLum < 1);
    });

    it('correctly calculates contrast ratios for extreme and standard color pairs', () => {
      // Pure black on pure white is 21:1
      const blackOnWhite = calculateContrastRatio('#000000', '#FFFFFF');
      assert.equal(blackOnWhite, 21);

      // Pure white on pure white is 1:1
      const whiteOnWhite = calculateContrastRatio('#FFFFFF', '#FFFFFF');
      assert.equal(whiteOnWhite, 1);

      // Pure black on pure black is 1:1
      const blackOnBlack = calculateContrastRatio('#000000', '#000000');
      assert.equal(blackOnBlack, 1);

      // Typical dark body text on white (#334155 on #FFFFFF) > 9:1
      const slateOnWhite = calculateContrastRatio('#334155', '#FFFFFF');
      assert.ok(slateOnWhite !== null);
      assert.ok(slateOnWhite > 7);

      // Light slate text (#94A3B8 on #FFFFFF) is ~2.4:1 (fails normal and large text)
      const lightSlateOnWhite = calculateContrastRatio('#94A3B8', '#FFFFFF');
      assert.ok(lightSlateOnWhite !== null);
      assert.ok(lightSlateOnWhite < 3.0);
    });

    it('parses various CSS color formats: 3-digit hex, 6-digit hex, rgb(), and named colors', () => {
      const hex3 = parseColorToRgb('#fff');
      assert.deepEqual(hex3, { r: 255, g: 255, b: 255 });

      const hex6 = parseColorToRgb('#0f172a');
      assert.deepEqual(hex6, { r: 15, g: 23, b: 42 });

      const rgb = parseColorToRgb('rgb(79, 70, 229)');
      assert.deepEqual(rgb, { r: 79, g: 70, b: 229 });

      const named = parseColorToRgb('white');
      assert.deepEqual(named, { r: 255, g: 255, b: 255 });

      const invalid = parseColorToRgb('invalid-not-a-color');
      assert.equal(invalid, null);
    });

    it('correctly classifies large text boundaries according to WCAG specifications', () => {
      // Normal text (< 18pt and not bold)
      assert.equal(isLargeText(16, false, 'text'), false);
      assert.equal(isLargeText(14, false, 'bullet'), false);

      // Large text >= 18pt
      assert.equal(isLargeText(18, false, 'text'), true);
      assert.equal(isLargeText(24, false, 'text'), true);

      // Large text >= 14pt with bold
      assert.equal(isLargeText(14, true, 'text'), true);
      assert.equal(isLargeText(16, true, 'text'), true);

      // Slide title is always classified as large text
      assert.equal(isLargeText(undefined, false, 'title'), true);
    });
  });

  // ==========================================================================
  // 2. Slide Contrast Validation
  // ==========================================================================
  describe('Slide Contrast Validation', () => {
    it('flags light text on a light background with LOW_CONTRAST warning', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Contrast Test',
        line: 1,
        elements: [
          {
            id: 'txt-1',
            type: 'text',
            content: 'Very low contrast muted caption',
            color: '#E2E8F0', // light grey on white
            fontSize: 14,
            bold: false,
            line: 5,
          },
        ],
      };

      const issues = validateSlideContrast(slide, THEMES.modern, 0);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].code, 'LOW_CONTRAST');
      assert.equal(issues[0].severity, 'warning');
      assert.equal(issues[0].line, 5);
      assert.ok(issues[0].message.includes('Slide 1'));
      assert.ok(issues[0].message.includes('Very low contrast muted'));
    });

    it('passes high-contrast dark text on light background without warnings', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Valid Contrast Test',
        line: 1,
        elements: [
          {
            id: 'txt-1',
            type: 'text',
            content: 'High contrast readable body text',
            color: '#0F172A', // dark navy on white
            fontSize: 16,
            line: 5,
          },
        ],
      };

      const issues = validateSlideContrast(slide, THEMES.modern, 0);
      assert.equal(issues.length, 0);
    });

    it('accounts for dark slide background override when evaluating text contrast', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Dark Slide Test',
        background: '#0F172A', // Dark slide background
        line: 1,
        elements: [
          {
            id: 'txt-1',
            type: 'text',
            content: 'White text on dark slide background',
            color: '#FFFFFF',
            fontSize: 16,
            line: 5,
          },
          {
            id: 'txt-2',
            type: 'text',
            content: 'Dark text on dark slide background (low contrast)',
            color: '#1E293B',
            fontSize: 14,
            line: 7,
          },
        ],
      };

      const issues = validateSlideContrast(slide, THEMES.dark, 0);
      // txt-1 passes (white on dark), txt-2 fails (dark on dark)
      const lowContrastIssues = issues.filter((i) => i.code === 'LOW_CONTRAST');
      assert.equal(lowContrastIssues.length, 1);
      assert.equal(lowContrastIssues[0].line, 7);
    });

    it('accounts for background card shapes when checking text contrast', () => {
      // Shape card has dark fill, text inside has white color: should pass!
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Card Background Test',
        line: 1,
        elements: [
          {
            id: 'shape-card',
            type: 'shape',
            shapeType: 'round-rect',
            content: '',
            x: 1.0,
            y: 1.5,
            w: 4.0,
            h: 2.0,
            fillColor: '#1E293B', // dark card background
            line: 3,
          } as ShapeElement,
          {
            id: 'card-text',
            type: 'text',
            content: 'White callout text inside dark card',
            x: 1.2,
            y: 1.7,
            w: 3.6,
            h: 1.0,
            color: '#FFFFFF', // High contrast with card fill #1E293B
            fontSize: 15,
            line: 4,
          },
        ],
      };

      const issues = validateSlideContrast(slide, THEMES.modern, 0);
      // Should evaluate white text against #1E293B card fill and pass!
      assert.equal(issues.length, 0);
    });
  });

  // ==========================================================================
  // 3. Spatial Overlap Validation
  // ==========================================================================
  describe('Spatial Overlap Validation', () => {
    it('flags two explicitly positioned overlapping elements with SPATIAL_OVERLAP warning', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Overlap Test',
        line: 1,
        elements: [
          {
            id: 'block-1',
            type: 'text',
            content: 'First Block',
            x: 1.0,
            y: 1.0,
            w: 3.0,
            h: 2.0,
            line: 5,
          },
          {
            id: 'block-2',
            type: 'text',
            content: 'Second Colliding Block',
            x: 2.0,
            y: 1.5,
            w: 3.0,
            h: 2.0,
            line: 8,
          },
        ],
      };

      const issues = validateSlideOverlap(slide, 0);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].code, 'SPATIAL_OVERLAP');
      assert.equal(issues[0].severity, 'warning');
      assert.equal(issues[0].line, 8);
      assert.ok(issues[0].message.includes('Slide 1'));
      assert.ok(issues[0].message.includes('First Block'));
      assert.ok(issues[0].message.includes('Second Colliding Block'));
    });

    it('ignores negligible edge contact and zero-area boundary touching', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Edge Touch Test',
        line: 1,
        elements: [
          {
            id: 'left-col',
            type: 'text',
            content: 'Left Column',
            x: 1.0,
            y: 1.0,
            w: 2.5,
            h: 2.0,
            line: 4,
          },
          {
            id: 'right-col',
            type: 'text',
            content: 'Right Column touching edge at x=3.5',
            x: 3.5, // exact edge contact
            y: 1.0,
            w: 2.5,
            h: 2.0,
            line: 7,
          },
        ],
      };

      const issues = validateSlideOverlap(slide, 0);
      assert.equal(issues.length, 0);
    });

    it('does NOT flag intentional text inside a background shape card as accidental overlap', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Contained Card Test',
        line: 1,
        elements: [
          {
            id: 'card-bg',
            type: 'shape',
            shapeType: 'round-rect',
            content: '',
            x: 1.0,
            y: 1.5,
            w: 5.0,
            h: 3.0,
            fillColor: '#F8FAFC',
            line: 3,
          } as ShapeElement,
          {
            id: 'card-title',
            type: 'subtitle',
            content: 'Card Header',
            x: 1.3,
            y: 1.8,
            w: 4.4,
            h: 0.8,
            line: 5,
          },
          {
            id: 'card-desc',
            type: 'text',
            content: 'Detailed description inside the card container',
            x: 1.3,
            y: 2.6,
            w: 4.4,
            h: 1.2,
            line: 6,
          },
        ],
      };

      const issues = validateSlideOverlap(slide, 0);
      assert.equal(issues.length, 0);
    });

    it('elements on separate slides are never flagged for spatial overlap', () => {
      const pres: Presentation = {
        title: 'Multi-Slide Deck',
        theme: 'modern',
        slides: [
          {
            id: 's1',
            index: 0,
            title: 'Slide 1',
            line: 1,
            elements: [
              {
                id: 'el-1',
                type: 'text',
                content: 'Same Position Slide 1',
                x: 2.0,
                y: 2.0,
                w: 3.0,
                h: 1.5,
                line: 3,
              },
            ],
          },
          {
            id: 's2',
            index: 1,
            title: 'Slide 2',
            line: 5,
            elements: [
              {
                id: 'el-2',
                type: 'text',
                content: 'Same Position Slide 2',
                x: 2.0,
                y: 2.0,
                w: 3.0,
                h: 1.5,
                line: 7,
              },
            ],
          },
        ],
      };

      const issues = validatePresentationQuality(pres);
      const overlapIssues = issues.filter((i) => i.code === 'SPATIAL_OVERLAP');
      assert.equal(overlapIssues.length, 0);
    });
  });

  // ==========================================================================
  // 4. Broken Image Asset Validation
  // ==========================================================================
  describe('Broken Image Asset Validation', () => {
    it('passes valid base64 data URIs without warnings', () => {
      const validDataUri =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Valid Image',
        line: 1,
        elements: [
          {
            id: 'img-1',
            type: 'image',
            content: validDataUri,
            src: validDataUri,
            line: 4,
          } as ImageElement,
        ],
      };

      const issues = validateSlideImages(slide, 0);
      assert.equal(issues.length, 0);
    });

    it('flags empty image source with BROKEN_IMAGE warning', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Empty Image',
        line: 1,
        elements: [
          {
            id: 'img-1',
            type: 'image',
            content: '',
            src: '',
            line: 4,
          } as ImageElement,
        ],
      };

      const issues = validateSlideImages(slide, 0);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].code, 'BROKEN_IMAGE');
      assert.equal(issues[0].severity, 'warning');
      assert.equal(issues[0].line, 4);
    });

    it('flags malformed data URIs with missing separator or corrupted base64 characters', () => {
      // 1. Missing separator
      const missingSeparatorSlide: Slide = {
        id: 's1',
        index: 0,
        title: 'Corrupt 1',
        line: 1,
        elements: [
          {
            id: 'img-1',
            type: 'image',
            content: 'data:image/png;base64',
            src: 'data:image/png;base64',
            line: 3,
          } as ImageElement,
        ],
      };
      const issues1 = validateSlideImages(missingSeparatorSlide, 0);
      assert.equal(issues1.length, 1);
      assert.equal(issues1[0].code, 'BROKEN_IMAGE');

      // 2. Corrupted base64 payload
      const corruptPayloadSlide: Slide = {
        id: 's2',
        index: 0,
        title: 'Corrupt 2',
        line: 1,
        elements: [
          {
            id: 'img-2',
            type: 'image',
            content: 'data:image/png;base64,@@@invalid_base64!!!',
            src: 'data:image/png;base64,@@@invalid_base64!!!',
            line: 6,
          } as ImageElement,
        ],
      };
      const issues2 = validateSlideImages(corruptPayloadSlide, 0);
      assert.equal(issues2.length, 1);
      assert.equal(issues2[0].code, 'BROKEN_IMAGE');
      assert.equal(issues2[0].line, 6);
    });

    it('does NOT treat well-formed external image URLs as broken offline', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Unsplash Image',
        line: 1,
        elements: [
          {
            id: 'img-1',
            type: 'image',
            content: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
            src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800',
            line: 4,
          } as ImageElement,
        ],
      };

      const issues = validateSlideImages(slide, 0);
      // Valid HTTPS URLs must NOT be flagged as broken offline
      assert.equal(issues.length, 0);
    });

    it('flags unsupported file:// and ftp:// protocols', () => {
      const slide: Slide = {
        id: 'slide-1',
        index: 0,
        title: 'Local File Reference',
        line: 1,
        elements: [
          {
            id: 'img-1',
            type: 'image',
            content: 'file:///C:/Users/Pictures/photo.png',
            src: 'file:///C:/Users/Pictures/photo.png',
            line: 5,
          } as ImageElement,
        ],
      };

      const issues = validateSlideImages(slide, 0);
      assert.equal(issues.length, 1);
      assert.equal(issues[0].code, 'BROKEN_IMAGE');
      assert.ok(issues[0].message.includes('Unsupported image protocol'));
    });
  });

  // ==========================================================================
  // 5. Non-Blocking Validation & Regression Safety
  // ==========================================================================
  describe('Presentation Quality Integration & Non-Blocking Export', () => {
    it('reports all three quality warnings concurrently with stable identifiers', () => {
      const pres: Presentation = {
        title: 'Comprehensive Warnings Deck',
        theme: 'modern',
        slides: [
          {
            id: 's1',
            index: 0,
            title: 'Warnings Slide',
            line: 1,
            elements: [
              // 1. Low contrast
              {
                id: 'el-low-contrast',
                type: 'text',
                content: 'Muted unreadable text',
                color: '#E2E8F0',
                fontSize: 13,
                line: 3,
              },
              // 2. Spatial overlap pair
              {
                id: 'el-box-a',
                type: 'text',
                content: 'Box Alpha',
                x: 1.0,
                y: 2.0,
                w: 4.0,
                h: 1.5,
                line: 5,
              },
              {
                id: 'el-box-b',
                type: 'text',
                content: 'Box Beta Collision',
                x: 2.0,
                y: 2.5,
                w: 4.0,
                h: 1.5,
                line: 7,
              },
              // 3. Broken image
              {
                id: 'el-broken-img',
                type: 'image',
                content: 'data:image/png;base64,corrupt!!!',
                src: 'data:image/png;base64,corrupt!!!',
                line: 9,
              } as ImageElement,
            ],
          },
        ],
      };

      const issues = validatePresentationQuality(pres);
      assert.ok(issues.length >= 3);

      const codes = issues.map((i) => i.code);
      assert.ok(codes.includes('LOW_CONTRAST'));
      assert.ok(codes.includes('SPATIAL_OVERLAP'));
      assert.ok(codes.includes('BROKEN_IMAGE'));

      // All issues must be warnings, never errors
      assert.ok(issues.every((i) => i.severity === 'warning'));
    });

    it('preserves existing presentation output and export functionality when warnings exist', async () => {
      const presWithWarnings: Presentation = {
        title: 'Export With Warnings Deck',
        theme: 'ocean',
        slides: [
          {
            id: 's1',
            index: 0,
            title: 'Exportable Despite Warnings',
            line: 1,
            elements: [
              {
                id: 't1',
                type: 'text',
                content: 'Light text with warning',
                color: '#E0F2FE',
                fontSize: 14,
                line: 3,
              },
              {
                id: 't2',
                type: 'text',
                content: 'Overlapping content A',
                x: 1.0,
                y: 2.0,
                w: 4.0,
                h: 1.5,
                line: 5,
              },
              {
                id: 't3',
                type: 'text',
                content: 'Overlapping content B',
                x: 2.0,
                y: 2.2,
                w: 4.0,
                h: 1.5,
                line: 7,
              },
            ],
          },
        ],
      };

      // Quality validation generates warnings
      const warnings = validatePresentationQuality(presWithWarnings);
      assert.ok(warnings.length > 0);

      // PPTX generation must succeed without throwing or blocking
      const pptx = buildPptxPresentation(presWithWarnings);
      assert.ok(pptx !== null);
      const b64 = await pptx.write({ outputType: 'base64' });
      assert.ok(typeof b64 === 'string');
      assert.ok(b64.length > 5000);
    });
  });
});
