import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Check,
  Copy,
  X,
  RefreshCw,
  Wand2,
  Palette,
  Layers,
  Monitor,
} from 'lucide-react';
import { InputMode } from './Editor';

interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (snippet: string) => void;
  currentMode: InputMode;
}

const INSPIRATION_PROMPTS = [
  {
    label: 'Modern Indigo Gradient',
    prompt: 'Minimalist smooth fluid wave gradient in deep navy and vibrant indigo with soft ambient glow',
    type: 'background' as const,
    style: 'Modern Abstract',
  },
  {
    label: 'Futuristic Cyber Tech',
    prompt: 'High-tech dark futuristic cyberspace mesh with luminous cyan and violet circuit nodes',
    type: 'background' as const,
    style: 'Dark Tech Grid',
  },
  {
    label: 'Clean Corporate Geometry',
    prompt: 'Clean professional corporate geometry with elegant diagonal facets in navy blue and silver slate',
    type: 'background' as const,
    style: 'Digital Vector',
  },
  {
    label: 'Warm Sunset Horizon',
    prompt: 'Warm atmospheric sunset horizon with soft golden amber and crimson gradient clouds',
    type: 'background' as const,
    style: 'Watercolor Gradient',
  },
  {
    label: 'Nature Emerald Foliage',
    prompt: 'Lush organic emerald green botanical texture with subtle geometric shadow accents',
    type: 'background' as const,
    style: 'Modern Abstract',
  },
  {
    label: '3D Floating Isometric Shapes',
    prompt: 'Minimalist 3D isometric glass cube cluster with chromatic dispersion on soft background',
    type: 'decorative' as const,
    style: 'Minimalist 3D',
  },
];

const STYLES = [
  'Modern Abstract',
  'Dark Tech Grid',
  'Digital Vector',
  'Minimalist 3D',
  'Watercolor Gradient',
  'Photorealistic',
];

export const AiImageModal: React.FC<AiImageModalProps> = ({
  isOpen,
  onClose,
  onInsertImage,
  currentMode,
}) => {
  const [prompt, setPrompt] = useState('Minimalist smooth fluid wave gradient in deep navy and vibrant indigo');
  const [imageType, setImageType] = useState<'background' | 'split' | 'decorative'>('background');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3' | '1:1'>('16:9');
  const [selectedStyle, setSelectedStyle] = useState('Modern Abstract');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isProcedural, setIsProcedural] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          type: imageType === 'background' ? 'background' : 'decorative',
          style: selectedStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setGeneratedImageUrl(data.imageUrl);
      setIsProcedural(!!data.isProcedural);
    } catch (err: any) {
      console.error('Failed to generate image:', err);
      setError(err?.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const constructSnippet = (url: string) => {
    if (currentMode === 'code') {
      if (imageType === 'background') {
        return `slide "Visual Showcase" layout="full-image"\nimage "${url}"`;
      }
      if (imageType === 'split') {
        return `slide "Visual Feature" layout="image-text"\nimage "${url}"\ntext "Description of key highlight or metric"`;
      }
      return `image "${url}"`;
    }

    if (currentMode === 'simple-text') {
      if (imageType === 'background') {
        return `Slide: Visual Showcase\nLayout: full-image\nImage: ${url}`;
      }
      if (imageType === 'split') {
        return `Slide: Visual Feature\nLayout: image-text\nImage: ${url}\nKey feature description...`;
      }
      return `Image: ${url}`;
    }

    // batch mode
    if (imageType === 'background') {
      return `SLIDE: Visual Showcase\nLAYOUT: full-image\nIMAGE: ${url}`;
    }
    if (imageType === 'split') {
      return `SLIDE: Visual Feature\nLAYOUT: image-text\nIMAGE: ${url}\nTEXT: Key feature description...`;
    }
    return `IMAGE: ${url}`;
  };

  const handleInsert = () => {
    if (!generatedImageUrl) return;
    const snippet = constructSnippet(generatedImageUrl);
    onInsertImage(snippet);
    onClose();
  };

  const handleCopySnippet = () => {
    if (!generatedImageUrl) return;
    const snippet = constructSnippet(generatedImageUrl);
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-image-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ai-image-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                AI Image Generation
                <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                  Gemini AI
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create background textures and decorative visuals directly from text prompts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Prompt Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt-input" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                Prompt Description
              </label>
              <span className="text-[11px] text-slate-400">Be descriptive for best presentation aesthetics</span>
            </div>
            <div className="relative">
              <textarea
                id="prompt-input"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your slide background or decorative graphic (e.g. Modern dark cyberspace mesh with glowing indigo nodes)..."
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none shadow-2xs"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Quick Inspiration:</span>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setImageType(item.type);
                      setSelectedStyle(item.style);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700/80 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Image Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-indigo-500" />
                Presentation Role
              </label>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setImageType('background');
                    setAspectRatio('16:9');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                    imageType === 'background'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Full Slide Background</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">16:9 full canvas</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageType('split');
                    setAspectRatio('1:1');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                    imageType === 'split'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Side-by-Side (Image & Text)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Split layout slide</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImageType('decorative')}
                  className={`px-3 py-1.5 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                    imageType === 'decorative'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[11px]">Inline Slide Graphic</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Element inside slide</div>
                </button>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                Aspect Ratio
              </label>
              <div className="flex flex-col gap-1.5">
                {(['16:9', '4:3', '1:1'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border transition-all cursor-pointer ${
                      aspectRatio === ratio
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span>{ratio}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {ratio === '16:9' ? 'Widescreen (PPT)' : ratio === '4:3' ? 'Classic' : 'Square'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                Visual Style
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
              >
                {STYLES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Applies prompt steering to match presentation color harmonies and clean aesthetics.
              </div>
            </div>
          </div>

          {/* Generate Button Action */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Image with AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate AI Image</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Generated Result Preview */}
          {generatedImageUrl && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  Generated Result
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {isProcedural ? 'High-Res Presentation Graphic' : 'Gemini AI Generated'}
                </span>
              </div>

              {/* Image Preview Box */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-inner flex items-center justify-center max-h-[260px] aspect-[16/9]">
                <img
                  src={generatedImageUrl}
                  alt={prompt}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Code Snippet Preview & Actions */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Code snippet to be inserted:</span>
                  <button
                    type="button"
                    onClick={handleCopySnippet}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block text-[11px] font-mono text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 truncate">
                  {constructSnippet(generatedImageUrl).trim()}
                </code>
              </div>

              {/* Primary Insert CTA */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleInsert}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Insert into Presentation</span>
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Generate another variation"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
