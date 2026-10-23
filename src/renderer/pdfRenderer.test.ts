import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePresentation } from '../parser/presentationParser';
import { buildPdfPresentation, exportToPdfFile, formatPdfFileName } from './pdfRenderer';
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

  it('renders vector shapes, tables, and charts to PDF accurately', () => {
    const presentation: Presentation = {
      title: 'Visual Features Deck',
      theme: 'ocean',
      slides: [
        {
          id: 'slide-shapes',
          index: 0,
          line: 1,
          title: 'Native Shapes and Vectors',
          layout: 'title-content',
          background: '#0F172A',
          elements: [
            {
              id: 'shape-1',
              type: 'shape',
              content: 'rect',
              shapeType: 'rect',
              x: 1.0,
              y: 1.5,
              w: 2.0,
              h: 1.2,
              line: 2,
            },
            {
              id: 'shape-2',
              type: 'shape',
              content: 'circle',
              shapeType: 'circle',
              x: 3.5,
              y: 1.5,
              w: 1.5,
              h: 1.5,
              line: 3,
            },
            {
              id: 'shape-3',
              type: 'shape',
              content: 'arrow',
              shapeType: 'arrow',
              x: 5.5,
              y: 1.5,
              w: 2.0,
              h: 1.0,
              line: 4,
            },
            {
              id: 'shape-4',
              type: 'shape',
              content: 'triangle',
              shapeType: 'triangle',
              x: 8.0,
              y: 1.5,
              w: 1.5,
              h: 1.2,
              line: 5,
            },
          ],
        },
        {
          id: 'slide-table',
          index: 1,
          line: 10,
          title: 'Structured Table Data',
          layout: 'title-content',
          elements: [
            {
              id: 'table-1',
              type: 'table',
              content: 'Quarterly Results',
              headers: ['Quarter', 'Revenue ($M)', 'Growth YoY'],
              rows: [
                ['Q1 2026', '$14.2M', '+18%'],
                ['Q2 2026', '$16.8M', '+24%'],
                ['Q3 2026', '$19.5M', '+31%'],
              ],
              x: 1.0,
              y: 1.5,
              w: 8.0,
              h: 2.5,
              line: 11,
            },
          ],
        },
        {
          id: 'slide-chart',
          index: 2,
          line: 20,
          title: 'Performance Metrics Chart',
          layout: 'title-content',
          elements: [
            {
              id: 'chart-1',
              type: 'chart',
              content: 'Metrics',
              chartType: 'bar',
              title: 'Division Performance Index',
              data: [
                { label: 'Engineering', value: 92 },
                { label: 'Product', value: 88 },
                { label: 'Operations', value: 95 },
                { label: 'Marketing', value: 81 },
              ],
              x: 1.5,
              y: 1.5,
              w: 7.0,
              h: 3.2,
              line: 21,
            },
          ],
        },
      ],
    };

    const doc = buildPdfPresentation(presentation);
    assert.strictEqual(doc.getNumberOfPages(), 3);
    const pdfOutput = doc.output();
    assert.ok(pdfOutput.length > 1000, 'Expected non-empty valid PDF byte output');
    assert.ok(pdfOutput.startsWith('%PDF-'), 'Valid PDF magic header present');
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

  it('exportToPdfFile succeeds cleanly in Node environment and formats filename', async () => {
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

    assert.strictEqual(formatPdfFileName('Quarterly_Report.pptx'), 'Quarterly_Report.pdf');
    assert.strictEqual(formatPdfFileName('Annual_Plan.pdf.zip'), 'Annual_Plan.pdf');
  });
});
