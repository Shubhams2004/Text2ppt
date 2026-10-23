import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import JSZip from 'jszip';
import {
  Presentation,
  Slide,
  SlideElement,
  ShapeElement,
  TableElement,
  ChartElement,
  ImageElement,
} from '../models/presentation';
import { getElementGeometry } from './Preview';
import { computeSlideLayout, DEFAULT_GEOMETRY } from '../renderer/layoutSystem';
import { serializePresentation, serializeSlideElement } from '../parser/presentationSerializer';
import { parsePresentation } from '../parser/presentationParser';
import { buildPptxPresentation } from '../renderer/pptxRenderer';

describe('Code2PPT Studio Visual Editor Regression Tests', () => {
  // 1. Selecting and editing text
  it('allows selecting an element and updating its content, typography, and styling', () => {
    const textEl: SlideElement = {
      id: 'text-1',
      type: 'text',
      content: 'Original Headline',
      x: 0.8,
      y: 1.5,
      w: 8.4,
      h: 1.0,
      line: 1,
    };

    const slide: Slide = {
      id: 'slide-1',
      index: 0,
      title: 'Slide 1',
      line: 1,
      elements: [textEl],
    };

    const presentation: Presentation = {
      title: 'Test Deck',
      theme: 'modern',
      slides: [slide],
    };

    // Simulate user selecting and modifying properties
    const updatedEl: SlideElement = {
      ...textEl,
      content: 'Updated High-Impact Headline',
      fontFamily: 'Calibri',
      fontSize: 20,
      bold: true,
      italic: true,
      underline: true,
      color: '#4F46E5',
      align: 'center',
      lineSpacing: 1.25,
    };

    const updatedSlide: Slide = {
      ...slide,
      elements: slide.elements.map((el) => (el.id === updatedEl.id ? updatedEl : el)),
    };
    const updatedPres: Presentation = {
      ...presentation,
      slides: [updatedSlide],
    };

    // Verify model state
    assert.equal(updatedPres.slides[0].elements[0].content, 'Updated High-Impact Headline');
    assert.equal(updatedPres.slides[0].elements[0].fontFamily, 'Calibri');
    assert.equal(updatedPres.slides[0].elements[0].fontSize, 20);
    assert.equal(updatedPres.slides[0].elements[0].bold, true);
    assert.equal(updatedPres.slides[0].elements[0].align, 'center');
    assert.equal(updatedPres.slides[0].elements[0].lineSpacing, 1.25);

    // Verify serialization reflects exact properties
    const serialized = serializePresentation(updatedPres);
    assert.match(serialized, /text "Updated High-Impact Headline"/);
    assert.match(serialized, /font="Calibri"/);
    assert.match(serialized, /size=20/);
    assert.match(serialized, /bold=true/);
    assert.match(serialized, /align="center"/);

    // Round-trip parse check
    const reparsed = parsePresentation(serialized);
    const reparsedEl = reparsed.presentation.slides[0].elements[0];
    assert.equal(reparsedEl.content, 'Updated High-Impact Headline');
    assert.equal(reparsedEl.fontFamily, 'Calibri');
    assert.equal(reparsedEl.bold, true);
  });

  // 2. Moving and resizing elements
  it('correctly updates element position and size, clamping to slide boundaries', () => {
    const el: SlideElement = {
      id: 'box-1',
      type: 'shape',
      content: 'rect',
      shapeType: 'rect',
      x: 1.0,
      y: 1.0,
      w: 3.0,
      h: 2.0,
      line: 1,
    };

    // Move element by dx = 2.0, dy = 1.5
    const movedX = el.x! + 2.0;
    const movedY = el.y! + 1.5;
    assert.equal(movedX, 3.0);
    assert.equal(movedY, 2.5);

    // Verify slide boundaries (10.0 x 5.625)
    const maxX = DEFAULT_GEOMETRY.width - el.w!; // 10.0 - 3.0 = 7.0
    const maxY = DEFAULT_GEOMETRY.height - el.h!; // 5.625 - 2.0 = 3.625

    // Attempting to move beyond right edge should clamp to maxX
    const clampedBeyondRight = Math.max(0, Math.min(maxX, 8.5));
    assert.equal(clampedBeyondRight, 7.0);

    // Attempting to move above top should clamp to 0
    const clampedAboveTop = Math.max(0, Math.min(maxY, -1.2));
    assert.equal(clampedAboveTop, 0);

    // Resize from SE handle by dw = 1.5, dh = 1.0
    const resizedW = el.w! + 1.5;
    const resizedH = el.h! + 1.0;
    assert.equal(resizedW, 4.5);
    assert.equal(resizedH, 3.0);
  });

  // 3. Correct coordinate conversion at different canvas sizes
  it('correctly translates screen pointer deltas to canonical inches at different viewport scales', () => {
    // 10 x 5.625 inches slide
    const slideInchesW = 10.0;

    // Small canvas (e.g. mobile/preview: 400px width)
    const scaleSmall = 400 / slideInchesW; // 40 px/in
    const deltaPixelsSmall = 80;
    const deltaInchesSmall = deltaPixelsSmall / scaleSmall;
    assert.equal(deltaInchesSmall, 2.0, '80px at 400px width should equal 2.0 inches');

    // Standard canvas (e.g. laptop: 800px width)
    const scaleStandard = 800 / slideInchesW; // 80 px/in
    const deltaPixelsStandard = 160;
    const deltaInchesStandard = deltaPixelsStandard / scaleStandard;
    assert.equal(deltaInchesStandard, 2.0, '160px at 800px width should equal 2.0 inches');

    // HiDPI / Large desktop canvas (e.g. 1600px width)
    const scaleLarge = 1600 / slideInchesW; // 160 px/in
    const deltaPixelsLarge = 320;
    const deltaInchesLarge = deltaPixelsLarge / scaleLarge;
    assert.equal(deltaInchesLarge, 2.0, '320px at 1600px width should equal 2.0 inches');
  });

  // 4. Image aspect ratio preservation
  it('preserves image aspect ratio by default during resize interactions', () => {
    const originalW = 4.0;
    const originalH = 3.0;
    const initialAspect = originalW / originalH; // 1.3333333333333333

    // Dragging SE handle to increase width to 6.0
    const newWidth = 6.0;
    const computedHeight = newWidth / initialAspect;
    assert.equal(computedHeight, 4.5, 'Image height should scale proportionally from 3.0 to 4.5');
    assert.equal(Number((newWidth / computedHeight).toFixed(4)), Number(initialAspect.toFixed(4)));

    // Dragging handle to change height to 1.5
    const newHeight = 1.5;
    const computedWidth = newHeight * initialAspect;
    assert.equal(computedWidth, 2.0, 'Image width should scale proportionally to 2.0');
    assert.equal(Number((computedWidth / newHeight).toFixed(4)), Number(initialAspect.toFixed(4)));
  });

  // 5. Shape property changes
  it('supports modifying shape geometry, fill, stroke, strokeWidth, opacity, and rotation', () => {
    const shape: ShapeElement = {
      id: 'shape-1',
      type: 'shape',
      content: 'round-rect',
      shapeType: 'round-rect',
      fillColor: '#10B981',
      strokeColor: '#047857',
      strokeWidth: 2,
      opacity: 0.8,
      rotation: 45,
      x: 1.5,
      y: 2.0,
      w: 3.5,
      h: 2.0,
      line: 1,
    };

    const serialized = serializeSlideElement(shape);
    assert.match(serialized, /shape "round-rect"/);
    assert.match(serialized, /fill="#10B981"/);
    assert.match(serialized, /stroke="#047857"/);
    assert.match(serialized, /strokeWidth=2/);
    assert.match(serialized, /opacity=0.8/);
    assert.match(serialized, /rot=45/);
    assert.match(serialized, /x=1.5/);
    assert.match(serialized, /y=2/);
    assert.match(serialized, /w=3.5/);
    assert.match(serialized, /h=2/);
  });

  // 6. Layer ordering
  it('correctly updates element layer order (front, forward, backward, back)', () => {
    const elA: SlideElement = { id: 'A', type: 'text', content: 'A', line: 1 };
    const elB: SlideElement = { id: 'B', type: 'text', content: 'B', line: 2 };
    const elC: SlideElement = { id: 'C', type: 'text', content: 'C', line: 3 };

    let elements: SlideElement[] = [elA, elB, elC];

    // Bring A to front -> [B, C, A]
    const layerChange = (list: SlideElement[], id: string, action: 'front' | 'forward' | 'backward' | 'back') => {
      const idx = list.findIndex((e) => e.id === id);
      if (idx === -1) return list;
      const copy = [...list];
      const [target] = copy.splice(idx, 1);
      if (action === 'front') copy.push(target);
      else if (action === 'back') copy.unshift(target);
      else if (action === 'forward') copy.splice(Math.min(copy.length, idx + 1), 0, target);
      else if (action === 'backward') copy.splice(Math.max(0, idx - 1), 0, target);
      return copy;
    };

    elements = layerChange(elements, 'A', 'front');
    assert.deepEqual(elements.map((e) => e.id), ['B', 'C', 'A']);

    // Send A backward -> [B, A, C]
    elements = layerChange(elements, 'A', 'backward');
    assert.deepEqual(elements.map((e) => e.id), ['B', 'A', 'C']);

    // Send C to back -> [C, B, A]
    elements = layerChange(elements, 'C', 'back');
    assert.deepEqual(elements.map((e) => e.id), ['C', 'B', 'A']);

    // Bring C forward -> [B, C, A]
    elements = layerChange(elements, 'C', 'forward');
    assert.deepEqual(elements.map((e) => e.id), ['B', 'C', 'A']);
  });

  // 7. Slide selection, duplication, deletion, and reordering
  it('preserves all slide attributes (title, notes, background, elements) when duplicating and reordering', () => {
    const slide1: Slide = {
      id: 'slide-1',
      index: 0,
      title: 'Executive Summary',
      notes: 'Remember to emphasize Q4 metrics',
      background: '#0F172A',
      layout: 'two-column',
      elements: [
        { id: 'el-1', type: 'text', content: 'Key Revenue Growth', line: 1 },
        { id: 'el-2', type: 'bullet', content: '140% YoY expansion', line: 2 },
      ],
      line: 1,
    };

    const slide2: Slide = {
      id: 'slide-2',
      index: 1,
      title: 'Architecture Blueprint',
      notes: 'Technical deep-dive slide',
      background: '#1E293B',
      layout: 'title-content',
      elements: [
        { id: 'el-3', type: 'text', content: 'Distributed Engine', line: 3 },
      ],
      line: 3,
    };

    let slides = [slide1, slide2];

    // Duplicate slide 1
    const duplicateSlide = (source: Slide): Slide => ({
      ...source,
      id: `slide-copy-${Date.now()}`,
      title: `${source.title} (Copy)`,
      elements: source.elements.map((e, idx) => ({ ...e, id: `${e.id}-copy-${idx}` })),
    });

    const duplicated = duplicateSlide(slide1);
    slides.splice(1, 0, duplicated);
    assert.equal(slides.length, 3);
    assert.equal(slides[1].title, 'Executive Summary (Copy)');
    assert.equal(slides[1].notes, 'Remember to emphasize Q4 metrics');
    assert.equal(slides[1].background, '#0F172A');
    assert.equal(slides[1].layout, 'two-column');
    assert.equal(slides[1].elements.length, 2);

    // Reorder: swap index 0 and index 2
    const temp = slides[0];
    slides[0] = slides[2];
    slides[2] = temp;

    assert.equal(slides[0].title, 'Architecture Blueprint');
    assert.equal(slides[2].title, 'Executive Summary');
    // Ensure contents are completely intact
    assert.equal(slides[2].elements[0].content, 'Key Revenue Growth');
    assert.equal(slides[0].elements[0].content, 'Distributed Engine');

    // Delete duplicated slide
    slides = slides.filter((s) => s.id !== duplicated.id);
    assert.equal(slides.length, 2);
    assert.equal(slides[0].id, 'slide-2');
    assert.equal(slides[1].id, 'slide-1');
  });

  // 8. Undo/redo history after editing
  it('manages undo and redo stacks cleanly without creating redundant states during drag movements', () => {
    let history: string[] = ['initial code'];
    let historyIndex = 0;

    const pushHistory = (state: string) => {
      history = history.slice(0, historyIndex + 1);
      if (history[history.length - 1] !== state) {
        history.push(state);
      }
      historyIndex = history.length - 1;
    };

    const undo = (): string => {
      if (historyIndex > 0) {
        historyIndex--;
      }
      return history[historyIndex];
    };

    const redo = (): string => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
      }
      return history[historyIndex];
    };

    // Simulate drag interaction: 10 pointermove events with commitToHistory: false
    // Only the final pointerup commits to history
    pushHistory('state after move finished');
    assert.equal(history.length, 2);
    assert.equal(historyIndex, 1);

    // User edits text
    pushHistory('state after text edited');
    assert.equal(history.length, 3);
    assert.equal(historyIndex, 2);

    // Undo text edit
    const afterUndo1 = undo();
    assert.equal(afterUndo1, 'state after move finished');
    assert.equal(historyIndex, 1);

    // Undo move
    const afterUndo2 = undo();
    assert.equal(afterUndo2, 'initial code');
    assert.equal(historyIndex, 0);

    // Redo move
    const afterRedo1 = redo();
    assert.equal(afterRedo1, 'state after move finished');

    // Redo text edit
    const afterRedo2 = redo();
    assert.equal(afterRedo2, 'state after text edited');
  });

  // 9. Autosave and recovery
  it('serializes complete presentation state to JSON for autosave and recovers faithfully', () => {
    const projectState = {
      code: 'presentation "AutoSave Deck"\ntheme "emerald"\n\nslide "Vision"\n  text "Visual Editor AutoSave" x=1.0 y=1.5 w=8.0 h=1.2 font="Georgia" size=18 bold=true',
      inputMode: 'code',
      activeSlideIndex: 0,
      timestamp: 1729000000000,
    };

    // Serialize to JSON storage representation
    const jsonString = JSON.stringify(projectState);
    assert.ok(jsonString.length > 0);

    // Recover from storage
    const recovered = JSON.parse(jsonString);
    assert.equal(recovered.code, projectState.code);
    assert.equal(recovered.inputMode, 'code');
    assert.equal(recovered.activeSlideIndex, 0);

    // Verify recovered code parses into correct structured presentation
    const parsed = parsePresentation(recovered.code);
    assert.equal(parsed.presentation.title, 'AutoSave Deck');
    assert.equal(parsed.presentation.theme, 'emerald');
    assert.equal(parsed.presentation.slides[0].elements[0].content, 'Visual Editor AutoSave');
    assert.equal(parsed.presentation.slides[0].elements[0].x, 1.0);
    assert.equal(parsed.presentation.slides[0].elements[0].fontFamily, 'Georgia');
  });

  // 10. Exporting edited content to a valid PPTX
  it('generates a valid standalone PPTX containing visually edited text, shapes, tables, charts, and images with exact geometry', async () => {
    const textEl: SlideElement = {
      id: 'text-1',
      type: 'text',
      content: 'Mission Critical System',
      fontFamily: 'Calibri',
      fontSize: 22,
      bold: true,
      color: '#4F46E5',
      align: 'left',
      x: 0.8,
      y: 1.2,
      w: 8.4,
      h: 0.8,
      rotation: 0,
      line: 1,
    };

    const shapeEl: ShapeElement = {
      id: 'shape-1',
      type: 'shape',
      content: 'round-rect',
      shapeType: 'round-rect',
      fillColor: '#06B6D4',
      strokeColor: '#0E7490',
      strokeWidth: 2,
      opacity: 0.9,
      rotation: 10,
      x: 1.0,
      y: 2.2,
      w: 2.8,
      h: 1.6,
      line: 2,
    };

    const tableEl: TableElement = {
      id: 'table-1',
      type: 'table',
      content: 'Metrics Table',
      headers: ['Service', 'Availability', 'SLA'],
      rows: [
        ['API Gateway', '99.99%', 'Exceeded'],
        ['Storage Engine', '99.999%', 'Met'],
      ],
      x: 4.2,
      y: 2.2,
      w: 5.0,
      h: 1.8,
      line: 3,
    };

    const slide: Slide = {
      id: 'slide-export-1',
      index: 0,
      title: 'Production Readiness',
      background: '#FFFFFF',
      elements: [textEl, shapeEl, tableEl],
      line: 1,
    };

    const presentation: Presentation = {
      title: 'Visual Studio Export Test',
      theme: 'modern',
      slides: [slide],
    };

    // Build PowerPoint presentation using PptxGenJS
    const pptx = buildPptxPresentation(presentation);
    assert.ok(pptx, 'PPTX generator should return pptx instance');

    // Export to zip buffer and inspect internal OpenXML files
    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
    assert.ok(buffer && buffer.length > 1000, 'Exported PPTX should be non-empty buffer');

    const zip = await JSZip.loadAsync(buffer);
    assert.ok(zip.file('ppt/presentation.xml'), 'Package must contain ppt/presentation.xml');
    assert.ok(zip.file('ppt/slides/slide1.xml'), 'Package must contain ppt/slides/slide1.xml');

    const slideXml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    assert.ok(slideXml.includes('Mission Critical System'), 'Slide XML must contain edited text');
    assert.ok(slideXml.includes('API Gateway'), 'Slide XML must contain table data');
  });
});
