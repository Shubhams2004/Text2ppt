import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePresentation } from './presentationParser';
import { buildPptxPresentation } from '../renderer/pptxRenderer';

describe('Code2PPT Parser & Model Tests', () => {
  // 1. One slide
  it('parses a presentation with one slide and bullet points', () => {
    const code = `presentation "AI in Healthcare"

slide "AI in Healthcare"
bullet "Medical diagnosis"
bullet "Drug discovery"`;

    const result = parsePresentation(code);

    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.title, 'AI in Healthcare');
    assert.equal(result.presentation.slides.length, 1);

    const slide1 = result.presentation.slides[0];
    assert.equal(slide1.title, 'AI in Healthcare');
    assert.equal(slide1.index, 0);
    assert.equal(slide1.elements.length, 2);
    assert.equal(slide1.elements[0].type, 'bullet');
    assert.equal(slide1.elements[0].content, 'Medical diagnosis');
    assert.equal(slide1.elements[1].type, 'bullet');
    assert.equal(slide1.elements[1].content, 'Drug discovery');
  });

  // 2. Indented syntax and multiple slides
  it('parses indented syntax with text and multiple bullets preserving order', () => {
    const code = `presentation "AI in Healthcare"

slide "Applications"
  text "Artificial intelligence is transforming healthcare."
  bullet "Medical diagnosis"
  bullet "Drug discovery"
  bullet "Patient monitoring"

slide "Benefits"
  bullet "Faster analysis"
  bullet "Reduced workload"`;

    const result = parsePresentation(code);

    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.title, 'AI in Healthcare');
    assert.equal(result.presentation.slides.length, 2);

    // Slide 1: Applications
    const s1 = result.presentation.slides[0];
    assert.equal(s1.index, 0);
    assert.equal(s1.title, 'Applications');
    assert.equal(s1.elements.length, 4);

    assert.equal(s1.elements[0].type, 'text');
    assert.equal(s1.elements[0].content, 'Artificial intelligence is transforming healthcare.');

    assert.equal(s1.elements[1].type, 'bullet');
    assert.equal(s1.elements[1].content, 'Medical diagnosis');

    assert.equal(s1.elements[2].type, 'bullet');
    assert.equal(s1.elements[2].content, 'Drug discovery');

    assert.equal(s1.elements[3].type, 'bullet');
    assert.equal(s1.elements[3].content, 'Patient monitoring');

    // Slide 2: Benefits
    const s2 = result.presentation.slides[1];
    assert.equal(s2.index, 1);
    assert.equal(s2.title, 'Benefits');
    assert.equal(s2.elements.length, 2);

    assert.equal(s2.elements[0].type, 'bullet');
    assert.equal(s2.elements[0].content, 'Faster analysis');

    assert.equal(s2.elements[1].type, 'bullet');
    assert.equal(s2.elements[1].content, 'Reduced workload');
  });

  // 3. Text element
  it('correctly creates text elements with line tracking', () => {
    const code = `presentation "Doc"
slide "Overview"
text "This is a detailed paragraph."`;

    const result = parsePresentation(code);
    assert.equal(result.presentation.slides.length, 1);

    const slide = result.presentation.slides[0];
    assert.equal(slide.elements.length, 1);

    const textEl = slide.elements[0];
    assert.equal(textEl.type, 'text');
    assert.equal(textEl.content, 'This is a detailed paragraph.');
    assert.equal(textEl.line, 3);
  });

  // 4. Bullets
  it('correctly creates bullet elements with line tracking', () => {
    const code = `presentation "Doc"
slide "Roadmap"
bullet "Step one: initialization"
bullet "Step two: execution"`;

    const result = parsePresentation(code);
    const slide = result.presentation.slides[0];
    assert.equal(slide.elements.length, 2);

    assert.equal(slide.elements[0].type, 'bullet');
    assert.equal(slide.elements[0].content, 'Step one: initialization');
    assert.equal(slide.elements[0].line, 3);

    assert.equal(slide.elements[1].type, 'bullet');
    assert.equal(slide.elements[1].content, 'Step two: execution');
    assert.equal(slide.elements[1].line, 4);
  });

  // 5. Empty presentation
  it('flags an empty presentation with an error', () => {
    const code = `# Just comments and empty lines

// Another comment`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);
    assert.equal(result.presentation.slides.length, 0);

    const emptyIssue = result.issues.find((i) => i.code === 'EMPTY_PRESENTATION');
    assert.ok(emptyIssue, 'Should produce an EMPTY_PRESENTATION issue');
    assert.equal(emptyIssue.severity, 'error');
  });

  // 6. Missing presentation declaration
  it('warns when presentation declaration is missing at the top', () => {
    const code = `slide "First Slide"
bullet "Point one"`;

    const result = parsePresentation(code);
    const missingDeclaration = result.issues.find(
      (i) => i.code === 'MISSING_PRESENTATION_DECLARATION'
    );
    assert.ok(missingDeclaration, 'Should flag MISSING_PRESENTATION_DECLARATION');
    assert.equal(missingDeclaration.line, 1);
    assert.equal(missingDeclaration.severity, 'warning');
  });

  // 7. Empty slide validation
  it('warns when a slide has no content elements', () => {
    const code = `presentation "My Deck"

slide "Empty Slide"

slide "Populated Slide"
bullet "Has content"`;

    const result = parsePresentation(code);
    const emptySlideIssue = result.issues.find((i) => i.code === 'EMPTY_SLIDE');
    assert.ok(emptySlideIssue, 'Should flag EMPTY_SLIDE warning');
    assert.equal(emptySlideIssue.line, 3);
    assert.equal(emptySlideIssue.severity, 'warning');
    assert.ok(emptySlideIssue.message.includes('Empty Slide'));
  });

  // 8. Invalid command (does not silently ignore)
  it('flags invalid commands with line numbers and does not silently ignore them', () => {
    const code = `presentation "Doc"
slide "Valid Slide"
bullet "Valid point"
unknownCommand "some bad payload"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);

    const invalidIssue = result.issues.find((i) => i.code === 'INVALID_COMMAND');
    assert.ok(invalidIssue, 'Should report INVALID_COMMAND issue');
    assert.equal(invalidIssue.line, 4);
    assert.equal(invalidIssue.severity, 'error');
    assert.ok(invalidIssue.message.includes('unknownCommand'));
  });

  // 9. Missing quotes
  it('warns when quotes are missing around argument values', () => {
    const code = `presentation "Doc"
slide My Unquoted Slide
bullet An unquoted bullet`;

    const result = parsePresentation(code);

    const missingQuoteIssues = result.issues.filter((i) => i.code === 'MISSING_QUOTES');
    assert.ok(missingQuoteIssues.length >= 2, 'Should flag missing quotes for slide and bullet');
    assert.equal(missingQuoteIssues[0].line, 2);
    assert.equal(missingQuoteIssues[1].line, 3);
  });

  // 10. Malformed syntax / unclosed quotes
  it('flags unclosed quotes with error and line number', () => {
    const code = `presentation "Doc"
slide "Unclosed title
bullet "Valid point"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);

    const unclosedIssue = result.issues.find((i) => i.code === 'UNCLOSED_QUOTE');
    assert.ok(unclosedIssue, 'Should flag UNCLOSED_QUOTE error');
    assert.equal(unclosedIssue.line, 2);
    assert.equal(unclosedIssue.severity, 'error');
  });

  // 11. Content appearing before a slide
  it('flags content appearing before any slide command', () => {
    const code = `text "Orphan paragraph before any slide"
slide "First Slide"
bullet "Point in slide"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);

    const orphanIssue = result.issues.find((i) => i.code === 'CONTENT_BEFORE_SLIDE');
    assert.ok(orphanIssue, 'Should flag CONTENT_BEFORE_SLIDE issue');
    assert.equal(orphanIssue.line, 1);
    assert.equal(orphanIssue.severity, 'error');
  });

  // 12. Architectural decoupling: AST contains zero PptxGenJS internals
  it('produces a pure TypeScript model without PptxGenJS dependency', () => {
    const code = `presentation "Pure AST"
slide "Intro"
text "Clean decoupled model"
bullet "Point"`;

    const result = parsePresentation(code);
    const jsonString = JSON.stringify(result.presentation);

    // Verify it is a clean serializable object without circular refs or library prototypes
    assert.ok(jsonString.includes('Pure AST'));
    assert.ok(jsonString.includes('Clean decoupled model'));
    assert.equal(typeof result.presentation, 'object');
    assert.equal(Array.isArray(result.presentation.slides), true);
  });

  // 13. End-to-end: Code2PPT markup → parser → typed presentation model → PptxGenJS → valid pptx
  it('generates a valid PPTX presentation from parsed model', async () => {
    const code = `presentation "AI in Healthcare"

slide "AI in Healthcare"
bullet "Medical diagnosis"
bullet "Drug discovery"

slide "Benefits"
text "Faster analysis"
bullet "Reduced workload"`;

    const parseResult = parsePresentation(code);
    assert.equal(parseResult.hasErrors, false);
    assert.equal(parseResult.presentation.slides.length, 2);

    // Pass typed model to PptxGenJS renderer
    const pres = buildPptxPresentation(parseResult.presentation);
    assert.ok(pres, 'Should successfully build PptxGenJS presentation');

    const b64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string', 'Should produce base64 string');
    assert.ok(b64.length > 10000, 'PPTX base64 payload should be substantial');
  });

  // 14. All 7 supported slide layouts
  it('parses all supported slide layouts properly', () => {
    const code = `presentation "Layout Showcase"

slide "Title Slide" layout="title"
  text "Subtitle text"

slide "Content Slide" layout="title-content"
  bullet "Point 1"

slide "Comparison" layout="two-column"
  text "Left column"
  text "Right column"

slide "Product Feature" layout="text-image"
  text "Description of product feature"

slide "Architecture Diagram" layout="image-text"
  bullet "Infrastructure points"

slide "Hero Shot" layout="full-image"
  text "Caption"

slide "Clean Canvas" layout="blank"
  text "Free-form text"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.slides.length, 7);

    assert.equal(result.presentation.slides[0].layout, 'title');
    assert.equal(result.presentation.slides[1].layout, 'title-content');
    assert.equal(result.presentation.slides[2].layout, 'two-column');
    assert.equal(result.presentation.slides[3].layout, 'text-image');
    assert.equal(result.presentation.slides[4].layout, 'image-text');
    assert.equal(result.presentation.slides[5].layout, 'full-image');
    assert.equal(result.presentation.slides[6].layout, 'blank');
  });

  // 15. Invalid layout name error validation
  it('flags unsupported layout names with line-numbered INVALID_LAYOUT error', () => {
    const code = `presentation "Doc"
slide "Bad Layout Slide" layout="three-column"
bullet "Point"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);

    const layoutIssue = result.issues.find((i) => i.code === 'INVALID_LAYOUT');
    assert.ok(layoutIssue, 'Should flag INVALID_LAYOUT error');
    assert.equal(layoutIssue.line, 2);
    assert.equal(layoutIssue.severity, 'error');
    assert.ok(layoutIssue.message.includes('three-column'));
  });

  // 16. Backward compatibility: slides without explicit layout
  it('maintains backward compatibility when no layout is specified', () => {
    const code = `presentation "Classic Deck"
slide "Overview"
text "First paragraph"
bullet "First bullet"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.slides[0].layout, undefined);
  });

  // 17. Image parsing
  it('parses image command into typed ImageElement', () => {
    const code = `presentation "Visual Deck"
slide "Product Showcase"
image "assets/product.png"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.slides[0].elements.length, 1);

    const imgEl = result.presentation.slides[0].elements[0];
    assert.equal(imgEl.type, 'image');
    assert.equal(imgEl.content, 'assets/product.png');
    assert.equal((imgEl as any).src, 'assets/product.png');
    assert.equal(imgEl.line, 3);
  });

  // 18. Missing image path
  it('flags missing image path with line-numbered error', () => {
    const code = `presentation "Deck"
slide "Empty Image Slide"
image`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, true);

    const issue = result.issues.find((i) => i.code === 'MISSING_IMAGE_PATH');
    assert.ok(issue, 'Should report MISSING_IMAGE_PATH error');
    assert.equal(issue.line, 3);
    assert.equal(issue.severity, 'error');
  });

  // 19. Missing image file extension warning
  it('warns when an image path lacks a recognized extension', () => {
    const code = `presentation "Deck"
slide "Photo Slide"
image "unspecified_extension"`;

    const result = parsePresentation(code);
    const issue = result.issues.find((i) => i.code === 'INVALID_IMAGE_PATH');
    assert.ok(issue, 'Should warn about missing extension');
    assert.equal(issue.line, 3);
    assert.equal(issue.severity, 'warning');
  });

  // 20. Image in text-image layout
  it('parses text and image in text-image layout', () => {
    const code = `presentation "Product Deck"
slide "Product" layout="text-image"
  text "Our new product"
  image "product.png"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];
    assert.equal(slide.layout, 'text-image');
    assert.equal(slide.elements.length, 2);
    assert.equal(slide.elements[0].type, 'text');
    assert.equal(slide.elements[1].type, 'image');
  });

  // 21. Image in image-text layout
  it('parses image and text in image-text layout', () => {
    const code = `presentation "Architecture Deck"
slide "Architecture" layout="image-text"
  image "architecture.png"
  text "System architecture"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];
    assert.equal(slide.layout, 'image-text');
    assert.equal(slide.elements.length, 2);
    assert.equal(slide.elements[0].type, 'image');
    assert.equal(slide.elements[1].type, 'text');
  });

  // 22. Image in full-image layout
  it('parses image in full-image layout', () => {
    const code = `presentation "Hero Deck"
slide "Hero" layout="full-image"
  image "hero.png"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];
    assert.equal(slide.layout, 'full-image');
    assert.equal(slide.elements.length, 1);
    assert.equal(slide.elements[0].type, 'image');
  });

  // 23. Multiple images across slides
  it('parses multiple slides with distinct images seamlessly', () => {
    const code = `presentation "Multi-Image Deck"
slide "Slide 1" layout="text-image"
  text "First description"
  image "diag1.png"

slide "Slide 2" layout="image-text"
  image "diag2.jpg"
  text "Second description"`;

    const result = parsePresentation(code);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.slides.length, 2);
    assert.equal((result.presentation.slides[0].elements[1] as any).src, 'diag1.png');
    assert.equal((result.presentation.slides[1].elements[0] as any).src, 'diag2.jpg');
  });
});
