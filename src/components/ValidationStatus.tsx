import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Terminal,
} from 'lucide-react';
import { ValidationIssue } from '../models/presentation';

interface ValidationStatusProps {
  issues: ValidationIssue[];
  hasErrors: boolean;
  slideCount: number;
  onSelectLine: (line: number) => void;
}

export const ValidationStatus: React.FC<ValidationStatusProps> = ({
  issues,
  hasErrors,
  slideCount,
  onSelectLine,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
      {/* Compact Status Bar */}
      <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs">
        {/* Left: Status Message */}
        <div className="flex items-center gap-2.5 min-w-0">
          {hasErrors ? (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 flex-none" />
              <span>
                {errorCount} {errorCount === 1 ? 'syntax error' : 'syntax errors'} found
              </span>
            </div>
          ) : warningCount > 0 ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-4 h-4 flex-none" />
              <span>
                Syntax valid with {warningCount} {warningCount === 1 ? 'warning' : 'warnings'} · {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 flex-none" />
              <span>
                Presentation valid · {slideCount} {slideCount === 1 ? 'slide' : 'slides'} ready for PPTX export
              </span>
            </div>
          )}
        </div>

        {/* Right: Toggle details */}
        <div className="flex items-center gap-2 flex-none">
          <div className="hidden sm:flex items-center gap-2 text-slate-400 dark:text-slate-500 text-[11px]">
            <span>DSL v1.0</span>
            <span>·</span>
            <span>PptxGenJS Engine</span>
          </div>

          {issues.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-[11px]"
            >
              <span>{isExpanded ? 'Hide Details' : `Show Issues (${issues.length})`}</span>
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Issues Drawer */}
      {isExpanded && issues.length > 0 && (
        <div className="max-h-48 overflow-y-auto px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              onClick={() => onSelectLine(issue.line)}
              className="py-2 px-1 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/40 rounded transition-colors group"
            >
              <div className="flex items-start gap-2 min-w-0">
                {issue.severity === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-none mt-0.5" />
                ) : issue.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-none mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-sky-500 flex-none mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {issue.message}
                  </div>
                  {issue.suggestion && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Suggestion: <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">{issue.suggestion}</code>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-none text-[11px] font-mono text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <Terminal className="w-3 h-3" />
                <span>Line {issue.line}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
