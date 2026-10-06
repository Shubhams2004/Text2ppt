import { useState, useMemo, useCallback } from 'react';
import { parsePresentation } from './parser/presentationParser';
import { parseSimpleText } from './parser/simpleTextParser';
import { parseBatchPresentations, serializeBatchPresentations } from './parser/batchParser';
import { exportToPptxFile } from './renderer/pptxRenderer';
import { DEFAULT_CODE, DEFAULT_SIMPLE_TEXT, DEFAULT_BATCH_TEXT } from './examples/samplePresentations';
import { Header } from './components/Header';
import { Editor, InputMode } from './components/Editor';
import { Preview } from './components/Preview';
import { ValidationStatus } from './components/ValidationStatus';
import { HelpModal } from './components/HelpModal';
import { ThemeId } from './models/presentation';

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

  // Active content based on mode
  const currentContent =
    inputMode === 'code' ? code : inputMode === 'simple-text' ? simpleText : batchText;

  const handleContentChange = useCallback(
    (value: string) => {
      if (inputMode === 'code') {
        setCode(value);
      } else if (inputMode === 'simple-text') {
        setSimpleText(value);
      } else {
        setBatchText(value);
      }
    },
    [inputMode]
  );

  // Batch parse result memo
  const batchResult = useMemo(() => {
    return parseBatchPresentations(batchText);
  }, [batchText]);

  // Safe selected batch index
  const safeBatchIndex = useMemo(() => {
    if (batchResult.items.length === 0) return 0;
    return Math.min(Math.max(0, selectedBatchIndex), batchResult.items.length - 1);
  }, [batchResult.items.length, selectedBatchIndex]);

  // Parse code, simple text, or batch on every change
  const activeParseResult = useMemo(() => {
    if (inputMode === 'batch') {
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
      return {
        presentation: activeItem.presentation,
        issues: [...batchResult.issues, ...activeItem.issues],
        hasErrors: activeItem.hasErrors || batchResult.hasErrors,
      };
    }
    if (inputMode === 'simple-text') {
      return parseSimpleText(simpleText);
    }
    return parsePresentation(code);
  }, [inputMode, code, simpleText, batchResult, safeBatchIndex]);

  const { presentation, issues, hasErrors } = activeParseResult;

  // Ensure activeSlideIndex stays in bounds
  const clampedSlideIndex = useMemo(() => {
    const total = presentation.slides.length;
    if (total === 0) return 0;
    return Math.min(Math.max(0, activeSlideIndex), total - 1);
  }, [presentation.slides.length, activeSlideIndex]);

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
      setBatchText(newText);
      setSelectedBatchIndex(index - 1);
    },
    [batchResult.items]
  );

  const handleMoveDownBatch = useCallback(
    (index: number) => {
      if (index < 0 || index >= batchResult.items.length - 1) return;
      const reordered = [...batchResult.items];
      const temp = reordered[index + 1];
      reordered[index + 1] = reordered[index];
      reordered[index] = temp;
      const newText = serializeBatchPresentations(reordered);
      setBatchText(newText);
      setSelectedBatchIndex(index + 1);
    },
    [batchResult.items]
  );

  const handleRemoveBatch = useCallback(
    (index: number) => {
      const filtered = batchResult.items.filter((_, idx) => idx !== index);
      const newText = serializeBatchPresentations(filtered);
      setBatchText(newText);
      if (selectedBatchIndex >= filtered.length) {
        setSelectedBatchIndex(Math.max(0, filtered.length - 1));
      }
    },
    [batchResult.items, selectedBatchIndex]
  );

  const handleExportSingleBatch = useCallback(
    async (index: number) => {
      const item = batchResult.items[index];
      if (!item || item.presentation.slides.length === 0) return;
      const fileName = item.presentation.title || `presentation_${index + 1}`;
      await exportToPptxFile(item.presentation, {
        fileName,
        includeSlideNumbers: true,
      });
    },
    [batchResult.items]
  );

  const isBatchLimitExceeded = batchResult.totalPresentations > 20;
  const batchLimitIssue = batchResult.issues.find((i) => i.code === 'BATCH_LIMIT_EXCEEDED');

  const handleExportAllBatch = useCallback(async () => {
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
        await exportToPptxFile(item.presentation, {
          fileName,
          includeSlideNumbers: true,
        });
        // Non-blocking browser download delay between files
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    } finally {
      setIsExportingAllBatch(false);
      setBatchExportProgress(null);
    }
  }, [batchResult.items, batchResult.totalPresentations]);

  // Line selection from issues panel
  const handleSelectLine = useCallback((line: number) => {
    setActiveLine(line);
    setActiveMobileTab('editor');
  }, []);

  // Export PPTX Handler for currently active presentation
  const handleExport = useCallback(async () => {
    if (presentation.slides.length === 0) return;

    setIsExporting(true);
    setExportSuccess(false);

    try {
      const fileName = presentation.title || 'presentation';
      const result = await exportToPptxFile(presentation, {
        fileName,
        includeSlideNumbers: true,
      });

      if (result.success) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Unexpected export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [presentation]);

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
        onOpenHelp={() => setIsHelpOpen(true)}
        hasErrors={hasErrors}
        activeMobileTab={activeMobileTab}
        onMobileTabChange={setActiveMobileTab}
        exportSuccess={exportSuccess}
      />

      {/* Main Two-Panel Layout */}
      <main className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
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
            onModeChange={setInputMode}
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
          />
        </section>
      </main>

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

