import React from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Layout,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Slide, SlideLayout, VALID_SLIDE_LAYOUTS, ThemeColors } from '../models/presentation';

export interface SlideNavPanelProps {
  slides: Slide[];
  activeSlideIndex: number;
  theme: ThemeColors;
  onSelectSlide: (index: number) => void;
  onAddSlide: (layout?: SlideLayout) => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onMoveSlide: (fromIndex: number, toIndex: number) => void;
  onToggleHideSlide?: (index: number) => void;
  hiddenSlideIndices?: Set<number>;
  thumbnailSize?: 'sm' | 'md' | 'lg';
  onChangeThumbnailSize?: (size: 'sm' | 'md' | 'lg') => void;
}

const LAYOUT_LABELS: Record<SlideLayout, string> = {
  title: 'Title Slide',
  'title-content': 'Title & Content',
  'two-column': 'Two Columns',
  'text-image': 'Text & Image',
  'image-text': 'Image & Text',
  'full-image': 'Full Image',
  blank: 'Blank Slide',
};

export const SlideNavPanel: React.FC<SlideNavPanelProps> = ({
  slides,
  activeSlideIndex,
  theme,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onMoveSlide,
  onToggleHideSlide,
  hiddenSlideIndices = new Set(),
  thumbnailSize = 'md',
  onChangeThumbnailSize,
}) => {
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = React.useState(false);
  const layoutMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const thumbnailWidthClass =
    thumbnailSize === 'sm' ? 'w-28 h-16' : thumbnailSize === 'lg' ? 'w-48 h-28' : 'w-36 h-20';

  return (
    <aside
      aria-label="Slide Navigation Thumbnails"
      className="flex flex-col h-full bg-slate-50/90 dark:bg-slate-900/90 border-r border-slate-200 dark:border-slate-800 select-none flex-none transition-all duration-150"
      style={{ width: thumbnailSize === 'sm' ? '140px' : thumbnailSize === 'lg' ? '230px' : '180px' }}
    >
      {/* Top Header: New Slide & Thumbnail Sizing */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 flex-none">
        <div className="relative flex-1" ref={layoutMenuRef}>
          <div className="flex items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors overflow-hidden">
            <button
              onClick={() => onAddSlide('title-content')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold cursor-pointer"
              title="Add New Slide (Title & Content)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Slide</span>
            </button>
            <button
              onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
              className="px-1.5 py-1.5 border-l border-indigo-500/50 hover:bg-indigo-800/40 cursor-pointer"
              title="Choose Layout"
              aria-label="Slide Layout Choices"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          {/* Slide Layout Dropdown */}
          {isLayoutMenuOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5 animate-in fade-in duration-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Slide Layout
              </div>
              {VALID_SLIDE_LAYOUTS.map((layout) => (
                <button
                  key={layout}
                  onClick={() => {
                    onAddSlide(layout);
                    setIsLayoutMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <Layout className="w-3.5 h-3.5 text-indigo-500 flex-none" />
                  <span className="truncate">{LAYOUT_LABELS[layout] || layout}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Size Switcher */}
        {onChangeThumbnailSize && (
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-md p-0.5 flex-none">
            <button
              onClick={() => onChangeThumbnailSize('sm')}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                thumbnailSize === 'sm' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'
              }`}
              title="Small Thumbnails"
            >
              S
            </button>
            <button
              onClick={() => onChangeThumbnailSize('md')}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                thumbnailSize === 'md' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'
              }`}
              title="Medium Thumbnails"
            >
              M
            </button>
            <button
              onClick={() => onChangeThumbnailSize('lg')}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                thumbnailSize === 'lg' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-slate-500'
              }`}
              title="Large Thumbnails"
            >
              L
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails Scrollable List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {slides.map((slide, idx) => {
          const isActive = idx === activeSlideIndex;
          const isHidden = hiddenSlideIndices.has(idx);

          return (
            <div
              key={slide.id || idx}
              onClick={() => onSelectSlide(idx)}
              className={`group relative rounded-xl transition-all cursor-pointer flex flex-col p-1.5 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-600 dark:ring-indigo-500 shadow-sm'
                  : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              {/* Header inside thumbnail: Slide number & actions */}
              <div className="flex items-center justify-between text-[11px] mb-1 px-1">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  {idx + 1}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSlide(idx);
                    }}
                    className="p-1 hover:text-indigo-600 rounded cursor-pointer"
                    title="Duplicate Slide"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  {slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSlide(idx);
                      }}
                      className="p-1 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {onToggleHideSlide && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHideSlide(idx);
                      }}
                      className="p-1 hover:text-amber-600 rounded cursor-pointer"
                      title={isHidden ? 'Unhide Slide' : 'Hide Slide'}
                    >
                      {isHidden ? <EyeOff className="w-3 h-3 text-amber-500" /> : <Eye className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* 16:9 Thumbnail Mini-Canvas */}
              <div
                className={`${thumbnailWidthClass} mx-auto rounded-lg overflow-hidden border border-slate-300/80 dark:border-slate-700/80 shadow-xs relative flex flex-col justify-between p-1.5`}
                style={{
                  backgroundColor: slide.background || theme.bgColor || '#ffffff',
                }}
              >
                {/* Mini Title Preview */}
                <div
                  className="font-bold text-[9px] truncate leading-tight"
                  style={{ color: theme.titleColor || '#0F172A' }}
                >
                  {slide.title || 'Untitled Slide'}
                </div>

                {/* Mini Element Placeholders */}
                <div className="space-y-1 my-auto">
                  {slide.elements.slice(0, 3).map((el, elIdx) => (
                    <div
                      key={elIdx}
                      className="h-1 rounded-full bg-slate-300 dark:bg-slate-700/80"
                      style={{
                        width: el.type === 'shape' ? '40%' : el.type === 'image' ? '60%' : `${60 + (elIdx * 15) % 35}%`,
                        backgroundColor: el.type === 'shape' ? theme.accentColor : undefined,
                      }}
                    />
                  ))}
                </div>

                {/* Footer metadata indicator */}
                <div className="flex items-center justify-between text-[7px] text-slate-400">
                  <span>{slide.elements.length} obj</span>
                  {slide.transition && slide.transition.style !== 'none' && (
                    <span className="text-indigo-500 font-semibold uppercase">{slide.transition.style}</span>
                  )}
                </div>
              </div>

              {/* Reorder arrows on hover */}
              <div className="absolute left-1 bottom-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {idx > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(idx, idx - 1);
                    }}
                    className="p-0.5 bg-white dark:bg-slate-800 rounded shadow-xs text-slate-600 hover:text-indigo-600 cursor-pointer"
                    title="Move Slide Up"
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                  </button>
                )}
                {idx < slides.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(idx, idx + 1);
                    }}
                    className="p-0.5 bg-white dark:bg-slate-800 rounded shadow-xs text-slate-600 hover:text-indigo-600 cursor-pointer"
                    title="Move Slide Down"
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-400 flex-none">
        {slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}
      </div>
    </aside>
  );
};
