import React from 'react';
import {
  FileDown,
  Layers,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit3,
  Loader2,
  Sparkles,
  ChevronDown,
  FileType,
} from 'lucide-react';
import { BatchPresentationItem } from '../parser/batchParser';

export type ExportFormat = 'pptx' | 'pdf';

interface BatchManagerProps {
  items: BatchPresentationItem[];
  totalDetected?: number;
  limitExceeded?: boolean;
  limitErrorMessage?: string;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  onExportSingle: (index: number, format?: ExportFormat) => void;
  onExportAll: (format?: ExportFormat) => void;
  onEditInSource: (line: number) => void;
  onPasteText?: (text: string) => void;
  isExportingAll: boolean;
  exportProgress?: { current: number; total: number } | null;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  items,
  totalDetected,
  limitExceeded = false,
  limitErrorMessage,
  selectedIndex,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRemove,
  onExportSingle,
  onExportAll,
  onEditInSource,
  onPasteText,
  isExportingAll,
  exportProgress,
}) => {
  const [isExportAllMenuOpen, setIsExportAllMenuOpen] = React.useState(false);
  const [openSingleMenuIndex, setOpenSingleMenuIndex] = React.useState<number | null>(null);

  const exportAllRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportAllRef.current && !exportAllRef.current.contains(e.target as Node)) {
        setIsExportAllMenuOpen(false);
      }
      setOpenSingleMenuIndex(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const count = totalDetected !== undefined ? totalDetected : items.length;
  const isApproachingLimit = count >= 18 && count <= 20;
  const isOverLimit = count > 20 || limitExceeded;

  const validCount = items.filter((i) => !i.hasErrors).length;
  const errorCount = items.filter((i) => i.hasErrors).length;

  return (
    <div
      tabIndex={0}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        if (text && onPasteText) {
          e.preventDefault();
          onPasteText(text);
        }
      }}
      className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden focus:outline-none"
    >
      {/* Limit Exceeded Banner */}
      {isOverLimit && (
        <div className="flex-none p-3.5 bg-rose-500/10 border-b border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 flex-none text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="min-w-0">
            <strong className="font-semibold block">Batch limit exceeded:</strong>
            <span>
              {limitErrorMessage ||
                `Maximum 20 presentations per batch. Found ${count}. Please reduce the batch to 20 or fewer.`}
            </span>
          </div>
        </div>
      )}

      {/* Batch Stats & Bulk Export Header */}
      <div className="flex-none p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span
              className={
                isOverLimit
                  ? 'text-rose-600 font-bold'
                  : isApproachingLimit
                  ? 'text-amber-600 font-bold'
                  : ''
              }
            >
              {count} / 20 presentations
            </span>
          </span>

          {isApproachingLimit && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              Approaching 20 deck limit
            </span>
          )}

          {!isOverLimit && validCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              {validCount} Ready
            </span>
          )}

          {errorCount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
              {errorCount} Issues
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditInSource(1)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Open batch text in editor"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Batch Text</span>
          </button>

          {/* Export All Action with format selection */}
          <div className="relative" ref={exportAllRef}>
            <div className="inline-flex rounded-lg shadow-xs">
              <button
                onClick={() => onExportAll('pptx')}
                disabled={isExportingAll || validCount === 0 || isOverLimit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-all cursor-pointer disabled:cursor-not-allowed"
                title={
                  isOverLimit
                    ? `Export disabled: Maximum 20 presentations per batch. Found ${count}.`
                    : 'Download all presentations as separate .pptx files'
                }
              >
                {isExportingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {exportProgress
                        ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                        : 'Exporting All...'}
                    </span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Export All ({validCount} Decks)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsExportAllMenuOpen(!isExportAllMenuOpen)}
                disabled={isExportingAll || validCount === 0 || isOverLimit}
                className="inline-flex items-center px-1.5 py-1.5 rounded-r-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white border-l border-indigo-500/50 transition-all cursor-pointer disabled:cursor-not-allowed"
                title="Choose batch export format (PPTX or PDF)"
                aria-label="Batch Export Options"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {isExportAllMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Batch Format
                </div>
                <button
                  onClick={() => {
                    setIsExportAllMenuOpen(false);
                    onExportAll('pptx');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-indigo-600" />
                  <div>
                    <div className="font-medium">Export All (.pptx)</div>
                    <div className="text-[10px] text-slate-500">PowerPoint files</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setIsExportAllMenuOpen(false);
                    onExportAll('pdf');
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-left transition-colors cursor-pointer"
                >
                  <FileType className="w-4 h-4 text-rose-600" />
                  <div>
                    <div className="font-medium">Export All (.pdf)</div>
                    <div className="text-[10px] text-slate-500">PDF documents</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Presentations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <p>
              No presentations detected. Paste batch text starting with{' '}
              <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">
                PRESENTATION: 1
              </code>.
            </p>
            <button
              onClick={() => onEditInSource(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Paste / Edit Batch Text</span>
            </button>
          </div>
        ) : (
          items.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const slideCount = item.presentation.slides.length;

            return (
              <div
                key={item.id}
                className={`group rounded-xl border p-3.5 transition-all bg-white dark:bg-slate-900 ${
                  isSelected
                    ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top Row: Index Badge, Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.headerLabel || `Presentation ${idx + 1}`}
                      </span>
                      {item.hasErrors ? (
                        <span className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {item.issues.length} {item.issues.length === 1 ? 'issue' : 'issues'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Valid
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-1 truncate">
                      {item.presentation.title || 'Untitled Presentation'}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {slideCount} {slideCount === 1 ? 'slide' : 'slides'} • Line {item.startLine}
                    </p>
                  </div>

                  {/* Move Up/Down & Delete */}
                  <div className="flex items-center gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Move presentation up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onMoveDown(idx)}
                      disabled={idx === items.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Move presentation down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemove(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Remove presentation from batch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Issues preview if any */}
                {item.issues.length > 0 && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
                    {item.issues.slice(0, 2).map((iss, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-600 flex-none mt-0.5" />
                        <span className="truncate">{iss.message}</span>
                      </div>
                    ))}
                    {item.issues.length > 2 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        +{item.issues.length - 2} more issues
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Row Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelect(idx)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Preview this presentation in slide canvas"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Previewing' : 'Preview'}</span>
                    </button>

                    <button
                      onClick={() => onEditInSource(item.startLine)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Jump to source code for this presentation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Source</span>
                    </button>
                  </div>

                  <div className="relative">
                    <div className="inline-flex rounded-md shadow-2xs">
                      <button
                        onClick={() => onExportSingle(idx, 'pptx')}
                        disabled={item.hasErrors || slideCount === 0}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-l-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Export this deck as .pptx"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PPTX</span>
                      </button>

                      <button
                        onClick={() =>
                          setOpenSingleMenuIndex(openSingleMenuIndex === idx ? null : idx)
                        }
                        disabled={item.hasErrors || slideCount === 0}
                        className="inline-flex items-center px-1.5 py-1 rounded-r-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-l-0 border-slate-200 dark:border-slate-800 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Choose export format"
                        aria-label="Export format options"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>

                    {openSingleMenuIndex === idx && (
                      <div className="absolute right-0 bottom-full mb-1 w-40 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                        <button
                          onClick={() => {
                            setOpenSingleMenuIndex(null);
                            onExportSingle(idx, 'pptx');
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5 text-indigo-600" />
                          <span>PowerPoint (.pptx)</span>
                        </button>
                        <button
                          onClick={() => {
                            setOpenSingleMenuIndex(null);
                            onExportSingle(idx, 'pdf');
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <FileType className="w-3.5 h-3.5 text-rose-600" />
                          <span>PDF Document (.pdf)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
