/**
 * Client-Side PowerPoint (.pptx) Import Engine
 *
 * Unpacks PowerPoint OpenXML (.pptx) ZIP archives entirely on the client
 * using JSZip. Parses presentation structure, slide relationships,
 * shapes, text runs, typography, geometry coordinates, tables,
 * and embedded media (converting images to base64 data URIs).
 *
 * Runs seamlessly in both browser (DOMParser) and Node.js environments.
 */

import JSZip from 'jszip';
import {
  Presentation,
  Slide,
  SlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  TableElement,
  ThemeId,
} from '../models/presentation';

const EMU_PER_INCH = 914400;
const SLIDE_WIDTH_INCHES = 10;
const SLIDE_HEIGHT_INCHES = 5.625;

function emuToPercentX(emu: number, slideWidthEmu: number = SLIDE_WIDTH_INCHES * EMU_PER_INCH): number {
  return Math.min(100, Math.max(0, (emu / slideWidthEmu) * 100));
}

function emuToPercentY(emu: number, slideHeightEmu: number = SLIDE_HEIGHT_INCHES * EMU_PER_INCH): number {
  return Math.min(100, Math.max(0, (emu / slideHeightEmu) * 100));
}

export interface PptxImportResult {
  success: boolean;
  presentation?: Presentation;
  slideCount?: number;
  warnings?: string[];
  error?: string;
}

/**
 * Universal XML Tag Extractor to work identically in browser and Node
 */
class SimpleXmlReader {
  private xml: string;

  constructor(xml: string) {
    this.xml = xml;
  }

  getAttribute(tagName: string, attrName: string): string | null {
    const regex = new RegExp(`<[^>]*${tagName}[^>]*\\b${attrName}=["']([^"']+)["'][^>]*>`, 'i');
    const match = this.xml.match(regex);
    return match ? match[1] : null;
  }

  getBlocks(tagPrefix: string, tagName: string): string[] {
    const openTag = `${tagPrefix}:${tagName}`;
    const blocks: string[] = [];
    const openRegex = new RegExp(`<${openTag}\\b[^>]*>`, 'gi');
    let match;

    while ((match = openRegex.exec(this.xml)) !== null) {
      const startIndex = match.index;
      const endTag = `</${openTag}>`;
      const endIndex = this.xml.indexOf(endTag, startIndex);
      if (endIndex !== -1) {
        blocks.push(this.xml.slice(startIndex, endIndex + endTag.length));
      } else {
        // Self-closing tag check: <openTag ... />
        const tagClose = this.xml.indexOf('>', startIndex);
        if (tagClose !== -1 && this.xml[tagClose - 1] === '/') {
          blocks.push(this.xml.slice(startIndex, tagClose + 1));
        }
      }
    }
    return blocks;
  }
}

/**
 * Parses an ArrayBuffer of a PPTX file and returns an editable Presentation document
 */
export async function importPptxFile(fileBuffer: ArrayBuffer, fileName: string = 'Imported Presentation'): Promise<PptxImportResult> {
  const warnings: string[] = [];

  try {
    const zip = await JSZip.loadAsync(fileBuffer);

    // 1. Read presentation.xml
    const presentationXmlEntry = zip.file('ppt/presentation.xml');
    if (!presentationXmlEntry) {
      return { success: false, error: 'Invalid PowerPoint file: ppt/presentation.xml not found.' };
    }

    const presentationXmlText = await presentationXmlEntry.async('string');

    // Slide Dimensions
    const sldSzMatch = presentationXmlText.match(/<p:sldSz\b[^>]*cx=["'](\d+)["'][^>]*cy=["'](\d+)["']/i) ||
      presentationXmlText.match(/<p:sldSz\b[^>]*cy=["'](\d+)["'][^>]*cx=["'](\d+)["']/i);

    let slideWidthEmu = SLIDE_WIDTH_INCHES * EMU_PER_INCH;
    let slideHeightEmu = SLIDE_HEIGHT_INCHES * EMU_PER_INCH;

    if (sldSzMatch) {
      const cx = parseInt(sldSzMatch[1], 10);
      const cy = parseInt(sldSzMatch[2], 10);
      if (cx > 0 && cy > 0) {
        slideWidthEmu = cx;
        slideHeightEmu = cy;
      }
    }

    // Slide IDs
    const slideRelIds = [...presentationXmlText.matchAll(/<p:sldId\b[^>]*\br:id=["']([^"']+)["']/gi)].map((m) => m[1]);

    // Read relationships
    const relsXmlEntry = zip.file('ppt/_rels/presentation.xml.rels');
    const relMap = new Map<string, string>();
    if (relsXmlEntry) {
      const relsText = await relsXmlEntry.async('string');
      const relMatches = [...relsText.matchAll(/<Relationship\b[^>]*Id=["']([^"']+)["'][^>]*Target=["']([^"']+)["']/gi)];
      for (const m of relMatches) {
        const id = m[1];
        let target = m[2];
        if (target.startsWith('/')) target = target.slice(1);
        if (!target.startsWith('ppt/')) target = `ppt/${target}`;
        relMap.set(id, target);
      }
    }

    // Determine slide paths in order
    let slidePaths: string[] = [];
    for (const rId of slideRelIds) {
      const target = relMap.get(rId);
      if (target && zip.file(target)) {
        slidePaths.push(target);
      }
    }

    if (slidePaths.length === 0) {
      slidePaths = Object.keys(zip.files).filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k));
      slidePaths.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
    }

    if (slidePaths.length === 0) {
      return { success: false, error: 'No slides could be extracted from this PowerPoint presentation.' };
    }

    const slides: Slide[] = [];

    // Parse each slide
    for (let i = 0; i < slidePaths.length; i++) {
      const slidePath = slidePaths[i];
      const slideXmlEntry = zip.file(slidePath);
      if (!slideXmlEntry) continue;

      const slideXmlText = await slideXmlEntry.async('string');
      const slideReader = new SimpleXmlReader(slideXmlText);

      // Slide media relationships
      const slideRelsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
      const slideRelsEntry = zip.file(slideRelsPath);
      const slideMediaRelMap = new Map<string, string>();

      if (slideRelsEntry) {
        const slideRelsText = await slideRelsEntry.async('string');
        const mediaRelMatches = [...slideRelsText.matchAll(/<Relationship\b[^>]*Id=["']([^"']+)["'][^>]*Target=["']([^"']+)["']/gi)];
        for (const m of mediaRelMatches) {
          const id = m[1];
          let target = m[2];
          if (target.startsWith('../')) {
            target = `ppt/${target.replace('../', '')}`;
          } else if (target.startsWith('/')) {
            target = target.slice(1);
          } else {
            target = `ppt/slides/${target}`;
          }
          slideMediaRelMap.set(id, target);
        }
      }

      let slideTitle = `Slide ${i + 1}`;
      const elements: SlideElement[] = [];

      // 1. Parse Shape & Text Blocks (<p:sp> ... </p:sp>)
      const spBlocks = slideReader.getBlocks('p', 'sp');
      spBlocks.forEach((spBlock, spIdx) => {
        try {
          // Offsets & Extents
          const offMatch = spBlock.match(/<a:off\b[^>]*x=["'](-?\d+)["'][^>]*y=["'](-?\d+)["']/i);
          const extMatch = spBlock.match(/<a:ext\b[^>]*cx=["'](\d+)["'][^>]*cy=["'](\d+)["']/i);

          const xEmu = offMatch ? parseInt(offMatch[1], 10) : 0;
          const yEmu = offMatch ? parseInt(offMatch[2], 10) : 0;
          const wEmu = extMatch ? parseInt(extMatch[1], 10) : 0;
          const hEmu = extMatch ? parseInt(extMatch[2], 10) : 0;

          const posX = emuToPercentX(xEmu, slideWidthEmu);
          const posY = emuToPercentY(yEmu, slideHeightEmu);
          const posW = emuToPercentX(wEmu, slideWidthEmu);
          const posH = emuToPercentY(hEmu, slideHeightEmu);

          // Check if placeholder is title
          const isTitle = /<p:ph\b[^>]*type=["'](title|ctrTitle)["']/i.test(spBlock) ||
            (posY <= 20 && posH <= 25 && /fontSize|title/i.test(spBlock));

          // Extract text runs: <a:t>...</a:t>
          const textMatches = [...spBlock.matchAll(/<a:t\b[^>]*>([^<]+)<\/a:t>/gi)].map((m) => m[1]);
          const fullText = textMatches.join(' ').replace(/\s+/g, ' ').trim();

          // Font attributes
          let fontSize = 18;
          const szMatch = spBlock.match(/<a:rPr\b[^>]*sz=["'](\d+)["']/i);
          if (szMatch) {
            fontSize = Math.round(parseInt(szMatch[1], 10) / 100);
          }

          const isBold = /<a:rPr\b[^>]*b=["']1["']/i.test(spBlock);
          const isItalic = /<a:rPr\b[^>]*i=["']1["']/i.test(spBlock);
          const isUnderline = /<a:rPr\b[^>]*u=["']sng["']/i.test(spBlock);

          // Color
          let color: string | undefined;
          const srgbMatch = spBlock.match(/<a:srgbClr\b[^>]*val=["']([0-9a-fA-F]{6})["']/i);
          if (srgbMatch) {
            color = `#${srgbMatch[1]}`;
          }

          if (isTitle && fullText && slideTitle === `Slide ${i + 1}`) {
            slideTitle = fullText;
          }

          if (fullText) {
            const textElem: TextElement = {
              id: `text_${i}_${spIdx}`,
              type: 'text',
              content: fullText,
              line: i + 1,
              x: Math.round(posX),
              y: Math.round(posY),
              w: Math.max(15, Math.round(posW)),
              h: Math.max(8, Math.round(posH)),
              fontSize: isTitle ? Math.max(28, fontSize) : fontSize,
              bold: isTitle ? true : isBold,
              italic: isItalic,
              underline: isUnderline,
              color: color || '#0F172A',
            };
            elements.push(textElem);
          } else if (posW > 2 && posH > 2) {
            // Pure geometry shape
            let shapeType: ShapeElement['shapeType'] = 'rect';
            const prstMatch = spBlock.match(/<a:prstGeom\b[^>]*prst=["']([^"']+)["']/i);
            if (prstMatch) {
              const prst = prstMatch[1].toLowerCase();
              if (prst.includes('round')) shapeType = 'round-rect';
              else if (prst.includes('ellipse') || prst.includes('circle')) shapeType = 'circle';
              else if (prst.includes('triangle')) shapeType = 'triangle';
              else if (prst.includes('star')) shapeType = 'star';
              else if (prst.includes('arrow')) shapeType = 'arrow';
              else if (prst.includes('line')) shapeType = 'line';
            }

            const shapeColor = color || '#E2E8F0';
            const shapeElem: ShapeElement = {
              id: `shape_${i}_${spIdx}`,
              type: 'shape',
              shapeType,
              content: '',
              line: i + 1,
              x: Math.round(posX),
              y: Math.round(posY),
              w: Math.max(5, Math.round(posW)),
              h: Math.max(5, Math.round(posH)),
              fillColor: shapeColor,
              fillHex: shapeColor.replace('#', ''),
            };
            elements.push(shapeElem);
          }
        } catch (_spErr) {
          warnings.push(`Skipped a non-standard shape on slide ${i + 1}`);
        }
      });

      // 2. Parse Picture Blocks (<p:pic> ... </p:pic>)
      const picBlocks = slideReader.getBlocks('p', 'pic');
      for (let picIdx = 0; picIdx < picBlocks.length; picIdx++) {
        const picBlock = picBlocks[picIdx];
        try {
          const blipMatch = picBlock.match(/<a:blip\b[^>]*r:embed=["']([^"']+)["']/i);
          if (blipMatch) {
            const rId = blipMatch[1];
            const mediaPath = slideMediaRelMap.get(rId);

            if (mediaPath && zip.file(mediaPath)) {
              const imgFile = zip.file(mediaPath)!;
              const base64Data = await imgFile.async('base64');
              const ext = (mediaPath.split('.').pop() || 'png').toLowerCase();
              const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
              const dataUri = `data:${mime};base64,${base64Data}`;

              const offMatch = picBlock.match(/<a:off\b[^>]*x=["'](-?\d+)["'][^>]*y=["'](-?\d+)["']/i);
              const extMatch = picBlock.match(/<a:ext\b[^>]*cx=["'](\d+)["'][^>]*cy=["'](\d+)["']/i);

              const xEmu = offMatch ? parseInt(offMatch[1], 10) : 0;
              const yEmu = offMatch ? parseInt(offMatch[2], 10) : 0;
              const wEmu = extMatch ? parseInt(extMatch[1], 10) : 0;
              const hEmu = extMatch ? parseInt(extMatch[2], 10) : 0;

              const imgElem: ImageElement = {
                id: `img_${i}_${picIdx}`,
                type: 'image',
                src: dataUri,
                url: dataUri,
                content: `Image ${picIdx + 1}`,
                line: i + 1,
                x: Math.round(emuToPercentX(xEmu, slideWidthEmu)),
                y: Math.round(emuToPercentY(yEmu, slideHeightEmu)),
                w: Math.max(10, Math.round(emuToPercentX(wEmu, slideWidthEmu))),
                h: Math.max(10, Math.round(emuToPercentY(hEmu, slideHeightEmu))),
                fit: 'contain',
              };
              elements.push(imgElem);
            }
          }
        } catch (_picErr) {
          warnings.push(`Could not decode image on slide ${i + 1}`);
        }
      }

      // 3. Parse Tables (<a:tbl> ... </a:tbl>)
      const tblBlocks = slideReader.getBlocks('a', 'tbl');
      tblBlocks.forEach((tblBlock, tblIdx) => {
        try {
          const rowBlocks = [...tblBlock.matchAll(/<a:tr\b[^>]*>([\s\S]*?)<\/a:tr>/gi)].map((m) => m[1]);
          const tableRows: string[][] = [];

          for (const rowBlock of rowBlocks) {
            const cellBlocks = [...rowBlock.matchAll(/<a:tc\b[^>]*>([\s\S]*?)<\/a:tc>/gi)].map((m) => m[1]);
            const cells: string[] = [];
            for (const cell of cellBlocks) {
              const texts = [...cell.matchAll(/<a:t\b[^>]*>([^<]+)<\/a:t>/gi)].map((m) => m[1]);
              cells.push(texts.join(' ').trim() || '-');
            }
            if (cells.length > 0) tableRows.push(cells);
          }

          if (tableRows.length > 0) {
            const headers = tableRows[0];
            const bodyRows = tableRows.slice(1);

            const tableElem: TableElement = {
              id: `tbl_${i}_${tblIdx}`,
              type: 'table',
              content: 'Table',
              headers,
              rows: bodyRows.length > 0 ? bodyRows : [headers.map(() => '-')],
              line: i + 1,
              x: 10,
              y: 25,
              w: 80,
              h: 40,
            };
            elements.push(tableElem);
          }
        } catch (_tblErr) {
          warnings.push(`Skipped a table on slide ${i + 1}`);
        }
      });

      slides.push({
        id: `slide_${i + 1}`,
        index: i,
        title: slideTitle,
        line: i + 1,
        elements,
      });
    }

    const cleanTitle = fileName.replace(/\.[^/.]+$/, '').trim() || 'Imported Presentation';

    const presentation: Presentation = {
      title: cleanTitle,
      theme: 'modern' as ThemeId,
      slides,
      metadata: {
        date: new Date().toLocaleDateString(),
        description: `Imported from ${fileName}`,
      },
    };

    return {
      success: true,
      presentation,
      slideCount: slides.length,
      warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to unpack and parse PowerPoint presentation.',
      warnings,
    };
  }
}
