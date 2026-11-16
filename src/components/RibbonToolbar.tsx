import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Home,
  PlusSquare,
  Palette,
  Sparkles,
  Play,
  FileDown,
  FileType,
  Undo2,
  Redo2,
  HelpCircle,
  Sun,
  Moon,
  FolderOpen,
  Save,
  FileSpreadsheet,
  FileCode,
  Layout,
  Type,
  Image as ImageIcon,
  Shapes,
  Table as TableIcon,
  BarChart3,
  Sliders,
  Grid,
  Maximize2,
  Minimize2,
  BookOpen,
  Check,
  ChevronDown,
  Layers,
  Wand2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Scissors,
  Copy,
  Trash2,
  Eye,
  CheckCircle2,
  RotateCw,
  Clock,
  Compass,
} from 'lucide-react';
import { Presentation, ThemeId, SlideLayout, TransitionStyle, SlideElement } from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { ExportFormat } from './Header';

export type RibbonTab =
  | 'file'
  | 'home'
  | 'insert'
  | 'design'
  | 'transitions'
  | 'animations'
  | 'review'
  | 'view'
  | 'ai';

export interface RibbonToolbarProps {
  presentation: Presentation;
  onUpdateTitle: (newTitle: string) => void;
  activeSlideIndex: number;
  selectedElement: SlideElement | null;
  onUpdateElement?: (updated: SlideElement) => void;
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
  onAddSlide: (layout?: SlideLayout) => void;
  onInsertElement: (type: 'text' | 'image' | 'shape' | 'table' | 'chart' | 'quote', payload?: any) => void;
  onExport: (format?: ExportFormat) => void;
  isExporting: boolean;
  exportSuccess: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPresent: () => void;
  onOpenAIModal: () => void;
  onOpenTemplates: () => void;
  onOpenHelp: () => void;
  onNavigateLanding: () => void;
  onExportProject: () => void;
  onImportProjectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportPptxFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportMarkdownFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportCsvFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCleanContent: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  // Canvas View Controls
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSnapGuides: boolean;
  onToggleSnapGuides: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  showNotes: boolean;
  onToggleNotes: () => void;
  aspectRatio: '16:9' | '4:3';
  onChangeAspectRatio: (ratio: '16:9' | '4:3') => void;
  showCodePane?: boolean;
  onToggleCodePane?: () => void;
  // Transition Controls
  onApplyTransition: (style: TransitionStyle, applyToAll?: boolean) => void;
}

export const RibbonToolbar: React.FC<RibbonToolbarProps> = ({
  presentation,
  onUpdateTitle,
  activeSlideIndex,
  selectedElement,
  onUpdateElement,
  currentTheme,
  onThemeChange,
  onAddSlide,
  onInsertElement,
  onExport,
  isExporting,
  exportSuccess,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPresent,
  onOpenAIModal,
  onOpenTemplates,
  onOpenHelp,
  onNavigateLanding,
  onExportProject,
  onImportProjectFile,
  onImportPptxFile,
  onImportMarkdownFile,
  onImportCsvFile,
  onCleanContent,
  isDarkMode,
  onToggleDarkMode,
  zoomLevel,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showSnapGuides,
  onToggleSnapGuides,
  showRulers,
  onToggleRulers,
  showNotes,
  onToggleNotes,
  aspectRatio,
  onChangeAspectRatio,
  showCodePane = false,
  onToggleCodePane,
  onApplyTransition,
}) => {
  const [activeTab, setActiveTab] = useState<RibbonTab>('home');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(presentation.title);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const pptxInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleDraft(presentation.title);
  }, [presentation.title]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    setIsTitleEditing(false);
    if (titleDraft.trim()) {
      onUpdateTitle(titleDraft.trim());
    }
  };

  const currentSlide = presentation.slides[activeSlideIndex] || presentation.slides[0];

  return (
    <header className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 select-none z-30 shadow-xs">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={pptxInputRef}
        onChange={onImportPptxFile}
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
      />
      <input
        type="file"
        ref={projectInputRef}
        onChange={onImportProjectFile}
        accept=".json,.code2ppt"
        className="hidden"
      />
      <input
        type="file"
        ref={mdInputRef}
        onChange={onImportMarkdownFile}
        accept=".md,text/markdown"
        className="hidden"
      />
      <input
        type="file"
        ref={csvInputRef}
        onChange={onImportCsvFile}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Level 1: Top Navigation Bar */}
      <div className="h-11 px-4 flex items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onNavigateLanding}
            className="flex items-center gap-2 group cursor-pointer"
            title="Code2PPT Home & Guide"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 transition-transform flex-none">
              P
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white hidden sm:inline">
              Code2PPT <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Studio</span>
            </span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Editable Presentation Title */}
          {isTitleEditing ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              autoFocus
              className="px-2 py-0.5 text-xs font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded text-slate-900 dark:text-white outline-none w-48 sm:w-64"
            />
          ) : (
            <button
              onClick={() => setIsTitleEditing(true)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded truncate max-w-[140px] sm:max-w-[240px] text-left transition-colors cursor-pointer"
              title="Click to rename presentation"
            >
              {presentation.title || 'Untitled Presentation'}
            </button>
          )}

          {/* Autosaved Status Indicator */}
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium ml-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Saved locally</span>
          </span>
        </div>

        {/* Right: Actions, Present & Export */}
        <div className="flex items-center gap-2 flex-none">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Assistant Quick Trigger */}
          <button
            onClick={onOpenAIModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/60 dark:to-purple-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 transition-all cursor-pointer shadow-xs"
            title="Open AI Presentation Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Assistant</span>
          </button>

          {/* Present Full-Screen Button */}
          <button
            onClick={onPresent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shadow-xs"
            title="Start Full-Screen Presentation Mode"
          >
            <Play className="w-3.5 h-3.5 fill-current text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Present</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={isExporting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
                exportSuccess ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isExporting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : exportSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Export</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in duration-100">
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pptx');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400">PowerPoint (.pptx)</div>
                    <div className="text-[10px] text-slate-500">Native OpenXML vector slides</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    onExport('pdf');
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <FileType className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <div>
                    <div className="font-semibold text-rose-600 dark:text-rose-400">PDF Document (.pdf)</div>
                    <div className="text-[10px] text-slate-500">Vector 16:9 presentation document</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Level 2: Office Ribbon Tabs Header */}
      <div className="px-4 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 overflow-x-auto no-scrollbar">
        {[
          { id: 'file', label: 'File' },
          { id: 'home', label: 'Home' },
          { id: 'insert', label: 'Insert' },
          { id: 'design', label: 'Design' },
          { id: 'transitions', label: 'Transitions' },
          { id: 'animations', label: 'Animations' },
          { id: 'review', label: 'Review' },
          { id: 'view', label: 'View' },
          { id: 'ai', label: 'AI Assistant' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'ai') {
                onOpenAIModal();
              } else {
                setActiveTab(tab.id as RibbonTab);
              }
            }}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Level 3: Ribbon Content Bar (Contextual Tools) */}
      <div className="h-14 px-4 py-1.5 flex items-center gap-3 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900">
        {/* FILE TAB */}
        {activeTab === 'file' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => pptxInputRef.current?.click()}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Import and edit existing PowerPoint presentation (.pptx)"
            >
              <FolderOpen className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span>Import PPTX</span>
            </button>
            <button
              onClick={() => projectInputRef.current?.click()}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Open project backup file (.code2ppt.json)"
            >
              <FolderOpen className="w-4 h-4 text-slate-500 mb-0.5" />
              <span>Open Backup</span>
            </button>
            <button
              onClick={onExportProject}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Download local project backup (.code2ppt.json)"
            >
              <Save className="w-4 h-4 text-emerald-600 mb-0.5" />
              <span>Save Backup</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />
            <button
              onClick={() => mdInputRef.current?.click()}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Import Markdown document (.md)"
            >
              <FileCode className="w-4 h-4 text-emerald-500 mb-0.5" />
              <span>Import .md</span>
            </button>
            <button
              onClick={() => csvInputRef.current?.click()}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Import CSV Spreadsheet (.csv)"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-500 mb-0.5" />
              <span>Import .csv</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />
            <button
              onClick={onOpenTemplates}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              title="Browse Curated Template Gallery"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Templates</span>
            </button>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="flex items-center gap-2">
            {/* New Slide Button */}
            <button
              onClick={() => onAddSlide('title-content')}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <PlusSquare className="w-4 h-4 text-indigo-600 mb-0.5" />
              <span>New Slide</span>
            </button>

            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />

            {/* Quick Insert Elements */}
            <button
              onClick={() => onInsertElement('text')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Insert Text Box"
            >
              <Type className="w-3.5 h-3.5 text-indigo-500" />
              <span>Text</span>
            </button>

            <button
              onClick={() => onInsertElement('shape', { shapeType: 'round-rect' })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Insert Rectangle Shape"
            >
              <Shapes className="w-3.5 h-3.5 text-indigo-500" />
              <span>Shape</span>
            </button>

            <button
              onClick={() => onInsertElement('image')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              title="Insert Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Image</span>
            </button>

            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />

            {/* Typography Formatting when text element selected */}
            {selectedElement && selectedElement.type === 'text' && onUpdateElement && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateElement({ ...selectedElement, bold: !selectedElement.bold })}
                  className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
                    selectedElement.bold ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateElement({ ...selectedElement, italic: !selectedElement.italic })}
                  className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
                    selectedElement.italic ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateElement({ ...selectedElement, underline: !selectedElement.underline })}
                  className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
                    selectedElement.underline ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                <div className="h-6 w-px bg-slate-200 dark:border-slate-800 mx-1" />

                <button
                  onClick={() => onUpdateElement({ ...selectedElement, align: 'left' })}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedElement.align === 'left' || !selectedElement.align ? 'bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateElement({ ...selectedElement, align: 'center' })}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedElement.align === 'center' ? 'bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onUpdateElement({ ...selectedElement, align: 'right' })}
                  className={`p-1.5 rounded cursor-pointer ${
                    selectedElement.align === 'right' ? 'bg-slate-200 dark:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* INSERT TAB */}
        {activeTab === 'insert' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onInsertElement('text')}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Type className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Text Box</span>
            </button>
            <button
              onClick={() => onInsertElement('image')}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Image</span>
            </button>
            <button
              onClick={() => onInsertElement('shape', { shapeType: 'round-rect' })}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Shapes className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Shapes</span>
            </button>
            <button
              onClick={() => onInsertElement('table')}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <TableIcon className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => onInsertElement('chart', { chartType: 'bar' })}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Chart</span>
            </button>
            <button
              onClick={() => onInsertElement('quote')}
              className="flex flex-col items-center justify-center px-3 py-1 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-500 mb-0.5" />
              <span>Quote</span>
            </button>
          </div>
        )}

        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div className="flex items-center gap-3">
            {/* Theme Palettes */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Themes:
              </span>
              {Object.values(THEMES).slice(0, 7).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                    currentTheme === t.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/10"
                    style={{ backgroundColor: t.accentColor }}
                  />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>

            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />

            {/* Slide Dimensions */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => onChangeAspectRatio('16:9')}
                className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                  aspectRatio === '16:9' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                16:9 Widescreen
              </button>
              <button
                onClick={() => onChangeAspectRatio('4:3')}
                className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                  aspectRatio === '4:3' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                4:3 Standard
              </button>
            </div>
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === 'transitions' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Transition:
            </span>
            {(['none', 'fade', 'push', 'wipe', 'split', 'zoom'] as TransitionStyle[]).map((st) => (
              <button
                key={st}
                onClick={() => onApplyTransition(st, false)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  currentSlide.transition?.style === st
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}

            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />

            <button
              onClick={() => onApplyTransition(currentSlide.transition?.style || 'fade', true)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              Apply to All Slides
            </button>
          </div>
        )}

        {/* REVIEW TAB */}
        {activeTab === 'review' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onCleanContent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-semibold text-xs cursor-pointer shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Clean Content & Filler</span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />
            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>Automatic WCAG 2.1 Contrast: <strong className="text-emerald-600">Active</strong></span>
              <span>Spatial Overlap Guard: <strong className="text-emerald-600">Active</strong></span>
              <span>Image Asset Integrity: <strong className="text-emerald-600">Active</strong></span>
            </div>
          </div>
        )}

        {/* VIEW TAB */}
        {activeTab === 'view' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.1))}
                className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded font-bold cursor-pointer"
                title="Zoom Out"
              >
                -
              </button>
              <span className="px-2 font-mono text-[11px] font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => onZoomChange(Math.min(2.0, zoomLevel + 0.1))}
                className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded font-bold cursor-pointer"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={() => onZoomChange(1.0)}
                className="px-2 py-1 hover:bg-white dark:hover:bg-slate-700 rounded text-[11px] font-medium cursor-pointer"
              >
                100%
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:border-slate-800 mx-1" />

            <button
              onClick={onToggleGrid}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                showGrid ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>

            <button
              onClick={onToggleSnapGuides}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                showSnapGuides ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Smart Guides</span>
            </button>

            <button
              onClick={onToggleNotes}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                showNotes ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            <button
              onClick={onToggleRulers}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                showRulers ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Rulers</span>
            </button>

            {onToggleCodePane && (
              <button
                onClick={onToggleCodePane}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  showCodePane ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Code Outliner</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
