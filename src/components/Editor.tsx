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
  ChevronDown,
  LayoutGrid,
  Film,
  CheckCircle2,
} from 'lucide-react';
import { ValidationIssue } from '../models/presentation';
import { isJavaScriptOrPptxCode, convertPptxJsToDsl } from '../parser/jsToDslConverter';

export type InputMode = 'code' | 'simple-text';
export type ExportFormat = 'pptx' | 'pdf';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  issues: ValidationIssue[];
  activeLine?: number | null;
  onSelectLine?: (line: number) => void;
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onCleanContent?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  issues,
  activeLine,
  mode,
  onModeChange,
  onCleanContent,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = React.useState(false);
  const [isTransitionMenuOpen, setIsTransitionMenuOpen] = React.useState(false);

  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const transitionMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
      if (transitionMenuRef.current && !transitionMenuRef.current.contains(e.target as Node)) {
        setIsTransitionMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      <div className="flex-none px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto py-0.5">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs flex-none">
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
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>
        </div>

        {/* Quick Insert Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full flex-none touch-pan-x scrollbar-none">
          {mode === 'code' ? (
            <>
              <button
                onClick={() => handleInsertSnippet('slide "New Slide"')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs flex-none"
                title="Insert a new slide"
              >
                <Plus className="w-3 h-3 text-indigo-500" />
                Slide
              </button>

              {/* Layout Dropdown */}
              <div className="relative" ref={layoutMenuRef}>
                <button
                  onClick={() => {
                    setIsLayoutMenuOpen(!isLayoutMenuOpen);
                    setIsTransitionMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Insert slide with specific layout"
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-500" />
                  <span>Layout</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {isLayoutMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Slide Layouts
                    </div>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Comparison" layout="two-column"\nbullet "Left column item"\nbullet "Right column item"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Two Column</div>
                      <div className="text-[10px] text-slate-400">Side-by-side elements</div>
                    </button>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Visual Overview" layout="image-text"\nimage "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"\ntext "Description of key feature or metric"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Image & Text</div>
                      <div className="text-[10px] text-slate-400">Image on left, text on right</div>
                    </button>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Feature Spotlight" layout="text-image"\ntext "Summary of capability"\nimage "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Text & Image</div>
                      <div className="text-[10px] text-slate-400">Text on left, image on right</div>
                    </button>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Visual Showcase" layout="full-image"\nimage "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Full Image</div>
                      <div className="text-[10px] text-slate-400">Large centered image canvas</div>
                    </button>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Welcome" layout="title"\nsubtitle "Presentation subtitle"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Cover Slide</div>
                      <div className="text-[10px] text-slate-400">Title hero layout</div>
                    </button>
                    <button
                      onClick={() => {
                        handleInsertSnippet('slide "Blank Canvas" layout="blank"');
                        setIsLayoutMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="font-medium text-slate-800 dark:text-slate-200">Blank Slide</div>
                      <div className="text-[10px] text-slate-400">No header or dividers</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Transition Dropdown */}
              <div className="relative" ref={transitionMenuRef}>
                <button
                  onClick={() => {
                    setIsTransitionMenuOpen(!isTransitionMenuOpen);
                    setIsLayoutMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Insert slide transition"
                >
                  <Film className="w-3 h-3 text-indigo-500" />
                  <span>Transition</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {isTransitionMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Slide Transitions
                    </div>
                    {[
                      { name: 'Fade', code: 'transition "fade"' },
                      { name: 'Push Left', code: 'transition "push" dir="left"' },
                      { name: 'Push Up', code: 'transition "push" dir="up"' },
                      { name: 'Zoom', code: 'transition "zoom"' },
                      { name: 'Wipe', code: 'transition "wipe"' },
                      { name: 'Split', code: 'transition "split"' },
                    ].map((tr) => (
                      <button
                        key={tr.name}
                        onClick={() => {
                          handleInsertSnippet(tr.code);
                          setIsTransitionMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {tr.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                onClick={() => handleInsertSnippet('\n\nSlide: New Slide\n- First point')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="Insert a new slide section"
              >
                <Plus className="w-3 h-3 text-indigo-500" />
                Section
              </button>

              {/* Simple Text Layout Dropdown */}
              <div className="relative" ref={layoutMenuRef}>
                <button
                  onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Insert layout"
                >
                  <LayoutGrid className="w-3 h-3 text-indigo-500" />
                  <span>Layout</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>
                {isLayoutMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { name: 'Two Column', snippet: '\nLayout: two-column\n- Column 1\n- Column 2' },
                      { name: 'Image & Text', snippet: '\nLayout: image-text\nImage: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80\nDetailed description...' },
                      { name: 'Full Image', snippet: '\nLayout: full-image\nImage: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          handleInsertSnippet(item.snippet);
                          setIsLayoutMenuOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleInsertSnippet('\n- New bullet point')}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                title="Insert a bullet point"
              >
                <Plus className="w-3 h-3" />
                Bullet
              </button>
            </>
          ) : null}

          {/* Content Quality Clean Button */}
          {onCleanContent && (
            <button
              onClick={onCleanContent}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border border-emerald-200/80 dark:border-emerald-800 rounded-md transition-all cursor-pointer shadow-2xs hover:shadow-xs"
              title="Apply content quality rules: removes artificial instructions (e.g. 'Must reach 100%'), hollow summaries, and clutter while preserving all facts and metrics."
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Clean Content</span>
            </button>
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

      {/* Editor Body: Textarea with Line Numbers Gutter */}
      <div className="flex-1 relative flex flex-col overflow-hidden font-mono text-[13px] leading-relaxed">
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
            className="flex-1 resize-none bg-transparent p-3 outline-none text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-950/80 whitespace-pre font-mono overflow-y-auto leading-[21px] text-[14px] sm:text-[13px]"
            placeholder={
              mode === 'code'
                ? `presentation "My Presentation"\n\nslide "Introduction"\ntext "Start typing your presentation code here..."`
                : `Title: AI in Healthcare\n\nApplications\n- Medical diagnosis\n- Drug discovery\n- Patient monitoring\n\nBenefits\n- Faster analysis\n- Better decision support`
            }
          />
        </div>
      </div>
    </div>
  );
};
