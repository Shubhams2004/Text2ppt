import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isArtificialFiller,
  refineContentPreamble,
  isQualityCleanRequested,
  cleanPresentationText,
  cleanPresentationModel,
} from './contentQuality';
import { parsePresentation } from '../parser/presentationParser';
import { parseSimpleText } from '../parser/simpleTextParser';
import { Presentation } from '../models/presentation';

describe('Content Quality Rules & Validation Tests', () => {
  it('correctly identifies artificial filler instructions such as "Must reach 100%" and "ensure full completion"', () => {
    assert.equal(isArtificialFiller('Must reach 100%'), true);
    assert.equal(isArtificialFiller('must reach 100%'), true);
    assert.equal(isArtificialFiller('Action item: must reach 100%'), true);
    assert.equal(isArtificialFiller('Ensure full completion'), true);
    assert.equal(isArtificialFiller('ensure 100% completion'), true);
    assert.equal(isArtificialFiller('100% completion is mandatory'), true);
    assert.equal(isArtificialFiller('All items must reach 100%'), true);
    assert.equal(isArtificialFiller('Guarantee 100% success'), true);
    assert.equal(isArtificialFiller('Target: 100%'), true);
  });

  it('strictly preserves real technical metrics and contextual figures containing 100% or percentages', () => {
    // Concrete technical metrics must never be classified as filler!
    assert.equal(isArtificialFiller('Bullet with special symbols: 100% accuracy & <50ms latency.'), false);
    assert.equal(isArtificialFiller('Achieved 100% unit test coverage across all parser modules.'), false);
    assert.equal(isArtificialFiller('Over 90% diagnostic agreement in radiographic scans.'), false);
    assert.equal(isArtificialFiller('Maintains 99.99% uptime SLA.'), false);
    assert.equal(isArtificialFiller('Sub-10ms neural execution with zero cloud bandwidth requirements.'), false);
  });

  it('identifies generic space-filling conclusion and placeholder boilerplate', () => {
    assert.equal(isArtificialFiller('In conclusion, this concludes the presentation.'), true);
    assert.equal(isArtificialFiller('Summary of the above points.'), true);
    assert.equal(isArtificialFiller('Key takeaway: To be determined.'), true);
    assert.equal(isArtificialFiller('Generic summary: TBD'), true);
    assert.equal(isArtificialFiller('Placeholder text'), true);
  });

  it('refines wordy preambles into concise, natural wording while preserving facts', () => {
    const refined1 = refineContentPreamble(
      'It is important to remember that cells contain specialized organelles.'
    );
    assert.equal(refined1, 'Cells contain specialized organelles.');

    const refined2 = refineContentPreamble(
      'Needless to say, offline hardware cannot execute cloud workflows.'
    );
    assert.equal(refined2, 'Offline hardware cannot execute cloud workflows.');

    const refined3 = refineContentPreamble(
      'In order to reduce network latency, inference runs locally on the edge device.'
    );
    assert.equal(refined3, 'To reduce network latency, inference runs locally on the edge device.');
  });

  it('detects explicit quality clean directives in input source', () => {
    assert.equal(isQualityCleanRequested('# clean\npresentation "My Deck"'), true);
    assert.equal(isQualityCleanRequested('clean: true\nTitle: My Deck'), true);
    assert.equal(isQualityCleanRequested('cleanup: on\nTitle: My Deck'), true);
    assert.equal(isQualityCleanRequested('options clean_content=true\npresentation "My Deck"'), true);
    assert.equal(isQualityCleanRequested('presentation "Normal Deck"\nslide "Intro"'), false);
  });

  it('cleans Code2PPT markup by removing filler instructions and refining preambles', () => {
    const inputCode = `presentation "Project Quality"
theme "modern"

slide "Execution Goals"
text "In order to streamline delivery, the core compiler runs client-side."
bullet "Sub-10ms latency across edge devices"
bullet "Must reach 100%"
bullet "Ensure full completion"
bullet "100% test coverage verified"

slide "Summary"
text "In conclusion, this concludes the presentation."`;

    const { cleanedText, report } = cleanPresentationText(inputCode, 'code');
    assert.equal(report.hasChanges, true);
    assert.equal(report.removedFillerCount, 3); // "Must reach 100%", "Ensure full completion", "In conclusion..."
    assert.equal(report.refinedPreambleCount, 1); // "In order to streamline..." -> "To streamline..."

    // Verify filler was removed
    assert.ok(!cleanedText.includes('Must reach 100%'));
    assert.ok(!cleanedText.includes('Ensure full completion'));
    assert.ok(!cleanedText.includes('this concludes the presentation'));

    // Verify valid technical metrics and facts are strictly preserved
    assert.ok(cleanedText.includes('100% test coverage verified'));
    assert.ok(cleanedText.includes('Sub-10ms latency across edge devices'));
    assert.ok(cleanedText.includes('To streamline delivery, the core compiler runs client-side.'));
  });

  it('cleans Simple Text format preserving headings, lists and technical metrics', () => {
    const simpleInput = `Title: Cloud Architecture

Key Metrics
- 100% uptime SLA guaranteed
- Must reach 100%
- Target: 100%
- Sub-50ms response time

Summary
In conclusion, this concludes the presentation.`;

    const { cleanedText, report } = cleanPresentationText(simpleInput, 'simple');
    assert.equal(report.hasChanges, true);
    assert.ok(!cleanedText.includes('Must reach 100%'));
    assert.ok(!cleanedText.includes('Target: 100%'));
    assert.ok(!cleanedText.includes('In conclusion'));
    assert.ok(cleanedText.includes('100% uptime SLA guaranteed'));
    assert.ok(cleanedText.includes('Sub-50ms response time'));
  });

  it('does NOT silently rewrite user content when clean directive is absent', () => {
    const rawUserCode = `presentation "Unmodified"
slide "Tasks"
text "Must reach 100%"`;

    const parseResult = parsePresentation(rawUserCode);
    assert.equal(parseResult.presentation.slides[0].elements[0].content, 'Must reach 100%');
  });

  it('automatically applies cleanup when clean directive is present in DSL code', () => {
    const codeWithCleanDirective = `# clean
presentation "Cleaned Presentation"
slide "Objectives"
text "Must reach 100%"
bullet "Real objective: 100% test pass rate"`;

    const parseResult = parsePresentation(codeWithCleanDirective);
    assert.equal(parseResult.presentation.slides[0].elements.length, 1);
    assert.equal(
      parseResult.presentation.slides[0].elements[0].content,
      'Real objective: 100% test pass rate'
    );
  });

  it('automatically applies cleanup when clean directive is present in Simple Text', () => {
    const simpleWithClean = `Clean: true
Title: Automated Quality

Deliverables
- Ensure full completion
- Must reach 100%
- Shipped 5 core compiler modules`;

    const parseResult = parseSimpleText(simpleWithClean);
    assert.equal(parseResult.presentation.slides[0].elements.length, 1);
    assert.equal(
      parseResult.presentation.slides[0].elements[0].content,
      'Shipped 5 core compiler modules'
    );
  });

  it('cleanPresentationModel cleans typed Presentation object and drops empty hollow summary slides', () => {
    const model: Presentation = {
      title: 'Deck Model',
      theme: 'modern',
      slides: [
        {
          id: 's1',
          index: 0,
          title: 'Introduction',
          line: 1,
          elements: [
            { id: 'e1', type: 'text', content: 'It is important to remember that data is encrypted.', line: 2 },
            { id: 'e2', type: 'bullet', content: 'Must reach 100%', line: 3 },
          ],
        },
        {
          id: 's2',
          index: 1,
          title: 'Conclusion',
          line: 4,
          elements: [
            { id: 'e3', type: 'text', content: 'In conclusion, this concludes the presentation.', line: 5 },
          ],
        },
      ],
    };

    const { presentation: cleaned, report } = cleanPresentationModel(model);
    assert.equal(report.hasChanges, true);
    assert.equal(report.emptySlidesRemoved, 1); // Hollow conclusion slide removed
    assert.equal(cleaned.slides.length, 1);
    assert.equal(cleaned.slides[0].elements.length, 1);
    assert.equal(cleaned.slides[0].elements[0].content, 'Data is encrypted.');
  });
});
