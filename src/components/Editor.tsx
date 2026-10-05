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
} from 'lucide-react';
import { ValidationIssue } from '../models/presentation';
import { isJavaScriptOrPptxCode, convertPptxJsToDsl } from '../parser/jsToDslConverter';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
  issues: ValidationIssue[];
  activeLine?: number | null;
  onSelectLine?: (line: number) => void;
}

export const Editor: React.FC<EditorProps> = ({
  code,
  onChange,
  issues,
  activeLine,
}) => {
  const [copied, setCopied] = React.useState(false);
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
      {/* JavaScript Detected Banner */}
      {isJsCode && (
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

      {/* Editor Toolbar */}
      <div className="flex-none px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            Presentation Code
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>
        </div>

        {/* Quick Insert Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsertSnippet('slide "New Slide"')}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
            title="Insert a new slide"
          >
            <Plus className="w-3 h-3" />
            Slide
          </button>
          <button
            onClick={() => handleInsertSnippet('bullet "New key point"')}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
            title="Insert a bullet point"
          >
            <Plus className="w-3 h-3" />
            Bullet
          </button>
          <button
            onClick={() => handleInsertSnippet('text "Description paragraph..."')}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
            title="Insert paragraph text"
          >
            <Plus className="w-3 h-3" />
            Text
          </button>

          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="Copy code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Code */}
          <button
            onClick={() => onChange('')}
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title="Clear all code"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body with Gutter */}
      <div className="flex-1 relative flex overflow-hidden font-mono text-[13px] leading-relaxed">
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
          placeholder="presentation &quot;My Presentation&quot;

slide &quot;Introduction&quot;
text &quot;Start typing your presentation code here...&quot;"
        />
      </div>
    </div>
  );
};
