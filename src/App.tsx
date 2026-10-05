import { useState, useMemo, useCallback } from 'react';
import { parsePresentation } from './parser/presentationParser';
import { exportToPptxFile } from './renderer/pptxRenderer';
import { DEFAULT_CODE } from './examples/samplePresentations';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { ValidationStatus } from './components/ValidationStatus';
import { HelpModal } from './components/HelpModal';
import { ThemeId } from './models/presentation';

export default function App() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  // Parse code on every change
  const parseResult = useMemo(() => {
    return parsePresentation(code);
  }, [code]);

  const { presentation, issues, hasErrors } = parseResult;

  // Ensure activeSlideIndex stays in bounds
  const clampedSlideIndex = useMemo(() => {
    const total = presentation.slides.length;
    if (total === 0) return 0;
    return Math.min(Math.max(0, activeSlideIndex), total - 1);
  }, [presentation.slides.length, activeSlideIndex]);

  // Handle theme changes from Header UI
  const handleThemeChange = useCallback(
    (newTheme: ThemeId) => {
      // Check if theme command exists in code
      const themeRegex = /^\s*theme\s+["']?([a-zA-Z0-9_-]+)["']?/m;
      if (themeRegex.test(code)) {
        const updated = code.replace(themeRegex, `theme "${newTheme}"`);
        setCode(updated);
      } else {
        // Prepend or add after presentation line
        const presentationRegex = /^(\s*presentation\s+["'][^"']*["'])/m;
        if (presentationRegex.test(code)) {
          const updated = code.replace(presentationRegex, `$1\ntheme "${newTheme}"`);
          setCode(updated);
        } else {
          setCode(`theme "${newTheme}"\n\n${code}`);
        }
      }
    },
    [code]
  );

  // Load preset code
  const handleLoadPreset = useCallback((presetCode: string) => {
    setCode(presetCode);
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, []);

  // Reset to default
  const handleReset = useCallback(() => {
    setCode(DEFAULT_CODE);
    setActiveSlideIndex(0);
    setActiveLine(null);
  }, []);

  // Line selection from issues panel
  const handleSelectLine = useCallback((line: number) => {
    setActiveLine(line);
    // Switch to editor tab on mobile
    setActiveMobileTab('editor');
  }, []);

  // Export PPTX Handler
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
            code={code}
            onChange={setCode}
            issues={issues}
            activeLine={activeLine}
            onSelectLine={handleSelectLine}
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
