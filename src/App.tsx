import { useState, useMemo, useCallback, useEffect } from 'react';
import { parsePresentation } from './parser/presentationParser';
import { parseSimpleText } from './parser/simpleTextParser';
import {
  parseBatchPresentations,
  serializeBatchPresentations,
  countPresentationDeclarations,
} from './parser/batchParser';
import { exportToPptxFile, exportBatchToZipFile } from './renderer/pptxRenderer';
import { exportToPdfFile } from './renderer/pdfRenderer';
import { autoPaginatePresentation } from './renderer/layoutSystem';
import { cleanPresentationText } from './utils/contentQuality';
import { validatePresentationQuality } from './utils/qualityValidators';
import { serializePresentation } from './parser/presentationSerializer';
import { DEFAULT_CODE, DEFAULT_SIMPLE_TEXT, DEFAULT_BATCH_TEXT } from './examples/samplePresentations';
import { Header, ExportFormat } from './components/Header';
import { Editor, InputMode } from './components/Editor';
import { Preview } from './components/Preview';
import { ValidationStatus } from './components/ValidationStatus';
import { HelpModal } from './components/HelpModal';
import { Presentation, ThemeId, ValidationIssue } from './models/presentation';
import {
  FileDown,
  FileType,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import {
  saveProjectLocally,
  loadProjectLocally,
  exportProjectBackup,
  parseProjectBackupJson,
  convertMarkdownToCode,
  convertCsvToCode,
} from './utils/projectStorage';

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>('code');
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [simpleText, setSimpleText] = useState<string>(DEFAULT_SIMPLE_TEXT);
  const [batchText, setBatchText] = useState<string>(DEFAULT_BATCH_TEXT);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);
  const [isExportingAllBatch, setIsExportingAllBatch] = useState<boolean>(false);
  const [batchExportProgress, setBatchExportProgress] = useState<{ current: number; total: number } | null>(null);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  // Dark mode state with persistence and system detection
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('code2ppt_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Sync dark class to root document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('code2ppt_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('code2ppt_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // Active content based on mode
  const currentContent =
    inputMode === 'code' ? code : inputMode === 'simple-text' ? simpleText : batchText;

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[]>([DEFAULT_CODE]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const pushHistory = useCallback((newText: string) => {
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      if (slice.length > 0 && slice[slice.length - 1] === newText) {
        return prev;
      }
      return [...slice, newText];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const targetContent = history[targetIdx];
      setHistoryIndex(targetIdx);
      if (inputMode === 'code') setCode(targetContent);
      else if (inputMode === 'simple-text') setSimpleText(targetContent);
      else setBatchText(targetContent);
    }
  }, [historyIndex, history, inputMode]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetContent = history[targetIdx];
      setHistoryIndex(targetIdx);
      if (inputMode === 'code') setCode(targetContent);
      else if (inputMode === 'simple-text') setSimpleText(targetContent);
      else setBatchText(targetContent);
    }
  }, [historyIndex, history, inputMode]);

  // Local storage restore and autosave system (IndexedDB + localStorage fallback)
  useEffect(() => {
    let isMounted = true;
    loadProjectLocally().then((saved) => {
      if (!isMounted || !saved) return;
      if (saved.code) {
        setCode(saved.code);
        if (saved.simpleText) setSimpleText(saved.simpleText);
        if (saved.batchText) setBatchText(saved.batchText);
        if (saved.inputMode) setInputMode(saved.inputMode);
        if (typeof saved.activeSlideIndex === 'number') {
          setActiveSlideIndex(saved.activeSlideIndex);
        }
        setHistory([saved.code]);
        setHistoryIndex(0);
      }
    }).catch(() => {
      // Ignore storage loading errors
    });
    return () => {
      isMounted = false;
    };
  }, []);



  const handleContentChange = useCallback(
    (value: string) => {
      if (inputMode === 'code') {
        setCode(value);
      } else if (inputMode === 'simple-text') {
        setSimpleText(value);
      } else {
        setBatchText(value);
      }
      pushHistory(value);
    },
    [inputMode, pushHistory]
  );

  const handleModeChange = useCallback(
    (newMode: InputMode) => {
      if (newMode === 'batch') {
        const detectedInCurrent = countPresentationDeclarations(currentContent);
        if (detectedInCurrent > 1) {
          setBatchText(currentContent);
        }
      }
      setInputMode(newMode);
    },
    [currentContent]
  );

  // Automatic detection: does current content contain multiple presentation declarations?
  const isMultiInCurrent = useMemo(() => {
    if (inputMode === 'batch') return true;
    return countPresentationDeclarations(currentContent) > 1;
  }, [inputMode, currentContent]);

  // Batch parse result memo (processes batchText if in batch mode, or currentContent if multi-presentation)
  const batchResult = useMemo(() => {
    const textToParse = inputMode === 'batch' ? batchText : currentContent;
    const parsed = parseBatchPresentations(textToParse);
    return {
      ...parsed,
      items: parsed.items.map((it) => ({
        ...it,
        presentation: autoPaginatePresentation(it.presentation),
      })),
    };
  }, [inputMode, batchText, currentContent]);

  // Safe selected batch index
  const safeBatchIndex = useMemo(() => {
    if (batchResult.items.length === 0) return 0;
    return Math.min(Math.max(0, selectedBatchIndex), batchResult.items.length - 1);
  }, [batchResult.items.length, selectedBatchIndex]);

  // Parse code, simple text, or batch on every change
  const activeParseResult = useMemo(() => {
    if (inputMode === 'batch' || isMultiInCurrent) {
      if (batchResult.items.length === 0) {
        return {
          presentation: {
            title: 'Empty Batch',
            theme: 'modern' as ThemeId,
            slides: [],
          },
          issues: batchResult.issues,
          hasErrors: batchResult.hasErrors,
        };
      }
      const activeItem = batchResult.items[safeBatchIndex];
      const paginated = autoPaginatePresentation(activeItem.presentation);
      const qualityIssues = validatePresentationQuality(paginated);
      return {
        presentation: paginated,
        issues: [...batchResult.issues, ...activeItem.issues, ...qualityIssues],
        hasErrors: activeItem.hasErrors || batchResult.hasErrors,
      };
    }
    const rawResult =
      inputMode === 'simple-text'
        ? parseSimpleText(simpleText)
        : parsePresentation(code);

    const paginated = autoPaginatePresentation(rawResult.presentation);
    const qualityIssues = validatePresentationQuality(paginated);

    return {
      ...rawResult,
      presentation: paginated,
      issues: [...rawResult.issues, ...qualityIssues],
    };
  }, [inputMode, isMultiInCurrent, code, simpleText, batchResult, safeBatchIndex]);

  const { presentation, issues, hasErrors } = activeParseResult;

  // Ensure activeSlideIndex stays in bounds
  const clampedSlideIndex = useMemo(() => {
    const total = presentation.slides.length;
    return Math.min(Math.max(0, activeSlideIndex), total - 1);
  }, [presentation.slides.length, activeSlideIndex]);

  // Debounced client-side local project autosave (IndexedDB + localStorage fallback)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectLocally({
        version: 1,
        title: presentation.title,
        code,
        simpleText,
        batchText,
        inputMode,
        activeSlideIndex,
        theme: presentation.theme,
        timestamp: Date.now(),
      }).catch((err) => {
        console.warn('Local autosave error:', err);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [code, simpleText, batchText, inputMode, activeSlideIndex, presentation.title, presentation.theme]);

  // Update canonical presentation model from visual editor
  const handleUpdatePresentation = useCallback(
    (updatedPresentation: Presentation, commitToHistory: boolean = true) => {
      let serialized: string;
      if (inputMode === 'batch') {
        const updatedItems = batchResult.items.map((it, idx) =>
          idx === safeBatchIndex ? { ...it, presentation: updatedPresentation } : it
        );
        serialized = serializeBatchPresentations(updatedItems);
        setBatchText(serialized);
      } else {
        serialized = serializePresentation(updatedPresentation);
        setCode(serialized);
        if (inputMode !== 'code') {
          setInputMode('code');
        }
      }

      if (commitToHistory) {
        pushHistory(serialized);
      }
    },
    [inputMode, batchResult.items, safeBatchIndex, pushHistory]
  );

  // Downloadable Project Backup (.code2ppt.json)
  const handleExportProject = useCallback(() => {
    exportProjectBackup({
      version: 1,
      title: presentation.title,
      code,
      simpleText,
      batchText,
      inputMode,
      activeSlideIndex,
      theme: presentation.theme,
      timestamp: Date.now(),
    });
    setQualityToast('Downloaded project backup (.code2ppt.json)');
    setTimeout(() => setQualityToast(null), 3500);
  }, [presentation.title, presentation.theme, code, simpleText, batchText, inputMode, activeSlideIndex]);

  // Open Project File (.json or .code2ppt) client-side
  const handleImportProjectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const parsed = parseProjectBackupJson(text);
      if (parsed) {
        setCode(parsed.code);
        if (parsed.simpleText) setSimpleText(parsed.simpleText);
        if (parsed.batchText) setBatchText(parsed.batchText);
        setInputMode(parsed.inputMode);
        setActiveSlideIndex(parsed.activeSlideIndex || 0);
        pushHistory(parsed.code);
        setQualityToast(`Opened project "${parsed.title || file.name}"`);
        setTimeout(() => setQualityToast(null), 3500);
      } else {
        setQualityToast('Error: Invalid project backup format');
        setTimeout(() => setQualityToast(null), 3500);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [pushHistory]);

  // Import Markdown (.md) document client-side
  const handleImportMarkdownFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const generatedCode = convertMarkdownToCode(text);
      setCode(generatedCode);
      setInputMode('code');
      setActiveSlideIndex(0);
      pushHistory(generatedCode);
      setQualityToast(`Imported markdown slides from "${file.name}"`);
      setTimeout(() => setQualityToast(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [pushHistory]);

  // Import CSV spreadsheet data client-side
  const handleImportCsvFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
      const generatedCode = convertCsvToCode(text, cleanBaseName);
      setCode(generatedCode);
      setInputMode('code');
      setActiveSlideIndex(0);
      pushHistory(generatedCode);
      setQualityToast(`Imported CSV spreadsheet table from "${file.name}"`);
      setTimeout(() => setQualityToast(null), 3500);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [pushHistory]);

  // Global undo / redo hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Handle theme changes from Header UI
  const handleThemeChange = useCallback(
    (newTheme: ThemeId) => {
      if (inputMode === 'code') {
        const themeRegex = /^\s*theme\s+["']?([a-zA-Z0-9_-]+)["']?/m;
        if (themeRegex.test(code)) {
          const updated = code.replace(themeRegex, `theme "${newTheme}"`);
          setCode(updated);
        } else {
          const presentationRegex = /^(\s*presentation\s+["'][^"']*["'])/m;
          if (presentationRegex.test(code)) {
            const updated = code.replace(presentationRegex, `$1\ntheme "${newTheme}"`);
            setCode(updated);
          } else {
            setCode(`theme "${newTheme}"\n\n${code}`);
          }
        }
      }
    },
    [inputMode, code]
  );

  // Load preset code
  const handleLoadPreset = useCallback((presetCode: string) => {
    setInputMode('code');
    setCode(presetCode);
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, []);

  // Reset to default
  const handleReset = useCallback(() => {
    if (inputMode === 'code') {
      setCode(DEFAULT_CODE);
    } else if (inputMode === 'simple-text') {
      setSimpleText(DEFAULT_SIMPLE_TEXT);
    } else {
      setBatchText(DEFAULT_BATCH_TEXT);
      setSelectedBatchIndex(0);
    }
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, [inputMode]);

  // Batch actions
  const handleSelectBatchItem = useCallback((index: number) => {
    setSelectedBatchIndex(index);
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, []);

  const handleMoveUpBatch = useCallback(
    (index: number) => {
      if (index <= 0 || index >= batchResult.items.length) return;
      const reordered = [...batchResult.items];
      const temp = reordered[index - 1];
      reordered[index - 1] = reordered[index];
      reordered[index] = temp;
      const newText = serializeBatchPresentations(reordered);
      if (inputMode === 'batch') {
        setBatchText(newText);
      } else {
        handleContentChange(newText);
      }
      setSelectedBatchIndex(index - 1);
    },
    [batchResult.items, inputMode, handleContentChange]
  );

  const handleMoveDownBatch = useCallback(
    (index: number) => {
      if (index < 0 || index >= batchResult.items.length - 1) return;
      const reordered = [...batchResult.items];
      const temp = reordered[index + 1];
      reordered[index + 1] = reordered[index];
      reordered[index] = temp;
      const newText = serializeBatchPresentations(reordered);
      if (inputMode === 'batch') {
        setBatchText(newText);
      } else {
        handleContentChange(newText);
      }
      setSelectedBatchIndex(index + 1);
    },
    [batchResult.items, inputMode, handleContentChange]
  );

  const handleRemoveBatch = useCallback(
    (index: number) => {
      const filtered = batchResult.items.filter((_, idx) => idx !== index);
      const newText = serializeBatchPresentations(filtered);
      if (inputMode === 'batch') {
        setBatchText(newText);
      } else {
        handleContentChange(newText);
      }
      if (selectedBatchIndex >= filtered.length) {
        setSelectedBatchIndex(Math.max(0, filtered.length - 1));
      }
    },
    [batchResult.items, selectedBatchIndex, inputMode, handleContentChange]
  );

  const handleExportSingleBatch = useCallback(
    async (index: number, format: ExportFormat = 'pptx') => {
      const item = batchResult.items[index];
      if (!item || item.presentation.slides.length === 0) return;
      const fileName = item.presentation.title || `presentation_${index + 1}`;
      if (format === 'pdf') {
        await exportToPdfFile(item.presentation, {
          fileName,
          includeSlideNumbers: true,
        });
      } else {
        await exportToPptxFile(item.presentation, {
          fileName,
          includeSlideNumbers: true,
        });
      }
    },
    [batchResult.items]
  );

  const isBatchLimitExceeded = batchResult.totalPresentations > 20;
  const batchLimitIssue = batchResult.issues.find((i) => i.code === 'BATCH_LIMIT_EXCEEDED');

  const handleExportAllBatch = useCallback(async (format: ExportFormat = 'pptx') => {
    if (batchResult.totalPresentations > 20) {
      return;
    }
    const validItems = batchResult.items.filter(
      (i) => !i.hasErrors && i.presentation.slides.length > 0
    );
    if (validItems.length === 0) return;

    setIsExportingAllBatch(true);
    setBatchExportProgress({ current: 0, total: validItems.length });

    try {
      for (let i = 0; i < validItems.length; i++) {
        setBatchExportProgress({ current: i + 1, total: validItems.length });
        const item = validItems[i];
        const fileName = item.presentation.title || `presentation_${i + 1}`;
        if (format === 'pdf') {
          await exportToPdfFile(item.presentation, {
            fileName,
            includeSlideNumbers: true,
          });
        } else {
          await exportToPptxFile(item.presentation, {
            fileName,
            includeSlideNumbers: true,
          });
        }
        // Non-blocking browser download delay between files
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setIsExportingAllBatch(false);
      setBatchExportProgress(null);
    }
  }, [batchResult.items, batchResult.totalPresentations]);

  // Bulk ZIP export handler: compiles all presentations into a single .zip archive containing .pptx files
  const handleExportAllBatchZip = useCallback(async () => {
    if (batchResult.totalPresentations > 20) {
      return;
    }
    const validItems = batchResult.items.filter(
      (i) => !i.hasErrors && i.presentation.slides.length > 0
    );
    if (validItems.length === 0) return;

    setIsExportingAllBatch(true);
    setBatchExportProgress({ current: 0, total: validItems.length });

    try {
      await exportBatchToZipFile(validItems, {
        zipFileName: 'presentations_bundle',
      });
    } finally {
      setIsExportingAllBatch(false);
      setBatchExportProgress(null);
    }
  }, [batchResult.items, batchResult.totalPresentations]);

  // Content quality clean toast & handler
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  const handleCleanContent = useCallback(() => {
    const currentText = inputMode === 'code' ? code : inputMode === 'simple-text' ? simpleText : batchText;
    const { cleanedText, report } = cleanPresentationText(
      currentText,
      inputMode === 'code' ? 'code' : 'simple'
    );
    if (report.hasChanges) {
      if (inputMode === 'code') setCode(cleanedText);
      else if (inputMode === 'simple-text') setSimpleText(cleanedText);
      else setBatchText(cleanedText);

      const count = report.removedFillerCount + report.refinedPreambleCount + report.emptySlidesRemoved;
      setQualityToast(`Cleaned ${count} item(s): removed artificial instructions & filler.`);
      setTimeout(() => setQualityToast(null), 4000);
    } else {
      setQualityToast('Content quality check passed: no artificial filler detected.');
      setTimeout(() => setQualityToast(null), 3000);
    }
  }, [inputMode, code, simpleText, batchText]);

  // Line selection from issues panel
  const handleSelectLine = useCallback((line: number) => {
    setActiveLine(line);
    setActiveMobileTab('editor');
  }, []);

  const [lastExportFormat, setLastExportFormat] = useState<ExportFormat>('pptx');
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportSuccessFormat, setExportSuccessFormat] = useState<ExportFormat | null>(null);

  // Export PPTX / PDF Handler for currently active presentation
  const handleExport = useCallback(async (format: ExportFormat = 'pptx') => {
    if (presentation.slides.length === 0) return;

    setLastExportFormat(format);
    setExportingFormat(format);
    setIsExporting(true);
    setExportSuccess(false);
    setExportSuccessFormat(null);

    try {
      const fileName = presentation.title || 'presentation';
      const result =
        format === 'pdf'
          ? await exportToPdfFile(presentation, {
              fileName,
              includeSlideNumbers: true,
            })
          : await exportToPptxFile(presentation, {
              fileName,
              includeSlideNumbers: true,
            });

      if (result.success) {
        setExportSuccess(true);
        setExportSuccessFormat(format);
        setTimeout(() => {
          setExportSuccess(false);
          setExportSuccessFormat(null);
        }, 3000);
      } else {
        console.error('Export failed:', result.error);
      }
    } catch (err) {
      console.error('Unexpected export error:', err);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [presentation]);

  // Global productivity shortcuts: Ctrl/Cmd+S for PPTX, Ctrl/Cmd+P or Shift+Ctrl+S for PDF, Ctrl/Cmd+/ for help
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleExport('pdf');
        } else {
          handleExport('pptx');
        }
      } else if (isCmdOrCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleExport('pdf');
      } else if (isCmdOrCtrl && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleExport('pptx');
      } else if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        setIsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleExport]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* Top Header */}
      <Header
        presentation={presentation}
        currentTheme={presentation.theme}
        onThemeChange={handleThemeChange}
        onLoadPreset={handleLoadPreset}
        onReset={handleReset}
        onExport={handleExport}
        isExporting={isExporting}
        exportingFormat={exportingFormat}
        onOpenHelp={() => setIsHelpOpen(true)}
        hasErrors={hasErrors}
        activeMobileTab={activeMobileTab}
        onMobileTabChange={setActiveMobileTab}
        exportSuccess={exportSuccess}
        exportSuccessFormat={exportSuccessFormat}
        lastExportFormat={lastExportFormat}
        totalBatchCount={batchResult.totalPresentations}
        onExportAllBatch={handleExportAllBatch}
        onExportAllBatchZip={handleExportAllBatchZip}
        isExportingAllBatch={isExportingAllBatch}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExportProject={handleExportProject}
        onImportProjectFile={handleImportProjectFile}
        onImportMarkdownFile={handleImportMarkdownFile}
        onImportCsvFile={handleImportCsvFile}
      />

      {/* Main Two-Panel Studio Layout */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden pb-14 md:pb-0">
        {/* Left: Code Editor (hidden on mobile if preview tab active) */}
        <section
          aria-label="Presentation Code Editor"
          className={`flex-1 md:w-1/2 lg:w-5/12 h-full min-h-0 flex flex-col ${
            activeMobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <Editor
            code={currentContent}
            onChange={handleContentChange}
            issues={issues}
            activeLine={activeLine}
            onSelectLine={handleSelectLine}
            mode={inputMode}
            onModeChange={handleModeChange}
            batchItems={batchResult.items}
            totalBatchDetected={batchResult.totalPresentations}
            batchLimitExceeded={isBatchLimitExceeded}
            batchLimitErrorMessage={batchLimitIssue?.message}
            selectedBatchIndex={safeBatchIndex}
            onSelectBatchItem={handleSelectBatchItem}
            onMoveUpBatchItem={handleMoveUpBatch}
            onMoveDownBatchItem={handleMoveDownBatch}
            onRemoveBatchItem={handleRemoveBatch}
            onExportSingleBatchItem={handleExportSingleBatch}
            onExportAllBatchItems={handleExportAllBatch}
            onExportAllBatchZip={handleExportAllBatchZip}
            onCleanContent={handleCleanContent}
            isExportingAllBatch={isExportingAllBatch}
            batchExportProgress={batchExportProgress}
          />
        </section>

        {/* Right: Slide Preview (hidden on mobile if editor tab active) */}
        <section
          aria-label="Slide Live Preview"
          className={`flex-1 md:w-1/2 lg:w-7/12 h-full min-h-0 flex flex-col ${
            activeMobileTab === 'preview' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <Preview
            presentation={presentation}
            themeId={presentation.theme}
            activeSlideIndex={clampedSlideIndex}
            onSelectSlide={setActiveSlideIndex}
            onUpdatePresentation={handleUpdatePresentation}
            batchItems={batchResult.items}
            selectedBatchIndex={safeBatchIndex}
            onSelectBatchItem={handleSelectBatchItem}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onExport={handleExport}
            isExporting={isExporting}
          />
        </section>
      </main>

      {/* Mobile Fixed Bottom Action Dock (Thumb-friendly for phone users) */}
      <nav
        aria-label="Mobile Bottom Actions"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shadow-2xl"
      >
        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs flex-none">
          <button
            onClick={() => setActiveMobileTab('editor')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeMobileTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setActiveMobileTab('preview')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              activeMobileTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Preview ({presentation.slides.length})
          </button>
        </div>

        {/* Slide Counter & Arrows when in Preview */}
        {activeMobileTab === 'preview' && presentation.slides.length > 0 && (
          <div className="flex items-center gap-1 flex-none">
            <button
              onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={clampedSlideIndex <= 0}
              className="p-1.5 text-slate-600 dark:text-slate-300 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Previous Slide"
              aria-label="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 min-w-[36px] text-center">
              {clampedSlideIndex + 1}/{presentation.slides.length}
            </span>
            <button
              onClick={() => setActiveSlideIndex((prev) => Math.min(presentation.slides.length - 1, prev + 1))}
              disabled={clampedSlideIndex >= presentation.slides.length - 1}
              className="p-1.5 text-slate-600 dark:text-slate-300 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Next Slide"
              aria-label="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1-Tap Quick Export Buttons */}
        <div className="flex items-center gap-1.5 flex-none">
          <button
            onClick={() => handleExport('pptx')}
            disabled={isExporting || presentation.slides.length === 0}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
              exportSuccessFormat === 'pptx' || (exportSuccess && lastExportFormat === 'pptx')
                ? 'bg-emerald-600 text-white'
                : exportingFormat === 'pptx'
                ? 'bg-indigo-600 text-white'
                : 'bg-indigo-600 active:bg-indigo-700 text-white'
            }`}
            title="Download PowerPoint presentation (.pptx)"
          >
            {exportingFormat === 'pptx' ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : exportSuccessFormat === 'pptx' || (exportSuccess && lastExportFormat === 'pptx') ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>PPTX</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting || presentation.slides.length === 0}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 ${
              exportSuccessFormat === 'pdf' || (exportSuccess && lastExportFormat === 'pdf')
                ? 'bg-emerald-600 text-white'
                : exportingFormat === 'pdf'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-600 active:bg-rose-700 text-white'
            }`}
            title="Download PDF document (.pdf)"
          >
            {exportingFormat === 'pdf' ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : exportSuccessFormat === 'pdf' || (exportSuccess && lastExportFormat === 'pdf') ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <FileType className="w-3.5 h-3.5" />
            )}
            <span>PDF</span>
          </button>
        </div>
      </nav>

      {/* Floating Quality Toast Notification */}
      {qualityToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-12 right-6 z-50 bg-slate-900/95 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 dark:bg-emerald-600 flex-none animate-pulse" />
          <span>{qualityToast}</span>
        </div>
      )}

      {/* Bottom Validation / Status Area */}
      <ValidationStatus
        issues={issues}
        hasErrors={hasErrors}
        slideCount={presentation.slides.length}
        onSelectLine={handleSelectLine}
      />

      {/* Syntax Guide / Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onInsertExample={(exampleCode) => {
          setCode(exampleCode);
          setActiveSlideIndex(0);
        }}
      />
    </div>
  );
}

