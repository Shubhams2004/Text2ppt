import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Square,
  FileQuestion,
  Image as ImageIcon,
  Layers,
  Sparkles,
  RotateCw,
  PenTool,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Table as TableIcon,
  BarChart3,
  Shapes,
  FileText,
  ListPlus,
  Upload,
  ExternalLink,
  StickyNote,
  X,
  Check,
  Palette,
  Eye,
} from 'lucide-react';
import {
  ChartElement,
  ChartType,
  Presentation,
  ShapeElement,
  ShapeType,
  Slide,
  SlideElement,
  SlideLayout,
  SlideTransition,
  TableElement,
  ThemeId,
} from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { computeSlideLayout } from '../renderer/layoutSystem';
import { BatchPresentationItem } from '../parser/batchParser';

/**
 * Slide transition variants for Framer Motion
 */
function getSlideVariants(transition?: SlideTransition, navDir: number = 1) {
  const style = transition?.style;
  const direction = transition?.direction;

  if (style === 'none') {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 },
    };
  }

  if (style === 'cut') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  if (style === 'fade') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  if (style === 'push') {
    const effDir = direction || (navDir >= 0 ? 'left' : 'right');
    let xIn: string | number = 0;
    let xExit: string | number = 0;
    let yIn: string | number = 0;
    let yExit: string | number = 0;

    if (effDir === 'left' || effDir === 'l') {
      xIn = '100%';
      xExit = '-100%';
    } else if (effDir === 'right' || effDir === 'r') {
      xIn = '-100%';
      xExit = '100%';
    } else if (effDir === 'up' || effDir === 'u') {
      yIn = '100%';
      yExit = '-100%';
    } else if (effDir === 'down' || effDir === 'd') {
      yIn = '-100%';
      yExit = '100%';
    } else {
      xIn = navDir >= 0 ? '100%' : '-100%';
      xExit = navDir >= 0 ? '-100%' : '100%';
    }

    return {
      initial: { x: xIn, y: yIn, opacity: 1 },
      animate: { x: 0, y: 0, opacity: 1 },
      exit: { x: xExit, y: yExit, opacity: 1 },
    };
  }

  if (style === 'zoom') {
    return {
      initial: { scale: 0.82, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.15, opacity: 0 },
    };
  }

  if (style === 'wipe') {
    const effDir = direction || (navDir >= 0 ? 'left' : 'right');
    const initialClip =
      effDir === 'right' || effDir === 'r'
        ? 'inset(0 0 0 100%)'
        : effDir === 'up' || effDir === 'u'
        ? 'inset(100% 0 0 0)'
        : effDir === 'down' || effDir === 'd'
        ? 'inset(0 0 100% 0)'
        : 'inset(0 100% 0 0)';

    return {
      initial: { clipPath: initialClip, opacity: 1 },
      animate: { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
      exit: { opacity: 0.2 },
    };
  }

  if (style === 'split') {
    return {
      initial: { scaleY: 0.05, opacity: 0 },
      animate: { scaleY: 1, opacity: 1 },
      exit: { scaleY: 0.05, opacity: 0 },
    };
  }

  if (style === 'dissolve') {
    return {
      initial: { opacity: 0, filter: 'blur(8px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(8px)' },
    };
  }

  return {
    initial: {
      x: navDir >= 0 ? '6%' : '-6%',
      opacity: 0,
      scale: 0.985,
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: {
      x: navDir >= 0 ? '-6%' : '6%',
      opacity: 0,
      scale: 0.985,
    },
  };
}

function getSlideTransitionTiming(transition?: SlideTransition) {
  if (transition?.style === 'none') {
    return { duration: 0 };
  }
  if (transition?.style === 'cut') {
    return { duration: 0.04, ease: 'linear' as const };
  }

  let duration = 0.32;
  if (typeof transition?.duration === 'number' && transition.duration > 0) {
    duration = Math.min(3, transition.duration);
  } else if (transition?.speed === 'fast') {
    duration = 0.18;
  } else if (transition?.speed === 'slow') {
    duration = 0.55;
  } else if (transition?.speed === 'med') {
    duration = 0.32;
  }

  return {
    duration,
    ease: [0.22, 1, 0.36, 1] as const,
  };
}

interface PreviewProps {
  presentation: Presentation;
  themeId: ThemeId;
  activeSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onUpdatePresentation?: (presentation: Presentation) => void;
  batchItems?: BatchPresentationItem[];
  selectedBatchIndex?: number;
  onSelectBatchItem?: (index: number) => void;
}

export const Preview: React.FC<PreviewProps> = ({
  presentation,
  themeId,
  activeSlideIndex,
  onSelectSlide,
  onUpdatePresentation,
  batchItems,
  selectedBatchIndex = 0,
  onSelectBatchItem,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [isVisualEditing, setIsVisualEditing] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showNotesDrawer, setShowNotesDrawer] = useState(false);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isAddElementOpen, setIsAddElementOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const theme = THEMES[themeId] || THEMES.modern;
  const slides = presentation.slides;
  const totalSlides = slides.length;
  const currentSlide: Slide | undefined = slides[activeSlideIndex] || slides[0];
  const activeTransition = currentSlide?.transition || presentation.transition;

  const prevSlideIndexRef = useRef(activeSlideIndex);
  const navDirection = activeSlideIndex >= prevSlideIndexRef.current ? 1 : -1;
  useEffect(() => {
    prevSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  // Keyboard navigation and shortcuts for slide preview & visual editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (viewMode === 'grid') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !isVisualEditing)) {
        e.preventDefault();
        if (activeSlideIndex < totalSlides - 1) {
          onSelectSlide(activeSlideIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (activeSlideIndex > 0) {
          onSelectSlide(activeSlideIndex - 1);
        }
      } else if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        if (selectedElementId) setSelectedElementId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && isVisualEditing && selectedElementId) {
        e.preventDefault();
        handleDeleteElement(selectedElementId);
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey) && isVisualEditing && selectedElementId) {
        e.preventDefault();
        handleDuplicateElement(selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlideIndex, totalSlides, viewMode, isFullscreen, onSelectSlide, isVisualEditing, selectedElementId]);

  // Visual Editor Handlers
  const handleUpdateSlideTitle = (newTitle: string) => {
    if (!currentSlide || !onUpdatePresentation) return;
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? { ...s, title: newTitle } : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
  };

  const handleUpdateSlideNotes = (notes: string) => {
    if (!currentSlide || !onUpdatePresentation) return;
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? { ...s, notes } : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
  };

  const handleAddSlide = () => {
    if (!onUpdatePresentation) return;
    const newSlide: Slide = {
      id: `slide-${slides.length + 1}`,
      index: slides.length,
      title: 'New Slide',
      line: slides.length * 5,
      layout: 'title-content',
      elements: [{ id: `el-${Date.now()}`, type: 'text', content: 'Add your content here...', line: 1 }],
    };
    const newSlides = [...slides, newSlide];
    onUpdatePresentation({ ...presentation, slides: newSlides });
    onSelectSlide(newSlides.length - 1);
  };

  const handleDuplicateSlide = () => {
    if (!currentSlide || !onUpdatePresentation) return;
    const duplicated: Slide = {
      ...currentSlide,
      id: `slide-${Date.now()}`,
      title: `${currentSlide.title} (Copy)`,
      elements: currentSlide.elements.map((el) => ({ ...el, id: `el-${Date.now()}-${Math.random()}` })),
    };
    const newSlides = [...slides];
    newSlides.splice(activeSlideIndex + 1, 0, duplicated);
    onUpdatePresentation({ ...presentation, slides: newSlides });
    onSelectSlide(activeSlideIndex + 1);
  };

  const handleDeleteSlide = () => {
    if (!currentSlide || !onUpdatePresentation || slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== activeSlideIndex);
    onUpdatePresentation({ ...presentation, slides: newSlides });
    onSelectSlide(Math.max(0, activeSlideIndex - 1));
  };

  const handleAddElement = (type: 'text' | 'bullet' | 'shape' | 'table' | 'chart', subtype?: string) => {
    if (!currentSlide || !onUpdatePresentation) return;
    const id = `el-${Date.now()}`;
    let newEl: SlideElement;

    if (type === 'shape') {
      newEl = {
        id,
        type: 'shape',
        content: subtype || 'rect',
        shapeType: (subtype as ShapeType) || 'rect',
        fillColor: theme.accentColor,
        line: 1,
      };
    } else if (type === 'table') {
      newEl = {
        id,
        type: 'table',
        content: 'Table',
        headers: ['Feature', 'Description', 'Status'],
        rows: [
          ['PowerPoint Export', 'Native PPTX Generation', 'Ready'],
          ['Visual Editing', 'Direct Slide Manipulation', 'Active'],
        ],
        line: 1,
      };
    } else if (type === 'chart') {
      newEl = {
        id,
        type: 'chart',
        content: 'Metrics Chart',
        chartType: (subtype as ChartType) || 'bar',
        title: 'Performance Overview',
        data: [
          { label: 'Q1', value: 45 },
          { label: 'Q2', value: 70 },
          { label: 'Q3', value: 95 },
        ],
        line: 1,
      };
    } else if (type === 'bullet') {
      newEl = { id, type: 'bullet', content: 'New bullet point', line: 1 };
    } else {
      newEl = { id, type: 'text', content: 'New paragraph description...', line: 1 };
    }

    const updatedSlide = {
      ...currentSlide,
      elements: [...currentSlide.elements, newEl],
    };
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
    setSelectedElementId(id);
    setIsAddElementOpen(false);
  };

  const handleDuplicateElement = (elementId: string) => {
    if (!currentSlide || !onUpdatePresentation) return;
    const target = currentSlide.elements.find((el) => el.id === elementId);
    if (!target) return;
    const copy: SlideElement = { ...target, id: `el-${Date.now()}` };
    const updatedSlide = {
      ...currentSlide,
      elements: [...currentSlide.elements, copy],
    };
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
    setSelectedElementId(copy.id);
  };

  const handleDeleteElement = (elementId: string) => {
    if (!currentSlide || !onUpdatePresentation) return;
    const updatedSlide = {
      ...currentSlide,
      elements: currentSlide.elements.filter((el) => el.id !== elementId),
    };
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
    if (selectedElementId === elementId) setSelectedElementId(null);
  };

  const handleMoveElement = (elementId: string, dir: 'up' | 'down') => {
    if (!currentSlide || !onUpdatePresentation) return;
    const idx = currentSlide.elements.findIndex((el) => el.id === elementId);
    if (idx === -1) return;
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentSlide.elements.length) return;

    const newEls = [...currentSlide.elements];
    const [moved] = newEls.splice(idx, 1);
    newEls.splice(targetIdx, 0, moved);

    const updatedSlide = { ...currentSlide, elements: newEls };
    const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updatedSlide : s));
    onUpdatePresentation({ ...presentation, slides: newSlides });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSlide || !onUpdatePresentation) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (!dataUri) return;

      const imgEl: SlideElement = {
        id: `el-${Date.now()}`,
        type: 'image',
        content: file.name,
        src: dataUri,
        url: dataUri,
        alt: file.name,
        line: 1,
      };

      const updatedSlide: Slide = {
        ...currentSlide,
        elements: [...currentSlide.elements, imgEl],
        layout: (currentSlide.layout === 'full-image' ? 'full-image' : 'text-image') as SlideLayout,
      };
      const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
      onUpdatePresentation({ ...presentation, slides: newSlides });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementId);

  return (
    <div
      className={`flex flex-col h-full bg-slate-100 dark:bg-slate-950/80 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black/90 p-6' : ''
      }`}
    >
      {/* Hidden file input for local device image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Preview Top Controls */}
      <div className="flex-none px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-2 text-xs flex-wrap">
        {/* Left: Slide navigation & count */}
        <div className="flex items-center gap-1.5 flex-none">
          <button
            onClick={() => onSelectSlide(Math.max(0, activeSlideIndex - 1))}
            disabled={activeSlideIndex <= 0 || totalSlides === 0}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[70px] text-center text-[11px] sm:text-xs">
            {totalSlides > 0 ? `Slide ${activeSlideIndex + 1} of ${totalSlides}` : 'No slides'}
          </span>

          <button
            onClick={() => onSelectSlide(Math.min(totalSlides - 1, activeSlideIndex + 1))}
            disabled={activeSlideIndex >= totalSlides - 1 || totalSlides === 0}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-Deck Selector if multiple presentations present */}
        {batchItems && batchItems.length > 1 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs font-medium">
            <Layers className="w-3.5 h-3.5 text-indigo-500 flex-none" />
            <select
              value={selectedBatchIndex}
              onChange={(e) => onSelectBatchItem?.(Number(e.target.value))}
              aria-label="Select Presentation Deck"
              className="bg-transparent border-none text-slate-800 dark:text-slate-200 font-semibold text-xs cursor-pointer focus:outline-none max-w-[140px] truncate"
            >
              {batchItems.map((item, idx) => (
                <option key={item.id} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {idx + 1}. {item.presentation.title || `Deck ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Center: Slide indicator pills & transition replay */}
        <div className="flex items-center gap-2">
          {activeTransition && activeTransition.style !== 'none' && !isVisualEditing && (
            <button
              onClick={() => setReplayCount((c) => c + 1)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-2xs hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer group"
              title={`Slide transition: ${activeTransition.style} • Click to replay effect`}
            >
              <Sparkles className="w-3 h-3 text-indigo-500 group-hover:rotate-12 transition-transform" />
              <span className="capitalize">{activeTransition.style}</span>
              <RotateCw className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Right: Studio Visual Editor Toggle & View Modes */}
        <div className="flex items-center gap-1">
          {/* Visual Editor Mode Toggle */}
          <button
            onClick={() => {
              setIsVisualEditing(!isVisualEditing);
              if (viewMode === 'grid') setViewMode('single');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isVisualEditing
                ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
            }`}
            title={isVisualEditing ? 'Switch to Presentation Mode' : 'Enable Visual Slide Studio Workspace'}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{isVisualEditing ? 'Visual Editor' : 'Visual Studio'}</span>
          </button>

          {/* Grid View Toggle */}
          <button
            onClick={() => {
              setViewMode(viewMode === 'single' ? 'grid' : 'single');
              setIsVisualEditing(false);
            }}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            title={viewMode === 'single' ? 'Show all slides grid' : 'Show single slide'}
          >
            {viewMode === 'single' ? <LayoutGrid className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Present / Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visual Studio Editing Context Toolbar */}
      {isVisualEditing && currentSlide && (
        <div className="flex-none px-4 py-2 bg-indigo-50/90 dark:bg-slate-900 border-b border-indigo-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap animate-in fade-in duration-150">
          {/* Add Elements Actions */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider mr-1">
              Insert:
            </span>

            <button
              onClick={() => handleAddElement('text')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
            >
              <FileText className="w-3 h-3 text-indigo-500" />
              <span>Text</span>
            </button>

            <button
              onClick={() => handleAddElement('bullet')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
            >
              <ListPlus className="w-3 h-3 text-indigo-500" />
              <span>Bullet</span>
            </button>

            {/* Shape Menu */}
            <div className="relative">
              <button
                onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              >
                <Shapes className="w-3 h-3 text-emerald-500" />
                <span>Shape</span>
              </button>
              {isShapeMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1 z-50">
                  {(['rect', 'round-rect', 'circle', 'arrow', 'line', 'triangle', 'star'] as const).map((sh) => (
                    <button
                      key={sh}
                      onClick={() => {
                        handleAddElement('shape', sh);
                        setIsShapeMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium capitalize text-slate-700 dark:text-slate-300"
                    >
                      {sh.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleAddElement('table')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
            >
              <TableIcon className="w-3 h-3 text-amber-500" />
              <span>Table</span>
            </button>

            <button
              onClick={() => handleAddElement('chart', 'bar')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
            >
              <BarChart3 className="w-3 h-3 text-violet-500" />
              <span>Chart</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              title="Upload an image from your device into this slide"
            >
              <Upload className="w-3 h-3 text-rose-500" />
              <span>Upload Image</span>
            </button>
          </div>

          {/* Slide Deck Operations */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSlide}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs shadow-2xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Slide</span>
            </button>
            <button
              onClick={handleDuplicateSlide}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Duplicate current slide"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteSlide}
              disabled={slides.length <= 1}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Delete current slide"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Selected Element Property Inspector */}
      {isVisualEditing && selectedElement && (
        <div className="flex-none px-4 py-2 bg-indigo-100/70 dark:bg-slate-900/90 border-b border-indigo-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap animate-in slide-in-from-top-1 duration-100">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-semibold text-indigo-700 dark:text-indigo-400 text-[11px] uppercase">
              {selectedElement.type}:
            </span>
            <input
              type="text"
              value={selectedElement.content}
              onChange={(e) => {
                if (!currentSlide || !onUpdatePresentation) return;
                const updated = currentSlide.elements.map((el) =>
                  el.id === selectedElement.id ? { ...el, content: e.target.value } : el
                );
                onUpdatePresentation({
                  ...presentation,
                  slides: slides.map((s, i) => (i === activeSlideIndex ? { ...s, elements: updated } : s)),
                });
              }}
              className="flex-1 max-w-md px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-indigo-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Edit element content..."
            />
          </div>

          <div className="flex items-center gap-1.5 flex-none">
            <button
              onClick={() => handleMoveElement(selectedElement.id, 'up')}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Move element up in layer order"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleMoveElement(selectedElement.id, 'down')}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Move element down in layer order"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDuplicateElement(selectedElement.id)}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Duplicate element"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteElement(selectedElement.id)}
              className="p-1 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Delete element"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSelectedElementId(null)}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 flex items-center justify-center">
        {totalSlides === 0 ? (
          <div className="text-center p-8 max-w-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
              No Slides Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">slide "Title"</code> in the editor or click "New Slide" to start.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View: All slides overview
          <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
            {slides.map((s, index) => (
              <div
                key={s.id || index}
                onClick={() => {
                  onSelectSlide(index);
                  setViewMode('single');
                }}
                className={`group cursor-pointer rounded-xl overflow-hidden border-2 transition-all shadow-sm hover:shadow-md ${
                  index === activeSlideIndex
                    ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="relative aspect-[16/9] w-full">
                  <SlideCanvas
                    slide={s}
                    slideIndex={index}
                    totalSlides={totalSlides}
                    presentationTitle={presentation.title}
                    theme={theme}
                    isThumbnail={true}
                  />
                </div>
                <div className="px-3 py-2 bg-white dark:bg-slate-900 text-xs flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {index + 1}. {s.title}
                  </span>
                  <div className="flex items-center gap-1.5 flex-none">
                    {s.transition && s.transition.style !== 'none' && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded font-medium">
                        {s.transition.style}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {s.elements.length} {s.elements.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Single Slide View
          <div className="w-full max-w-4xl flex flex-col items-center">
            {/* Slide Stage Container */}
            <div
              className={`w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/15 dark:shadow-black/50 ring-1 ring-slate-900/10 dark:ring-white/10 transition-all ${
                isVisualEditing ? 'ring-2 ring-indigo-500/50' : ''
              }`}
              style={{ backgroundColor: currentSlide?.background || theme.bgColor }}
            >
              <AnimatePresence mode="popLayout" custom={navDirection} initial={false}>
                {currentSlide && (
                  <motion.div
                    key={`${currentSlide.id || activeSlideIndex}-${replayCount}`}
                    custom={navDirection}
                    variants={isVisualEditing ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } } : getSlideVariants(activeTransition, navDirection)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={isVisualEditing ? { duration: 0 } : getSlideTransitionTiming(activeTransition)}
                    className="w-full h-full"
                  >
                    <SlideCanvas
                      slide={currentSlide}
                      slideIndex={activeSlideIndex}
                      totalSlides={totalSlides}
                      presentationTitle={presentation.title}
                      theme={theme}
                      isVisualEditing={isVisualEditing}
                      selectedElementId={selectedElementId}
                      onSelectElement={(id) => setSelectedElementId(id)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Speaker Notes Pill/Bar */}
            {currentSlide?.notes && (
              <div className="w-full max-w-4xl mt-3 px-3.5 py-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-xl text-xs flex items-start gap-2 shadow-2xs">
                <StickyNote className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 mr-1.5">
                    Speaker Notes:
                  </span>
                  <span className="text-amber-900/90 dark:text-amber-200">
                    {currentSlide.notes}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive Filmstrip */}
            {totalSlides > 1 && !isFullscreen && (
              <div className="flex items-center gap-1.5 mt-4 overflow-x-auto max-w-full px-2 py-1.5 scrollbar-thin">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectSlide(idx);
                      setSelectedElementId(null);
                    }}
                    className={`group px-3 py-1.5 text-xs rounded-xl font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      idx === activeSlideIndex
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                        : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800'
                    }`}
                    title={`Jump to slide ${idx + 1}: ${s.title}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-md text-[10px] font-bold flex items-center justify-center ${
                        idx === activeSlideIndex
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">
                      {s.title || `Slide ${idx + 1}`}
                    </span>
                    {s.layout && s.layout !== 'title-content' && (
                      <span
                        className={`text-[9px] uppercase px-1 rounded font-semibold ${
                          idx === activeSlideIndex ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.layout === 'two-column' ? '2-Col' : s.layout === 'full-image' ? 'Image' : s.layout}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen Floating Presentation HUD */}
            {isFullscreen && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/80 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-4 text-xs z-50">
                <button
                  onClick={() => onSelectSlide(Math.max(0, activeSlideIndex - 1))}
                  disabled={activeSlideIndex <= 0}
                  className="p-1 hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Previous Slide (Left Arrow)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-slate-300">
                  {activeSlideIndex + 1} / {totalSlides}
                </span>
                <button
                  onClick={() => onSelectSlide(Math.min(totalSlides - 1, activeSlideIndex + 1))}
                  disabled={activeSlideIndex >= totalSlides - 1}
                  className="p-1 hover:bg-slate-800 rounded-lg disabled:opacity-30 cursor-pointer"
                  title="Next Slide (Right Arrow)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="w-px h-4 bg-slate-700" />
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="hover:text-indigo-400 cursor-pointer"
                  title="Exit Fullscreen (Esc)"
                >
                  Exit (Esc)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface SlideCanvasProps {
  slide: Slide;
  slideIndex: number;
  totalSlides: number;
  presentationTitle: string;
  theme: typeof THEMES['modern'];
  isThumbnail?: boolean;
  isVisualEditing?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}

const SlideImage: React.FC<{
  imageRegion: NonNullable<ReturnType<typeof computeSlideLayout>['imageRegion']>;
  isThumbnail: boolean;
  theme: typeof THEMES['modern'];
}> = ({ imageRegion, isThumbnail, theme }) => {
  const [loadError, setLoadError] = useState(false);
  const { hasImage, image, label } = imageRegion;

  if (!hasImage || !image || !image.src) {
    return (
      <div className="w-full h-full min-h-[100px] rounded-lg border-2 border-dashed border-black/15 dark:border-white/15 bg-black/5 dark:bg-white/5 flex flex-col items-center justify-center p-4 text-center">
        <ImageIcon className={`${isThumbnail ? 'w-4 h-4' : 'w-8 h-8'} text-slate-400 mb-1.5`} />
        {!isThumbnail && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </span>
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full min-h-[100px] rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex flex-col items-center justify-center p-3 text-center">
        <FileQuestion className={`${isThumbnail ? 'w-3 h-3' : 'w-6 h-6'} text-rose-500 mb-1`} />
        <span className={`${isThumbnail ? 'text-[7px]' : 'text-xs'} font-medium text-rose-600 dark:text-rose-400 truncate max-w-full px-1`}>
          Failed to load image
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[100px] rounded-lg overflow-hidden flex items-center justify-center p-1 bg-black/5 dark:bg-white/5">
      <img
        src={image.src}
        alt={image.alt || 'Slide image'}
        className="max-w-full max-h-full object-contain rounded"
        onError={() => setLoadError(true)}
      />
    </div>
  );
};

const renderElementItems = (
  elements: SlideElement[],
  bodyTextClass: string,
  theme: typeof THEMES['modern'],
  isThumbnail: boolean,
  isVisualEditing?: boolean,
  selectedElementId?: string | null,
  onSelectElement?: (id: string | null) => void
) => {
  if (elements.length === 0) return null;
  return elements.map((el) => {
    const isSelected = isVisualEditing && selectedElementId === el.id;
    const wrapperClass = isVisualEditing
      ? `relative transition-all cursor-pointer rounded p-1 ${
          isSelected
            ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
            : 'hover:ring-1 hover:ring-indigo-300/80 hover:bg-black/[0.02]'
        }`
      : '';

    const onClickHandler = isVisualEditing
      ? (e: React.MouseEvent) => {
          e.stopPropagation();
          onSelectElement?.(el.id);
        }
      : undefined;

    // Bullet item
    if (el.type === 'bullet') {
      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <div className="flex items-start gap-2.5">
            <span
              className={`rounded-full mt-1.5 flex-none ${isThumbnail ? 'w-1 h-1' : 'w-2 h-2'}`}
              style={{ backgroundColor: theme.accentColor }}
            />
            <span
              className={`leading-relaxed ${isThumbnail ? 'text-[9px] line-clamp-1' : bodyTextClass}`}
              style={{ color: theme.bodyColor }}
            >
              {el.content}
              {el.link && (
                <a
                  href={el.link}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 inline-flex items-center text-indigo-500 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              )}
            </span>
          </div>
        </div>
      );
    }

    // Subtitle item
    if (el.type === 'subtitle') {
      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <div
            className={`font-semibold tracking-wide uppercase ${isThumbnail ? 'text-[8px]' : 'text-xs sm:text-sm'}`}
            style={{ color: theme.accentColor }}
          >
            {el.content}
          </div>
        </div>
      );
    }

    // Quote item
    if (el.type === 'quote') {
      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <blockquote
            className={`italic border-l-2 pl-3 my-2 ${isThumbnail ? 'text-[9px]' : bodyTextClass}`}
            style={{ borderColor: theme.accentColor, color: theme.bodyColor }}
          >
            “{el.content}”
          </blockquote>
        </div>
      );
    }

    // Shape item
    if (el.type === 'shape') {
      const shape = el as ShapeElement;
      const fill = shape.fillColor || theme.accentColor;
      const stroke = shape.strokeColor || theme.border;
      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <div className="my-2 flex items-center justify-center p-1">
            {shape.shapeType === 'circle' ? (
              <div
                className={`${isThumbnail ? 'w-8 h-8' : 'w-16 h-16'} rounded-full border shadow-xs`}
                style={{ backgroundColor: fill, borderColor: stroke }}
              />
            ) : shape.shapeType === 'round-rect' ? (
              <div
                className={`${isThumbnail ? 'w-12 h-7' : 'w-24 h-14'} rounded-xl border shadow-xs`}
                style={{ backgroundColor: fill, borderColor: stroke }}
              />
            ) : shape.shapeType === 'line' ? (
              <div className="w-full h-1 rounded-full" style={{ backgroundColor: fill }} />
            ) : shape.shapeType === 'arrow' ? (
              <svg className={isThumbnail ? 'w-12 h-6' : 'w-24 h-12'} viewBox="0 0 100 50">
                <polygon points="0,15 60,15 60,0 100,25 60,50 60,35 0,35" fill={fill} stroke={stroke} strokeWidth="1.5" />
              </svg>
            ) : shape.shapeType === 'triangle' ? (
              <svg className={isThumbnail ? 'w-10 h-8' : 'w-20 h-16'} viewBox="0 0 100 80">
                <polygon points="50,0 100,80 0,80" fill={fill} stroke={stroke} strokeWidth="1.5" />
              </svg>
            ) : shape.shapeType === 'star' ? (
              <svg className={isThumbnail ? 'w-8 h-8' : 'w-16 h-16'} viewBox="0 0 100 100">
                <polygon
                  points="50,0 63,38 100,38 69,59 82,100 50,75 18,100 31,59 0,38 37,38"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="1.5"
                />
              </svg>
            ) : (
              <div
                className={`${isThumbnail ? 'w-14 h-7' : 'w-28 h-14'} rounded border shadow-xs`}
                style={{ backgroundColor: fill, borderColor: stroke }}
              />
            )}
          </div>
        </div>
      );
    }

    // Table item
    if (el.type === 'table') {
      const table = el as TableElement;
      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <div className="w-full overflow-x-auto my-2 rounded-lg border border-black/10 dark:border-white/10 shadow-2xs">
            <table className="w-full border-collapse text-left text-[10px] sm:text-xs">
              <thead>
                <tr style={{ backgroundColor: theme.accentColor, color: '#ffffff' }}>
                  {(table.headers || []).map((h, i) => (
                    <th key={i} className="p-1.5 sm:p-2 font-bold border-r border-white/20 last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.rows || []).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={rIdx % 2 === 0 ? 'bg-black/[0.02] dark:bg-white/[0.02]' : ''}
                    style={{ color: theme.bodyColor }}
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1.5 sm:p-2 border-t border-black/5 dark:border-white/5 border-r last:border-r-0">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Chart item
    if (el.type === 'chart') {
      const chart = el as ChartElement;
      const data = chart.data || [];
      const maxVal = Math.max(...data.map((d) => d.value), 1);
      const colors = [theme.accentColor, theme.titleColor, '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

      return (
        <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
          <div className="w-full my-2 p-2 sm:p-3 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
            {chart.title && (
              <div className="font-semibold text-xs mb-1.5 truncate" style={{ color: theme.titleColor }}>
                {chart.title}
              </div>
            )}
            <div className="space-y-1.5 py-1">
              {data.map((d, i) => {
                const pct = Math.min(100, Math.max(5, (d.value / maxVal) * 100));
                const barColor = colors[i % colors.length];
                return (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]" style={{ color: theme.bodyColor }}>
                      <span className="font-medium truncate max-w-[70%]">{d.label}</span>
                      <span className="font-bold">{d.value}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Text paragraph
    return (
      <div key={el.id} className={wrapperClass} onClick={onClickHandler}>
        <p
          className={`leading-relaxed ${isThumbnail ? 'text-[9px] line-clamp-2' : bodyTextClass}`}
          style={{ color: theme.bodyColor }}
        >
          {el.content}
          {el.link && (
            <a
              href={el.link}
              target="_blank"
              rel="noreferrer"
              className="ml-1 inline-flex items-center text-indigo-500 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          )}
        </p>
      </div>
    );
  });
};

const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  slideIndex,
  totalSlides,
  presentationTitle,
  theme,
  isThumbnail = false,
  isVisualEditing = false,
  selectedElementId = null,
  onSelectElement,
}) => {
  const layout = computeSlideLayout(slide, slideIndex, totalSlides, presentationTitle);
  const typography = layout.body.typography;

  const bodyTextClass =
    typography.fontSize <= 12
      ? 'text-xs sm:text-sm'
      : typography.fontSize <= 14
      ? 'text-xs sm:text-base'
      : typography.fontSize >= 18
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  const titleClass =
    layout.header.title.fontSize <= 18
      ? isThumbnail ? 'text-xs' : 'text-base sm:text-lg'
      : layout.header.title.fontSize <= 20
      ? isThumbnail ? 'text-xs' : 'text-lg sm:text-xl'
      : isThumbnail ? 'text-xs' : 'text-xl sm:text-2xl';

  return (
    <div
      onClick={() => onSelectElement?.(null)}
      className="absolute inset-0 p-[7%] flex flex-col select-none transition-colors duration-150"
      style={{
        backgroundColor: slide.background || theme.bgColor,
        color: theme.bodyColor,
      }}
    >
      {layout.layoutType === 'title' ? (
        // Title / Cover Slide Layout
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-16 h-1.5 rounded-full mb-4" style={{ backgroundColor: theme.accentColor }} />
          <h1
            className={`font-bold tracking-tight mb-4 ${isThumbnail ? 'text-sm' : 'text-3xl sm:text-4xl'}`}
            style={{ color: theme.titleColor }}
          >
            {slide.title}
          </h1>
          <div className="space-y-2 max-w-2xl">
            {slide.elements.map((el) => (
              <p
                key={el.id}
                className={`${
                  el.type === 'subtitle'
                    ? isThumbnail ? 'text-[10px] font-semibold' : 'text-base sm:text-lg font-medium'
                    : isThumbnail ? 'text-[9px]' : 'text-base sm:text-lg text-slate-600 dark:text-slate-400'
                }`}
                style={{ color: el.type === 'subtitle' ? theme.accentColor : theme.bodyColor }}
              >
                {el.content}
              </p>
            ))}
          </div>
        </div>
      ) : (
        // Standard, Column, Image, or Blank Slide Layouts
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          {layout.header.show && (
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/10 dark:border-white/10 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-5 rounded-full flex-none" style={{ backgroundColor: theme.accentColor }} />
                <h2 className={`font-bold tracking-tight truncate ${titleClass}`} style={{ color: theme.titleColor }}>
                  {slide.title}
                </h2>
              </div>
              {layout.body.isOverflowing && !isThumbnail && (
                <span className="flex-none px-2 py-0.5 text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 rounded-md">
                  Auto-fit
                </span>
              )}
            </div>
          )}

          {/* Layout Content Area */}
          {layout.layoutType === 'two-column' && layout.twoColumn ? (
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              <div className="space-y-2 overflow-hidden border-r border-black/5 dark:border-white/5 pr-2">
                {renderElementItems(
                  layout.twoColumn.column1.elements.map((e) => e.element),
                  bodyTextClass,
                  theme,
                  isThumbnail,
                  isVisualEditing,
                  selectedElementId,
                  onSelectElement
                )}
              </div>
              <div className="space-y-2 overflow-hidden pl-2">
                {renderElementItems(
                  layout.twoColumn.column2.elements.map((e) => e.element),
                  bodyTextClass,
                  theme,
                  isThumbnail,
                  isVisualEditing,
                  selectedElementId,
                  onSelectElement
                )}
              </div>
            </div>
          ) : layout.layoutType === 'text-image' ? (
            <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
              <div className="col-span-7 space-y-2 overflow-hidden">
                {renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail,
                  isVisualEditing,
                  selectedElementId,
                  onSelectElement
                )}
              </div>
              <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                {layout.imageRegion && <SlideImage imageRegion={layout.imageRegion} isThumbnail={isThumbnail} theme={theme} />}
              </div>
            </div>
          ) : layout.layoutType === 'image-text' ? (
            <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
              <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                {layout.imageRegion && <SlideImage imageRegion={layout.imageRegion} isThumbnail={isThumbnail} theme={theme} />}
              </div>
              <div className="col-span-7 space-y-2 overflow-hidden">
                {renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail,
                  isVisualEditing,
                  selectedElementId,
                  onSelectElement
                )}
              </div>
            </div>
          ) : layout.layoutType === 'full-image' ? (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="flex-1 overflow-hidden min-h-0 flex items-center justify-center">
                {layout.imageRegion && <SlideImage imageRegion={layout.imageRegion} isThumbnail={isThumbnail} theme={theme} />}
              </div>
              {slide.elements.filter((e) => e.type !== 'image').length > 0 && (
                <div className="flex-none pt-1">
                  {renderElementItems(
                    slide.elements.filter((e) => e.type !== 'image'),
                    'text-xs text-slate-500',
                    theme,
                    isThumbnail,
                    isVisualEditing,
                    selectedElementId,
                    onSelectElement
                  )}
                </div>
              )}
            </div>
          ) : (
            // Standard Title-Content or Blank layout
            <div className={`flex-1 overflow-hidden space-y-2 ${isThumbnail ? 'space-y-1' : ''}`}>
              {slide.elements.filter((e) => e.type !== 'image').length === 0 && !layout.imageRegion?.hasImage ? (
                <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs italic">
                  {isThumbnail ? '' : 'Empty Slide — Click Insert to add elements'}
                </div>
              ) : layout.imageRegion?.hasImage ? (
                <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
                  <div className="col-span-7 space-y-2 overflow-hidden">
                    {renderElementItems(
                      slide.elements.filter((e) => e.type !== 'image'),
                      bodyTextClass,
                      theme,
                      isThumbnail,
                      isVisualEditing,
                      selectedElementId,
                      onSelectElement
                    )}
                  </div>
                  <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                    <SlideImage imageRegion={layout.imageRegion} isThumbnail={isThumbnail} theme={theme} />
                  </div>
                </div>
              ) : (
                renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail,
                  isVisualEditing,
                  selectedElementId,
                  onSelectElement
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Slide Footer */}
      {layout.footer.show && (
        <div className="flex-none pt-2 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 border-t border-black/5 dark:border-white/5">
          <span className="truncate max-w-[60%] font-medium">{presentationTitle || 'Code2PPT'}</span>
          <span>
            Slide {slideIndex + 1} of {totalSlides}
          </span>
        </div>
      )}
    </div>
  );
};
