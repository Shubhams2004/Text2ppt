import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeSlideLayout } from '../renderer/layoutSystem';
import { buildPptxPresentation } from '../renderer/pptxRenderer';
import { parseSimpleText } from './simpleTextParser';

describe('Simple Text -> PPT Parser & Renderer Tests', () => {
  // 1. Title + bullets
  it('parses presentation title and slide with bullet points', () => {
    const text = `Title: AI in Healthcare

Applications
- Medical diagnosis
- Drug discovery
- Patient monitoring`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.title, 'AI in Healthcare');
    assert.equal(result.presentation.slides.length, 1);

    const slide = result.presentation.slides[0];
    assert.equal(slide.title, 'Applications');
    assert.equal(slide.elements.length, 3);
    assert.equal(slide.elements[0].type, 'bullet');
    assert.equal(slide.elements[0].content, 'Medical diagnosis');
    assert.equal(slide.elements[1].content, 'Drug discovery');
    assert.equal(slide.elements[2].content, 'Patient monitoring');
  });

  // 2. Multiple slide sections
  it('parses multiple slide sections preserving section boundaries', () => {
    const text = `Title: AI in Healthcare

Applications
- Medical diagnosis
- Drug discovery
- Patient monitoring

Benefits
- Faster analysis
- Better decision support`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.title, 'AI in Healthcare');
    assert.equal(result.presentation.slides.length, 2);

    assert.equal(result.presentation.slides[0].title, 'Applications');
    assert.equal(result.presentation.slides[0].elements.length, 3);

    assert.equal(result.presentation.slides[1].title, 'Benefits');
    assert.equal(result.presentation.slides[1].elements.length, 2);
    assert.equal(result.presentation.slides[1].elements[0].content, 'Faster analysis');
    assert.equal(result.presentation.slides[1].elements[1].content, 'Better decision support');
  });

  // 3. Paragraph text
  it('parses normal paragraph text under a heading', () => {
    const text = `Title: Clinical Overview

Executive Summary
Artificial intelligence algorithms now analyze clinical records and radiographic scans with superior consistency.

Patient Outcomes
Machine learning models reduce diagnosis lag times significantly across outpatient networks.`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    assert.equal(result.presentation.slides.length, 2);

    const slide1 = result.presentation.slides[0];
    assert.equal(slide1.title, 'Executive Summary');
    assert.equal(slide1.elements.length, 1);
    assert.equal(slide1.elements[0].type, 'text');
    assert.ok(slide1.elements[0].content.includes('radiographic scans'));

    const slide2 = result.presentation.slides[1];
    assert.equal(slide2.title, 'Patient Outcomes');
    assert.equal(slide2.elements.length, 1);
    assert.equal(slide2.elements[0].type, 'text');
    assert.ok(slide2.elements[0].content.includes('diagnosis lag times'));
  });

  // 4. Mixed text and bullets
  it('preserves exact sequential order of mixed paragraph text and bullets', () => {
    const text = `Title: Diagnostic Pipelines

Diagnostic Workflows
The workflow begins with multi-modal patient sensor data acquisition.

- High-resolution CT imaging
- Real-time genomic sequencing

Next, predictive models highlight suspicious anomalies for radiologist review.`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];

    assert.equal(slide.title, 'Diagnostic Workflows');
    assert.equal(slide.elements.length, 4);

    assert.equal(slide.elements[0].type, 'text');
    assert.ok(slide.elements[0].content.includes('multi-modal patient sensor'));

    assert.equal(slide.elements[1].type, 'bullet');
    assert.equal(slide.elements[1].content, 'High-resolution CT imaging');

    assert.equal(slide.elements[2].type, 'bullet');
    assert.equal(slide.elements[2].content, 'Real-time genomic sequencing');

    assert.equal(slide.elements[3].type, 'text');
    assert.ok(slide.elements[3].content.includes('radiologist review'));
  });

  // 5. Multiline text
  it('accumulates multiline paragraphs while preserving newlines', () => {
    const text = `Title: Clinical Trial Notes

Research Summary
Line 1: Randomized double-blind clinical validation.
Line 2: Over 12,000 patient records surveyed across 14 hospital centers.
Line 3: Phase III trial endpoints met with statistical significance.

- Final FDA approval pending`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];

    assert.equal(slide.elements.length, 2);
    assert.equal(slide.elements[0].type, 'text');
    assert.ok(slide.elements[0].content.includes('Line 1'));
    assert.ok(slide.elements[0].content.includes('Line 2'));
    assert.ok(slide.elements[0].content.includes('Line 3'));
    assert.ok(slide.elements[0].content.includes('\n'));

    assert.equal(slide.elements[1].type, 'bullet');
    assert.equal(slide.elements[1].content, 'Final FDA approval pending');
  });

  // 6. Different bullet markers
  it('supports -, •, ·, *, +, and numbered bullet markers interchangeably', () => {
    const text = `Title: Marker Variety

Marker Showcase
- Standard hyphen bullet
• Unicode bullet point
· Middle dot marker
* Asterisk bullet
+ Plus sign marker
1. Numbered first step
2) Numbered second step`;

    const result = parseSimpleText(text);
    assert.equal(result.hasErrors, false);
    const slide = result.presentation.slides[0];

    assert.equal(slide.elements.length, 7);
    assert.equal(slide.elements[0].content, 'Standard hyphen bullet');
    assert.equal(slide.elements[1].content, 'Unicode bullet point');
    assert.equal(slide.elements[2].content, 'Middle dot marker');
    assert.equal(slide.elements[3].content, 'Asterisk bullet');
    assert.equal(slide.elements[4].content, 'Plus sign marker');
    assert.equal(slide.elements[5].content, 'Numbered first step');
    assert.equal(slide.elements[6].content, 'Numbered second step');

    for (const el of slide.elements) {
      assert.equal(el.type, 'bullet');
    }
  });

  // 7. Empty input
  it('flags empty input with EMPTY_PRESENTATION error', () => {
    const empty1 = parseSimpleText('');
    assert.equal(empty1.hasErrors, true);
    assert.ok(empty1.issues.some((i) => i.code === 'EMPTY_PRESENTATION'));

    const empty2 = parseSimpleText('   \n\n\t   \n  ');
    assert.equal(empty2.hasErrors, true);
    assert.ok(empty2.issues.some((i) => i.code === 'EMPTY_PRESENTATION'));
  });

  // 8. Invalid/ambiguous input
  it('flags unparseable symbolic input with error message', () => {
    const symbolsOnly = parseSimpleText('??? /// !!! ===');
    assert.equal(symbolsOnly.hasErrors, true);
    assert.ok(symbolsOnly.issues.length > 0);
  });

  // 9. End-to-end Simple Text -> Presentation Model -> Layout Engine -> Valid .pptx
  it('generates a valid, editable PowerPoint presentation from Simple Text', async () => {
    const simpleText = `Title: Healthcare Innovations

Introduction
Artificial intelligence represents a fundamental paradigm shift in modern therapeutic delivery.

Core Pillars
- Accelerated drug discovery pipelines
- Automated pathological analysis
- Continuous vital telemetry

Future Outlook
Regulatory standardization and patient data privacy will dictate enterprise adoption.`;

    // 1. Parse Simple Text to Presentation Model
    const parseResult = parseSimpleText(simpleText);
    assert.equal(parseResult.hasErrors, false);
    assert.equal(parseResult.presentation.slides.length, 3);

    // 2. Validate Layout Engine integration
    const layout0 = computeSlideLayout(parseResult.presentation.slides[0], 0, 3);
    assert.ok(layout0.body.bounds);
    assert.ok(layout0.header.title);

    const layout1 = computeSlideLayout(parseResult.presentation.slides[1], 1, 3);
    assert.equal(layout1.body.elements.length, 3);

    // 3. Render directly using existing PPTX Renderer
    const pres = buildPptxPresentation(parseResult.presentation);
    assert.ok(pres, 'PptxGenJS instance should be created');

    const base64 = await pres.write({ outputType: 'base64' });
    assert.ok(typeof base64 === 'string');
    assert.ok(base64.length > 10000, 'Output .pptx should have substantial base64 length');
  });
});
