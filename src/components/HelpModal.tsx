import React from 'react';
import { X, BookOpen, Check, Copy } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertExample: (code: string) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  onInsertExample,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const exampleSyntax = `presentation "My Presentation"
theme "modern"

slide "Introduction"
text "This presentation was generated from code."
subtitle "Fast, client-side, zero setup."

slide "Key Points"
bullet "Point one"
bullet "Point two"
bullet "Point three"`;

  const copySyntax = () => {
    navigator.clipboard.writeText(exampleSyntax);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                Code2PPT Syntax Guide
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Write human-readable presentation scripts that export to native .pptx files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
              Supported Commands
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  presentation "Title"
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sets the presentation file and deck title.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  slide "Slide Title"
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Creates a new slide with the specified header.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  text "Paragraph..."
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Adds a descriptive paragraph or body text block.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  bullet "Item text"
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Adds a bullet point with clean PowerPoint indentation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  subtitle "Tagline"
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Adds a stylized subtitle or section descriptor.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <code className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                  theme "ocean"
                </code>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Options: modern, ocean, emerald, sunset, dark.
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                Full Code Example
              </h4>
              <button
                onClick={copySyntax}
                className="text-xs inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              {exampleSyntax}
            </pre>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200">
            <span className="font-semibold">Tip:</span> Lines starting with <code className="font-mono bg-white/70 dark:bg-slate-900/70 px-1 py-0.5 rounded">#</code> or <code className="font-mono bg-white/70 dark:bg-slate-900/70 px-1 py-0.5 rounded">//</code> are treated as comments and will not appear in the generated slides.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => {
              onInsertExample(exampleSyntax);
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-900"
          >
            Insert Example Code
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
