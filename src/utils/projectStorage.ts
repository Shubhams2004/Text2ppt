/**
 * Client-Side Local Project Storage & Backup Manager
 *
 * Implements browser-only storage using IndexedDB with fallback to localStorage.
 * Keeps all presentations, assets, and edits on the user's device without uploading.
 */

export interface ProjectState {
  version: number;
  title?: string;
  code: string;
  simpleText?: string;
  batchText?: string;
  inputMode: 'code' | 'simple-text' | 'batch';
  activeSlideIndex: number;
  theme?: string;
  timestamp: number;
}

const DB_NAME = 'code2ppt_studio_db';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const STORAGE_KEY_CURRENT = 'code2ppt_current_project';
const LOCAL_STORAGE_FALLBACK_KEY = 'code2ppt_autosave_state';

// In-memory fallback if both IndexedDB and localStorage are unavailable
let inMemoryStore: ProjectState | null = null;

/**
 * Initializes and returns the browser IndexedDB database instance
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error || new Error('IndexedDB open error'));
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves project state locally on the user's device.
 * Prioritizes IndexedDB to support large presentations and assets, with graceful
 * fallback to localStorage and quota error handling.
 */
export async function saveProjectLocally(
  state: ProjectState
): Promise<{ success: boolean; storageType: 'indexeddb' | 'localstorage' | 'memory'; error?: string }> {
  // 1. Try IndexedDB
  try {
    const db = await openDatabase();
    return await new Promise((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const record = { id: STORAGE_KEY_CURRENT, ...state };
        const putRequest = store.put(record);

        putRequest.onsuccess = () => {
          resolve({ success: true, storageType: 'indexeddb' });
        };

        putRequest.onerror = (event) => {
          const err = (event.target as IDBRequest).error;
          console.warn('IndexedDB put error, falling back to localStorage:', err);
          resolve(saveToLocalStorageFallback(state));
        };
      } catch (txErr: any) {
        console.warn('IndexedDB transaction error, falling back to localStorage:', txErr);
        resolve(saveToLocalStorageFallback(state));
      }
    });
  } catch (_idbErr) {
    // IndexedDB not available, try localStorage
    return saveToLocalStorageFallback(state);
  }
}

/**
 * Fallback local storage save with quota exceeded handling
 */
function saveToLocalStorageFallback(
  state: ProjectState
): { success: boolean; storageType: 'localstorage' | 'memory'; error?: string } {
  if (typeof window === 'undefined' || !window.localStorage) {
    inMemoryStore = state;
    return { success: true, storageType: 'memory' };
  }

  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, serialized);
    return { success: true, storageType: 'localstorage' };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    console.warn('localStorage quota warning:', err);

    if (isQuota) {
      // Gracefully store in-memory to prevent user workflow interruption
      inMemoryStore = state;
      return {
        success: false,
        storageType: 'memory',
        error: 'Browser storage quota exceeded. Consider downloading a project backup.',
      };
    }

    inMemoryStore = state;
    return { success: false, storageType: 'memory', error: err?.message || 'Storage write failed' };
  }
}

/**
 * Loads the active project state from local browser storage.
 */
export async function loadProjectLocally(): Promise<ProjectState | null> {
  // 1. Try IndexedDB
  try {
    const db = await openDatabase();
    const idbResult = await new Promise<ProjectState | null>((resolve) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(STORAGE_KEY_CURRENT);

        getRequest.onsuccess = () => {
          const res = getRequest.result;
          if (res && res.code) {
            resolve({
              version: res.version || 1,
              title: res.title,
              code: res.code,
              simpleText: res.simpleText,
              batchText: res.batchText,
              inputMode: res.inputMode || 'code',
              activeSlideIndex: typeof res.activeSlideIndex === 'number' ? res.activeSlideIndex : 0,
              theme: res.theme,
              timestamp: res.timestamp || Date.now(),
            });
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    if (idbResult) return idbResult;
  } catch {
    // Ignore and proceed to localStorage
  }

  // 2. Try localStorage fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.code) {
          return {
            version: parsed.version || 1,
            title: parsed.title,
            code: parsed.code,
            simpleText: parsed.simpleText,
            batchText: parsed.batchText,
            inputMode: parsed.inputMode || 'code',
            activeSlideIndex: typeof parsed.activeSlideIndex === 'number' ? parsed.activeSlideIndex : 0,
            theme: parsed.theme,
            timestamp: parsed.timestamp || Date.now(),
          };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // 3. Return memory store if available
  return inMemoryStore;
}

/**
 * Exports a downloadable project backup file (.code2ppt / .json) directly from the browser.
 */
export function exportProjectBackup(state: ProjectState, suggestedFileName?: string): void {
  if (typeof window === 'undefined') return;

  const exportPayload = {
    app: 'Code2PPT STUDIO',
    format: 'code2ppt-project-backup',
    version: state.version || 1,
    exportedAt: new Date().toISOString(),
    title: state.title || 'Presentation',
    inputMode: state.inputMode,
    activeSlideIndex: state.activeSlideIndex,
    theme: state.theme,
    code: state.code,
    simpleText: state.simpleText,
    batchText: state.batchText,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const cleanName = (suggestedFileName || state.title || 'presentation')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const fileName = `${cleanName}.code2ppt.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates and parses project backup JSON string client-side
 */
export function parseProjectBackupJson(jsonString: string): ProjectState | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return null;

    const code = typeof data.code === 'string' ? data.code : '';
    const simpleText = typeof data.simpleText === 'string' ? data.simpleText : undefined;
    const batchText = typeof data.batchText === 'string' ? data.batchText : undefined;

    if (!code && !simpleText && !batchText) {
      return null;
    }

    return {
      version: data.version || 1,
      title: data.title || 'Imported Presentation',
      code: code || `presentation "Imported Presentation"\n\nslide "Slide 1"\ntext "Imported content"`,
      simpleText,
      batchText,
      inputMode: data.inputMode === 'simple-text' || data.inputMode === 'batch' ? data.inputMode : 'code',
      activeSlideIndex: typeof data.activeSlideIndex === 'number' ? data.activeSlideIndex : 0,
      theme: data.theme,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Converts Markdown text into Code2PPT DSL client-side
 */
export function convertMarkdownToCode(mdText: string): string {
  const lines = mdText.split(/\r?\n/);
  const slides: Array<{ title: string; bullets: string[]; texts: string[] }> = [];

  let currentTitle = 'Slide';
  let currentBullets: string[] = [];
  let currentTexts: string[] = [];
  let presentationTitle = '';

  const flushSlide = () => {
    if (currentBullets.length > 0 || currentTexts.length > 0 || slides.length === 0) {
      slides.push({
        title: currentTitle,
        bullets: [...currentBullets],
        texts: [...currentTexts],
      });
      currentBullets = [];
      currentTexts = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Header 1: presentation title or first slide
    if (line.startsWith('# ')) {
      const heading = line.slice(2).trim();
      if (!presentationTitle) {
        presentationTitle = heading;
      }
      flushSlide();
      currentTitle = heading;
      continue;
    }

    // Header 2: Slide title
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const heading = line.replace(/^#{2,3}\s+/, '').trim();
      flushSlide();
      currentTitle = heading;
      continue;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      currentBullets.push(line.replace(/^[-*•]\s+/, '').trim());
      continue;
    }

    // Standard paragraph text
    currentTexts.push(line);
  }

  flushSlide();

  const titleHeader = presentationTitle || slides[0]?.title || 'Presentation';
  const parts: string[] = [`presentation "${titleHeader}"\ntheme "modern"`];

  for (const s of slides) {
    parts.push(`\nslide "${s.title}"`);
    for (const t of s.texts) {
      parts.push(`text "${t.replace(/"/g, '\\"')}"`);
    }
    for (const b of s.bullets) {
      parts.push(`bullet "${b.replace(/"/g, '\\"')}"`);
    }
  }

  return parts.join('\n');
}

/**
 * Converts CSV text into a Code2PPT table slide client-side
 */
export function convertCsvToCode(csvText: string, suggestedTitle: string = 'Data Summary'): string {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return `presentation "Spreadsheet"\n\nslide "${suggestedTitle}"\ntext "No table rows found"`;
  }

  const parseRow = (line: string): string[] => {
    // Simple CSV parser handling quotes
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headerRow = parseRow(lines[0]);
  const dataRows = lines.slice(1, 15).map(parseRow); // Limit to top 15 rows for slide legibility

  const parts: string[] = [
    `presentation "${suggestedTitle}"`,
    `theme "modern"`,
    `\nslide "${suggestedTitle}" layout="title-content"`,
  ];

  const headersStr = headerRow.map((h) => `"${h.replace(/"/g, '\\"')}"`).join(', ');
  const rowsStr = dataRows
    .map((r) => `[${r.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(', ')}]`)
    .join(', ');

  parts.push(`table headers=[${headersStr}] rows=[${rowsStr}] x=0.8 y=1.5 w=8.4 h=3.4`);

  return parts.join('\n');
}
