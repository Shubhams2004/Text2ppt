import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Presentation, Slide } from '../models/presentation';
import { buildPptxPresentation, exportToPptxFile } from './pptxRenderer';
import {
  autoPaginateSlide,
  autoPaginatePresentation,
  calculateFittedImageBounds,
  computeAdaptiveTypography,
  computeSlideLayout,
  computeTitleLayout,
  DEFAULT_GEOMETRY,
  DEFAULT_LAYOUT_CONFIG,
} from './layoutSystem';

describe('Code2PPT Layout Engine & PPTX Renderer Tests', () => {
  // 1. Short title
  it('correctly formats and positions a short title', () => {
    const titleLayout = computeTitleLayout('Applications');
    assert.equal(titleLayout.fontSize, 24, 'Short title should use 24pt');
    assert.equal(titleLayout.isLongTitle, false);
    assert.equal(titleLayout.lineCount, 1);
    assert.equal(titleLayout.bounds.x, 1.05);
    assert.equal(titleLayout.bounds.w, 8.15);
  });

  // 2. Long title
  it('adapts typography and bounding box for a long title to prevent collision', () => {
    const longTitle =
      'Comprehensive Overview of Artificial Intelligence Applications in Next-Generation Hospital Management Systems';
    const titleLayout = computeTitleLayout(longTitle);
    assert.ok(titleLayout.fontSize <= 20, 'Long title should scale down to 20pt or 18pt');
    assert.equal(titleLayout.isLongTitle, true);
    assert.ok(titleLayout.bounds.h >= 0.85, 'Long title should have taller height allocation');

    // Verify slide layout shifts divider and content start Y down
    const slide: Slide = {
      id: 'slide-1',
      index: 1,
      title: longTitle,
      layout: 'title-content',
      line: 1,
      elements: [{ id: 'el-1', type: 'text', content: 'Intro paragraph', line: 2 }],
    };
    const layout = computeSlideLayout(slide);
    assert.ok(layout.header.dividerY > 1.25, 'Divider should shift down for long title');
    assert.ok(layout.body.bounds.y > 1.45, 'Content should start lower to avoid overlapping long title');
  });

  // 3. Multiple text blocks
  it('renders multiple text blocks with automatic sequential spacing', async () => {
    const presentation: Presentation = {
      title: 'Multi-Text Presentation',
      theme: 'modern',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'System Architecture',
          line: 1,
          elements: [
            {
              id: 'el-1',
              type: 'text',
              content: 'Primary service coordinates distributed compute nodes.',
              line: 2,
            },
            {
              id: 'el-2',
              type: 'text',
              content: 'Secondary workers process message queues asynchronously.',
              line: 3,
            },
            {
              id: 'el-3',
              type: 'text',
              content: 'Storage cache persists hot queries for sub-second retrieval.',
              line: 4,
            },
          ],
        },
      ],
    };

    const layout = computeSlideLayout(presentation.slides[0]);
    assert.equal(layout.body.elements.length, 3);
    assert.ok(layout.body.elements[1].bounds.y > layout.body.elements[0].bounds.y, 'Elements must follow vertical flow');
    assert.ok(layout.body.elements[2].bounds.y > layout.body.elements[1].bounds.y, 'Elements must follow vertical flow');

    const pres = buildPptxPresentation(presentation);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 4. Multiple bullets
  it('renders multiple bullets with native bullet styling and calculated spacing', async () => {
    const presentation: Presentation = {
      title: 'Bullet Presentation',
      theme: 'ocean',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Key Clinical Capabilities',
          line: 1,
          elements: [
            { id: 'el-1', type: 'bullet', content: 'Medical diagnosis acceleration', line: 2 },
            { id: 'el-2', type: 'bullet', content: 'High-throughput drug discovery', line: 3 },
            { id: 'el-3', type: 'bullet', content: 'Continuous patient telemetry monitoring', line: 4 },
            { id: 'el-4', type: 'bullet', content: 'Automated electronic health record synthesis', line: 5 },
          ],
        },
      ],
    };

    const layout = computeSlideLayout(presentation.slides[0]);
    assert.equal(layout.body.elements.length, 4);
    assert.ok(layout.body.elements.every((el) => el.isBullet));

    const pres = buildPptxPresentation(presentation);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 5. Mixed text and bullets
  it('renders mixed text blocks and bullet lists seamlessly without collision', async () => {
    const presentation: Presentation = {
      title: 'AI in Healthcare',
      theme: 'emerald',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Benefits Overview',
          line: 1,
          elements: [
            {
              id: 'el-1',
              type: 'text',
              content: 'Modern clinical algorithms accelerate diagnostic throughput.',
              line: 2,
            },
            { id: 'el-2', type: 'bullet', content: 'Faster analysis across clinical imaging', line: 3 },
            { id: 'el-3', type: 'bullet', content: 'Reduced physician workload and fatigue', line: 4 },
            {
              id: 'el-4',
              type: 'text',
              content: 'Adoption rates have grown 40% year-over-year in participating hospitals.',
              line: 5,
            },
          ],
        },
      ],
    };

    const layout = computeSlideLayout(presentation.slides[0]);
    assert.equal(layout.body.elements.length, 4);
    assert.equal(layout.body.elements[0].isBullet, false);
    assert.equal(layout.body.elements[1].isBullet, true);
    assert.equal(layout.body.elements[2].isBullet, true);
    assert.equal(layout.body.elements[3].isBullet, false);

    const pres = buildPptxPresentation(presentation);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 6. Long content
  it('adapts typography for long content to preserve readability', async () => {
    const longText =
      'Artificial intelligence in modern medicine enables automated feature extraction from complex diagnostic modalities, including computerized tomography, magnetic resonance imaging, and whole-slide histopathology specimens. When deployed directly at the point of care on localized hospital hardware, these systems provide rapid decision support while fully respecting patient health information privacy and jurisdictional regulatory mandates.';

    const presentation: Presentation = {
      title: 'Long Content Slide',
      theme: 'modern',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Diagnostic Precision',
          line: 1,
          elements: [
            {
              id: 'el-1',
              type: 'text',
              content: longText,
              line: 2,
            },
          ],
        },
      ],
    };

    const layout = computeSlideLayout(presentation.slides[0]);
    assert.ok(layout.body.typography.fontSize <= 16, 'Font size should adapt for long paragraphs');
    assert.ok(layout.body.elements[0].estimatedLines >= 3, 'Estimated lines should reflect content length');

    const pres = buildPptxPresentation(presentation);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 7. Empty slide
  it('renders an empty slide gracefully without errors or crashes', async () => {
    const presentation: Presentation = {
      title: 'Deck with Empty Slide',
      theme: 'modern',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Blank Section Break',
          line: 1,
          elements: [], // 0 elements
        },
      ],
    };

    const layout = computeSlideLayout(presentation.slides[0]);
    assert.equal(layout.body.isEmpty, true);
    assert.equal(layout.body.elements.length, 0);

    const pres = buildPptxPresentation(presentation);
    assert.ok(pres, 'Should create presentation with empty slide');

    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 8. Content overflow detection and mitigation
  it('detects overflow when content exceeds available area and compacts bounds', () => {
    // Construct a dense slide with 12 paragraphs
    const overflowElements = Array.from({ length: 12 }, (_, i) => ({
      id: `el-${i + 1}`,
      type: 'bullet' as const,
      content: `Extensive enterprise requirement item ${i + 1} detailing complex infrastructural prerequisites and distributed deployment constraints.`,
      line: i + 2,
    }));

    const slide: Slide = {
      id: 'slide-overflow',
      index: 1,
      title: 'Dense Requirement Matrix',
      line: 1,
      elements: overflowElements,
    };

    const layout = computeSlideLayout(slide);
    // Overflow should be detected or font size stepped down to compact level
    assert.ok(
      layout.body.typography.fontSize <= 12,
      'Dense content should step down to 12pt or 11pt'
    );
    assert.ok(
      layout.body.isOverflowing || layout.body.typography.densityLevel === 'overflow-compact',
      'Should flag overflow or compact density'
    );

    // Verify all element bounds remain inside the slide height (5.625")
    for (const el of layout.body.elements) {
      assert.ok(el.bounds.y + el.bounds.h <= 5.5, 'Elements must never exceed bottom slide bounds');
      assert.ok(el.bounds.x >= 0.8, 'Elements must remain within left margin');
      assert.ok(el.bounds.x + el.bounds.w <= 10.0, 'Elements must remain within right margin');
    }
  });

  // 9. Multiple slides
  it('renders multiple slides with consistent header, footer and slide numbers', async () => {
    const presentation: Presentation = {
      title: 'Multi-Slide Deck',
      theme: 'modern',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          title: 'Executive Summary',
          line: 1,
          elements: [
            { id: 'el-1', type: 'text', content: 'Introductory statement for slide 1.', line: 2 },
          ],
        },
        {
          id: 'slide-2',
          index: 1,
          title: 'Key Metrics',
          line: 3,
          elements: [
            { id: 'el-2', type: 'bullet', content: 'Metric A: +120%', line: 4 },
            { id: 'el-3', type: 'bullet', content: 'Metric B: -45% cost', line: 5 },
          ],
        },
        {
          id: 'slide-3',
          index: 2,
          title: 'Next Steps',
          line: 6,
          elements: [
            { id: 'el-4', type: 'text', content: 'Deployment begins next quarter.', line: 7 },
          ],
        },
      ],
    };

    const pres = buildPptxPresentation(presentation, { includeSlideNumbers: true });
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 10000, 'Multiple slides should produce larger PPTX output');
  });

  // 10. Reusable slide geometry constants
  it('provides reusable standard 16:9 widescreen geometry and safe areas', () => {
    assert.equal(DEFAULT_GEOMETRY.width, 10.0, '16:9 width should be 10 inches');
    assert.equal(DEFAULT_GEOMETRY.height, 5.625, '16:9 height should be 5.625 inches');
    assert.equal(DEFAULT_GEOMETRY.margins.left, 0.8, 'Left margin should be 0.8 inches');
    assert.equal(DEFAULT_GEOMETRY.margins.right, 0.8, 'Right margin should be 0.8 inches');
    assert.equal(DEFAULT_GEOMETRY.safeArea.w, 8.4, 'Safe content width should be 8.4 inches');
  });

  // 11. Two-column layout geometry & element distribution
  it('calculates two-column layout geometry and splits elements across columns', async () => {
    const slide: Slide = {
      id: 'slide-col',
      index: 1,
      title: 'Comparison Matrix',
      layout: 'two-column',
      line: 1,
      elements: [
        { id: 'el-1', type: 'text', content: 'Traditional approach', line: 2 },
        { id: 'el-2', type: 'bullet', content: 'Manual transcription', line: 3 },
        { id: 'el-3', type: 'text', content: 'AI-powered approach', line: 4 },
        { id: 'el-4', type: 'bullet', content: 'Automated synthesis', line: 5 },
      ],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'two-column');
    assert.ok(layout.twoColumn, 'Should calculate twoColumn geometry');
    assert.equal(layout.twoColumn.column1.elements.length, 2);
    assert.equal(layout.twoColumn.column2.elements.length, 2);
    assert.equal(layout.twoColumn.column1.bounds.x, 0.8);
    assert.ok(layout.twoColumn.column2.bounds.x >= 5.0, 'Column 2 should be positioned on right');

    const pres = buildPptxPresentation({
      title: 'Two Column Deck',
      theme: 'modern',
      slides: [slide],
    });
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 12. Text-image and image-text layouts
  it('calculates complementary text and image regions for text-image and image-text', async () => {
    const textImageSlide: Slide = {
      id: 'slide-ti',
      index: 1,
      title: 'Product Feature',
      layout: 'text-image',
      line: 1,
      elements: [{ id: 'el-1', type: 'text', content: 'Detailed caption on the left.', line: 2 }],
    };

    const layoutTI = computeSlideLayout(textImageSlide);
    assert.equal(layoutTI.layoutType, 'text-image');
    assert.ok(layoutTI.imageRegion);
    assert.equal(layoutTI.body.bounds.x, 0.8, 'Text should be on left');
    assert.ok(layoutTI.imageRegion.bounds.x >= 5.0, 'Image should be on right');

    const imageTextSlide: Slide = {
      id: 'slide-it',
      index: 2,
      title: 'Architecture View',
      layout: 'image-text',
      line: 1,
      elements: [{ id: 'el-2', type: 'text', content: 'Detailed explanation on the right.', line: 2 }],
    };

    const layoutIT = computeSlideLayout(imageTextSlide);
    assert.equal(layoutIT.layoutType, 'image-text');
    assert.ok(layoutIT.imageRegion);
    assert.equal(layoutIT.imageRegion.bounds.x, 0.8, 'Image should be on left');
    assert.ok(layoutIT.body.bounds.x >= 4.5, 'Text should be on right');
  });

  // 13. Blank layout
  it('omits headers and dividers for blank layout', () => {
    const slide: Slide = {
      id: 'slide-blank',
      index: 1,
      title: 'Unrendered Title',
      layout: 'blank',
      line: 1,
      elements: [{ id: 'el-1', type: 'text', content: 'Free form canvas text', line: 2 }],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'blank');
    assert.equal(layout.header.show, false, 'Blank layout must not show header');
    assert.ok(layout.body.bounds.h >= 4.0, 'Blank layout provides larger canvas height');
  });

  // 14. Full-image layout
  it('allocates large central image region for full-image layout', () => {
    const slide: Slide = {
      id: 'slide-fi',
      index: 1,
      title: 'Hero Image',
      layout: 'full-image',
      line: 1,
      elements: [{ id: 'el-1', type: 'text', content: 'Overlay caption', line: 2 }],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'full-image');
    assert.ok(layout.imageRegion);
    assert.ok(layout.imageRegion.bounds.h >= 3.5, 'Image region should fill major portion of slide');
  });

  // 15. All 7 layouts end-to-end presentation generation
  it('generates a complete valid PPTX containing all 7 layout types', async () => {
    const presentation: Presentation = {
      title: 'Complete Layout Showcase',
      theme: 'modern',
      slides: [
        {
          id: 's1',
          index: 0,
          title: 'Cover Slide',
          layout: 'title',
          line: 1,
          elements: [{ id: 'e1', type: 'text', content: 'Subtitle text', line: 2 }],
        },
        {
          id: 's2',
          index: 1,
          title: 'Standard Content',
          layout: 'title-content',
          line: 3,
          elements: [{ id: 'e2', type: 'bullet', content: 'Bullet item', line: 4 }],
        },
        {
          id: 's3',
          index: 2,
          title: 'Two Column Comparison',
          layout: 'two-column',
          line: 5,
          elements: [
            { id: 'e3', type: 'text', content: 'Left side', line: 6 },
            { id: 'e4', type: 'text', content: 'Right side', line: 7 },
          ],
        },
        {
          id: 's4',
          index: 3,
          title: 'Feature with Visual',
          layout: 'text-image',
          line: 8,
          elements: [{ id: 'e5', type: 'text', content: 'Text description', line: 9 }],
        },
        {
          id: 's5',
          index: 4,
          title: 'Visual with Analysis',
          layout: 'image-text',
          line: 10,
          elements: [{ id: 'e6', type: 'text', content: 'Analysis report', line: 11 }],
        },
        {
          id: 's6',
          index: 5,
          title: 'Hero Snapshot',
          layout: 'full-image',
          line: 12,
          elements: [{ id: 'e7', type: 'text', content: 'Caption at bottom', line: 13 }],
        },
        {
          id: 's7',
          index: 6,
          title: 'Blank Canvas',
          layout: 'blank',
          line: 14,
          elements: [{ id: 'e8', type: 'text', content: 'Direct content', line: 15 }],
        },
      ],
    };

    const pres = buildPptxPresentation(presentation);
    assert.ok(pres);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 25000, '7-slide multi-layout PPTX should have substantial base64 length');
  });

  // 16. Aspect-ratio calculation preserves proportions and fits inside bounds
  it('preserves aspect ratio and prevents overflow for wide and tall images', () => {
    const container = { x: 5.5, y: 1.45, w: 3.7, h: 3.55 };

    // Wide image: 16:9 aspect ratio
    const wideBounds = calculateFittedImageBounds(container, 16, 9);
    assert.ok(wideBounds.w <= container.w, 'Width must fit');
    assert.ok(wideBounds.h <= container.h, 'Height must fit');
    assert.ok(wideBounds.x >= container.x, 'X must be inside container');
    assert.ok(wideBounds.y >= container.y, 'Y must be inside container');

    // Tall image: 3:4 aspect ratio
    const tallBounds = calculateFittedImageBounds(container, 3, 4);
    assert.ok(tallBounds.w <= container.w, 'Width must fit');
    assert.ok(tallBounds.h <= container.h, 'Height must fit');
    assert.ok(tallBounds.x >= container.x, 'X must be inside container');
    assert.ok(tallBounds.y >= container.y, 'Y must be inside container');
  });

  // 17. Image in text-image layout
  it('correctly populates imageRegion with primary image in text-image layout', () => {
    const slide: Slide = {
      id: 's-ti',
      index: 1,
      title: 'Product Overview',
      layout: 'text-image',
      line: 1,
      elements: [
        { id: 'e1', type: 'text', content: 'Our groundbreaking new platform.', line: 2 },
        { id: 'e2', type: 'image', content: 'product.png', src: 'product.png', line: 3 },
      ],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'text-image');
    assert.ok(layout.imageRegion);
    assert.equal(layout.imageRegion.hasImage, true);
    assert.equal(layout.imageRegion.image?.src, 'product.png');
    // Ensure image element was not counted among text elements
    assert.equal(layout.body.elements.length, 1);
    assert.equal(layout.body.elements[0].element.type, 'text');
  });

  // 18. Image in image-text layout
  it('correctly populates imageRegion with primary image in image-text layout', () => {
    const slide: Slide = {
      id: 's-it',
      index: 1,
      title: 'Infrastructure',
      layout: 'image-text',
      line: 1,
      elements: [
        { id: 'e1', type: 'image', content: 'arch.png', src: 'arch.png', line: 2 },
        { id: 'e2', type: 'text', content: 'Detailed diagram description.', line: 3 },
      ],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'image-text');
    assert.ok(layout.imageRegion);
    assert.equal(layout.imageRegion.hasImage, true);
    assert.equal(layout.imageRegion.image?.src, 'arch.png');
    assert.equal(layout.body.elements.length, 1);
  });

  // 19. Image in full-image layout
  it('allocates full central area for image in full-image layout', () => {
    const slide: Slide = {
      id: 's-fi',
      index: 1,
      title: 'Hero Shot',
      layout: 'full-image',
      line: 1,
      elements: [
        { id: 'e1', type: 'image', content: 'hero.png', src: 'hero.png', line: 2 },
        { id: 'e2', type: 'text', content: 'Caption at bottom', line: 3 },
      ],
    };

    const layout = computeSlideLayout(slide);
    assert.equal(layout.layoutType, 'full-image');
    assert.ok(layout.imageRegion);
    assert.equal(layout.imageRegion.hasImage, true);
    assert.equal(layout.imageRegion.image?.src, 'hero.png');
  });

  // 20. End-to-end PPTX generation with embedded image data URI
  it('renders embedded image data URI into PowerPoint without errors', async () => {
    // 1x1 transparent PNG data URI
    const testPngDataUri =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const presentation: Presentation = {
      title: 'Embedded Image Deck',
      theme: 'modern',
      slides: [
        {
          id: 's1',
          index: 0,
          title: 'Product Feature',
          layout: 'text-image',
          line: 1,
          elements: [
            { id: 'e1', type: 'text', content: 'Text description on the left', line: 2 },
            { id: 'e2', type: 'image', content: testPngDataUri, src: testPngDataUri, line: 3 },
          ],
        },
      ],
    };

    const pres = buildPptxPresentation(presentation);
    assert.ok(pres);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);
  });

  // 21. Automatically assigns overflowing elements to the next slide without text compression or deletion
  it('automatically assigns overflowing text to next slide without compressing or removing text', () => {
    // 14 distinct requirement items
    const elements = Array.from({ length: 14 }, (_, i) => ({
      id: `el-${i + 1}`,
      type: 'bullet' as const,
      content: `Comprehensive system requirement item ${i + 1} specifying operational constraints, security requirements, and scalable architecture rules.`,
      line: i + 2,
    }));

    const slide: Slide = {
      id: 'slide-1',
      index: 0,
      title: 'System Requirements',
      line: 1,
      elements,
    };

    const paginated = autoPaginateSlide(slide);
    assert.ok(paginated.length >= 2, 'Slide must be split into at least 2 slides');
    assert.equal(paginated[0].title, 'System Requirements');
    assert.equal(paginated[1].title, 'System Requirements (Cont.)');

    // Verify all original elements are preserved in exact order
    const totalPaginatedElements = paginated.reduce(
      (sum, s) => sum + s.elements.length,
      0
    );
    assert.equal(totalPaginatedElements, 14, 'All 14 elements must be retained without deletion');

    // Check that each slide has comfortable, uncompressed layout
    for (const s of paginated) {
      const layout = computeSlideLayout(s);
      assert.ok(
        layout.body.typography.fontSize >= 14,
        'Font size must remain readable and not compressed to tiny text'
      );
      assert.equal(layout.body.isOverflowing, false, 'No paginated slide should overflow');
    }
  });

  // 22. Preserves all content across continuation slides with (Cont.) naming across a full presentation
  it('preserves all presentation content when auto-paginating multiple slides', () => {
    const denseElements = Array.from({ length: 16 }, (_, i) => ({
      id: `dense-${i + 1}`,
      type: 'bullet' as const,
      content: `Quarterly strategic initiative ${i + 1} detailing deliverables and enterprise milestones.`,
      line: i + 2,
    }));

    const normalElements = [
      { id: 'norm-1', type: 'text' as const, content: 'Normal paragraph 1', line: 2 },
      { id: 'norm-2', type: 'text' as const, content: 'Normal paragraph 2', line: 3 },
    ];

    const presentation: Presentation = {
      title: 'Corporate Strategy',
      theme: 'modern',
      slides: [
        {
          id: 's1',
          index: 0,
          title: 'Executive Overview',
          line: 1,
          elements: normalElements,
        },
        {
          id: 's2',
          index: 1,
          title: 'Strategic Roadmap',
          line: 4,
          elements: denseElements,
        },
      ],
    };

    const paginated = autoPaginatePresentation(presentation);
    assert.ok(paginated.slides.length >= 3, 'Deck must contain at least 3 slides after pagination');
    assert.equal(paginated.slides[0].title, 'Executive Overview');
    assert.equal(paginated.slides[1].title, 'Strategic Roadmap');
    assert.equal(paginated.slides[2].title, 'Strategic Roadmap (Cont.)');

    // Re-indexing check
    for (let i = 0; i < paginated.slides.length; i++) {
      assert.equal(paginated.slides[i].index, i);
    }

    // Verify content count
    const totalRoadmapElements = paginated.slides
      .filter((s) => s.title.startsWith('Strategic Roadmap'))
      .reduce((sum, s) => sum + s.elements.length, 0);
    assert.equal(totalRoadmapElements, 16, 'All 16 strategic roadmap elements must be preserved');
  });

  // 23. Automatically splits a single overly long paragraph across slides without losing text
  it('splits a massive single paragraph across consecutive slides without truncation', () => {
    const sentence1 = 'Modern distributed cloud architectures decouple storage from compute layers to provide elastic scalability across availability zones.';
    const sentence2 = 'Container orchestration frameworks continuously monitor cluster health, autonomously provisioning replacement nodes upon hardware degradation.';
    const sentence3 = 'Transactional persistence guarantees ACID compliance via distributed consensus protocols operating across geo-replicated data centers.';
    const sentence4 = 'Automated telemetry pipelines stream operational metrics directly to real-time analytics engines for proactive anomaly detection.';
    const sentence5 = 'Security enclaves safeguard sensitive customer data using hardware-level cryptographic key management and zero-trust verification.';
    const sentence6 = 'Zero-downtime blue-green deployment pipelines validate health metrics before shifting production traffic to candidate builds.';
    const sentence7 = 'Comprehensive audit logs record all administrative operations for compliance with stringent financial and healthcare mandates.';
    const sentence8 = 'Edge computing nodes cache frequently accessed assets to minimize latency for end-user interactions globally.';

    const massiveContent = [
      sentence1,
      sentence2,
      sentence3,
      sentence4,
      sentence5,
      sentence6,
      sentence7,
      sentence8,
    ].join(' ');

    const slide: Slide = {
      id: 'massive-slide',
      index: 0,
      title: 'Distributed Systems Architecture',
      line: 1,
      elements: [
        {
          id: 'el-massive',
          type: 'text',
          content: massiveContent,
          line: 2,
        },
      ],
    };

    const paginated = autoPaginateSlide(slide);
    assert.ok(paginated.length >= 2, 'Massive text must be assigned to consecutive slides');

    // Verify all original sentences are present across the paginated slides
    const combinedText = paginated.map((s) => s.elements.map((e) => e.content).join(' ')).join(' ');
    assert.ok(combinedText.includes(sentence1), 'Must contain sentence 1');
    assert.ok(combinedText.includes(sentence4), 'Must contain sentence 4');
    assert.ok(combinedText.includes(sentence8), 'Must contain sentence 8');
  });

  // 24. exportToPptxFile and buildPptxPresentation produce complete, downloadable PPTX with paginated slides
  it('exports cleanly to PPTX with auto-paginated slides without compression or text loss', async () => {
    const denseItems = Array.from({ length: 15 }, (_, i) => ({
      id: `pt-${i + 1}`,
      type: 'bullet' as const,
      content: `Action item ${i + 1}: Implementation of critical workflow requirement with verified acceptance criteria.`,
      line: i + 2,
    }));

    const presentation: Presentation = {
      title: 'Action Items Deck',
      theme: 'emerald',
      slides: [
        {
          id: 'slide-actions',
          index: 0,
          title: 'Q4 Action Items',
          line: 1,
          elements: denseItems,
        },
      ],
    };

    // Build PPTX
    const pres = buildPptxPresentation(presentation);
    assert.ok(pres);
    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string');
    assert.ok(b64.length > 5000);

    // Test exportToPptxFile
    const exportResult = await exportToPptxFile(presentation, { fileName: 'Action_Items' });
    assert.equal(exportResult.success, true);
    assert.equal(exportResult.fileName, 'Action_Items.pptx');
  });
});
