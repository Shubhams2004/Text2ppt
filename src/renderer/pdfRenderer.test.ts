import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePresentation } from '../parser/presentationParser';
import { buildPdfPresentation, exportToPdfFile } from './pdfRenderer';
import { Presentation } from '../models/presentation';

describe('PDF Export & Rendering Tests', () => {
  it('generates a PDF document with the correct number of landscape slides', () => {
    const code = `
presentation "Quarterly Strategy"
theme "modern"

slide "Executive Summary"
text "Our results for Q3 exceeded all baseline forecasts."
bullets
- Revenue up 24% year over year
- Customer retention remains at 98%
- Expansion into 3 new regional markets

slide "Financial Highlights"
text "Key performance metrics across divisions."
bullets
- Gross margins expanded to 74%
- Operating expenses down 8%
`;
    const parsed = parsePresentation(code);
    const doc = buildPdfPresentation(parsed.presentation);
    assert.strictEqual(doc.getNumberOfPages(), 2);
  });

  it('handles multi-slide presentations with various layouts without crashing', () => {
    const code = `
presentation "Comprehensive Showcase"
theme "midnight"

slide "Title Deck"
subtitle "Strategy & Execution"
text "An overview of our core principles and architecture."

slide "Two Column Analysis"
layout two-column
col1
text "Strengths & Opportunities"
bullets
- Modern stack
- Fast iteration
col2
text "Weaknesses & Threats"
bullets
- Legacy dependencies
- Market volatility

slide "Key Takeaways"
quote "The future belongs to those who build with precision."
text "Closing remarks on upcoming initiatives."
`;
    const parsed = parsePresentation(code);
    const doc = buildPdfPresentation(parsed.presentation);
    assert.strictEqual(doc.getNumberOfPages(), 3);
  });

  it('automatically paginate overflowing text into next slides in PDF export', () => {
    // Generate a slide with tons of bullets that overflow
    const overflowSlideBullets = Array.from(
      { length: 25 },
      (_, i) => `- Essential point ${i + 1}: Detailed commentary and extensive observations regarding systems architecture and performance.`
    ).join('\n');

    const code = `
presentation "Auto Pagination Test"
theme "ocean"

slide "Extremely Long Bulleted List"
bullets
${overflowSlideBullets}
`;
    const parsed = parsePresentation(code);
    assert.strictEqual(parsed.presentation.slides.length, 1);

    const doc = buildPdfPresentation(parsed.presentation);
    // Should have auto-paginated into multiple pages
    assert.ok(doc.getNumberOfPages() > 1, `Expected > 1 pages, got ${doc.getNumberOfPages()}`);
  });

  it('exportToPdfFile succeeds cleanly in Node environment', async () => {
    const testPres: Presentation = {
      title: 'Node Export Test',
      theme: 'emerald',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          line: 1,
          title: 'Hello PDF',
          layout: 'title-content',
          elements: [
            { id: 'el-1', type: 'text', content: 'Testing exportToPdfFile method', line: 2 },
          ],
        },
      ],
    };

    const result = await exportToPdfFile(testPres, { fileName: 'Node_Export_Test' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.fileName, 'Node_Export_Test.pdf');
  });
});
