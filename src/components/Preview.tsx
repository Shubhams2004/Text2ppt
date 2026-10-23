import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Grid,
  Undo2,
  Redo2,
  Palette,
  Sliders,
  Move,
  CornerDownRight,
  Settings,
  ChevronDown,
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
import {
  computeSlideLayout,
  ComputedSlideLayout,
  DEFAULT_GEOMETRY,
} from '../renderer/layoutSystem';
import { BatchPresentationItem } from '../parser/batchParser';
import { VisualPropertiesPanel } from './VisualPropertiesPanel';

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

/**
 * Returns consistent slide coordinates (in inches) for any element on the slide.
 * Uses explicit coordinates when defined, or computes natural placement from layout system.
 */
export function getElementGeometry(
  el: SlideElement,
  layout: ComputedSlideLayout,
  index: number
): { x: number; y: number; w: number; h: number } {
  if (el.x !== undefined && el.y !== undefined) {
    return {
      x: el.x,
      y: el.y,
      w: el.w !== undefined ? el.w : el.type === 'shape' ? 2.5 : el.type === 'image' ? 4.0 : 4.5,
      h: el.h !== undefined ? el.h : el.type === 'shape' ? 1.5 : el.type === 'image' ? 3.0 : 1.2,
    };
  }

  const layoutEl = layout.body.elements.find((e) => e.element.id === el.id);
  if (layoutEl) {
    return {
      x: Number(layoutEl.bounds.x.toFixed(2)),
      y: Number(layoutEl.bounds.y.toFixed(2)),
      w: Number(layoutEl.bounds.w.toFixed(2)),
      h: Number(Math.max(0.6, layoutEl.bounds.h).toFixed(2)),
    };
  }

  if (el.type === 'image') {
    const ib = layout.imageRegion?.fittedBounds || layout.imageRegion?.bounds;
    if (ib) {
      return {
        x: Number(ib.x.toFixed(2)),
        y: Number(ib.y.toFixed(2)),
        w: Number(ib.w.toFixed(2)),
        h: Number(ib.h.toFixed(2)),
      };
    }
    return { x: 5.2, y: 1.5, w: 4.0, h: 3.0 };
  }

  if (el.type === 'shape') {
    return {
      x: Number((layout.body.bounds.x + (index % 3) * 2.8).toFixed(2)),
      y: Number((layout.body.bounds.y + 1.2).toFixed(2)),
      w: 2.4,
      h: 1.5,
    };
  }

  if (el.type === 'table') {
    return {
      x: Number(layout.body.bounds.x.toFixed(2)),
      y: Number((layout.body.bounds.y + 1.0).toFixed(2)),
      w: Number(layout.body.bounds.w.toFixed(2)),
      h: 2.8,
    };
  }

  if (el.type === 'chart') {
    return {
      x: Number(layout.body.bounds.x.toFixed(2)),
      y: Number((layout.body.bounds.y + 1.0).toFixed(2)),
      w: Number(Math.min(6.5, layout.body.bounds.w).toFixed(2)),
      h: 2.8,
    };
  }

  return {
    x: Number(layout.body.bounds.x.toFixed(2)),
    y: Number((layout.body.bounds.y + index * 0.9).toFixed(2)),
    w: Number(layout.body.bounds.w.toFixed(2)),
    h: 0.9,
  };
}

export interface PreviewProps {
  presentation: Presentation;
  themeId: ThemeId;
  activeSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onUpdatePresentation?: (presentation: Presentation, commitToHistory?: boolean) => void;
  batchItems?: BatchPresentationItem[];
  selectedBatchIndex?: number;
  onSelectBatchItem?: (index: number) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [replayCount, setReplayCount] = useState(0);
  const [isVisualEditing, setIsVisualEditing] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(0.1); // 0.1 inch grid step
  const [activeGuides, setActiveGuides] = useState<{ v?: number; h?: number }>({});
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

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

  // Selected element lookup
  const selectedElement = currentSlide?.elements.find((el) => el.id === selectedElementId);

  // Update a single element on current slide and push to canonical presentation
  const handleUpdateElement = useCallback(
    (updated: SlideElement, commitToHistory: boolean = true) => {
      if (!currentSlide || !onUpdatePresentation) return;
      const newElements = currentSlide.elements.map((el) =>
        el.id === updated.id ? updated : el
      );
      const updatedSlide = { ...currentSlide, elements: newElements };
      const newSlides = slides.map((s, idx) =>
        idx === activeSlideIndex ? updatedSlide : s
      );
      onUpdatePresentation({ ...presentation, slides: newSlides }, commitToHistory);
    },
    [currentSlide, onUpdatePresentation, slides, activeSlideIndex, presentation]
  );

  // Delete element from current slide
  const handleDeleteElement = useCallback(
    (elementId: string) => {
      if (!currentSlide || !onUpdatePresentation) return;
      const updatedSlide = {
        ...currentSlide,
        elements: currentSlide.elements.filter((el) => el.id !== elementId),
      };
      const newSlides = slides.map((s, idx) =>
        idx === activeSlideIndex ? updatedSlide : s
      );
      onUpdatePresentation({ ...presentation, slides: newSlides }, true);
      if (selectedElementId === elementId) {
        setSelectedElementId(null);
        setInlineEditingId(null);
      }
    },
    [currentSlide, onUpdatePresentation, slides, activeSlideIndex, presentation, selectedElementId]
  );

  // Duplicate element with slight spatial offset
  const handleDuplicateElement = useCallback(
    (elementId: string) => {
      if (!currentSlide || !onUpdatePresentation) return;
      const target = currentSlide.elements.find((el) => el.id === elementId);
      if (!target) return;

      const layout = computeSlideLayout(currentSlide, activeSlideIndex, totalSlides, presentation.title);
      const geom = getElementGeometry(target, layout, currentSlide.elements.indexOf(target));

      const copyId = `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const copy: SlideElement = {
        ...target,
        id: copyId,
        x: Math.min(10.0 - (geom.w || 4.0), Number((geom.x + 0.3).toFixed(2))),
        y: Math.min(5.625 - (geom.h || 1.5), Number((geom.y + 0.3).toFixed(2))),
        w: geom.w,
        h: geom.h,
      };

      const updatedSlide = {
        ...currentSlide,
        elements: [...currentSlide.elements, copy],
      };
      const newSlides = slides.map((s, idx) =>
        idx === activeSlideIndex ? updatedSlide : s
      );
      onUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setSelectedElementId(copyId);
    },
    [currentSlide, onUpdatePresentation, slides, activeSlideIndex, totalSlides, presentation]
  );

  // Layer ordering: front, forward, backward, back
  const handleLayerChange = useCallback(
    (elementId: string, action: 'front' | 'forward' | 'backward' | 'back') => {
      if (!currentSlide || !onUpdatePresentation) return;
      const index = currentSlide.elements.findIndex((el) => el.id === elementId);
      if (index === -1) return;

      const newElements = [...currentSlide.elements];
      const [target] = newElements.splice(index, 1);

      if (action === 'front') {
        newElements.push(target);
      } else if (action === 'back') {
        newElements.unshift(target);
      } else if (action === 'forward') {
        const nextIdx = Math.min(newElements.length, index + 1);
        newElements.splice(nextIdx, 0, target);
      } else if (action === 'backward') {
        const prevIdx = Math.max(0, index - 1);
        newElements.splice(prevIdx, 0, target);
      }

      const updatedSlide = { ...currentSlide, elements: newElements };
      const newSlides = slides.map((s, idx) =>
        idx === activeSlideIndex ? updatedSlide : s
      );
      onUpdatePresentation({ ...presentation, slides: newSlides }, true);
    },
    [currentSlide, onUpdatePresentation, slides, activeSlideIndex, presentation]
  );

  // Quick alignment relative to slide canvas
  const handleAlignElement = useCallback(
    (elementId: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (!currentSlide || !onUpdatePresentation) return;
      const target = currentSlide.elements.find((el) => el.id === elementId);
      if (!target) return;

      const layout = computeSlideLayout(currentSlide, activeSlideIndex, totalSlides, presentation.title);
      const geom = getElementGeometry(target, layout, currentSlide.elements.indexOf(target));

      let newX = geom.x;
      let newY = geom.y;

      if (alignment === 'left') newX = 0.8;
      else if (alignment === 'center') newX = Number(((10.0 - geom.w) / 2).toFixed(2));
      else if (alignment === 'right') newX = Number((10.0 - 0.8 - geom.w).toFixed(2));
      else if (alignment === 'top') newY = 0.5;
      else if (alignment === 'middle') newY = Number(((5.625 - geom.h) / 2).toFixed(2));
      else if (alignment === 'bottom') newY = Number((5.625 - 0.5 - geom.h).toFixed(2));

      handleUpdateElement({ ...target, x: newX, y: newY, w: geom.w, h: geom.h }, true);
    },
    [currentSlide, onUpdatePresentation, totalSlides, activeSlideIndex, presentation, handleUpdateElement]
  );

  // Slide Deck Management: Add, Duplicate, Delete, Reorder
  const handleAddSlide = () => {
    if (!onUpdatePresentation) return;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      index: slides.length,
      title: `Slide ${slides.length + 1}`,
      line: slides.length * 5,
      layout: 'title-content',
      elements: [
        {
          id: `el-${Date.now()}-1`,
          type: 'text',
          content: 'Add your slide content description here...',
          x: 0.8,
          y: 1.5,
          w: 8.4,
          h: 1.0,
          line: 1,
        },
      ],
    };
    const newSlides = [...slides, newSlide];
    onUpdatePresentation({ ...presentation, slides: newSlides }, true);
    onSelectSlide(newSlides.length - 1);
    setSelectedElementId(null);
  };

  const handleDuplicateSlide = () => {
    if (!currentSlide || !onUpdatePresentation) return;
    const duplicated: Slide = {
      ...currentSlide,
      id: `slide-${Date.now()}`,
      title: `${currentSlide.title} (Copy)`,
      elements: currentSlide.elements.map((el) => ({
        ...el,
        id: `el-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      })),
    };
    const newSlides = [...slides];
    newSlides.splice(activeSlideIndex + 1, 0, duplicated);
    const reindexed = newSlides.map((s, i) => ({ ...s, index: i }));
    onUpdatePresentation({ ...presentation, slides: reindexed }, true);
    onSelectSlide(activeSlideIndex + 1);
    setSelectedElementId(null);
  };

  const handleDeleteSlide = () => {
    if (!currentSlide || !onUpdatePresentation || slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== activeSlideIndex);
    const reindexed = newSlides.map((s, i) => ({ ...s, index: i }));
    onUpdatePresentation({ ...presentation, slides: reindexed }, true);
    onSelectSlide(Math.max(0, activeSlideIndex - 1));
    setSelectedElementId(null);
  };

  const handleMoveSlide = (direction: 'left' | 'right') => {
    if (!onUpdatePresentation) return;
    const targetIdx = direction === 'left' ? activeSlideIndex - 1 : activeSlideIndex + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[activeSlideIndex];
    newSlides[activeSlideIndex] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;

    const reindexed = newSlides.map((s, i) => ({ ...s, index: i }));
    onUpdatePresentation({ ...presentation, slides: reindexed }, true);
    onSelectSlide(targetIdx);
  };

  // Insert new element into current slide with default spatial geometry
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
        strokeColor: theme.border,
        strokeWidth: 1,
        opacity: 1,
        x: 1.0,
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
        x: 0.8,
        y: 1.6,
        w: 8.4,
        h: 2.2,
        line: 1,
      };
    } else if (type === 'chart') {
      newEl = {
        id,
        type: 'chart',
        content: 'Performance Chart',
        chartType: (subtype as ChartType) || 'bar',
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
    } else if (type === 'bullet') {
      newEl = {
        id,
        type: 'bullet',
        content: 'New key bullet point',
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 0.8,
        line: 1,
      };
    } else {
      newEl = {
        id,
        type: 'text',
        content: 'Enter description text here...',
        x: 0.8,
        y: 1.8,
        w: 8.4,
        h: 0.8,
        line: 1,
      };
    }

    const updatedSlide = {
      ...currentSlide,
      elements: [...currentSlide.elements, newEl],
    };
    const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
    onUpdatePresentation({ ...presentation, slides: newSlides }, true);
    setSelectedElementId(id);
    setIsShapeMenuOpen(false);
  };

  // Local image upload handler
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
        fit: 'contain',
        x: 2.5,
        y: 1.5,
        w: 5.0,
        h: 3.2,
        line: 1,
      };

      const updatedSlide: Slide = {
        ...currentSlide,
        elements: [...currentSlide.elements, imgEl],
      };
      const newSlides = slides.map((s, idx) => (idx === activeSlideIndex ? updatedSlide : s));
      onUpdatePresentation({ ...presentation, slides: newSlides }, true);
      setSelectedElementId(imgEl.id);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Keyboard navigation and shortcuts for slide preview & visual editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (viewMode === 'grid') return;

      // Escape: clear inline editing, selection, or exit fullscreen
      if (e.key === 'Escape') {
        if (inlineEditingId) {
          setInlineEditingId(null);
        } else if (selectedElementId) {
          setSelectedElementId(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
        return;
      }

      // Visual editor element shortcuts
      if (isVisualEditing && selectedElementId && currentSlide) {
        const target = currentSlide.elements.find((el) => el.id === selectedElementId);
        if (target) {
          // Delete element
          if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            handleDeleteElement(selectedElementId);
            return;
          }

          // Duplicate: Ctrl+D / Cmd+D
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            handleDuplicateElement(selectedElementId);
            return;
          }

          // Nudge position with arrow keys
          const step = e.shiftKey ? 0.25 : 0.05;
          const layout = computeSlideLayout(currentSlide, activeSlideIndex, totalSlides, presentation.title);
          const geom = getElementGeometry(target, layout, currentSlide.elements.indexOf(target));

          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handleUpdateElement(
              { ...target, x: Math.max(0, Number((geom.x - step).toFixed(2))), y: geom.y, w: geom.w, h: geom.h },
              true
            );
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleUpdateElement(
              { ...target, x: Math.min(10.0 - geom.w, Number((geom.x + step).toFixed(2))), y: geom.y, w: geom.w, h: geom.h },
              true
            );
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleUpdateElement(
              { ...target, x: geom.x, y: Math.max(0, Number((geom.y - step).toFixed(2))), w: geom.w, h: geom.h },
              true
            );
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleUpdateElement(
              { ...target, x: geom.x, y: Math.min(5.625 - geom.h, Number((geom.y + step).toFixed(2))), w: geom.w, h: geom.h },
              true
            );
            return;
          }
        }
      }

      // Slide navigation
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeSlideIndex,
    totalSlides,
    viewMode,
    isFullscreen,
    onSelectSlide,
    isVisualEditing,
    selectedElementId,
    inlineEditingId,
    currentSlide,
    presentation,
    handleDeleteElement,
    handleDuplicateElement,
    handleUpdateElement,
  ]);

  return (
    <div
      className={`flex flex-col h-full bg-slate-100 dark:bg-slate-950/80 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black/95 p-4' : ''
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

      {/* Top Controls Bar */}
      <div className="flex-none px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-between gap-2 text-xs flex-wrap">
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
            title={isVisualEditing ? 'Exit Visual Studio Workspace' : 'Enable Visual Slide Studio Workspace'}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>{isVisualEditing ? 'Visual Studio (Active)' : 'Visual Studio'}</span>
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
        <div className="flex-none px-4 py-1.5 bg-indigo-50/90 dark:bg-slate-900 border-b border-indigo-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap animate-in fade-in duration-150">
          {/* Left: Insert Elements & Snapping */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider mr-1">
              Insert:
            </span>

            <button
              onClick={() => handleAddElement('text')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              title="Add text paragraph to slide"
            >
              <FileText className="w-3 h-3 text-indigo-500" />
              <span>Text</span>
            </button>

            <button
              onClick={() => handleAddElement('bullet')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              title="Add bullet point to slide"
            >
              <ListPlus className="w-3 h-3 text-indigo-500" />
              <span>Bullet</span>
            </button>

            {/* Shape Menu */}
            <div className="relative">
              <button
                onClick={() => setIsShapeMenuOpen(!isShapeMenuOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
                title="Add native PowerPoint shape"
              >
                <Shapes className="w-3 h-3 text-emerald-500" />
                <span>Shape</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </button>
              {isShapeMenuOpen && (
                <div className="absolute left-0 mt-1.5 w-36 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {(['rect', 'round-rect', 'circle', 'arrow', 'line', 'triangle', 'star'] as const).map((sh) => (
                    <button
                      key={sh}
                      onClick={() => handleAddElement('shape', sh)}
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
              title="Add data table to slide"
            >
              <TableIcon className="w-3 h-3 text-amber-500" />
              <span>Table</span>
            </button>

            <button
              onClick={() => handleAddElement('chart', 'bar')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              title="Add metrics chart to slide"
            >
              <BarChart3 className="w-3 h-3 text-violet-500" />
              <span>Chart</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs font-medium cursor-pointer"
              title="Upload image from device"
            >
              <Upload className="w-3 h-3 text-rose-500" />
              <span>Upload Image</span>
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Snap to grid toggle */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                snapToGrid
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle snap-to-grid alignment (0.1 in)"
            >
              <Grid className="w-3 h-3" />
              <span>Snap: {snapToGrid ? '0.1"' : 'Off'}</span>
            </button>

            {/* Undo / Redo in Toolbar */}
            {onUndo && (
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-white dark:hover:bg-slate-800"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onRedo && (
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-white dark:hover:bg-slate-800"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Slide Deck Operations */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAddSlide}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-xs shadow-2xs cursor-pointer"
              title="Add a new slide to presentation"
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
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={() => handleMoveSlide('left')}
              disabled={activeSlideIndex <= 0}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Move slide earlier in order"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleMoveSlide('right')}
              disabled={activeSlideIndex >= slides.length - 1}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-white dark:hover:bg-slate-800"
              title="Move slide later in order"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Workspace Area: Canvas + Contextual Properties Panel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Canvas Center Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-center relative">
          {totalSlides === 0 ? (
            <div className="text-center p-8 max-w-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
                No Slides Found
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click "New Slide" or type <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">slide "Title"</code> to start.
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
                    <span className="text-[10px] text-slate-400">
                      {s.elements.length} {s.elements.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single Slide Canvas Stage
            <div className="w-full max-w-4xl flex flex-col items-center">
              {/* Slide Stage Container */}
              <div
                className={`w-full relative aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/15 dark:shadow-black/50 ring-1 ring-slate-900/10 dark:ring-white/10 transition-all ${
                  isVisualEditing ? 'ring-2 ring-indigo-500/60' : ''
                }`}
                style={{ backgroundColor: currentSlide?.background || theme.bgColor }}
              >
                <AnimatePresence mode="popLayout" custom={navDirection} initial={false}>
                  {currentSlide && (
                    <motion.div
                      key={`${currentSlide.id || activeSlideIndex}-${replayCount}`}
                      custom={navDirection}
                      variants={
                        isVisualEditing
                          ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 } }
                          : getSlideVariants(activeTransition, navDirection)
                      }
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
                        inlineEditingId={inlineEditingId}
                        snapToGrid={snapToGrid}
                        gridSize={gridSize}
                        guides={activeGuides}
                        onSelectElement={(id) => {
                          setSelectedElementId(id);
                          if (!id) setInlineEditingId(null);
                        }}
                        onStartInlineEdit={(id) => setInlineEditingId(id)}
                        onEndInlineEdit={() => setInlineEditingId(null)}
                        onUpdateElement={handleUpdateElement}
                        setGuides={setActiveGuides}
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
                    <div
                      key={s.id || idx}
                      className={`group relative rounded-xl transition-all flex items-center p-0.5 border ${
                        idx === activeSlideIndex
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90'
                      }`}
                    >
                      <button
                        onClick={() => {
                          onSelectSlide(idx);
                          setSelectedElementId(null);
                        }}
                        className="px-2.5 py-1 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        title={`Jump to slide ${idx + 1}: ${s.title}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-md text-[10px] font-bold flex items-center justify-center ${
                            idx === activeSlideIndex
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[100px] sm:max-w-[130px] text-slate-700 dark:text-slate-300 font-medium">
                          {s.title || `Slide ${idx + 1}`}
                        </span>
                      </button>

                      {/* Filmstrip Reorder controls */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1 gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (idx > 0) {
                              onSelectSlide(idx);
                              handleMoveSlide('left');
                            }
                          }}
                          disabled={idx <= 0}
                          className="p-0.5 hover:text-indigo-600 disabled:opacity-20 text-slate-400"
                          title="Move Left"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (idx < totalSlides - 1) {
                              onSelectSlide(idx);
                              handleMoveSlide('right');
                            }
                          }}
                          disabled={idx >= totalSlides - 1}
                          className="p-0.5 hover:text-indigo-600 disabled:opacity-20 text-slate-400"
                          title="Move Right"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Contextual Properties Panel or Slide Settings */}
        {isVisualEditing && currentSlide && (
          <div className="w-72 sm:w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-none overflow-y-auto p-3 scrollbar-thin">
            {selectedElement ? (
              <VisualPropertiesPanel
                element={selectedElement}
                theme={theme}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                onLayerChange={handleLayerChange}
                onAlignElement={handleAlignElement}
                onClose={() => setSelectedElementId(null)}
              />
            ) : (
              // Slide Settings Panel when no element is selected
              <div className="space-y-4 text-xs select-none animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Slide {activeSlideIndex + 1} Settings</span>
                  </div>
                </div>

                {/* Slide Title */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Slide Title
                  </label>
                  <input
                    type="text"
                    value={currentSlide.title}
                    onChange={(e) => {
                      if (!onUpdatePresentation) return;
                      const updated = { ...currentSlide, title: e.target.value };
                      const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updated : s));
                      onUpdatePresentation({ ...presentation, slides: newSlides }, false);
                    }}
                    onBlur={() => {
                      if (!onUpdatePresentation) return;
                      onUpdatePresentation({ ...presentation }, true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Enter slide title..."
                  />
                </div>

                {/* Slide Layout */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Layout
                  </label>
                  <select
                    value={currentSlide.layout || 'title-content'}
                    onChange={(e) => {
                      if (!onUpdatePresentation) return;
                      const updated = { ...currentSlide, layout: e.target.value as SlideLayout };
                      const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updated : s));
                      onUpdatePresentation({ ...presentation, slides: newSlides }, true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer capitalize"
                  >
                    {(['title-content', 'two-column', 'text-image', 'image-text', 'full-image', 'blank'] as const).map(
                      (l) => (
                        <option key={l} value={l}>
                          {l.replace('-', ' ')}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Background color */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentSlide.background || theme.bgColor}
                      onChange={(e) => {
                        if (!onUpdatePresentation) return;
                        const updated = { ...currentSlide, background: e.target.value };
                        const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updated : s));
                        onUpdatePresentation({ ...presentation, slides: newSlides }, true);
                      }}
                      className="w-7 h-7 rounded-lg border-none cursor-pointer p-0 bg-transparent flex-none"
                    />
                    <button
                      onClick={() => {
                        if (!onUpdatePresentation) return;
                        const updated = { ...currentSlide, background: undefined };
                        const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updated : s));
                        onUpdatePresentation({ ...presentation, slides: newSlides }, true);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      Reset to Theme
                    </button>
                  </div>
                </div>

                {/* Speaker Notes */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Speaker Notes
                  </label>
                  <textarea
                    value={currentSlide.notes || ''}
                    onChange={(e) => {
                      if (!onUpdatePresentation) return;
                      const updated = { ...currentSlide, notes: e.target.value };
                      const newSlides = slides.map((s, i) => (i === activeSlideIndex ? updated : s));
                      onUpdatePresentation({ ...presentation, slides: newSlides }, false);
                    }}
                    onBlur={() => {
                      if (!onUpdatePresentation) return;
                      onUpdatePresentation({ ...presentation }, true);
                    }}
                    rows={3}
                    placeholder="Enter presenter remarks..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Direct Canvas Tips */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Move className="w-3.5 h-3.5" />
                    <span>Direct Canvas Controls</span>
                  </div>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[10px] list-disc list-inside">
                    <li>Click element to select & show 8 resize handles</li>
                    <li>Drag selected element to reposition</li>
                    <li>Drag handles to resize (images keep aspect ratio)</li>
                    <li>Drag top knob to rotate</li>
                    <li>Double-click text to edit directly on slide</li>
                    <li>Press <kbd className="px-1 bg-white dark:bg-slate-800 rounded border">Del</kbd> to delete, <kbd className="px-1 bg-white dark:bg-slate-800 rounded border">Ctrl+D</kbd> to duplicate</li>
                    <li>Arrow keys nudge position by 0.05"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
  inlineEditingId?: string | null;
  snapToGrid?: boolean;
  gridSize?: number;
  guides?: { v?: number; h?: number };
  onSelectElement?: (id: string | null) => void;
  onStartInlineEdit?: (id: string) => void;
  onEndInlineEdit?: () => void;
  onUpdateElement?: (updated: SlideElement, commitToHistory?: boolean) => void;
  setGuides?: (guides: { v?: number; h?: number }) => void;
}

const SlideCanvas: React.FC<SlideCanvasProps> = ({
  slide,
  slideIndex,
  totalSlides,
  presentationTitle,
  theme,
  isThumbnail = false,
  isVisualEditing = false,
  selectedElementId = null,
  inlineEditingId = null,
  snapToGrid = true,
  gridSize = 0.1,
  guides = {},
  onSelectElement,
  onStartInlineEdit,
  onEndInlineEdit,
  onUpdateElement,
  setGuides,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const layout = computeSlideLayout(slide, slideIndex, totalSlides, presentationTitle);
  const typography = layout.body.typography;

  const [scale, setScale] = useState<number>(80);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setScale(rect.width / 10.0);
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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

  // In presentation/read-only mode or thumbnail mode: render standard layout
  if (!isVisualEditing || isThumbnail) {
    return (
      <div
        ref={containerRef}
        onClick={() => onSelectElement?.(null)}
        className="absolute inset-0 p-[7%] flex flex-col select-none transition-colors duration-150 overflow-hidden"
        style={{
          backgroundColor: slide.background || theme.bgColor,
          color: theme.bodyColor,
        }}
      >
        {layout.layoutType === 'title' ? (
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
          <div className="flex-1 flex flex-col min-h-0">
            {layout.header.show && (
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-black/10 dark:border-white/10 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1.5 h-5 rounded-full flex-none" style={{ backgroundColor: theme.accentColor }} />
                  <h2 className={`font-bold tracking-tight truncate ${titleClass}`} style={{ color: theme.titleColor }}>
                    {slide.title}
                  </h2>
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-hidden space-y-2 ${isThumbnail ? 'space-y-1' : ''}`}>
              {slide.elements.map((el) => (
                <div key={el.id} className="text-xs">
                  {el.type === 'bullet' ? (
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-none" style={{ backgroundColor: theme.accentColor }} />
                      <span style={{ color: theme.bodyColor }}>{el.content}</span>
                    </div>
                  ) : el.type === 'shape' ? (
                    <div className="w-16 h-8 rounded border" style={{ backgroundColor: (el as ShapeElement).fillColor || theme.accentColor }} />
                  ) : el.type === 'image' ? (
                    <div className="max-h-24 overflow-hidden rounded">
                      <img src={(el as any).src || (el as any).url} alt={el.content} className="max-h-24 object-contain" />
                    </div>
                  ) : (
                    <p style={{ color: theme.bodyColor }}>{el.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
  }

  // Visual Interactive Studio Canvas
  return (
    <div
      ref={containerRef}
      onClick={() => onSelectElement?.(null)}
      className="absolute inset-0 select-none overflow-hidden"
      style={{
        backgroundColor: slide.background || theme.bgColor,
        color: theme.bodyColor,
        backgroundImage: snapToGrid
          ? 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 1px, transparent 1px)'
          : undefined,
        backgroundSize: `${gridSize * 10 * (scale || 80)}px ${gridSize * 10 * (scale || 80)}px`,
      }}
    >
      {/* Header boundary line & slide title */}
      {layout.header.show && (
        <div
          className="absolute left-[8%] right-[8%] top-[8%] flex items-center gap-2 pb-1.5 border-b border-black/10 dark:border-white/10 z-0 pointer-events-none"
        >
          <div className="w-1.5 h-4 rounded-full flex-none" style={{ backgroundColor: theme.accentColor }} />
          <h2 className="font-bold tracking-tight text-base sm:text-lg truncate" style={{ color: theme.titleColor }}>
            {slide.title}
          </h2>
        </div>
      )}

      {/* Slide footer boundary info */}
      {layout.footer.show && (
        <div
          className="absolute left-[8%] right-[8%] bottom-[4%] flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 border-t border-black/5 dark:border-white/5 pt-1 z-0 pointer-events-none"
        >
          <span className="font-medium">{presentationTitle || 'Code2PPT'}</span>
          <span>
            Slide {slideIndex + 1} of {totalSlides}
          </span>
        </div>
      )}

      {/* Alignment Guides */}
      {guides?.v !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-indigo-500 z-40 pointer-events-none animate-in fade-in duration-75"
          style={{ left: `${(guides.v / 10.0) * 100}%` }}
        />
      )}
      {guides?.h !== undefined && (
        <div
          className="absolute left-0 right-0 h-px border-t-2 border-dashed border-indigo-500 z-40 pointer-events-none animate-in fade-in duration-75"
          style={{ top: `${(guides.h / 5.625) * 100}%` }}
        />
      )}

      {/* Render each interactive slide element */}
      {slide.elements.map((element, idx) => (
        <InteractiveElementItem
          key={element.id}
          element={element}
          index={idx}
          layout={layout}
          scale={scale}
          canvasRef={containerRef}
          isSelected={selectedElementId === element.id}
          isInlineEditing={inlineEditingId === element.id}
          theme={theme}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          onSelect={(id) => onSelectElement?.(id)}
          onStartInlineEdit={(id) => onStartInlineEdit?.(id)}
          onEndInlineEdit={() => onEndInlineEdit?.()}
          onUpdateElement={(updated, commit) => onUpdateElement?.(updated, commit)}
          setGuides={setGuides || (() => {})}
        />
      ))}
    </div>
  );
};

/**
 * Individual Interactive Canvas Element
 * Supports direct selection, dragging, 8-handle resizing (with image aspect ratio preservation),
 * rotation, and inline text editing without dragging interference.
 */
interface InteractiveElementItemProps {
  element: SlideElement;
  index: number;
  layout: ComputedSlideLayout;
  scale: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isSelected: boolean;
  isInlineEditing: boolean;
  theme: typeof THEMES['modern'];
  snapToGrid: boolean;
  gridSize: number;
  onSelect: (id: string) => void;
  onStartInlineEdit: (id: string) => void;
  onEndInlineEdit: () => void;
  onUpdateElement: (updated: SlideElement, commitToHistory?: boolean) => void;
  setGuides: (guides: { v?: number; h?: number }) => void;
}

const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;

const InteractiveElementItem: React.FC<InteractiveElementItemProps> = ({
  element,
  index,
  layout,
  scale,
  canvasRef,
  isSelected,
  isInlineEditing,
  theme,
  snapToGrid,
  gridSize,
  onSelect,
  onStartInlineEdit,
  onEndInlineEdit,
  onUpdateElement,
  setGuides,
}) => {
  const geom = getElementGeometry(element, layout, index);

  // Drag to reposition
  const handlePointerDownReposition = (e: React.PointerEvent) => {
    if (isInlineEditing) return;
    e.stopPropagation();
    onSelect(element.id);

    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startX = geom.x;
    const startY = geom.y;
    let finalBounds = { x: startX, y: startY, w: geom.w, h: geom.h };

    const handlePointerMove = (moveEv: PointerEvent) => {
      const dx = (moveEv.clientX - startPointerX) / (scale || 80);
      const dy = (moveEv.clientY - startPointerY) / (scale || 80);
      let nx = startX + dx;
      let ny = startY + dy;

      if (snapToGrid) {
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }

      // Clamping within slide bounds
      nx = Math.max(0, Math.min(10.0 - geom.w, nx));
      ny = Math.max(0, Math.min(5.625 - geom.h, ny));

      // Alignment Guide snapping
      let showV: number | undefined;
      let showH: number | undefined;
      const centerX = nx + geom.w / 2;
      const centerY = ny + geom.h / 2;

      if (Math.abs(centerX - 5.0) < 0.12) {
        nx = 5.0 - geom.w / 2;
        showV = 5.0;
      }
      if (Math.abs(centerY - 2.8125) < 0.12) {
        ny = 2.8125 - geom.h / 2;
        showH = 2.8125;
      }
      setGuides({ v: showV, h: showH });

      finalBounds = {
        x: Number(nx.toFixed(2)),
        y: Number(ny.toFixed(2)),
        w: geom.w,
        h: geom.h,
      };
      onUpdateElement({ ...element, ...finalBounds }, false);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setGuides({});
      onUpdateElement({ ...element, ...finalBounds }, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Resize from handles with aspect ratio preservation for images
  const handlePointerDownResize = (e: React.PointerEvent, dir: string) => {
    e.stopPropagation();
    const startPointerX = e.clientX;
    const startPointerY = e.clientY;
    const startX = geom.x;
    const startY = geom.y;
    const startW = geom.w;
    const startH = geom.h;
    const isImage = element.type === 'image';
    const aspect = startW / startH;

    let finalBounds = { x: startX, y: startY, w: startW, h: startH };

    const handlePointerMove = (moveEv: PointerEvent) => {
      let dx = (moveEv.clientX - startPointerX) / (scale || 80);
      let dy = (moveEv.clientY - startPointerY) / (scale || 80);

      if (snapToGrid) {
        dx = Math.round(dx / gridSize) * gridSize;
        dy = Math.round(dy / gridSize) * gridSize;
      }

      let nw = startW;
      let nh = startH;
      let nx = startX;
      let ny = startY;

      if (dir === 'se') {
        nw = Math.max(0.3, startW + dx);
        nh = isImage ? nw / aspect : Math.max(0.15, startH + dy);
      } else if (dir === 'e') {
        nw = Math.max(0.3, startW + dx);
        nh = isImage ? nw / aspect : startH;
        ny = isImage ? startY - (nh - startH) / 2 : startY;
      } else if (dir === 's') {
        nh = Math.max(0.15, startH + dy);
        nw = isImage ? nh * aspect : startW;
        nx = isImage ? startX - (nw - startW) / 2 : startX;
      } else if (dir === 'sw') {
        nw = Math.max(0.3, startW - dx);
        nh = isImage ? nw / aspect : Math.max(0.15, startH + dy);
        nx = startX + (startW - nw);
      } else if (dir === 'ne') {
        nw = Math.max(0.3, startW + dx);
        nh = isImage ? nw / aspect : Math.max(0.15, startH - dy);
        ny = startY + (startH - nh);
      } else if (dir === 'nw') {
        nw = Math.max(0.3, startW - dx);
        nh = isImage ? nw / aspect : Math.max(0.15, startH - dy);
        nx = startX + (startW - nw);
        ny = startY + (startH - nh);
      } else if (dir === 'w') {
        nw = Math.max(0.3, startW - dx);
        nh = isImage ? nw / aspect : startH;
        nx = startX + (startW - nw);
        ny = isImage ? startY - (nh - startH) / 2 : startY;
      } else if (dir === 'n') {
        nh = Math.max(0.15, startH - dy);
        nw = isImage ? nh * aspect : startW;
        nx = isImage ? startX - (nw - startW) / 2 : startX;
        ny = startY + (startH - nh);
      }

      nx = Math.max(0, Number(nx.toFixed(2)));
      ny = Math.max(0, Number(ny.toFixed(2)));
      nw = Number(nw.toFixed(2));
      nh = Number(nh.toFixed(2));

      finalBounds = { x: nx, y: ny, w: nw, h: nh };
      onUpdateElement({ ...element, ...finalBounds }, false);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onUpdateElement({ ...element, ...finalBounds }, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Rotation handle
  const handlePointerDownRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerScreenX = rect.left + (geom.x + geom.w / 2) * (scale || 80);
    const centerScreenY = rect.top + (geom.y + geom.h / 2) * (scale || 80);

    let finalRot = element.rotation || 0;

    const handlePointerMove = (moveEv: PointerEvent) => {
      const rad = Math.atan2(moveEv.clientY - centerScreenY, moveEv.clientX - centerScreenX);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      deg = ((deg % 360) + 360) % 360;
      if (moveEv.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }
      finalRot = deg;
      onUpdateElement({ ...element, rotation: deg }, false);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      onUpdateElement({ ...element, rotation: finalRot }, true);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Double-click to start inline text editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (
      element.type === 'text' ||
      element.type === 'bullet' ||
      element.type === 'subtitle' ||
      element.type === 'quote'
    ) {
      e.stopPropagation();
      onStartInlineEdit(element.id);
    }
  };

  const getHandlePositionClass = (dir: string) => {
    switch (dir) {
      case 'nw':
        return '-top-1.5 -left-1.5 cursor-nwse-resize';
      case 'n':
        return '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
      case 'ne':
        return '-top-1.5 -right-1.5 cursor-nesw-resize';
      case 'e':
        return 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize';
      case 'se':
        return '-bottom-1.5 -right-1.5 cursor-nwse-resize';
      case 's':
        return '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize';
      case 'sw':
        return '-bottom-1.5 -left-1.5 cursor-nesw-resize';
      case 'w':
        return 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize';
      default:
        return '';
    }
  };

  return (
    <div
      onPointerDown={handlePointerDownReposition}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: `${(geom.x / 10.0) * 100}%`,
        top: `${(geom.y / 5.625) * 100}%`,
        width: `${(geom.w / 10.0) * 100}%`,
        height: `${(geom.h / 5.625) * 100}%`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        transformOrigin: 'center center',
        zIndex: isSelected ? 35 : index + 10,
      }}
      className={`group cursor-move transition-shadow ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md'
          : 'hover:ring-1 hover:ring-indigo-300/80'
      }`}
    >
      {/* Element Content Render */}
      <div className="w-full h-full p-1 overflow-hidden relative">
        {isInlineEditing ? (
          <textarea
            autoFocus
            value={element.content}
            onChange={(e) => onUpdateElement({ ...element, content: e.target.value }, false)}
            onBlur={() => {
              onEndInlineEdit();
              onUpdateElement(element, true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onEndInlineEdit();
                onUpdateElement(element, true);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-full bg-white/95 dark:bg-slate-900/95 border border-indigo-500 rounded p-1 outline-none resize-none font-sans text-xs"
            style={{
              color: element.color || theme.bodyColor,
              fontWeight: element.bold ? 'bold' : 'normal',
              fontStyle: element.italic ? 'italic' : 'normal',
              textDecoration: element.underline ? 'underline' : 'none',
              textAlign: (element.align || 'left') as any,
              lineHeight: element.lineSpacing || 1.15,
            }}
          />
        ) : element.type === 'shape' ? (
          (() => {
            const shape = element as ShapeElement;
            const fill = shape.fillColor || '#' + (shape.fillHex || theme.accentHex);
            const stroke = shape.strokeColor || '#' + (shape.strokeHex || theme.border.replace('#', ''));
            const strokeWidth = shape.strokeWidth !== undefined ? shape.strokeWidth : 1;
            const opacity = shape.opacity !== undefined ? shape.opacity : 1;

            return (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ opacity }}
              >
                {shape.shapeType === 'circle' || shape.shapeType === 'ellipse' ? (
                  <div
                    className="w-full h-full rounded-full border"
                    style={{ backgroundColor: fill, borderColor: stroke, borderWidth: strokeWidth }}
                  />
                ) : shape.shapeType === 'round-rect' ? (
                  <div
                    className="w-full h-full rounded-xl border"
                    style={{ backgroundColor: fill, borderColor: stroke, borderWidth: strokeWidth }}
                  />
                ) : shape.shapeType === 'line' ? (
                  <div className="w-full h-1 my-auto" style={{ backgroundColor: fill }} />
                ) : shape.shapeType === 'arrow' ? (
                  <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                    <polygon points="0,15 65,15 65,0 100,25 65,50 65,35 0,35" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                  </svg>
                ) : shape.shapeType === 'triangle' ? (
                  <svg className="w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                    <polygon points="50,0 100,80 0,80" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                  </svg>
                ) : shape.shapeType === 'star' ? (
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polygon points="50,0 63,38 100,38 69,59 82,100 50,75 18,100 31,59 0,38 37,38" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
                  </svg>
                ) : (
                  <div
                    className="w-full h-full rounded border"
                    style={{ backgroundColor: fill, borderColor: stroke, borderWidth: strokeWidth }}
                  />
                )}
              </div>
            );
          })()
        ) : element.type === 'image' ? (
          (() => {
            const img = element as any;
            const src = img.src || img.url || element.content;
            return (
              <div className="w-full h-full flex items-center justify-center overflow-hidden rounded">
                {src ? (
                  <img
                    src={src}
                    alt={img.alt || 'Slide asset'}
                    style={{ objectFit: (img.fit || 'contain') as any }}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Image Asset</span>
                  </div>
                )}
              </div>
            );
          })()
        ) : element.type === 'table' ? (
          (() => {
            const table = element as TableElement;
            const headers = table.headers || ['Column 1', 'Column 2'];
            const rows = table.rows || [['Data A', 'Data B']];
            return (
              <div className="w-full h-full overflow-hidden border border-slate-300 dark:border-slate-700 rounded-md text-[10px]">
                <table className="w-full h-full border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: theme.accentColor, color: '#ffffff' }}>
                      {headers.map((h, i) => (
                        <th key={i} className="p-1 font-bold text-center border-r border-white/20 last:border-r-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-black/[0.02]' : ''}>
                        {r.map((c, ci) => (
                          <td key={ci} className="p-1 border-t border-black/5 border-r last:border-r-0 truncate">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()
        ) : element.type === 'chart' ? (
          (() => {
            const chart = element as ChartElement;
            const data = chart.data || [];
            const maxVal = Math.max(...data.map((d) => d.value), 1);
            return (
              <div className="w-full h-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white/60 dark:bg-slate-800/60 flex flex-col justify-between overflow-hidden">
                {chart.title && (
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {chart.title}
                  </div>
                )}
                <div className="flex-1 flex items-end gap-1.5 pt-1">
                  {data.map((d, i) => {
                    const pct = Math.max(8, (d.value / maxVal) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                        <div
                          className="w-full rounded-t transition-all"
                          style={{
                            height: `${pct}%`,
                            backgroundColor: i % 2 === 0 ? theme.accentColor : theme.titleColor,
                          }}
                        />
                        <span className="text-[8px] text-slate-500 truncate max-w-full mt-0.5">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : element.type === 'bullet' ? (
          <div className="flex items-start gap-2">
            <span
              className="w-2 h-2 rounded-full mt-1.5 flex-none"
              style={{ backgroundColor: theme.accentColor }}
            />
            <span
              className="leading-snug"
              style={{
                fontFamily: element.fontFamily || 'Arial',
                fontSize: `${element.fontSize || 14}px`,
                fontWeight: element.bold ? 'bold' : 'normal',
                fontStyle: element.italic ? 'italic' : 'normal',
                textDecoration: element.underline ? 'underline' : 'none',
                color: element.color || theme.bodyColor,
                textAlign: (element.align || 'left') as any,
                lineHeight: element.lineSpacing || 1.15,
              }}
            >
              {element.content}
            </span>
          </div>
        ) : element.type === 'subtitle' ? (
          <div
            className="font-semibold tracking-wide uppercase leading-snug"
            style={{
              fontFamily: element.fontFamily || 'Arial',
              fontSize: `${element.fontSize || 16}px`,
              fontWeight: element.bold !== undefined ? (element.bold ? 'bold' : 'normal') : 'bold',
              fontStyle: element.italic ? 'italic' : 'normal',
              textDecoration: element.underline ? 'underline' : 'none',
              color: element.color || theme.accentColor,
              textAlign: (element.align || 'left') as any,
              lineHeight: element.lineSpacing || 1.15,
            }}
          >
            {element.content}
          </div>
        ) : element.type === 'quote' ? (
          <blockquote
            className="italic border-l-2 pl-2.5 my-1"
            style={{
              borderColor: theme.accentColor,
              color: element.color || theme.bodyColor,
              fontFamily: element.fontFamily || 'Georgia',
              fontSize: `${element.fontSize || 14}px`,
              textAlign: (element.align || 'left') as any,
              lineHeight: element.lineSpacing || 1.25,
            }}
          >
            “{element.content}”
          </blockquote>
        ) : (
          <p
            className="leading-snug break-words"
            style={{
              fontFamily: element.fontFamily || 'Arial',
              fontSize: `${element.fontSize || 14}px`,
              fontWeight: element.bold ? 'bold' : 'normal',
              fontStyle: element.italic ? 'italic' : 'normal',
              textDecoration: element.underline ? 'underline' : 'none',
              color: element.color || theme.bodyColor,
              textAlign: (element.align || 'left') as any,
              lineHeight: element.lineSpacing || 1.15,
            }}
          >
            {element.content}
          </p>
        )}
      </div>

      {/* Selection outline, rotation handle and 8 resize handles */}
      {isSelected && (
        <>
          {/* Top Rotation Knob */}
          <div
            onPointerDown={handlePointerDownRotate}
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group/rot z-40"
            title="Drag to Rotate element (Hold Shift for 15° snap)"
          >
            <div className="w-3 h-3 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-600 shadow-sm flex items-center justify-center hover:scale-125 transition-transform" />
            <div className="w-0.5 h-3 bg-indigo-600" />
          </div>

          {/* 8 Resize Handles */}
          {RESIZE_HANDLES.map((dir) => (
            <div
              key={dir}
              onPointerDown={(e) => handlePointerDownResize(e, dir)}
              className={`absolute w-2.5 h-2.5 bg-white dark:bg-slate-800 border-2 border-indigo-600 rounded-xs shadow-xs z-40 hover:scale-125 transition-transform ${getHandlePositionClass(
                dir
              )}`}
            />
          ))}
        </>
      )}
    </div>
  );
};
