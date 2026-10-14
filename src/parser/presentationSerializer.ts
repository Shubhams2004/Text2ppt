import {
  ChartElement,
  ImageElement,
  Presentation,
  ShapeElement,
  TableElement,
} from '../models/presentation';

/**
 * Serializes a typed Presentation model into clean, deterministic Code2PPT DSL markup
 */
export function presentationToDsl(pres: Presentation): string {
  const lines: string[] = [];
  lines.push(`presentation "${pres.title || 'Untitled Presentation'}"`);
  lines.push(`theme "${pres.theme || 'modern'}"`);
  if (pres.transition && pres.transition.style !== 'none') {
    let trCmd = `transition "${pres.transition.style}"`;
    if (pres.transition.direction) trCmd += ` dir="${pres.transition.direction}"`;
    if (pres.transition.speed) trCmd += ` speed="${pres.transition.speed}"`;
    lines.push(trCmd);
  }
  lines.push('');

  for (const slide of pres.slides) {
    let slideCmd = `slide "${slide.title || 'Untitled Slide'}"`;
    if (slide.layout && slide.layout !== 'title-content') {
      slideCmd += ` layout="${slide.layout}"`;
    }
    lines.push(slideCmd);

    if (slide.background) {
      lines.push(`background "${slide.background}"`);
    }

    if (slide.transition && slide.transition.style !== 'none') {
      let trCmd = `transition "${slide.transition.style}"`;
      if (slide.transition.direction) trCmd += ` dir="${slide.transition.direction}"`;
      if (slide.transition.speed) trCmd += ` speed="${slide.transition.speed}"`;
      lines.push(trCmd);
    }

    for (const el of slide.elements) {
      const linkAttr = el.link ? ` link="${el.link}"` : '';

      switch (el.type) {
        case 'text':
          lines.push(`text "${el.content}"${linkAttr}`);
          break;
        case 'bullet':
          lines.push(`bullet "${el.content}"${linkAttr}`);
          break;
        case 'subtitle':
          lines.push(`subtitle "${el.content}"${linkAttr}`);
          break;
        case 'quote':
          lines.push(`quote "${el.content}"${linkAttr}`);
          break;
        case 'image':
          lines.push(`image "${(el as ImageElement).src}"`);
          break;
        case 'shape': {
          const s = el as ShapeElement;
          let cmd = `shape "${s.shapeType}"`;
          if (s.fillColor) cmd += ` fill="${s.fillColor}"`;
          if (s.strokeColor) cmd += ` stroke="${s.strokeColor}"`;
          cmd += linkAttr;
          lines.push(cmd);
          break;
        }
        case 'table': {
          const t = el as TableElement;
          const headersStr = (t.headers || []).join(', ');
          const rowsStr = (t.rows || []).map((r) => r.join(', ')).join('; ');
          lines.push(`table headers="${headersStr}" rows="${rowsStr}"`);
          break;
        }
        case 'chart': {
          const c = el as ChartElement;
          const dataStr = (c.data || []).map((d) => `${d.label}:${d.value}`).join(', ');
          lines.push(`chart "${c.chartType}" data="${dataStr}"`);
          break;
        }
      }
    }

    if (slide.notes) {
      lines.push(`notes "${slide.notes}"`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Project file format schema
 */
export interface StudioProjectData {
  version: number;
  appName: string;
  title: string;
  theme: string;
  inputMode: 'code' | 'simple-text' | 'batch';
  code: string;
  savedAt: string;
}

/**
 * Downloads the current project as a JSON backup file
 */
export function exportProjectToJson(
  title: string,
  theme: string,
  inputMode: 'code' | 'simple-text' | 'batch',
  code: string
): void {
  const projectData: StudioProjectData = {
    version: 1,
    appName: 'Code2PPT STUDIO',
    title: title || 'Untitled Presentation',
    theme: theme || 'modern',
    inputMode,
    code,
    savedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (title || 'presentation').trim().replace(/[/\\?%*:|"<>]/g, '_');
  a.download = `${safeName}.code2ppt.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a CSV string into a presentation table slide
 */
export function convertCsvToPresentation(csvContent: string, fileName?: string): string {
  const lines = csvContent.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return '';

  const deckTitle = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Data Table';
  const parsedRows = lines.map((line) => {
    // Simple CSV parser handling quotes or commas
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  });

  const headers = parsedRows[0] || [];
  const rows = parsedRows.slice(1);

  const dslLines = [
    `presentation "${deckTitle}"`,
    `theme "ocean"`,
    '',
    `slide "${deckTitle}" layout="title-content"`,
    `subtitle "Imported from CSV (${lines.length} rows)"`,
    `table headers="${headers.join(', ')}" rows="${rows.slice(0, 15).map((r) => r.join(', ')).join('; ')}"`,
  ];

  return dslLines.join('\n');
}
