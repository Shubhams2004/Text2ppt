import React from 'react';
import {
  FileDown,
  Layers,
  Sparkles,
  HelpCircle,
  Palette,
  RotateCcw,
  Check,
  ChevronDown,
  FileType,
  Sun,
  Moon,
  Undo2,
  Redo2,
  FolderOpen,
  Save,
  FileSpreadsheet,
  FileCode,
  Archive,
  Menu,
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Presentation, ThemeId } from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { SAMPLE_PRESENTATIONS } from '../examples/samplePresentations';

export type ExportFormat = 'pptx' | 'pdf';

interface HeaderProps {
  presentation: Presentation;
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  onLoadPreset: (code: string) => void;
  onReset: () => void;
  onExport: (format?: ExportFormat) => void;
  isExporting: boolean;
  exportingFormat?: ExportFormat | null;
  onOpenHelp: () => void;
  onNavigateLanding?: () => void;
  hasErrors: boolean;
  activeMobileTab: 'editor' | 'preview';
  onMobileTabChange: (tab: 'editor' | 'preview') => void;
  exportSuccess: boolean;
  exportSuccessFormat?: ExportFormat | null;
  lastExportFormat?: ExportFormat;
  totalBatchCount?: number;
  onExportAllBatch?: (format?: ExportFormat) => void;
  onExportAllBatchZip?: () => void;
  isExportingAllBatch?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportProject?: () => void;
  onImportProjectFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportMarkdownFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportCsvFile?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  presentation,
  currentTheme,
  onThemeChange,
  onLoadPreset,
  onReset,
  onExport,
  isExporting,
  exportingFormat = null,
  onOpenHelp,
  onNavigateLanding,
  hasErrors,
  activeMobileTab,
  onMobileTabChange,
  exportSuccess,
  exportSuccessFormat = null,
  lastExportFormat = 'pptx',
  totalBatchCount,
  onExportAllBatch,
  onExportAllBatchZip,
  isExportingAllBatch,
  isDarkMode = false,
  onToggleDarkMode,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onExportProject,
  onImportProjectFile,
  onImportMarkdownFile,
  onImportCsvFile,
}) => {
  const [isPresetsOpen, setIsPresetsOpen] = React.useState(false);
  const [isThemesOpen, setIsThemesOpen] = React.useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = React.useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = React.useState(false);
  const [isBatchExportMenuOpen, setIsBatchExportMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const presetsRef = React.useRef<HTMLDivElement>(null);
  const themesRef = React.useRef<HTMLDivElement>(null);
  const fileMenuRef = React.useRef<HTMLDivElement>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const batchExportRef = React.useRef<HTMLDivElement>(null);

  const projectInputRef = React.useRef<HTMLInputElement>(null);
  const mdInputRef = React.useRef<HTMLInputElement>(null);
  const csvInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
      if (themesRef.current && !themesRef.current.contains(e.target as Node)) {
        setIsThemesOpen(false);
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (batchExportRef.current && !batchExportRef.current.contains(e.target as Node)) {
        setIsBatchExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex-none border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={projectInputRef}
        accept=".json,.code2ppt"
        onChange={onImportProjectFile}
        className="hidden"
      />
      <input
        type="file"
        ref={mdInputRef}
        accept=".md,.markdown"
        onChange={onImportMarkdownFile}
        className="hidden"
      />
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv"
        onChange={onImportCsvFile}
        className="hidden"
      />

      <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onNavigateLanding}
            className={`flex items-center gap-2 text-left ${
              onNavigateLanding ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
            }`}
            title={onNavigateLanding ? 'About Code2PPT Studio & User Guide' : undefined}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-600/20 flex-none">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base tracking-tight truncate">
                  Code2PPT
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70 hidden sm:inline-block">
                  STUDIO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-xs">
                {presentation.title || 'Untitled Presentation'}
              </p>
            </div>
          </button>
        </div>

        {/* Center: Device Storage Status on desktop */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 flex-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-none" />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Local Browser Storage</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Zero Cloud Upload</span>
        </div>

        {/* Center: Desktop / Tablet Mode Switcher */}
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium flex-none">
          <button
            onClick={() => onMobileTabChange('editor')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeMobileTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => onMobileTabChange('preview')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              activeMobileTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Preview ({presentation.slides.length})
          </button>
        </div>

        {/* Right Section: Controls & Export */}
        <div className="flex items-center gap-1 sm:gap-2 flex-none">
          {/* Desktop-only Undo/Redo */}
          <div className="hidden md:flex items-center gap-0.5">
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Desktop Project Menu Dropdown */}
          <div className="relative hidden md:block" ref={fileMenuRef}>
            <button
              onClick={() => {
                setIsFileMenuOpen(!isFileMenuOpen);
                setIsPresetsOpen(false);
                setIsThemesOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Project file operations"
            >
              <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Project</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isFileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Project Backup
                </div>
                <button
                  onClick={() => {
                    onExportProject?.();
                    setIsFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Save Project (.json)</span>
                </button>
                <button
                  onClick={() => {
                    projectInputRef.current?.click();
                    setIsFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Open Project (.json)</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Import Content
                </div>
                <button
                  onClick={() => {
                    mdInputRef.current?.click();
                    setIsFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Import Markdown (.md)</span>
                </button>
                <button
                  onClick={() => {
                    csvInputRef.current?.click();
                    setIsFileMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                  <span>Import CSV Spreadsheet</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Examples Dropdown */}
          <div className="relative hidden md:block" ref={presetsRef}>
            <button
              onClick={() => {
                setIsPresetsOpen(!isPresetsOpen);
                setIsThemesOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Load example presentations"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Examples</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isPresetsOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Sample Presentations
                </div>
                {SAMPLE_PRESENTATIONS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onLoadPreset(preset.code);
                      setIsPresetsOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Theme Selector Dropdown */}
          <div className="relative hidden md:block" ref={themesRef}>
            <button
              onClick={() => {
                setIsThemesOpen(!isThemesOpen);
                setIsPresetsOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Change presentation theme"
            >
              <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>{THEMES[currentTheme]?.name || 'Theme'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isThemesOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Slide Themes
                </div>
                {Object.values(THEMES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id);
                      setIsThemesOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                      currentTheme === theme.id
                        ? 'font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-black/10 inline-block"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      <span>{theme.name}</span>
                    </div>
                    {currentTheme === theme.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dark / Light Mode Toggle */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex-none"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}

          {/* Desktop About & Guide Link */}
          {onNavigateLanding && (
            <button
              onClick={onNavigateLanding}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex-none"
              title="About Code2PPT Studio and Complete User Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>About & Guide</span>
            </button>
          )}

          {/* Desktop Help Button */}
          <button
            onClick={onOpenHelp}
            className="hidden sm:inline-flex p-1.5 sm:p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex-none"
            title="Syntax Cheat Sheet & Guide (Ctrl+/)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Export Actions Section: Both PPTX and PDF Clearly Available */}
          <div className="relative flex items-center" ref={exportRef}>
            <div className="inline-flex items-center rounded-lg shadow-xs bg-slate-100/90 dark:bg-slate-800/90 p-0.5 border border-slate-200/80 dark:border-slate-700/80">
              {/* PowerPoint (PPTX) Download Button */}
              <button
                onClick={() => onExport('pptx')}
                disabled={isExporting || presentation.slides.length === 0}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                  exportSuccessFormat === 'pptx' || (exportSuccess && lastExportFormat === 'pptx')
                    ? 'bg-emerald-600 text-white'
                    : exportingFormat === 'pptx'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                }`}
                title="Download editable PowerPoint (.pptx) — Ctrl+S"
                aria-label="Download PowerPoint presentation"
              >
                {exportingFormat === 'pptx' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : exportSuccessFormat === 'pptx' || (exportSuccess && lastExportFormat === 'pptx') ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 flex-none" />
                )}
                <span className="font-semibold text-xs sm:text-sm">PPTX</span>
              </button>

              {/* PDF Document Download Button */}
              <button
                onClick={() => onExport('pdf')}
                disabled={isExporting || presentation.slides.length === 0}
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ml-0.5 sm:ml-1 ${
                  exportSuccessFormat === 'pdf' || (exportSuccess && lastExportFormat === 'pdf')
                    ? 'bg-emerald-600 text-white'
                    : exportingFormat === 'pdf'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white'
                }`}
                title="Download 16:9 vector PDF (.pdf) — Ctrl+P"
                aria-label="Download PDF presentation"
              >
                {exportingFormat === 'pdf' ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : exportSuccessFormat === 'pdf' || (exportSuccess && lastExportFormat === 'pdf') ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <FileType className="w-3.5 h-3.5 flex-none" />
                )}
                <span className="font-semibold text-xs sm:text-sm">PDF</span>
              </button>

              {/* Format Options Dropdown Toggle */}
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExporting || presentation.slides.length === 0}
                className="inline-flex items-center px-1 py-1.5 text-xs font-semibold rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                title="More download options"
                aria-label="Download format options"
              >
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>

            {/* Export Format Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1.5 mb-1">
                  <span>Download Formats</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {presentation.slides.length} {presentation.slides.length === 1 ? 'slide' : 'slides'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pptx');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs flex-none">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">PowerPoint (.pptx)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Editable 16:9 presentation</div>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400">Ctrl+S</kbd>
                </button>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pdf');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer group mt-1"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs flex-none">
                      <FileType className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-rose-600 dark:text-rose-400">PDF Document (.pdf)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">Vector 16:9 widescreen presentation</div>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400">Ctrl+P</kbd>
                </button>

                {totalBatchCount !== undefined && totalBatchCount > 1 && onExportAllBatch && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5">
                    <div className="px-2.5 py-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                      Batch Export ({totalBatchCount} Decks)
                    </div>
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExportAllBatch('pptx');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                      <span>All as PowerPoint (.pptx)</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExportAllBatch('pdf');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                    >
                      <FileType className="w-3.5 h-3.5 text-rose-500" />
                      <span>All as Vector PDF (.pdf)</span>
                    </button>
                    {onExportAllBatchZip && (
                      <button
                        onClick={() => {
                          setIsExportMenuOpen(false);
                          onExportAllBatchZip();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-left transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5 text-amber-500" />
                        <span>All as ZIP Archive (.zip)</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            title="Open Studio Menu"
            aria-label="Open Mobile Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay / Navigation Modal */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-top-2 duration-150">
          {/* Mobile Mode Switcher */}
          <div className="flex items-center justify-between p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => {
                onMobileTabChange('editor');
                setIsMobileMenuOpen(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMobileTab === 'editor'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Code Editor
            </button>
            <button
              onClick={() => {
                onMobileTabChange('preview');
                setIsMobileMenuOpen(false);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeMobileTab === 'preview'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Slide Preview ({presentation.slides.length})
            </button>
          </div>

          {/* Mobile Quick Export Actions */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Instant Download
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onExport('pptx');
                  setIsMobileMenuOpen(false);
                }}
                disabled={isExporting || presentation.slides.length === 0}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
              >
                <FileDown className="w-4 h-4" />
                <span>Export PPTX</span>
              </button>
              <button
                onClick={() => {
                  onExport('pdf');
                  setIsMobileMenuOpen(false);
                }}
                disabled={isExporting || presentation.slides.length === 0}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 active:bg-rose-700 text-white font-semibold text-xs shadow-xs"
              >
                <FileType className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
            </div>
          </div>

          {/* Mobile Theme Selection */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Theme Selection
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {Object.values(THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    onThemeChange(theme.id);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border text-left transition-all ${
                    currentTheme === theme.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-none border border-black/10"
                    style={{ backgroundColor: theme.accentColor }}
                  />
                  <span className="truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Project Backup Actions */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Project & Files
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  onExportProject?.();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Save className="w-4 h-4 text-indigo-500" />
                <span>Save Project</span>
              </button>
              <button
                onClick={() => {
                  projectInputRef.current?.click();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FolderOpen className="w-4 h-4 text-indigo-500" />
                <span>Open Project</span>
              </button>
              <button
                onClick={() => {
                  mdInputRef.current?.click();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileCode className="w-4 h-4 text-emerald-500" />
                <span>Import .md</span>
              </button>
              <button
                onClick={() => {
                  csvInputRef.current?.click();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          {/* Mobile Examples */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Templates
            </div>
            <div className="space-y-1">
              {SAMPLE_PRESENTATIONS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadPreset(preset.code);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{preset.name}</span>
                  <span className="text-[10px] text-slate-400">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile About & Guide Link */}
          {onNavigateLanding && (
            <button
              onClick={() => {
                onNavigateLanding();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold text-xs cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>About Code2PPT & User Guide</span>
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Help & Info */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                onOpenHelp();
                setIsMobileMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium py-1"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Syntax Cheat Sheet</span>
            </button>
            <div className="text-[11px] text-slate-400">
              100% Client-Side • Zero Cloud Upload
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
