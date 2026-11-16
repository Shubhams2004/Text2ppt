import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Grid,
  FileText,
  Compass,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Sliders,
} from 'lucide-react';
import { ValidationIssue } from '../models/presentation';

export interface BottomStatusBarProps {
  currentSlideIndex: number;
  totalSlides: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  wordCount: number;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showSnapGuides: boolean;
  onToggleSnapGuides: () => void;
  showNotes: boolean;
  onToggleNotes: () => void;
  onPresent: () => void;
  issues: ValidationIssue[];
  onOpenIssues: () => void;
}

export const BottomStatusBar: React.FC<BottomStatusBarProps> = ({
  currentSlideIndex,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  wordCount,
  zoomLevel,
  onZoomChange,
  onFitToScreen,
  showGrid,
  onToggleGrid,
  showSnapGuides,
  onToggleSnapGuides,
  showNotes,
  onToggleNotes,
  onPresent,
  issues,
  onOpenIssues,
}) => {
  const warnings = issues.filter((i) => i.severity === 'warning');
  const errors = issues.filter((i) => i.severity === 'error');

  return (
    <footer
      aria-label="Editor Status Bar"
      className="h-8 px-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 select-none flex-none z-20"
    >
      {/* Left: Slide Navigation & Counter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevSlide}
            disabled={currentSlideIndex <= 0}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
            title="Previous Slide (Page Up)"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] min-w-[70px] text-center">
            Slide {currentSlideIndex + 1} of {Math.max(1, totalSlides)}
          </span>
          <button
            onClick={onNextSlide}
            disabled={currentSlideIndex >= totalSlides - 1}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 rounded transition-colors cursor-pointer"
            title="Next Slide (Page Down)"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* Word Count */}
        <span className="text-[11px] text-slate-500 font-medium">
          {wordCount} words
        </span>
      </div>

      {/* Center: Quality & Accessibility Pill */}
      <div className="hidden sm:flex items-center gap-2">
        <button
          onClick={onOpenIssues}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
            errors.length > 0
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              : warnings.length > 0
              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}
          title="Open Presentation Quality & WCAG Audit Drawer"
        >
          {errors.length > 0 || warnings.length > 0 ? (
            <AlertTriangle className="w-3 h-3 flex-none" />
          ) : (
            <CheckCircle2 className="w-3 h-3 flex-none" />
          )}
          <span>
            {errors.length > 0
              ? `${errors.length} error${errors.length > 1 ? 's' : ''}`
              : warnings.length > 0
              ? `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`
              : 'WCAG AA Validated'}
          </span>
        </button>
      </div>

      {/* Right: View Toggles & Zoom Controls */}
      <div className="flex items-center gap-3">
        {/* Toggle Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleNotes}
            className={`p-1 rounded cursor-pointer transition-colors ${
              showNotes ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Toggle Speaker Notes Panel"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleGrid}
            className={`p-1 rounded cursor-pointer transition-colors ${
              showGrid ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Toggle Alignment Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleSnapGuides}
            className={`p-1 rounded cursor-pointer transition-colors ${
              showSnapGuides ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="Toggle Smart Snap Guides"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.1))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={zoomLevel}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-indigo-600 cursor-pointer h-1"
            title="Adjust Zoom Level"
          />

          <button
            onClick={() => onZoomChange(Math.min(2.0, zoomLevel + 0.1))}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onFitToScreen}
            className="px-1.5 py-0.5 text-[10px] font-mono font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer min-w-[34px] text-right"
            title="Fit to Screen"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
        </div>

        {/* Present Shortcut */}
        <button
          onClick={onPresent}
          className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded cursor-pointer ml-1"
          title="Full-Screen Presentation Mode (F5)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
