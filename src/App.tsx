import { useState, useMemo, useCallback, useEffect } from 'react';
import { parsePresentation } from './parser/presentationParser';
import { parseSimpleText } from './parser/simpleTextParser';
import { exportToPptxFile } from './renderer/pptxRenderer';
import { exportToPdfFile } from './renderer/pdfRenderer';
import { autoPaginatePresentation } from './renderer/layoutSystem';
import { cleanPresentationText } from './utils/contentQuality';
import { validatePresentationQuality } from './utils/qualityValidators';
import { serializePresentation } from './parser/presentationSerializer';
import { DEFAULT_CODE, DEFAULT_SIMPLE_TEXT } from './examples/samplePresentations';
import { THEMES } from './themes/presentationThemes';
import { RibbonToolbar } from './components/RibbonToolbar';
import { SlideNavPanel } from './components/SlideNavPanel';
import { BottomStatusBar } from './components/BottomStatusBar';
import { AIAssistantModal } from './components/AIAssistantModal';
import { Editor, InputMode } from './components/Editor';
import { Preview } from './components/Preview';
import { ValidationStatus } from './components/ValidationStatus';
import { HelpModal } from './components/HelpModal';
import { LandingPage } from './components/LandingPage';
import { CanvasErrorBoundary } from './components/CanvasErrorBoundary';
import { TemplateModal } from './components/TemplateModal';
import {
  Presentation,
  ThemeId,
  Slide,
  SlideElement,
  SlideLayout,
  TransitionStyle,
  ShapeType,
  ChartType,
} from './models/presentation';
import { importPptxFile } from './utils/pptxImporter';
import {
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileType,
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

export type ExportFormat = 'pptx' | 'pdf';

export default function App() {
  const [currentView, setCurrentView] = useState<'studio' | 'landing'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#landing' || hash === '#about' || hash === '#guide') {
        return 'landing';
      }
      if (hash === '#studio' || hash === '#editor') {
        return 'studio';
      }
    }
    return 'landing';
  });

  // Sync hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#landing' || hash === '#about' || hash === '#guide') {
        setCurrentView('landing');
      } else if (hash === '#studio' || hash === '#editor') {
        setCurrentView('studio');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const [inputMode, setInputMode] = useState<InputMode>('code');
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [simpleText, setSimpleText] = useState<string>(DEFAULT_SIMPLE_TEXT);

  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('preview');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
  const [isValidationDrawerOpen, setIsValidationDrawerOpen] = useState<boolean>(false);
  const [restoredSessionNotification, setRestoredSessionNotification] = useState<{
    title: string;
    slideCount: number;
  } | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  // Desktop studio workspace states
  const [showCodePane, setShowCodePane] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showSnapGuides, setShowSnapGuides] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(false);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3'>('16:9');
  const [thumbnailSize, setThumbnailSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [hiddenSlideIndices, setHiddenSlideIndices] = useState<Set<number>>(new Set());
  const [selectedElement, setSelectedElement] = useState<SlideElement | null>(null);

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
  const currentContent = inputMode === 'simple-text' ? simpleText : code;

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
      if (inputMode === 'simple-text') setSimpleText(targetContent);
      else setCode(targetContent);
    }
  }, [historyIndex, history, inputMode]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const targetContent = history[targetIdx];
      setHistoryIndex(targetIdx);
      if (inputMode === 'simple-text') setSimpleText(targetContent);
      else setCode(targetContent);
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
        if (saved.inputMode && (saved.inputMode as string) !== 'batch') {
          setInputMode(saved.inputMode as InputMode);
        }
        if (typeof saved.activeSlideIndex === 'number') {
          setActiveSlideIndex(saved.activeSlideIndex);
        }
        setHistory([saved.code]);
        setHistoryIndex(0);

        if (saved.code !== DEFAULT_CODE) {
          const estimatedSlides = (saved.code.match(/^\s*slide\s+/gm) || []).length || 1;
          setRestoredSessionNotification({
            title: saved.title || 'Previous Presentation',
            slideCount: estimatedSlides,
          });
        }
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
      if (inputMode === 'simple-text') {
        setSimpleText(value);
      } else {
        setCode(value);
      }
      pushHistory(value);
    },
    [inputMode, pushHistory]
  );

  const handleModeChange = useCallback(
    (newMode: InputMode) => {
      setInputMode(newMode);
    },
    []
  );

  // Parse code or simple text on every change
  const activeParseResult = useMemo(() => {
    const rawResult =
      inputMode === 'simple-text'
        ? parseSimpleText(simpleText)
        : parsePresentation(code);

    const paginated = autoPaginatePresentation(rawResult.presentation);
    if (aspectRatio === '4:3') {
      paginated.aspectRatio = '4:3';
    }
    const qualityIssues = validatePresentationQuality(paginated);

    return {
      ...rawResult,
      presentation: paginated,
      issues: [...rawResult.issues, ...qualityIssues],
    };
  }, [inputMode, code, simpleText, aspectRatio]);

  const { presentation, issues, hasErrors } = activeParseResult;
  const activeTheme = THEMES[presentation.theme] || THEMES.modern;

  // Total word count calculation across all slides
  const totalWordCount = useMemo(() => {
    let count = 0;
    for (const s of presentation.slides) {
      if (s.title) count += s.title.trim().split(/\s+/).filter(Boolean).length;
      for (const el of s.elements) {
        if (el.content) {
          count += el.content.trim().split(/\s+/).filter(Boolean).length;
        }
      }
    }
    return count;
  }, [presentation]);

  // Ensure activeSlideIndex stays in bounds
  const clampedSlideIndex = useMemo(() => {
    const total = presentation.slides.length;
    if (total === 0) return 0;
    return Math.min(Math.max(0, activeSlideIndex), total - 1);
  }, [presentation.slides.length, activeSlideIndex]);

  // Debounced client-side local project autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProjectLocally({
        version: 1,
        title: presentation.title,
        code,
        simpleText,
        inputMode,
        activeSlideIndex,
        theme: presentation.theme,
        timestamp: Date.now(),
      }).catch((err) => {
        console.warn('Local autosave error:', err);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [code, simpleText, inputMode, activeSlideIndex, presentation.title, presentation.theme]);

  // Update canonical presentation model from visual editor
  const handleUpdatePresentation = useCallback(
    (updatedPresentation: Presentation, commitToHistory: boolean = true) => {
      const serialized = serializePresentation(updatedPresentation);
      setCode(serialized);
      if (inputMode !== 'code') {
        setInputMode('code');
      }

      if (commitToHistory) {
        pushHistory(serialized);
      }
    },
    [inputMode, pushHistory]
  );

  // Quality clean toast & export state
  const [qualityToast, setQualityToast] = useState<string | null>(null);

  // Update single element on active slide (from Ribbon Home formatting controls)
  const handleUpdateElementFromRibbon = useCallback(
    (updatedEl: SlideElement) => {
      const currentSlide = presentation.slides[clampedSlideIndex];
      if (!currentSlide) return;
      const updatedSlide: Slide = {
        ...currentSlide,
        elements: currentSlide.elements.map((el) => (el.id === updatedEl.id ? updatedEl : el)),
      };
      const newSlides = presentation.slides.map((s, idx) =>
        idx === clampedSlideIndex ? updatedSlide : s
      );
      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setSelectedElement(updatedEl);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  // Downloadable Project Backup (.code2ppt.json)
  const handleExportProject = useCallback(() => {
    exportProjectBackup({
      version: 1,
      title: presentation.title,
      code,
      simpleText,
      inputMode,
      activeSlideIndex,
      theme: presentation.theme,
      timestamp: Date.now(),
    });
    setQualityToast('Downloaded project backup (.code2ppt.json)');
    setTimeout(() => setQualityToast(null), 3500);
  }, [presentation.title, presentation.theme, code, simpleText, inputMode, activeSlideIndex]);

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
        if (parsed.inputMode && (parsed.inputMode as string) !== 'batch') {
          setInputMode(parsed.inputMode as InputMode);
        }
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

  // Import PowerPoint (.pptx) file client-side
  const handleImportPptxFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const buffer = await file.arrayBuffer();
        const result = await importPptxFile(buffer, file.name);

        if (result.success && result.presentation) {
          const serialized = serializePresentation(result.presentation);
          setCode(serialized);
          setInputMode('code');
          setActiveSlideIndex(0);
          pushHistory(serialized);
          setQualityToast(`Imported ${result.slideCount} slides from "${file.name}"`);
          setTimeout(() => setQualityToast(null), 3500);
        } else {
          setQualityToast(`Import error: ${result.error || 'Failed to read PowerPoint file'}`);
          setTimeout(() => setQualityToast(null), 4000);
        }
      } catch (err: any) {
        setQualityToast(`Failed to import PowerPoint file: ${err?.message || 'Unknown error'}`);
        setTimeout(() => setQualityToast(null), 4000);
      } finally {
        e.target.value = '';
      }
    },
    [pushHistory]
  );

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

  // Handle theme changes
  const handleThemeChange = useCallback(
    (newTheme: ThemeId) => {
      if (inputMode === 'code') {
        const themeRegex = /^\s*theme\s+["']?([a-zA-Z0-9_-]+)["']?/m;
        if (themeRegex.test(code)) {
          const updated = code.replace(themeRegex, `theme "${newTheme}"`);
          setCode(updated);
          pushHistory(updated);
        } else {
          const presentationRegex = /^(\s*presentation\s+["'][^"']*["'])/m;
          if (presentationRegex.test(code)) {
            const updated = code.replace(presentationRegex, `$1\ntheme "${newTheme}"`);
            setCode(updated);
            pushHistory(updated);
          } else {
            const updated = `theme "${newTheme}"\n\n${code}`;
            setCode(updated);
            pushHistory(updated);
          }
        }
      } else {
        handleUpdatePresentation({ ...presentation, theme: newTheme }, true);
      }
    },
    [inputMode, code, presentation, handleUpdatePresentation, pushHistory]
  );

  // Load preset code
  const handleLoadPreset = useCallback((presetCode: string) => {
    setInputMode('code');
    setCode(presetCode);
    setActiveSlideIndex(0);
    setActiveLine(null);
    pushHistory(presetCode);
  }, [pushHistory]);

  // Reset to default
  const handleReset = useCallback(() => {
    if (inputMode === 'simple-text') {
      setSimpleText(DEFAULT_SIMPLE_TEXT);
      pushHistory(DEFAULT_SIMPLE_TEXT);
    } else {
      setCode(DEFAULT_CODE);
      pushHistory(DEFAULT_CODE);
    }
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, [inputMode, pushHistory]);

  // Clean presentation text
  const handleCleanContent = useCallback(() => {
    const currentText = inputMode === 'simple-text' ? simpleText : code;
    const { cleanedText, report } = cleanPresentationText(
      currentText,
      inputMode === 'code' ? 'code' : 'simple'
    );
    if (report.hasChanges) {
      if (inputMode === 'simple-text') setSimpleText(cleanedText);
      else setCode(cleanedText);
      pushHistory(cleanedText);

      const count = report.removedFillerCount + report.refinedPreambleCount + report.emptySlidesRemoved;
      setQualityToast(`Cleaned ${count} item(s): removed artificial instructions & filler.`);
      setTimeout(() => setQualityToast(null), 4000);
    } else {
      setQualityToast('Content quality check passed: no artificial filler detected.');
      setTimeout(() => setQualityToast(null), 3000);
    }
  }, [inputMode, code, simpleText, pushHistory]);

  // Line selection from issues panel
  const handleSelectLine = useCallback((line: number) => {
    setActiveLine(line);
    setActiveMobileTab('editor');
    setShowCodePane(true);
  }, []);

  const [lastExportFormat, setLastExportFormat] = useState<ExportFormat>('pptx');
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportSuccessFormat, setExportSuccessFormat] = useState<ExportFormat | null>(null);

  // Export PPTX / PDF Handler
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
        setQualityToast(`Successfully downloaded ${format.toUpperCase()} (${presentation.slides.length} slides)`);
        setTimeout(() => {
          setExportSuccess(false);
          setExportSuccessFormat(null);
          setQualityToast(null);
        }, 3500);
      } else {
        const errorMsg = result.error || `Unable to generate ${format.toUpperCase()}. Please check slide contents.`;
        setQualityToast(`Export error: ${errorMsg}`);
        setTimeout(() => setQualityToast(null), 5000);
      }
    } catch (err: any) {
      console.error('Unexpected export error:', err);
      const errorMsg = err?.message || 'An unexpected error occurred during export.';
      setQualityToast(`Export error: ${errorMsg}`);
      setTimeout(() => setQualityToast(null), 5000);
    } finally {
      setIsExporting(false);
      setExportingFormat(null);
    }
  }, [presentation]);

  // Global productivity shortcuts
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

  // Slide Management Handlers
  const handleAddSlide = useCallback(
    (layout: SlideLayout = 'title-content') => {
      const slideNumber = presentation.slides.length + 1;
      let initialElements: SlideElement[] = [];

      if (layout === 'title') {
        initialElements = [
          {
            id: `title-${Date.now()}`,
            type: 'text',
            content: 'Presentation Title',
            fontSize: 32,
            bold: true,
            align: 'center',
            x: 1.0,
            y: 1.6,
            w: 8.0,
            h: 1.4,
            line: 1,
          },
          {
            id: `sub-${Date.now()}`,
            type: 'text',
            content: 'Subtitle or Presenter Information',
            fontSize: 18,
            align: 'center',
            color: '#64748B',
            x: 1.5,
            y: 3.2,
            w: 7.0,
            h: 0.9,
            line: 2,
          },
        ];
      } else if (layout === 'two-column') {
        initialElements = [
          {
            id: `col1-${Date.now()}`,
            type: 'bullet',
            content: 'First column key point\nSupporting evidence and facts',
            x: 0.8,
            y: 1.6,
            w: 4.0,
            h: 2.8,
            line: 1,
          },
          {
            id: `col2-${Date.now()}`,
            type: 'bullet',
            content: 'Second column key point\nComparable metric or analysis',
            x: 5.2,
            y: 1.6,
            w: 4.0,
            h: 2.8,
            line: 2,
          },
        ];
      } else if (layout === 'blank') {
        initialElements = [];
      } else {
        // Default: title-content
        initialElements = [
          {
            id: `body-${Date.now()}`,
            type: 'bullet',
            content: 'Key project objective\nImplementation steps and milestones\nExpected deliverable and outcomes',
            x: 0.8,
            y: 1.6,
            w: 8.4,
            h: 2.6,
            line: 1,
          },
        ];
      }

      const newSlide: Slide = {
        id: `slide_${Date.now()}`,
        index: presentation.slides.length,
        title: layout === 'title' ? 'Title Slide' : `Slide ${slideNumber}`,
        layout,
        line: 1,
        elements: initialElements,
      };

      const insertIndex = clampedSlideIndex + 1;
      const newSlides = [
        ...presentation.slides.slice(0, insertIndex),
        newSlide,
        ...presentation.slides.slice(insertIndex),
      ].map((s, idx) => ({ ...s, index: idx }));

      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setActiveSlideIndex(insertIndex);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  const handleDuplicateSlide = useCallback(
    (index: number) => {
      const target = presentation.slides[index];
      if (!target) return;

      const clonedSlide: Slide = {
        ...target,
        id: `slide_${Date.now()}`,
        title: `${target.title} (Copy)`,
        elements: target.elements.map((el) => ({
          ...el,
          id: `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        })),
      };

      const newSlides = [
        ...presentation.slides.slice(0, index + 1),
        clonedSlide,
        ...presentation.slides.slice(index + 1),
      ].map((s, idx) => ({ ...s, index: idx }));

      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setActiveSlideIndex(index + 1);
    },
    [presentation, handleUpdatePresentation]
  );

  const handleDeleteSlide = useCallback(
    (index: number) => {
      if (presentation.slides.length <= 1) {
        setQualityToast('Cannot delete the only remaining slide');
        setTimeout(() => setQualityToast(null), 2500);
        return;
      }

      const newSlides = presentation.slides
        .filter((_, idx) => idx !== index)
        .map((s, idx) => ({ ...s, index: idx }));

      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setActiveSlideIndex((prev) => Math.min(prev, newSlides.length - 1));
    },
    [presentation, handleUpdatePresentation]
  );

  const handleMoveSlide = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (
        fromIndex < 0 ||
        fromIndex >= presentation.slides.length ||
        toIndex < 0 ||
        toIndex >= presentation.slides.length ||
        fromIndex === toIndex
      ) {
        return;
      }

      const updated = [...presentation.slides];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);

      const reindexed = updated.map((s, idx) => ({ ...s, index: idx }));
      handleUpdatePresentation({ ...presentation, slides: reindexed }, true);
      setActiveSlideIndex(toIndex);
    },
    [presentation, handleUpdatePresentation]
  );

  const handleToggleHideSlide = useCallback((index: number) => {
    setHiddenSlideIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleUpdateTitle = useCallback(
    (newTitle: string) => {
      handleUpdatePresentation({ ...presentation, title: newTitle }, true);
    },
    [presentation, handleUpdatePresentation]
  );

  const handleApplyTransition = useCallback(
    (style: TransitionStyle, applyToAll?: boolean) => {
      const transition = { style };
      if (applyToAll) {
        const newSlides = presentation.slides.map((s) => ({ ...s, transition }));
        handleUpdatePresentation({ ...presentation, transition, slides: newSlides }, true);
        setQualityToast(`Applied "${style}" transition to all slides`);
      } else {
        const currentSlide = presentation.slides[clampedSlideIndex];
        if (!currentSlide) return;

        const updatedSlide = { ...currentSlide, transition };
        const newSlides = presentation.slides.map((s, idx) =>
          idx === clampedSlideIndex ? updatedSlide : s
        );

        handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
        setQualityToast(`Applied "${style}" transition`);
      }
      setTimeout(() => setQualityToast(null), 2500);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  const handleInsertElement = useCallback(
    (type: 'text' | 'image' | 'shape' | 'table' | 'chart' | 'quote', payload?: any) => {
      const currentSlide = presentation.slides[clampedSlideIndex];
      if (!currentSlide) return;

      const id = `el-${Date.now()}`;
      let newEl: SlideElement;

      if (type === 'shape') {
        const shapeType = (payload?.shapeType || payload || 'rect') as ShapeType;
        newEl = {
          id,
          type: 'shape',
          content: shapeType,
          shapeType,
          fillColor: '#3B82F6',
          strokeColor: '#1D4ED8',
          strokeWidth: 1,
          opacity: 1,
          x: 2.0,
          y: 1.8,
          w: 2.5,
          h: 1.5,
          line: 1,
        };
      } else if (type === 'table') {
        newEl = {
          id,
          type: 'table',
          content: 'Data Table',
          headers: ['Column 1', 'Column 2', 'Status'],
          rows: [
            ['Feature A', 'Active', 'Complete'],
            ['Feature B', 'Review', 'Pending'],
          ],
          x: 1.0,
          y: 1.6,
          w: 8.0,
          h: 2.2,
          line: 1,
        };
      } else if (type === 'chart') {
        const chartType = (payload?.chartType || payload || 'bar') as ChartType;
        newEl = {
          id,
          type: 'chart',
          content: 'Performance Chart',
          chartType,
          title: 'Quarterly Metric',
          data: [
            { label: 'Q1', value: 40 },
            { label: 'Q2', value: 75 },
            { label: 'Q3', value: 90 },
          ],
          x: 1.5,
          y: 1.6,
          w: 6.0,
          h: 2.8,
          line: 1,
        };
      } else if (type === 'quote') {
        newEl = {
          id,
          type: 'quote',
          content: 'Simplicity is prerequisite for reliability. — Edsger W. Dijkstra',
          fontFamily: 'Georgia',
          fontSize: 15,
          italic: true,
          x: 1.2,
          y: 1.8,
          w: 7.6,
          h: 1.6,
          line: 1,
        };
      } else if (type === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUri = event.target?.result as string;
              if (dataUri) {
                const imgEl: SlideElement = {
                  id: `img-${Date.now()}`,
                  type: 'image',
                  content: file.name,
                  src: dataUri,
                  alt: file.name,
                  fit: 'contain',
                  x: 2.0,
                  y: 1.5,
                  w: 4.5,
                  h: 2.8,
                  line: 1,
                };
                const updatedSlide = {
                  ...currentSlide,
                  elements: [...currentSlide.elements, imgEl],
                };
                const newSlides = presentation.slides.map((s, idx) =>
                  idx === clampedSlideIndex ? updatedSlide : s
                );
                handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
                setQualityToast(`Inserted image "${file.name}"`);
                setTimeout(() => setQualityToast(null), 3000);
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      } else {
        newEl = {
          id,
          type: 'text',
          content: 'Type your message or title here...',
          fontSize: 16,
          color: '#1E293B',
          x: 1.5,
          y: 1.8,
          w: 7.0,
          h: 1.2,
          line: 1,
        };
      }

      const updatedSlide = {
        ...currentSlide,
        elements: [...currentSlide.elements, newEl],
      };
      const newSlides = presentation.slides.map((s, idx) =>
        idx === clampedSlideIndex ? updatedSlide : s
      );
      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  // AI Assistant Apply Callbacks
  const handleApplyNewPresentation = useCallback(
    (newPres: Presentation) => {
      handleUpdatePresentation(newPres, true);
      setActiveSlideIndex(0);
      setIsAIModalOpen(false);
      setQualityToast(`Generated "${newPres.title}" (${newPres.slides.length} slides)`);
      setTimeout(() => setQualityToast(null), 3500);
    },
    [handleUpdatePresentation]
  );

  const handleApplyNewSlide = useCallback(
    (newSlide: Slide) => {
      const insertIndex = clampedSlideIndex + 1;
      const newSlides = [
        ...presentation.slides.slice(0, insertIndex),
        newSlide,
        ...presentation.slides.slice(insertIndex),
      ].map((s, idx) => ({ ...s, index: idx }));
      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setActiveSlideIndex(insertIndex);
      setIsAIModalOpen(false);
      setQualityToast(`Inserted AI slide "${newSlide.title}"`);
      setTimeout(() => setQualityToast(null), 3000);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  const handleApplySlideUpdate = useCallback(
    (updatedSlide: Slide) => {
      const newSlides = presentation.slides.map((s, idx) =>
        idx === clampedSlideIndex ? updatedSlide : s
      );
      handleUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setIsAIModalOpen(false);
      setQualityToast(`Updated slide "${updatedSlide.title}"`);
      setTimeout(() => setQualityToast(null), 3000);
    },
    [presentation, clampedSlideIndex, handleUpdatePresentation]
  );

  if (currentView === 'landing') {
    return (
      <LandingPage
        onOpenStudio={() => {
          setCurrentView('studio');
          window.location.hash = '#studio';
        }}
        onLoadSampleAndOpen={(sampleCode) => {
          setCode(sampleCode);
          setInputMode('code');
          setActiveSlideIndex(0);
          setCurrentView('studio');
          window.location.hash = '#studio';
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
      {/* 1. Top Ribbon Navigation & Toolbar */}
      <RibbonToolbar
        presentation={presentation}
        onUpdateTitle={handleUpdateTitle}
        activeSlideIndex={clampedSlideIndex}
        selectedElement={selectedElement}
        onUpdateElement={handleUpdateElementFromRibbon}
        currentTheme={presentation.theme}
        onThemeChange={handleThemeChange}
        onAddSlide={handleAddSlide}
        onInsertElement={handleInsertElement}
        onExport={handleExport}
        isExporting={isExporting}
        exportSuccess={exportSuccess}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPresent={() => setIsFullscreen(true)}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onNavigateLanding={() => {
          setCurrentView('landing');
          window.location.hash = '#landing';
        }}
        onExportProject={handleExportProject}
        onImportProjectFile={handleImportProjectFile}
        onImportPptxFile={handleImportPptxFile}
        onImportMarkdownFile={handleImportMarkdownFile}
        onImportCsvFile={handleImportCsvFile}
        onCleanContent={handleCleanContent}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        showSnapGuides={showSnapGuides}
        onToggleSnapGuides={() => setShowSnapGuides((prev) => !prev)}
        showRulers={showRulers}
        onToggleRulers={() => setShowRulers((prev) => !prev)}
        showNotes={showNotes}
        onToggleNotes={() => setShowNotes((prev) => !prev)}
        aspectRatio={aspectRatio}
        onChangeAspectRatio={setAspectRatio}
        showCodePane={showCodePane}
        onToggleCodePane={() => setShowCodePane((prev) => !prev)}
        onApplyTransition={handleApplyTransition}
      />

      {/* Session Recovery Banner */}
      {restoredSessionNotification && (
        <div className="bg-indigo-50/90 dark:bg-slate-900 border-b border-indigo-200/80 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-indigo-950 dark:text-indigo-200 animate-in fade-in flex-none">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex-none">Session Restored</span>
            <span aria-hidden="true" className="text-indigo-300 dark:text-indigo-700 flex-none">·</span>
            <span className="truncate">
              Loaded previous work <strong>"{restoredSessionNotification.title}"</strong> ({restoredSessionNotification.slideCount} slides).
            </span>
            <button
              type="button"
              onClick={() => {
                handleReset();
                setRestoredSessionNotification(null);
              }}
              className="ml-2 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex-none cursor-pointer"
            >
              Start Fresh
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRestoredSessionNotification(null)}
            className="p-1 hover:bg-indigo-100 dark:hover:bg-slate-800 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex-none ml-2 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Studio Body: Left Slide Nav + Optional Code Pane + Central Canvas */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden pb-14 md:pb-0">
        {/* 2. Left Slide Navigation Panel */}
        <SlideNavPanel
          slides={presentation.slides}
          activeSlideIndex={clampedSlideIndex}
          theme={activeTheme}
          onSelectSlide={setActiveSlideIndex}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onMoveSlide={handleMoveSlide}
          onToggleHideSlide={handleToggleHideSlide}
          hiddenSlideIndices={hiddenSlideIndices}
          thumbnailSize={thumbnailSize}
          onChangeThumbnailSize={setThumbnailSize}
        />

        {/* Optional DSL Code Editor Pane */}
        {showCodePane && (
          <section
            aria-label="Presentation Code Editor"
            className={`w-full md:w-80 lg:w-96 flex-none border-r border-slate-200 dark:border-slate-800 flex flex-col ${
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
              onCleanContent={handleCleanContent}
            />
          </section>
        )}

        {/* 3. Central Slide Canvas Stage */}
        <section
          aria-label="Slide Live Preview"
          className={`flex-1 h-full min-h-0 flex flex-col bg-slate-200/40 dark:bg-slate-950 overflow-hidden relative ${
            activeMobileTab === 'preview' ? 'flex' : 'hidden md:flex'
          }`}
        >
          <CanvasErrorBoundary
            fallbackSlideTitle={presentation.slides[clampedSlideIndex]?.title}
            onResetSlide={() => setActiveSlideIndex(0)}
          >
            <Preview
              presentation={presentation}
              themeId={presentation.theme}
              activeSlideIndex={clampedSlideIndex}
              onSelectSlide={setActiveSlideIndex}
              onUpdatePresentation={handleUpdatePresentation}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onExport={handleExport}
              isExporting={isExporting}
              externalZoom={Math.round(zoomLevel * 100)}
              onZoomChange={(z) => setZoomLevel(Number((z / 100).toFixed(2)))}
              externalSnapToGrid={showSnapGuides}
              onToggleSnap={() => setShowSnapGuides((prev) => !prev)}
              externalShowNotes={showNotes}
              onToggleNotes={() => setShowNotes((prev) => !prev)}
              externalIsFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
              showRulers={showRulers}
              externalShowGrid={showGrid}
              onSelectElementChange={setSelectedElement}
            />
          </CanvasErrorBoundary>
        </section>
      </main>

      {/* Mobile Fixed Bottom Action Dock */}
      <nav
        aria-label="Mobile Bottom Actions"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shadow-2xl"
      >
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs flex-none">
          <button
            onClick={() => {
              setShowCodePane(true);
              setActiveMobileTab('editor');
            }}
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

      {/* Floating Quality / Export Toast Notification */}
      {qualityToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-14 right-6 z-50 bg-slate-900/95 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-300 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600 flex-none" />
          <span>{qualityToast}</span>
        </div>
      )}

      {/* Bottom Validation Issues Drawer (Collapsible) */}
      <ValidationStatus
        issues={issues}
        hasErrors={hasErrors}
        slideCount={presentation.slides.length}
        onSelectLine={handleSelectLine}
        externalIsExpanded={isValidationDrawerOpen}
        onToggleExpand={() => setIsValidationDrawerOpen((prev) => !prev)}
      />

      {/* 4. Bottom Status and Navigation Bar */}
      <BottomStatusBar
        currentSlideIndex={clampedSlideIndex}
        totalSlides={presentation.slides.length}
        onPrevSlide={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
        onNextSlide={() => setActiveSlideIndex((prev) => Math.min(presentation.slides.length - 1, prev + 1))}
        wordCount={totalWordCount}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onFitToScreen={() => setZoomLevel(1.0)}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((prev) => !prev)}
        showSnapGuides={showSnapGuides}
        onToggleSnapGuides={() => setShowSnapGuides((prev) => !prev)}
        showNotes={showNotes}
        onToggleNotes={() => setShowNotes((prev) => !prev)}
        onPresent={() => setIsFullscreen(true)}
        issues={issues}
        onOpenIssues={() => setIsValidationDrawerOpen((prev) => !prev)}
      />

      {/* 5. Modals & Dialogs */}
      <AIAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        presentation={presentation}
        activeSlideIndex={clampedSlideIndex}
        onApplyNewPresentation={handleApplyNewPresentation}
        onApplyNewSlide={handleApplyNewSlide}
        onApplySlideUpdate={handleApplySlideUpdate}
        currentTheme={presentation.theme}
      />

      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={(templateCode) => {
          handleLoadPreset(templateCode);
          setIsTemplateModalOpen(false);
        }}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onInsertExample={(exampleCode) => {
          setCode(exampleCode);
          setActiveSlideIndex(0);
          pushHistory(exampleCode);
        }}
      />
    </div>
  );
}
