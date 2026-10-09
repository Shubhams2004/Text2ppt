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
  onOpenHelp: () => void;
  hasErrors: boolean;
  activeMobileTab: 'editor' | 'preview';
  onMobileTabChange: (tab: 'editor' | 'preview') => void;
  exportSuccess: boolean;
  lastExportFormat?: ExportFormat;
  totalBatchCount?: number;
  onExportAllBatch?: (format?: ExportFormat) => void;
  isExportingAllBatch?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  presentation,
  currentTheme,
  onThemeChange,
  onLoadPreset,
  onReset,
  onExport,
  isExporting,
  onOpenHelp,
  hasErrors,
  activeMobileTab,
  onMobileTabChange,
  exportSuccess,
  lastExportFormat = 'pptx',
  totalBatchCount,
  onExportAllBatch,
  isExportingAllBatch,
}) => {
  const [isPresetsOpen, setIsPresetsOpen] = React.useState(false);
  const [isThemesOpen, setIsThemesOpen] = React.useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = React.useState(false);
  const [isBatchExportMenuOpen, setIsBatchExportMenuOpen] = React.useState(false);

  const presetsRef = React.useRef<HTMLDivElement>(null);
  const themesRef = React.useRef<HTMLDivElement>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);
  const batchExportRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
      if (themesRef.current && !themesRef.current.contains(e.target as Node)) {
        setIsThemesOpen(false);
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
    <header className="sticky top-0 z-30 flex-none border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Branding & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight">
                  Code2PPT
                </span>
                <span className="text-[10px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Client-Side
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs">
                {presentation.title || 'Untitled Presentation'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Mobile Tabs Switcher */}
        <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => onMobileTabChange('editor')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeMobileTab === 'editor'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => onMobileTabChange('preview')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeMobileTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Preview ({presentation.slides.length})
          </button>
        </div>

        {/* Right: Controls & Export */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Examples Dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              onClick={() => {
                setIsPresetsOpen(!isPresetsOpen);
                setIsThemesOpen(false);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
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
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

          {/* Theme Selector Dropdown */}
          <div className="relative" ref={themesRef}>
            <button
              onClick={() => {
                setIsThemesOpen(!isThemesOpen);
                setIsPresetsOpen(false);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
              title="Change presentation visual theme"
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
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

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Syntax Cheat Sheet"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Reset / Clear Button */}
          <button
            onClick={onReset}
            className="hidden lg:flex p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset code to default"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export All button if multiple presentations detected */}
          {totalBatchCount !== undefined && totalBatchCount > 1 && onExportAllBatch && (
            <div className="relative" ref={batchExportRef}>
              <div className="inline-flex rounded-lg shadow-xs">
                <button
                  onClick={() => onExportAllBatch('pptx')}
                  disabled={isExportingAllBatch}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-l-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-r-0 border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer disabled:opacity-50"
                  title="Download all detected presentations as separate .pptx files"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Export All ({totalBatchCount})</span>
                </button>
                <button
                  onClick={() => setIsBatchExportMenuOpen(!isBatchExportMenuOpen)}
                  disabled={isExportingAllBatch}
                  className="inline-flex items-center px-1.5 py-2 text-xs font-semibold rounded-r-lg bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer disabled:opacity-50"
                  title="Choose export format for all decks (PPTX or PDF)"
                  aria-label="Batch Export Format Options"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {isBatchExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Batch Export Format
                  </div>
                  <button
                    onClick={() => {
                      setIsBatchExportMenuOpen(false);
                      onExportAllBatch('pptx');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <div className="font-medium">All as PPTX</div>
                        <div className="text-[10px] text-slate-500">PowerPoint files (.pptx)</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setIsBatchExportMenuOpen(false);
                      onExportAllBatch('pdf');
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileType className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <div>
                        <div className="font-medium">All as PDF</div>
                        <div className="text-[10px] text-slate-500">Vector PDF documents (.pdf)</div>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Primary Action: Export PPTX & PDF with split dropdown */}
          <div className="relative" ref={exportRef}>
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => onExport('pptx')}
                disabled={isExporting || presentation.slides.length === 0}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-l-lg transition-all ${
                  exportSuccess
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : hasErrors
                    ? 'bg-indigo-600/80 hover:bg-indigo-600 text-white cursor-pointer'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                title="Download presentation as editable PowerPoint file (.pptx)"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span>Export PPTX</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExporting || presentation.slides.length === 0}
                className={`inline-flex items-center px-2 py-2 text-xs font-semibold rounded-r-lg border-l border-white/20 transition-all ${
                  exportSuccess
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
                title="Export options: Export PPTX or PDF format"
                aria-label="Export format options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export Format Dropdown Menu */}
            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Export Document As
                </div>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pptx');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                      <FileDown className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold">PowerPoint (.pptx)</div>
                      <div className="text-[10px] text-slate-500">Fully editable vector PPTX</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pdf');
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                      <FileType className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-rose-600 dark:text-rose-400">PDF Document (.pdf)</div>
                      <div className="text-[10px] text-slate-500">16:9 widescreen presentation PDF</div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
