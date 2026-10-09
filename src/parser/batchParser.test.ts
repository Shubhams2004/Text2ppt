import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseBatchPresentations,
  serializeBatchPresentations,
  countPresentationDeclarations,
} from './batchParser';
import { parsePresentation } from './presentationParser';
import { parseSimpleText } from './simpleTextParser';
import { buildPptxPresentation } from '../renderer/pptxRenderer';

describe('Batch Import / Multiple Presentations Tests', () => {
  // 1. Two presentations
  it('parses two distinct presentations into separate Presentation Models', () => {
    const input = `PRESENTATION: 1
TITLE: Biology Basics

SLIDE: Introduction
TEXT: Biology is the study of life.

SLIDE: Characteristics of Life
BULLETS:
- Growth
- Reproduction
- Metabolism

PRESENTATION: 2
TITLE: Cell Biology

SLIDE: Cell Structure
TEXT: Cells contain specialized structures.

SLIDE: Organelles
BULLETS:
- Nucleus
- Mitochondria
- Ribosomes`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    assert.equal(result.items.length, 2);

    // Presentation 1
    const p1 = result.items[0].presentation;
    assert.equal(p1.title, 'Biology Basics');
    assert.equal(p1.slides.length, 2);
    assert.equal(p1.slides[0].title, 'Introduction');
    assert.equal(p1.slides[0].elements[0].content, 'Biology is the study of life.');
    assert.equal(p1.slides[1].title, 'Characteristics of Life');
    assert.equal(p1.slides[1].elements.length, 3);
    assert.equal(p1.slides[1].elements[0].content, 'Growth');

    // Presentation 2
    const p2 = result.items[1].presentation;
    assert.equal(p2.title, 'Cell Biology');
    assert.equal(p2.slides.length, 2);
    assert.equal(p2.slides[0].title, 'Cell Structure');
    assert.equal(p2.slides[1].title, 'Organelles');
    assert.equal(p2.slides[1].elements.length, 3);
    assert.equal(p2.slides[1].elements[1].content, 'Mitochondria');
  });

  // 2. Twenty presentations
  it('parses twenty presentations without performance degradation or data loss', () => {
    const decks: string[] = [];
    for (let i = 1; i <= 20; i++) {
      decks.push(`PRESENTATION: ${i}
TITLE: Deck Number ${i}

SLIDE: Agenda ${i}
TEXT: Welcome to presentation ${i} in the bulk queue.
- Item alpha ${i}
- Item beta ${i}`);
    }

    const bulkText = decks.join('\n\n');
    const result = parseBatchPresentations(bulkText);

    assert.equal(result.hasErrors, false);
    assert.equal(result.items.length, 20);
    assert.equal(result.validCount, 20);
    assert.equal(result.errorCount, 0);

    for (let i = 0; i < 20; i++) {
      assert.equal(result.items[i].presentation.title, `Deck Number ${i + 1}`);
      assert.equal(result.items[i].presentation.slides.length, 1);
      assert.equal(result.items[i].presentation.slides[0].elements.length, 3);
    }
  });

  // 3. Different presentation header variations
  it('recognizes diverse header styles including case, colons, and markdown banners', () => {
    const variedInput = `PRESENTATION: 1
TITLE: Alpha Deck
SLIDE: S1
- Point 1

PRESENTATION 2
TITLE: Beta Deck
SLIDE: S2
- Point 2

Presentation: 3
TITLE: Gamma Deck
SLIDE: S3
- Point 3

Presentation 4
TITLE: Delta Deck
SLIDE: S4
- Point 4

=== PRESENTATION: 5 ===
TITLE: Epsilon Deck
SLIDE: S5
- Point 5

--- PRESENTATION 6 ---
TITLE: Zeta Deck
SLIDE: S6
- Point 6`;

    const result = parseBatchPresentations(variedInput);
    assert.equal(result.hasErrors, false);
    assert.equal(result.items.length, 6);
    assert.equal(result.items[0].presentation.title, 'Alpha Deck');
    assert.equal(result.items[1].presentation.title, 'Beta Deck');
    assert.equal(result.items[2].presentation.title, 'Gamma Deck');
    assert.equal(result.items[3].presentation.title, 'Delta Deck');
    assert.equal(result.items[4].presentation.title, 'Epsilon Deck');
    assert.equal(result.items[5].presentation.title, 'Zeta Deck');
  });

  // 4. Multiple slides per presentation
  it('correctly allocates multiple slides within each presentation', () => {
    const input = `PRESENTATION: 1
TITLE: Multi-Slide Deck

SLIDE: Slide One
TEXT: First slide content.

SLIDE: Slide Two
- Bullet on slide 2

SLIDE: Slide Three
TEXT: Third slide content.
- Bullet on slide 3

SLIDE: Slide Four
TEXT: Final wrap-up.`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    assert.equal(result.items[0].presentation.slides.length, 4);
    assert.equal(result.items[0].presentation.slides[0].title, 'Slide One');
    assert.equal(result.items[0].presentation.slides[1].title, 'Slide Two');
    assert.equal(result.items[0].presentation.slides[2].title, 'Slide Three');
    assert.equal(result.items[0].presentation.slides[3].title, 'Slide Four');
  });

  // 5. Mixed paragraphs and bullets
  it('preserves interleaved sequence of paragraphs and bullet lists', () => {
    const input = `PRESENTATION: 1
TITLE: Architecture

SLIDE: System Components
TEXT: The edge engine operates across three discrete tiers:
- Ingestion tier
- Inference tier
- Telemetry tier
TEXT: All three tiers run within sub-millisecond execution budgets.`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    const elements = result.items[0].presentation.slides[0].elements;

    assert.equal(elements.length, 5);
    assert.equal(elements[0].type, 'text');
    assert.ok(elements[0].content.includes('three discrete tiers'));

    assert.equal(elements[1].type, 'bullet');
    assert.equal(elements[1].content, 'Ingestion tier');
    assert.equal(elements[2].type, 'bullet');
    assert.equal(elements[2].content, 'Inference tier');
    assert.equal(elements[3].type, 'bullet');
    assert.equal(elements[3].content, 'Telemetry tier');

    assert.equal(elements[4].type, 'text');
    assert.ok(elements[4].content.includes('sub-millisecond'));
  });

  // 6. Empty presentation
  it('flags an empty presentation block with line-numbered error', () => {
    const input = `PRESENTATION: 1
TITLE: Valid Deck
SLIDE: S1
- Point

PRESENTATION: 2

PRESENTATION: 3
TITLE: Another Valid Deck
SLIDE: S3
- Point 3`;

    const result = parseBatchPresentations(input);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].hasErrors, false);
    assert.equal(result.items[1].hasErrors, true);
    assert.ok(result.items[1].issues.some((i) => i.code === 'EMPTY_PRESENTATION'));
    assert.equal(result.items[2].hasErrors, false);
  });

  // 7. Malformed presentation
  it('flags slide without content with warning while preserving parsing', () => {
    const input = `PRESENTATION: 1
TITLE: Deck With Empty Slide
SLIDE: Empty Slide Title

PRESENTATION: 2
TITLE: Normal Deck
SLIDE: Real Slide
- Real point`;

    const result = parseBatchPresentations(input);
    assert.equal(result.items.length, 2);
    assert.ok(result.items[0].issues.some((i) => i.code === 'EMPTY_SLIDE'));
    assert.equal(result.items[1].hasErrors, false);
  });

  // 8. Missing title
  it('handles missing TITLE declaration gracefully with a warning and fallback title', () => {
    const input = `PRESENTATION: 1
SLIDE: Introduction
TEXT: There is no TITLE keyword in this presentation block.`;

    const result = parseBatchPresentations(input);
    const item = result.items[0];
    assert.equal(item.hasErrors, false);
    assert.equal(item.presentation.title, 'Introduction');
    assert.ok(item.issues.some((i) => i.code === 'MISSING_TITLE'));
  });

  // 9. Presentation order preservation
  it('strictly preserves presentation order across batch parsing', () => {
    const input = `PRESENTATION: 1
TITLE: Order A
SLIDE: S1
- P1

PRESENTATION: 2
TITLE: Order B
SLIDE: S2
- P2

PRESENTATION: 3
TITLE: Order C
SLIDE: S3
- P3`;

    const result = parseBatchPresentations(input);
    assert.equal(result.items[0].presentation.title, 'Order A');
    assert.equal(result.items[1].presentation.title, 'Order B');
    assert.equal(result.items[2].presentation.title, 'Order C');
  });

  // 10. Slide order preservation
  it('strictly preserves slide order within each presentation', () => {
    const input = `PRESENTATION: 1
TITLE: Ordered Slides
SLIDE: First
- P1
SLIDE: Second
- P2
SLIDE: Third
- P3`;

    const result = parseBatchPresentations(input);
    const slides = result.items[0].presentation.slides;
    assert.equal(slides[0].title, 'First');
    assert.equal(slides[1].title, 'Second');
    assert.equal(slides[2].title, 'Third');
  });

  // 11. Content preservation
  it('preserves user text exactly without truncation or silent drops', () => {
    const input = `PRESENTATION: 1
TITLE: Exact Content
SLIDE: Precise Text
TEXT: "Quoted text inside body", with commas, apostrophes like don't, & ampersands.
• Bullet with special symbols: 100% accuracy & <50ms latency.
· Middle dot bullet with numbers: #1 rank in 2026.`;

    const result = parseBatchPresentations(input);
    const slide = result.items[0].presentation.slides[0];
    assert.equal(slide.elements[0].content, `"Quoted text inside body", with commas, apostrophes like don't, & ampersands.`);
    assert.equal(slide.elements[1].content, 'Bullet with special symbols: 100% accuracy & <50ms latency.');
    assert.equal(slide.elements[2].content, 'Middle dot bullet with numbers: #1 rank in 2026.');
  });

  // 12. One invalid presentation among valid presentations
  it('isolates errors to the specific invalid presentation without breaking valid ones', () => {
    const input = `PRESENTATION: 1
TITLE: Valid Deck One
SLIDE: S1
- Point 1

PRESENTATION: 2
TITLE: Corrupt Deck (No Slides)

PRESENTATION: 3
TITLE: Valid Deck Three
SLIDE: S3
- Point 3`;

    const result = parseBatchPresentations(input);
    assert.equal(result.items.length, 3);
    assert.equal(result.items[0].hasErrors, false);
    assert.equal(result.items[1].hasErrors, true);
    assert.equal(result.items[2].hasErrors, false);

    assert.equal(result.validCount, 2);
    assert.equal(result.errorCount, 1);
  });

  // 13. End-to-end batch parsing -> Presentation Models -> PPTX generation
  it('generates valid PPTX files for each presentation in the batch', async () => {
    const input = `PRESENTATION: 1
TITLE: Batch Deck 1
SLIDE: Intro 1
TEXT: Presentation one body text.
- Bullet one

PRESENTATION: 2
TITLE: Batch Deck 2
SLIDE: Intro 2
TEXT: Presentation two body text.
- Bullet two`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);

    // Export each presentation
    for (const item of result.items) {
      const pres = buildPptxPresentation(item.presentation);
      assert.ok(pres, 'PptxGenJS instance created for ' + item.presentation.title);
      const b64 = await pres.write({ outputType: 'base64' });
      assert.ok(typeof b64 === 'string');
      assert.ok(b64.length > 5000);
    }
  });

  // 14. Existing Code2PPT mode remains functional
  it('maintains full backward compatibility for standard Code2PPT DSL', () => {
    const dsl = `presentation "DSL Presentation"
theme "emerald"

slide "DSL Slide"
bullet "Point A"
bullet "Point B"`;

    const dslResult = parsePresentation(dsl);
    assert.equal(dslResult.hasErrors, false);
    assert.equal(dslResult.presentation.title, 'DSL Presentation');
    assert.equal(dslResult.presentation.theme, 'emerald');
    assert.equal(dslResult.presentation.slides[0].elements.length, 2);
  });

  // 15. Existing Simple Text mode remains functional
  it('maintains full backward compatibility for Simple Text mode', () => {
    const simple = `Title: Simple Mode Deck

Section One
- Item 1
- Item 2

Section Two
Text under section 2.`;

    const simpleResult = parseSimpleText(simple);
    assert.equal(simpleResult.hasErrors, false);
    assert.equal(simpleResult.presentation.title, 'Simple Mode Deck');
    assert.equal(simpleResult.presentation.slides.length, 2);
  });

  // Bonus test: serialization and reordering
  it('re-serializes reordered presentations correctly', () => {
    const input = `PRESENTATION: 1
TITLE: First
SLIDE: S1
- P1

PRESENTATION: 2
TITLE: Second
SLIDE: S2
- P2`;

    const parsed = parseBatchPresentations(input);
    // Swap items
    const reordered = [parsed.items[1], parsed.items[0]];
    const serialized = serializeBatchPresentations(reordered);

    const reparsed = parseBatchPresentations(serialized);
    assert.equal(reparsed.items[0].presentation.title, 'Second');
    assert.equal(reparsed.items[1].presentation.title, 'First');
  });

  // --- Tests for Batch Limit (Hard Maximum of 20) & Slide-Count Reliability ---

  // 16. Exactly 1 presentation
  it('parses a single presentation in batch format successfully', () => {
    const input = `PRESENTATION: 1
TITLE: Solo Deck
SLIDE: Slide 1
TEXT: Just one presentation.`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    assert.equal(result.totalPresentations, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].presentation.title, 'Solo Deck');
    assert.equal(result.items[0].presentation.slides.length, 1);
  });

  // 17. Exactly 20 presentations -> valid
  it('accepts exactly 20 presentations as valid without error', () => {
    const decks: string[] = [];
    for (let i = 1; i <= 20; i++) {
      decks.push(`PRESENTATION: ${i}
TITLE: Batch Deck ${i}
SLIDE: Slide 1
TEXT: Content for presentation ${i}`);
    }
    const result = parseBatchPresentations(decks.join('\n\n'));
    assert.equal(result.hasErrors, false);
    assert.equal(result.totalPresentations, 20);
    assert.equal(result.items.length, 20);
    assert.equal(result.validCount, 20);
    assert.equal(result.errorCount, 0);
  });

  // 18. 21 presentations -> rejected with BATCH_LIMIT_EXCEEDED
  it('rejects 21 presentations with exact error reporting count 21 and does not partially process', () => {
    const decks: string[] = [];
    for (let i = 1; i <= 21; i++) {
      decks.push(`PRESENTATION: ${i}
TITLE: Batch Deck ${i}
SLIDE: Slide 1
TEXT: Content for presentation ${i}`);
    }
    const result = parseBatchPresentations(decks.join('\n\n'));
    assert.equal(result.hasErrors, true);
    assert.equal(result.totalPresentations, 21);
    assert.equal(result.items.length, 0, 'Must not partially process batch when exceeding limit');
    assert.equal(result.errorCount, 21);
    const limitIssue = result.issues.find((iss) => iss.code === 'BATCH_LIMIT_EXCEEDED');
    assert.ok(limitIssue, 'Must contain BATCH_LIMIT_EXCEEDED issue');
    assert.equal(
      limitIssue.message,
      'Maximum 20 presentations per batch. Found 21. Please reduce the batch to 20 or fewer.'
    );
  });

  // 19. 25 presentations -> rejected with exact count 25
  it('rejects 25 presentations reporting exact count 25', () => {
    const decks: string[] = [];
    for (let i = 1; i <= 25; i++) {
      decks.push(`PRESENTATION: ${i}
TITLE: Batch Deck ${i}
SLIDE: Slide 1
TEXT: Content for presentation ${i}`);
    }
    const result = parseBatchPresentations(decks.join('\n\n'));
    assert.equal(result.hasErrors, true);
    assert.equal(result.totalPresentations, 25);
    assert.equal(result.items.length, 0);
    const limitIssue = result.issues.find((iss) => iss.code === 'BATCH_LIMIT_EXCEEDED');
    assert.ok(limitIssue);
    assert.equal(
      limitIssue.message,
      'Maximum 20 presentations per batch. Found 25. Please reduce the batch to 20 or fewer.'
    );
  });

  // 20. Exact 3-slide reliability test across Parser, Model, and PPTX Export
  it('produces exactly 3 slides for 3-slide input across batch, simple text, code2ppt and PPTX export', async () => {
    const input = `PRESENTATION: 1
TITLE: Test Presentation

SLIDE: Slide 1
TEXT: Content 1

SLIDE: Slide 2
TEXT: Content 2

SLIDE: Slide 3
TEXT: Content 3`;

    // 1. Batch Parser
    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.hasErrors, false);
    assert.equal(batchRes.items.length, 1);
    const model = batchRes.items[0].presentation;
    assert.equal(model.slides.length, 3, 'Model must contain exactly 3 slides');
    assert.equal(model.slides[0].title, 'Slide 1');
    assert.equal(model.slides[1].title, 'Slide 2');
    assert.equal(model.slides[2].title, 'Slide 3');
    assert.equal(model.slides[2].elements[0].content, 'Content 3', 'Final slide content must be preserved');

    // 2. Simple Text Parser
    const simpleRes = parseSimpleText(input);
    assert.equal(simpleRes.presentation.slides.length, 3, 'Simple text mode must produce exactly 3 slides');
    assert.equal(simpleRes.presentation.slides[0].title, 'Slide 1');
    assert.equal(simpleRes.presentation.slides[1].title, 'Slide 2');
    assert.equal(simpleRes.presentation.slides[2].title, 'Slide 3');

    // 3. Code2PPT Parser
    const dslRes = parsePresentation(input);
    assert.equal(dslRes.presentation.slides.length, 3, 'Code2PPT mode must produce exactly 3 slides');
    assert.equal(dslRes.presentation.slides[0].title, 'Slide 1');
    assert.equal(dslRes.presentation.slides[1].title, 'Slide 2');
    assert.equal(dslRes.presentation.slides[2].title, 'Slide 3');

    // 4. PPTX Generator
    const pptx = buildPptxPresentation(model);
    assert.ok(pptx);
    const b64 = await pptx.write({ outputType: 'base64' });
    assert.ok(typeof b64 === 'string' && b64.length > 5000, 'PPTX export must succeed with 3 slides');
  });

  // 21. Final slide is never lost (unlabeled, bullets, or trailing newlines)
  it('ensures final slide is never lost regardless of content type or trailing whitespace', () => {
    const input = `PRESENTATION: 1
TITLE: Final Slide Retention

SLIDE: Slide 1
TEXT: Body 1

SLIDE: Slide 2
TEXT: Body 2

SLIDE: Final Slide 3
BULLETS:
- Final bullet point alpha
- Final bullet point beta


`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    const slides = result.items[0].presentation.slides;
    assert.equal(slides.length, 3);
    assert.equal(slides[2].title, 'Final Slide 3');
    assert.equal(slides[2].elements.length, 2);
    assert.equal(slides[2].elements[0].content, 'Final bullet point alpha');
    assert.equal(slides[2].elements[1].content, 'Final bullet point beta');
  });

  // 22. Slide count regressions: 2, 3, 5, 10 slides
  it('reliably produces exact slide counts for 2, 3, 5, and 10 slide presentations', () => {
    const makeDeck = (count: number) => {
      const parts = [`PRESENTATION: 1`, `TITLE: ${count}-Slide Deck`];
      for (let s = 1; s <= count; s++) {
        parts.push(`SLIDE: Slide ${s}\nTEXT: Content for slide ${s}`);
      }
      return parts.join('\n\n');
    };

    // 2 slides
    const res2 = parseBatchPresentations(makeDeck(2));
    assert.equal(res2.items[0].presentation.slides.length, 2);
    assert.equal(res2.items[0].presentation.slides[1].title, 'Slide 2');

    // 3 slides
    const res3 = parseBatchPresentations(makeDeck(3));
    assert.equal(res3.items[0].presentation.slides.length, 3);
    assert.equal(res3.items[0].presentation.slides[2].title, 'Slide 3');

    // 5 slides
    const res5 = parseBatchPresentations(makeDeck(5));
    assert.equal(res5.items[0].presentation.slides.length, 5);
    assert.equal(res5.items[0].presentation.slides[4].title, 'Slide 5');

    // 10 slides
    const res10 = parseBatchPresentations(makeDeck(10));
    assert.equal(res10.items[0].presentation.slides.length, 10);
    assert.equal(res10.items[0].presentation.slides[9].title, 'Slide 10');
  });

  // 23. Regression: Exactly 1 presentation produces 1 presentation in batch queue
  it('reliably detects and retains exactly 1 presentation in batch queue', () => {
    const input = `PRESENTATION: 1
TITLE: Solo Presentation

SLIDE: Opening Slide
TEXT: Content for the single presentation.
- Key point alpha
- Key point beta`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    assert.equal(result.totalPresentations, 1);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].presentation.title, 'Solo Presentation');
    assert.equal(result.items[0].presentation.slides.length, 1);
  });

  // 24. Regression: Exactly 2 presentations produces 2 presentations in batch queue
  it('reliably detects and retains exactly 2 presentations in batch queue', () => {
    const input = `PRESENTATION: 1
TITLE: First Deck
SLIDE: S1
TEXT: Content 1

PRESENTATION: 2
TITLE: Second Deck
SLIDE: S2
TEXT: Content 2`;

    const result = parseBatchPresentations(input);
    assert.equal(result.hasErrors, false);
    assert.equal(result.totalPresentations, 2);
    assert.equal(result.items.length, 2);
    assert.equal(result.items[0].presentation.title, 'First Deck');
    assert.equal(result.items[1].presentation.title, 'Second Deck');
  });

  // 25. Regression: Exactly 3 presentations retains ALL 3, queue contains 3, preview selects 1, 2, 3, and export all succeeds
  it('reliably detects and retains all 3 presentations, allowing preview and export of each', async () => {
    const input = `PRESENTATION: 1
TITLE: Presentation Alpha
SLIDE: Slide A1
TEXT: Body content for alpha deck.
- Bullet A1

PRESENTATION: 2
TITLE: Presentation Beta
SLIDE: Slide B1
TEXT: Body content for beta deck.
- Bullet B1

PRESENTATION: 3
TITLE: Presentation Gamma
SLIDE: Slide C1
TEXT: Body content for gamma deck.
- Bullet C1`;

    const result = parseBatchPresentations(input);

    // 1. Boundary & count assertions: no presentation lost
    assert.equal(result.hasErrors, false);
    assert.equal(result.totalPresentations, 3);
    assert.equal(result.items.length, 3, 'Batch queue must contain exactly 3 presentations');
    assert.equal(result.validCount, 3);
    assert.equal(result.errorCount, 0);

    // 2. Individual presentation model assertions
    const p1 = result.items[0].presentation;
    const p2 = result.items[1].presentation;
    const p3 = result.items[2].presentation;

    assert.equal(p1.title, 'Presentation Alpha');
    assert.equal(p1.slides.length, 1);
    assert.equal(p1.slides[0].title, 'Slide A1');

    assert.equal(p2.title, 'Presentation Beta');
    assert.equal(p2.slides.length, 1);
    assert.equal(p2.slides[0].title, 'Slide B1');

    assert.equal(p3.title, 'Presentation Gamma');
    assert.equal(p3.slides.length, 1);
    assert.equal(p3.slides[0].title, 'Slide C1');
    assert.equal(p3.slides[0].elements[0].content, 'Body content for gamma deck.');

    // 3. Verify Preview selection (simulation of selectedBatchIndex 0, 1, and 2)
    const selectForPreview = (index: number) => {
      const safeIndex = Math.min(Math.max(0, index), result.items.length - 1);
      return result.items[safeIndex].presentation;
    };

    assert.equal(selectForPreview(0).title, 'Presentation Alpha', 'Preview must display presentation 1');
    assert.equal(selectForPreview(1).title, 'Presentation Beta', 'Preview must display presentation 2');
    assert.equal(selectForPreview(2).title, 'Presentation Gamma', 'Preview must display presentation 3');

    // 4. Verify Export All: all 3 can be converted into valid PPTX presentations separately
    const pptxAlpha = buildPptxPresentation(p1);
    const pptxBeta = buildPptxPresentation(p2);
    const pptxGamma = buildPptxPresentation(p3);

    const [b64_1, b64_2, b64_3] = await Promise.all([
      pptxAlpha.write({ outputType: 'base64' }),
      pptxBeta.write({ outputType: 'base64' }),
      pptxGamma.write({ outputType: 'base64' }),
    ]);

    assert.ok(typeof b64_1 === 'string' && b64_1.length > 1000);
    assert.ok(typeof b64_2 === 'string' && b64_2.length > 1000);
    assert.ok(typeof b64_3 === 'string' && b64_3.length > 1000);
  });

  // 26. Regression: 3 presentations in various alternative formatting styles
  it('detects 3 presentations across diverse header variants without dropping the 3rd block', () => {
    // A: Unnumbered PRESENTATION / PRESENTATION: headers
    const inputUnnumbered = `PRESENTATION:
TITLE: First Unnumbered
SLIDE: S1
TEXT: C1

PRESENTATION:
TITLE: Second Unnumbered
SLIDE: S2
TEXT: C2

PRESENTATION
TITLE: Third Unnumbered
SLIDE: S3
TEXT: C3`;
    const resA = parseBatchPresentations(inputUnnumbered);
    assert.equal(resA.items.length, 3, 'Must detect 3 unnumbered presentations');
    assert.equal(resA.items[2].presentation.title, 'Third Unnumbered');

    // B: Markdown headings (# PRESENTATION 1, ## PRESENTATION 2, ### PRESENTATION 3)
    const inputMarkdown = `# PRESENTATION 1
TITLE: Markdown Deck 1
SLIDE: S1
TEXT: C1

## PRESENTATION 2
TITLE: Markdown Deck 2
SLIDE: S2
TEXT: C2

### PRESENTATION 3
TITLE: Markdown Deck 3
SLIDE: S3
TEXT: C3`;
    const resB = parseBatchPresentations(inputMarkdown);
    assert.equal(resB.items.length, 3, 'Must detect 3 markdown presentations');
    assert.equal(resB.items[2].presentation.title, 'Markdown Deck 3');

    // C: DECK keyword headers
    const inputDeck = `DECK: 1
TITLE: Deck One
SLIDE: S1
TEXT: C1

DECK 2
TITLE: Deck Two
SLIDE: S2
TEXT: C2

DECK: 3
TITLE: Deck Three
SLIDE: S3
TEXT: C3`;
    const resC = parseBatchPresentations(inputDeck);
    assert.equal(resC.items.length, 3, 'Must detect 3 presentations using DECK keyword');
    assert.equal(resC.items[2].presentation.title, 'Deck Three');

    // D: Numbered and bulleted lists of presentations
    const inputList = `1. PRESENTATION: 1
TITLE: List Deck 1
SLIDE: S1
TEXT: C1

2. PRESENTATION: 2
TITLE: List Deck 2
SLIDE: S2
TEXT: C2

3. PRESENTATION: 3
TITLE: List Deck 3
SLIDE: S3
TEXT: C3`;
    const resD = parseBatchPresentations(inputList);
    assert.equal(resD.items.length, 3, 'Must detect 3 presentations in numbered list');
    assert.equal(resD.items[2].presentation.title, 'List Deck 3');
  });

  // 27. Regression: Confirmation that exactly 20 is accepted and 21 is rejected
  it('verifies boundary limits: exactly 20 is accepted and 21 is strictly rejected', () => {
    const makeDecks = (count: number) => {
      const arr: string[] = [];
      for (let i = 1; i <= count; i++) {
        arr.push(`PRESENTATION: ${i}
TITLE: Batch Item ${i}
SLIDE: Slide 1
TEXT: Slide content for presentation ${i}`);
      }
      return arr.join('\n\n');
    };

    // Exactly 20
    const res20 = parseBatchPresentations(makeDecks(20));
    assert.equal(res20.hasErrors, false, '20 presentations must not have errors');
    assert.equal(res20.totalPresentations, 20);
    assert.equal(res20.items.length, 20, '20 presentations must all be retained');
    assert.equal(res20.validCount, 20);
    assert.equal(res20.errorCount, 0);

    // Exactly 21
    const res21 = parseBatchPresentations(makeDecks(21));
    assert.equal(res21.hasErrors, true, '21 presentations must be rejected');
    assert.equal(res21.totalPresentations, 21);
    assert.equal(res21.items.length, 0, '21 presentations must not be partially processed');
    assert.equal(res21.validCount, 0);
    assert.equal(res21.errorCount, 21);
    const limitIssue = res21.issues.find((i) => i.code === 'BATCH_LIMIT_EXCEEDED');
    assert.ok(limitIssue, 'Must produce BATCH_LIMIT_EXCEEDED issue');
    assert.equal(
      limitIssue.message,
      'Maximum 20 presentations per batch. Found 21. Please reduce the batch to 20 or fewer.'
    );
  });

  // 28. Regression: 1 presentation with 2 slides -> 1 presentation / 2 slides
  it('handles 1 presentation with 2 slides -> exactly 1 presentation and 2 slides', () => {
    const input = `PRESENTATION: 1
TITLE: Solo Presentation

SLIDE: First Slide
TEXT: Content for the first slide.

SLIDE: Second Slide
BULLETS:
- Point A
- Point B`;

    // Batch parser
    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.totalPresentations, 1);
    assert.equal(batchRes.items.length, 1);
    assert.equal(batchRes.items[0].presentation.slides.length, 2);
    assert.equal(batchRes.items[0].presentation.slides[0].title, 'First Slide');
    assert.equal(batchRes.items[0].presentation.slides[1].title, 'Second Slide');

    // Code2PPT parser
    const codeRes = parsePresentation(input);
    assert.equal(codeRes.presentation.slides.length, 2);
    assert.equal(codeRes.presentation.slides[0].title, 'First Slide');
    assert.equal(codeRes.presentation.slides[1].title, 'Second Slide');
  });

  // 29. Regression: 2 presentations with 2 slides each -> 2 presentations / 4 slides total
  it('handles 2 presentations with 2 slides each -> 2 presentations and 4 total slides', () => {
    const input = `PRESENTATION: 1
TITLE: Biology Basics

SLIDE: Introduction
TEXT: Biology is the study of life.

SLIDE: Characteristics
BULLETS:
- Growth
- Reproduction

PRESENTATION: 2
TITLE: Cell Biology

SLIDE: Cell Structure
TEXT: Cells contain specialized structures.

SLIDE: Organelles
BULLETS:
- Nucleus
- Mitochondria`;

    // Batch parser
    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.totalPresentations, 2);
    assert.equal(batchRes.items.length, 2);
    assert.equal(batchRes.items[0].presentation.title, 'Biology Basics');
    assert.equal(batchRes.items[0].presentation.slides.length, 2);
    assert.equal(batchRes.items[1].presentation.title, 'Cell Biology');
    assert.equal(batchRes.items[1].presentation.slides.length, 2);

    const totalSlides =
      batchRes.items[0].presentation.slides.length +
      batchRes.items[1].presentation.slides.length;
    assert.equal(totalSlides, 4, 'Must have exactly 4 total slides across the 2 presentations');

    // Code2PPT automatic routing
    const codeRes = parsePresentation(input);
    assert.equal(codeRes.isMultiPresentation, true);
    assert.equal(codeRes.totalPresentations, 2);
    assert.equal(codeRes.presentations?.length, 2);
    assert.equal(codeRes.presentations?.[0].slides.length, 2);
    assert.equal(codeRes.presentations?.[1].slides.length, 2);
  });

  // 30. Regression: 3 presentations with 2 slides each -> 3 presentations / 6 slides total
  it('handles 3 presentations with 2 slides each -> 3 presentations and 6 total slides', async () => {
    const input = `PRESENTATION: 1
TITLE: Biology Basics

SLIDE: Introduction
TEXT: Biology is the study of life.

SLIDE: Characteristics
BULLETS:
- Growth
- Reproduction

PRESENTATION: 2
TITLE: Cell Biology

SLIDE: Cell Structure
TEXT: Cells contain specialized structures.

SLIDE: Organelles
BULLETS:
- Nucleus
- Mitochondria

PRESENTATION: 3
TITLE: Genetics

SLIDE: DNA Architecture
TEXT: DNA encodes the hereditary instructions.

SLIDE: Inheritance
BULLETS:
- Genes
- Chromosomes`;

    // Batch parser
    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.totalPresentations, 3);
    assert.equal(batchRes.items.length, 3);
    assert.equal(batchRes.items[0].presentation.slides.length, 2);
    assert.equal(batchRes.items[1].presentation.slides.length, 2);
    assert.equal(batchRes.items[2].presentation.slides.length, 2);

    const totalSlides = batchRes.items.reduce(
      (sum, it) => sum + it.presentation.slides.length,
      0
    );
    assert.equal(totalSlides, 6, 'Must have exactly 6 total slides across the 3 presentations');

    // Verify all 3 can export separately
    for (let i = 0; i < 3; i++) {
      const pptx = buildPptxPresentation(batchRes.items[i].presentation);
      const b64 = await pptx.write({ outputType: 'base64' });
      assert.ok(typeof b64 === 'string' && b64.length > 1000);
    }
  });

  // 31. Regression: 20 presentations with different slide counts -> 20 presentations, all slides preserved, no slide limit
  it('handles 20 presentations with different slide counts, preserving all slides and decks', () => {
    // Deck 1 has 1 slide, Deck 2 has 2 slides, ... Deck 20 has 4 slides
    const slideCounts = [
      1, 2, 3, 2, 4, 1, 5, 2, 3, 4,
      2, 1, 3, 4, 2, 5, 1, 3, 2, 4,
    ];
    const totalExpectedSlides = slideCounts.reduce((a, b) => a + b, 0); // 54 slides!

    const deckParts: string[] = [];
    for (let p = 0; p < 20; p++) {
      const slidesInDeck = slideCounts[p];
      const pNum = p + 1;
      const lines = [`PRESENTATION: ${pNum}`, `TITLE: Presentation ${pNum}`];
      for (let s = 1; s <= slidesInDeck; s++) {
        lines.push(`SLIDE: Slide ${pNum}.${s}\nTEXT: Content for slide ${s} in presentation ${pNum}`);
      }
      deckParts.push(lines.join('\n\n'));
    }

    const input = deckParts.join('\n\n');
    const batchRes = parseBatchPresentations(input);

    assert.equal(batchRes.hasErrors, false);
    assert.equal(batchRes.totalPresentations, 20);
    assert.equal(batchRes.items.length, 20);

    let actualSlideSum = 0;
    for (let p = 0; p < 20; p++) {
      const actualSlides = batchRes.items[p].presentation.slides.length;
      assert.equal(
        actualSlides,
        slideCounts[p],
        `Presentation ${p + 1} must retain exactly ${slideCounts[p]} slides`
      );
      actualSlideSum += actualSlides;
    }

    assert.equal(
      actualSlideSum,
      totalExpectedSlides,
      `All ${totalExpectedSlides} slides must be preserved with no slide count limit`
    );
  });

  // 32. Regression: 21 presentations is strictly rejected
  it('strictly rejects 21 presentations with BATCH_LIMIT_EXCEEDED error', () => {
    const deckParts: string[] = [];
    for (let i = 1; i <= 21; i++) {
      deckParts.push(`PRESENTATION: ${i}\nTITLE: Deck ${i}\nSLIDE: S1\nTEXT: C1`);
    }
    const input = deckParts.join('\n\n');

    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.hasErrors, true);
    assert.equal(batchRes.totalPresentations, 21);
    assert.equal(batchRes.items.length, 0);
    const limitIssue = batchRes.issues.find((iss) => iss.code === 'BATCH_LIMIT_EXCEEDED');
    assert.ok(limitIssue, 'Must contain BATCH_LIMIT_EXCEEDED issue');

    // Also check Code2PPT auto-routing rejects 21 presentations
    const codeRes = parsePresentation(input);
    assert.equal(codeRes.hasErrors, true);
    assert.ok(codeRes.issues.some((iss) => iss.code === 'BATCH_LIMIT_EXCEEDED'));
  });

  // 33. Regression: One presentation containing many slides is accepted (no slide limit)
  it('accepts one presentation containing many slides without any total-slide limit', () => {
    const slideCount = 45;
    const lines = [`PRESENTATION: 1`, `TITLE: Mega Presentation with ${slideCount} Slides`];
    for (let s = 1; s <= slideCount; s++) {
      lines.push(`SLIDE: Topic ${s}\nTEXT: Detailed text on topic ${s}\n- Bullet point ${s}`);
    }
    const input = lines.join('\n\n');

    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.hasErrors, false);
    assert.equal(batchRes.totalPresentations, 1);
    assert.equal(batchRes.items.length, 1);
    assert.equal(
      batchRes.items[0].presentation.slides.length,
      slideCount,
      `Must accept all ${slideCount} slides in a single presentation`
    );
  });

  // 34. Regression: Text containing the word "presentation" without declaration must NOT create a presentation
  it('does NOT create a new presentation when the word "presentation" appears in normal text or bullets', () => {
    const input = `PRESENTATION: 1
TITLE: Effective Presentations

SLIDE: Overview
TEXT: Presentation skills are crucial for executive leadership.
TEXT: We held a presentation workshop yesterday afternoon.

SLIDE: Best Practices
BULLETS:
- Presentation of data requires clean and readable charts
- The presentation should keep the audience engaged
- Avoid presentation clutter by using whitespace
QUOTE: A great presentation inspires action.`;

    const count = countPresentationDeclarations(input);
    assert.equal(count, 1, 'Must detect exactly 1 presentation declaration, not treating text occurrences as decks');

    const batchRes = parseBatchPresentations(input);
    assert.equal(batchRes.totalPresentations, 1);
    assert.equal(batchRes.items.length, 1);
    assert.equal(batchRes.items[0].presentation.slides.length, 2);

    // Verify slide 1 has the text elements with "presentation"
    const s1 = batchRes.items[0].presentation.slides[0];
    assert.equal(s1.elements.length, 2);
    assert.ok(s1.elements[0].content.includes('Presentation skills'));

    // Verify slide 2 has the bullets and quote with "presentation"
    const s2 = batchRes.items[0].presentation.slides[1];
    assert.equal(s2.elements.length, 4);
    assert.ok(s2.elements[0].content.includes('Presentation of data'));
    assert.ok(s2.elements[1].content.includes('The presentation should'));
    assert.ok(s2.elements[2].content.includes('Avoid presentation clutter'));
  });
});
