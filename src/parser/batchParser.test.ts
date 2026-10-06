import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseBatchPresentations, serializeBatchPresentations } from './batchParser';
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
});
