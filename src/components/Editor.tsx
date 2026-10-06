import React, { useRef, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  FileText,
  Layers,
  ListOrdered,
  FileCode,
} from 'lucide-react';
import { ValidationIssue } from '../models/presentation';
import { isJavaScriptOrPptxCode, convertPptxJsToDsl } from '../parser/jsToDslConverter';
import { BatchManager } from './BatchManager';
import { BatchPresentationItem } from '../parser/batchParser';

export type InputMode = 'code' | 'simple-text' | 'batch';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  issues: ValidationIssue[];
  activeLine?: number | null;
  onSelectLine?: (line: number) => void;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  // Batch specific props
  batchItems?: BatchPresentationItem[];
  totalBatchDetected?: number;
  batchLimitExceeded?: boolean;
  batchLimitErrorMessage?: string;
  selectedBatchIndex?: number;
  onSelectBatchItem?: (index: number) => void;
  onMoveUpBatchItem?: (index: number) => void;
  onMoveDownBatchItem?: (index: number) => void;
  onRemoveBatchItem?: (index: number) => void;
  onExportSingleBatchItem?: (index: number) => void;
  onExportAllBatchItems?: () => void;
  isExportingAllBatch?: boolean;
  batchExportProgress?: { current: number; total: number } | null;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  issues,
  activeLine,
  mode,
  onModeChange,
  batchItems = [],
  totalBatchDetected,
  batchLimitExceeded = false,
  batchLimitErrorMessage,
  selectedBatchIndex = 0,
  onSelectBatchItem = () => {},
  onMoveUpBatchItem = () => {},
  onMoveDownBatchItem = () => {},
  onRemoveBatchItem = () => {},
  onExportSingleBatchItem = () => {},
  onExportAllBatchItems = () => {},
  isExportingAllBatch = false,
  batchExportProgress = null,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [batchSubView, setBatchSubView] = React.useState<'cards' | 'source'>('cards');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Map issues by line number for gutter indicators
  const issuesByLine = React.useMemo(() => {
    const map = new Map<number, ValidationIssue>();
    for (const issue of issues) {
      if (!map.has(issue.line)) {
        map.set(issue.line, issue);
      }
    }
    return map;
  }, [issues]);

  // Sync scroll between line numbers gutter and textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Scroll to activeLine when selected from validation panel
  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const textarea = textareaRef.current;
      const linesArray = textarea.value.split('\n');
      let charIndex = 0;
      for (let i = 0; i < Math.min(activeLine - 1, linesArray.length); i++) {
        charIndex += linesArray[i].length + 1; // +1 for newline
      }
      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex + (linesArray[activeLine - 1]?.length || 0));

      // Compute approximate scroll position
      const lineHeight = 21; // roughly 21px for text-sm monospace
      textarea.scrollTop = Math.max(0, (activeLine - 3) * lineHeight);
    }
  }, [activeLine]);

  // Handle Tab key insertion in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(code + '\n' + snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prefix = code.substring(0, start);
    const suffix = code.substring(end);

    const needsNewlineBefore = prefix.length > 0 && !prefix.endsWith('\n');
    const toInsert = (needsNewlineBefore ? '\n' : '') + snippet + '\n';
    const newCode = prefix + toInsert + suffix;

    onChange(newCode);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + toInsert.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const isJsCode = React.useMemo(() => isJavaScriptOrPptxCode(code), [code]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* JavaScript Detected Banner (in Code mode only) */}
      {mode === 'code' && isJsCode && (
        <div className="flex-none bg-amber-500/10 border-b border-amber-500/30 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 min-w-0">
            <Sparkles className="w-4 h-4 flex-none text-amber-600 dark:text-amber-400" />
            <span className="truncate">
              <strong>JavaScript detected:</strong> Code2PPT uses simple presentation syntax instead of JavaScript code.
            </span>
          </div>
          <button
            onClick={() => onChange(convertPptxJsToDsl(code))}
            className="flex-none px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Convert JavaScript code to Code2PPT syntax"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Convert to Code2PPT</span>
          </button>
        </div>
      )}

      {/* Editor Toolbar with Mode Switcher */}
      <div className="flex-none px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => onModeChange('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'code'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Code2PPT Structured Markup Mode"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Code2PPT</span>
            </button>
            <button
              onClick={() => onModeChange('simple-text')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'simple-text'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Simple Text (Headings and Bullets) Mode"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Simple Text</span>
            </button>
            <button
              onClick={() => onModeChange('batch')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                mode === 'batch'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Batch Import (Multiple Presentations) Mode"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Batch ({totalBatchDetected !== undefined ? totalBatchDetected : batchItems.length}
                {batchLimitExceeded ? ' / 20 ⚠️' : ' / 20'})
              </span>
            </button>
          </div>

          {/* Batch Subview Switcher */}
          {mode === 'batch' && (
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setBatchSubView('cards')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  batchSubView === 'cards'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="View deck cards and manage queue"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Deck List</span>
              </button>
              <button
                onClick={() => setBatchSubView('source')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                  batchSubView === 'source'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Edit batch raw text directly"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Batch Text</span>
              </button>
            </div>
          )}

          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>
        </div>

        {/* Quick Insert Buttons */}
        <div className="flex items-center gap-1">
          {mode === 'code' ? (
            <>
              <button
                onClick={() => handleInsertSnippet('slide "New Slide"')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a new slide"
              >
                <Plus className="w-3 h-3" />
                Slide
              </button>
              <button
                onClick={() => handleInsertSnippet('bullet "New key point"')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a bullet point"
              >
                <Plus className="w-3 h-3" />
                Bullet
              </button>
              <button
                onClick={() => handleInsertSnippet('text "Description paragraph..."')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert paragraph text"
              >
                <Plus className="w-3 h-3" />
                Text
              </button>
            </>
          ) : mode === 'simple-text' ? (
            <>
              <button
                onClick={() => handleInsertSnippet('\n\nNew Slide Heading\n- First point')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a new slide section"
              >
                <Plus className="w-3 h-3" />
                Section
              </button>
              <button
                onClick={() => handleInsertSnippet('\n- New bullet point')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a bullet point"
              >
                <Plus className="w-3 h-3" />
                Bullet (-)
              </button>
              <button
                onClick={() => handleInsertSnippet('\n• Point with bullet mark')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a unicode bullet point"
              >
                <Plus className="w-3 h-3" />
                Bullet (•)
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setBatchSubView('source');
                  handleInsertSnippet(
                    `\n\nPRESENTATION: ${batchItems.length + 1}\nTITLE: New Deck\n\nSLIDE: Overview\nTEXT: Overview content...`
                  );
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a new presentation block"
              >
                <Plus className="w-3 h-3" />
                Deck
              </button>
              <button
                onClick={() => {
                  setBatchSubView('source');
                  handleInsertSnippet('\n\nSLIDE: New Slide\nTEXT: Content...');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a slide"
              >
                <Plus className="w-3 h-3" />
                Slide
              </button>
              <button
                onClick={() => {
                  setBatchSubView('source');
                  handleInsertSnippet('\nBULLETS:\n- Point A\n- Point B');
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert bullets"
              >
                <Plus className="w-3 h-3" />
                Bullets
              </button>
            </>
          )}

          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy text to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Code */}
          <button
            onClick={() => onChange('')}
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear all text"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body: Either Batch Cards View or Textarea with Gutter */}
      {mode === 'batch' && batchSubView === 'cards' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <BatchManager
            items={batchItems}
            totalDetected={totalBatchDetected}
            limitExceeded={batchLimitExceeded}
            limitErrorMessage={batchLimitErrorMessage}
            selectedIndex={selectedBatchIndex}
            onSelect={onSelectBatchItem}
            onMoveUp={onMoveUpBatchItem}
            onMoveDown={onMoveDownBatchItem}
            onRemove={onRemoveBatchItem}
            onExportSingle={onExportSingleBatchItem}
            onExportAll={onExportAllBatchItems}
            isExportingAll={isExportingAllBatch}
            exportProgress={batchExportProgress}
            onEditInSource={(line) => {
              setBatchSubView('source');
              setTimeout(() => {
                if (textareaRef.current) {
                  const linesArray = textareaRef.current.value.split('\n');
                  let charIndex = 0;
                  for (let i = 0; i < Math.min(line - 1, linesArray.length); i++) {
                    charIndex += linesArray[i].length + 1;
                  }
                  textareaRef.current.focus();
                  textareaRef.current.setSelectionRange(
                    charIndex,
                    charIndex + (linesArray[line - 1]?.length || 0)
                  );
                  const lineHeight = 21;
                  textareaRef.current.scrollTop = Math.max(0, (line - 3) * lineHeight);
                }
              }, 50);
            }}
          />
        </div>
      ) : (
        <div className="flex-1 relative flex flex-col overflow-hidden font-mono text-[13px] leading-relaxed">
          {/* Limit Exceeded Banner in Source View */}
          {mode === 'batch' && batchLimitExceeded && (
            <div className="flex-none p-3 bg-rose-500/10 border-b border-rose-500/30 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 flex-none text-rose-600 dark:text-rose-400" />
              <span>
                {batchLimitErrorMessage ||
                  `Maximum 20 presentations per batch. Found ${totalBatchDetected}. Please reduce the batch to 20 or fewer.`}
              </span>
            </div>
          )}

          <div className="flex-1 relative flex overflow-hidden">
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="flex-none w-12 select-none overflow-hidden bg-slate-50/90 dark:bg-slate-950/60 border-r border-slate-200 dark:border-slate-800/80 py-3 text-right pr-2 text-slate-400 dark:text-slate-600"
            >
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => {
                const lineNum = i + 1;
                const issue = issuesByLine.get(lineNum);
                const isLineActive = activeLine === lineNum;

                return (
                  <div
                    key={lineNum}
                    className={`h-[21px] flex items-center justify-end gap-1 ${
                      isLineActive ? 'text-indigo-600 font-bold' : ''
                    }`}
                  >
                    {issue ? (
                      issue.severity === 'error' ? (
                        <AlertCircle className="w-3 h-3 text-rose-500 flex-none" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-none" />
                      )
                    ) : null}
                    <span className="text-[11px]">{lineNum}</span>
                  </div>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className="flex-1 resize-none bg-transparent p-3 outline-none text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-950/80 whitespace-pre font-mono overflow-y-auto leading-[21px]"
              placeholder={
                mode === 'code'
                  ? `presentation "My Presentation"\n\nslide "Introduction"\ntext "Start typing your presentation code here..."`
                  : mode === 'simple-text'
                  ? `Title: AI in Healthcare\n\nApplications\n- Medical diagnosis\n- Drug discovery\n- Patient monitoring\n\nBenefits\n- Faster analysis\n- Better decision support`
                  : `PRESENTATION: 1\nTITLE: Biology Basics\n\nSLIDE: Introduction\nTEXT: Biology is the study of life.\n\nSLIDE: Characteristics of Life\nBULLETS:\n- Growth\n- Reproduction\n\nPRESENTATION: 2\nTITLE: Cell Biology\n\nSLIDE: Cell Structure\nTEXT: Cells contain specialized organelles.`
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
