import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Square,
  FileQuestion,
  Image as ImageIcon,
} from 'lucide-react';
import { Presentation, Slide, SlideElement, ThemeId } from '../models/presentation';
import { THEMES } from '../themes/presentationThemes';
import { computeAdaptiveTypography, computeSlideLayout } from '../renderer/layoutSystem';

interface PreviewProps {
  presentation: Presentation;
  themeId: ThemeId;
  activeSlideIndex: number;
  onSelectSlide: (index: number) => void;
}

export const Preview: React.FC<PreviewProps> = ({
  presentation,
  themeId,
  activeSlideIndex,
  onSelectSlide,
}) => {
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const theme = THEMES[themeId] || THEMES.modern;
  const slides = presentation.slides;
  const totalSlides = slides.length;
  const currentSlide: Slide | undefined = slides[activeSlideIndex] || slides[0];

  // Keyboard navigation for presentation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'grid') return;
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (activeSlideIndex < totalSlides - 1) {
          onSelectSlide(activeSlideIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (activeSlideIndex > 0) {
          onSelectSlide(activeSlideIndex - 1);
        }
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlideIndex, totalSlides, viewMode, isFullscreen, onSelectSlide]);

  return (
    <div
      className={`flex flex-col h-full bg-slate-100 dark:bg-slate-950/80 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black/90 p-6' : ''
      }`}
    >
      {/* Preview Top Controls */}
      <div className="flex-none px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 flex items-center justify-between gap-3 text-xs">
        {/* Left: Slide navigation & count */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSelectSlide(Math.max(0, activeSlideIndex - 1))}
            disabled={activeSlideIndex <= 0 || totalSlides === 0}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[75px] text-center">
            {totalSlides > 0
              ? `Slide ${activeSlideIndex + 1} of ${totalSlides}`
              : 'No slides'}
          </span>

          <button
            onClick={() => onSelectSlide(Math.min(totalSlides - 1, activeSlideIndex + 1))}
            disabled={activeSlideIndex >= totalSlides - 1 || totalSlides === 0}
            className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Slide Pills / Thumbnails */}
        {totalSlides > 1 && viewMode === 'single' && (
          <div className="hidden sm:flex items-center gap-1 max-w-[200px] md:max-w-xs overflow-x-auto py-0.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onSelectSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === activeSlideIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                }`}
                title={`Go to Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Right: View Toggles & Fullscreen */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'grid' : 'single')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            title={viewMode === 'single' ? 'Show all slides grid' : 'Show single slide'}
          >
            {viewMode === 'single' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Present / Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {totalSlides === 0 ? (
          <div className="text-center p-8 max-w-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <FileQuestion className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">
              No Slides Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">slide "Title"</code> in the editor to create your first presentation slide.
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
          // Single Slide View
          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="w-full relative aspect-[16/9] rounded-xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/10 transition-all">
              {currentSlide && (
                <SlideCanvas
                  slide={currentSlide}
                  slideIndex={activeSlideIndex}
                  totalSlides={totalSlides}
                  presentationTitle={presentation.title}
                  theme={theme}
                />
              )}
            </div>

            {/* Sub-bar showing quick jump buttons */}
            {totalSlides > 1 && (
              <div className="flex items-center gap-2 mt-4 overflow-x-auto max-w-full px-2 py-1">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSlide(idx)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                      idx === activeSlideIndex
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {idx + 1}. {s.title || `Slide ${idx + 1}`}
                  </button>
                ))}
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
}

interface SlideImageProps {
  imageRegion: NonNullable<ReturnType<typeof computeSlideLayout>['imageRegion']>;
  isThumbnail: boolean;
  theme: typeof THEMES['modern'];
}

const SlideImage: React.FC<SlideImageProps> = ({ imageRegion, isThumbnail, theme }) => {
  const [loadError, setLoadError] = useState(false);
  const { image, hasImage, label } = imageRegion;

  // Placeholder when no image is supplied
  if (!hasImage || !image || !image.src) {
    return (
      <div
        className="w-full h-full min-h-[100px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-3 text-center"
        style={{
          borderColor: theme.accentColor + '50',
          backgroundColor: theme.isDark ? '#0f172a40' : '#f8fafc',
        }}
      >
        <ImageIcon className={`${isThumbnail ? 'w-3 h-3' : 'w-7 h-7'} opacity-50 mb-1`} />
        <span className={`${isThumbnail ? 'text-[7px]' : 'text-xs'} font-medium text-slate-400`}>
          {isThumbnail ? 'Image' : label || 'Image Area'}
        </span>
      </div>
    );
  }

  // Clear visual error when image cannot be loaded
  if (loadError) {
    return (
      <div
        className="w-full h-full min-h-[100px] rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 flex flex-col items-center justify-center p-3 text-center"
      >
        <FileQuestion className={`${isThumbnail ? 'w-3 h-3' : 'w-6 h-6'} text-rose-500 mb-1`} />
        <span className={`${isThumbnail ? 'text-[7px]' : 'text-xs'} font-medium text-rose-600 dark:text-rose-400 truncate max-w-full px-1`}>
          Failed to load image
        </span>
        {!isThumbnail && (
          <span className="text-[10px] text-slate-400 truncate max-w-full mt-0.5 px-2">
            {image.src}
          </span>
        )}
      </div>
    );
  }

  // Real image rendering with contained aspect ratio
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
  isThumbnail: boolean
) => {
  if (elements.length === 0) return null;
  return elements.map((el) => {
    if (el.type === 'bullet') {
      return (
        <div key={el.id} className="flex items-start gap-2.5">
          <span
            className={`rounded-full mt-1.5 flex-none ${
              isThumbnail ? 'w-1 h-1' : 'w-2 h-2'
            }`}
            style={{ backgroundColor: theme.accentColor }}
          />
          <span
            className={`leading-relaxed ${
              isThumbnail ? 'text-[9px] line-clamp-1' : bodyTextClass
            }`}
            style={{ color: theme.bodyColor }}
          >
            {el.content}
          </span>
        </div>
      );
    }

    if (el.type === 'subtitle') {
      return (
        <div
          key={el.id}
          className={`font-semibold tracking-wide uppercase ${
            isThumbnail ? 'text-[8px]' : 'text-xs sm:text-sm'
          }`}
          style={{ color: theme.accentColor }}
        >
          {el.content}
        </div>
      );
    }

    if (el.type === 'quote') {
      return (
        <blockquote
          key={el.id}
          className={`italic border-l-2 pl-3 my-2 ${
            isThumbnail ? 'text-[9px]' : bodyTextClass
          }`}
          style={{
            borderColor: theme.accentColor,
            color: theme.bodyColor,
          }}
        >
          “{el.content}”
        </blockquote>
      );
    }

    // Text paragraph
    return (
      <p
        key={el.id}
        className={`leading-relaxed ${
          isThumbnail ? 'text-[9px] line-clamp-2' : bodyTextClass
        }`}
        style={{ color: theme.bodyColor }}
      >
        {el.content}
      </p>
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
}) => {
  const layout = computeSlideLayout(slide, slideIndex, totalSlides, presentationTitle);
  const typography = layout.body.typography;

  // Derive font classes from calculated typography fontSize
  const bodyTextClass =
    typography.fontSize <= 12
      ? 'text-xs sm:text-sm'
      : typography.fontSize <= 14
      ? 'text-xs sm:text-base'
      : typography.fontSize >= 18
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  // Title class based on title length/fontSize
  const titleClass =
    layout.header.title.fontSize <= 18
      ? isThumbnail ? 'text-xs' : 'text-base sm:text-lg'
      : layout.header.title.fontSize <= 20
      ? isThumbnail ? 'text-xs' : 'text-lg sm:text-xl'
      : isThumbnail ? 'text-xs' : 'text-xl sm:text-2xl';

  return (
    <div
      className="absolute inset-0 p-[7%] flex flex-col select-none transition-colors duration-150"
      style={{
        backgroundColor: theme.bgColor,
        color: theme.bodyColor,
      }}
    >
      {layout.layoutType === 'title' ? (
        // Title / Cover Slide Layout
        <div className="flex-1 flex flex-col justify-center">
          {/* Accent bar */}
          <div
            className="w-16 h-1.5 rounded-full mb-4"
            style={{ backgroundColor: theme.accentColor }}
          />

          {/* Slide Title */}
          <h1
            className={`font-bold tracking-tight mb-4 ${
              isThumbnail ? 'text-sm' : 'text-3xl sm:text-4xl'
            }`}
            style={{ color: theme.titleColor }}
          >
            {slide.title}
          </h1>

          {/* Intro elements */}
          <div className="space-y-2 max-w-2xl">
            {slide.elements.map((el) => (
              <p
                key={el.id}
                className={`${
                  el.type === 'subtitle'
                    ? isThumbnail
                      ? 'text-[10px] font-semibold'
                      : 'text-base sm:text-lg font-medium'
                    : isThumbnail
                    ? 'text-[9px]'
                    : 'text-base sm:text-lg text-slate-600 dark:text-slate-400'
                }`}
                style={{
                  color: el.type === 'subtitle' ? theme.accentColor : theme.bodyColor,
                }}
              >
                {el.content}
              </p>
            ))}
          </div>
        </div>
      ) : (
        // Standard, Column, Image, or Blank Slide Layouts
        <div className="flex-1 flex flex-col">
          {/* Header (hidden for blank layout) */}
          {layout.header.show && (
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/10 dark:border-white/10 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-1.5 h-6 rounded-full flex-none"
                  style={{ backgroundColor: theme.accentColor }}
                />
                <h2
                  className={`font-bold tracking-tight truncate ${titleClass}`}
                  style={{ color: theme.titleColor }}
                >
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

          {/* Layout-Specific Content Area */}
          {layout.layoutType === 'two-column' && layout.twoColumn ? (
            // Two-column layout
            <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
              <div className="space-y-2 overflow-hidden border-r border-black/5 dark:border-white/5 pr-2">
                {renderElementItems(
                  layout.twoColumn.column1.elements.map((e) => e.element),
                  bodyTextClass,
                  theme,
                  isThumbnail
                )}
              </div>
              <div className="space-y-2 overflow-hidden pl-2">
                {renderElementItems(
                  layout.twoColumn.column2.elements.map((e) => e.element),
                  bodyTextClass,
                  theme,
                  isThumbnail
                )}
              </div>
            </div>
          ) : layout.layoutType === 'text-image' ? (
            // Text on left, Image on right
            <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
              <div className="col-span-7 space-y-2 overflow-hidden">
                {renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail
                )}
              </div>
              <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                {layout.imageRegion && (
                  <SlideImage
                    imageRegion={layout.imageRegion}
                    isThumbnail={isThumbnail}
                    theme={theme}
                  />
                )}
              </div>
            </div>
          ) : layout.layoutType === 'image-text' ? (
            // Image on left, Text on right
            <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
              <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                {layout.imageRegion && (
                  <SlideImage
                    imageRegion={layout.imageRegion}
                    isThumbnail={isThumbnail}
                    theme={theme}
                  />
                )}
              </div>
              <div className="col-span-7 space-y-2 overflow-hidden">
                {renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail
                )}
              </div>
            </div>
          ) : layout.layoutType === 'full-image' ? (
            // Full image layout
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              <div className="flex-1 overflow-hidden min-h-0 flex items-center justify-center">
                {layout.imageRegion && (
                  <SlideImage
                    imageRegion={layout.imageRegion}
                    isThumbnail={isThumbnail}
                    theme={theme}
                  />
                )}
              </div>
              {slide.elements.filter((e) => e.type !== 'image').length > 0 && (
                <div className="flex-none pt-1">
                  {renderElementItems(
                    slide.elements.filter((e) => e.type !== 'image'),
                    'text-xs text-slate-500',
                    theme,
                    isThumbnail
                  )}
                </div>
              )}
            </div>
          ) : (
            // Standard Title-Content or Blank layout
            <div className={`flex-1 overflow-hidden space-y-2.5 ${isThumbnail ? 'space-y-1' : ''}`}>
              {slide.elements.filter((e) => e.type !== 'image').length === 0 && !layout.imageRegion?.hasImage ? (
                <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs italic">
                  {isThumbnail ? '' : 'Empty Slide'}
                </div>
              ) : layout.imageRegion?.hasImage ? (
                <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden">
                  <div className="col-span-7 space-y-2 overflow-hidden">
                    {renderElementItems(
                      slide.elements.filter((e) => e.type !== 'image'),
                      bodyTextClass,
                      theme,
                      isThumbnail
                    )}
                  </div>
                  <div className="col-span-5 h-full overflow-hidden flex items-center justify-center">
                    <SlideImage
                      imageRegion={layout.imageRegion}
                      isThumbnail={isThumbnail}
                      theme={theme}
                    />
                  </div>
                </div>
              ) : (
                renderElementItems(
                  slide.elements.filter((e) => e.type !== 'image'),
                  bodyTextClass,
                  theme,
                  isThumbnail
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* Slide Footer */}
      {layout.footer.show && (
        <div className="flex-none pt-2 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 border-t border-black/5 dark:border-white/5">
          <span className="truncate max-w-[60%] font-medium">
            {presentationTitle || 'Code2PPT'}
          </span>
          <span>
            Slide {slideIndex + 1} of {totalSlides}
          </span>
        </div>
      )}
    </div>
  );
};
