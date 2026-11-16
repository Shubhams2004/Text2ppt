import test from 'node:test';
import assert from 'node:assert/strict';
import { importPptxFile } from './pptxImporter';
import { buildPptxPresentation } from '../renderer/pptxRenderer';
import { Presentation } from '../models/presentation';

test('PowerPoint Importer Engine', async (t) => {
  await t.test('gracefully rejects non-zip and corrupt buffers', async () => {
    const corruptBuffer = new TextEncoder().encode('not a zip file').buffer;
    const result = await importPptxFile(corruptBuffer, 'invalid.pptx');
    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  await t.test('end-to-end: exports PPTX and re-imports slide structure accurately', async () => {
    const sourcePresentation: Presentation = {
      title: 'Q4 Product Strategy',
      theme: 'modern',
      slides: [
        {
          id: 'slide_1',
          index: 0,
          title: 'Executive Vision',
          line: 1,
          elements: [
            {
              id: 'text_1',
              type: 'text',
              content: 'Accelerating AI Transformation across Global Enterprises',
              line: 2,
              x: 10,
              y: 20,
              w: 80,
              h: 15,
              fontSize: 24,
              bold: true,
            },
            {
              id: 'shape_1',
              type: 'shape',
              shapeType: 'round-rect',
              content: '',
              line: 3,
              x: 10,
              y: 50,
              w: 30,
              h: 20,
              fillColor: '#4F46E5',
            },
          ],
        },
        {
          id: 'slide_2',
          index: 1,
          title: 'Financial Milestones',
          line: 4,
          elements: [
            {
              id: 'tbl_1',
              type: 'table',
              content: 'Metrics',
              line: 5,
              headers: ['Region', 'Growth', 'Target'],
              rows: [
                ['North America', '+38%', '$12M'],
                ['Europe', '+24%', '$8M'],
              ],
              x: 10,
              y: 25,
              w: 80,
              h: 40,
            },
          ],
        },
      ],
    };

    const pptxObj = buildPptxPresentation(sourcePresentation, {
      fileName: 'test_deck',
      includeSlideNumbers: true,
    });

    const pptxBuffer = (await pptxObj.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    assert.ok(pptxBuffer.byteLength > 1000);

    // Import back using our browser-compatible unpacker
    const importResult = await importPptxFile(pptxBuffer, 'q4_strategy.pptx');
    assert.equal(importResult.success, true);
    assert.ok(importResult.presentation);
    assert.equal(importResult.presentation?.slides.length, 2);

    const firstSlide = importResult.presentation?.slides[0];
    assert.ok(firstSlide);
    // Elements should be extracted as editable objects
    assert.ok(firstSlide.elements.length >= 1);
    const hasText = firstSlide.elements.some(
      (el) => el.type === 'text' && el.content.includes('Executive Vision') || el.content.includes('Accelerating AI')
    );
    assert.ok(hasText, 'Should extract slide text content');
  });
});
