import React, { useRef } from 'react';
import {
  SlideElement,
  ShapeElement,
  TableElement,
  ChartElement,
  ImageElement,
  ShapeType,
  ChartType,
  ThemeColors,
} from '../models/presentation';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Upload,
  Link,
  Plus,
  Minus,
  RotateCw,
  Sparkles,
  X,
} from 'lucide-react';

export interface VisualPropertiesPanelProps {
  element: SlideElement;
  theme: ThemeColors;
  onUpdateElement: (updated: SlideElement, commitToHistory?: boolean) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onLayerChange: (id: string, action: 'front' | 'forward' | 'backward' | 'back') => void;
  onAlignElement: (id: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onClose?: () => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Calibri',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Trebuchet MS',
  'Verdana',
  'Helvetica',
];

const PRESET_COLORS = [
  '#000000',
  '#FFFFFF',
  '#334155',
  '#64748B',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
];

export const VisualPropertiesPanel: React.FC<VisualPropertiesPanelProps> = ({
  element,
  theme,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onLayerChange,
  onAlignElement,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePropChange = (patch: Partial<SlideElement>, commit: boolean = true) => {
    onUpdateElement({ ...element, ...patch } as SlideElement, commit);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      if (dataUri) {
        handlePropChange({
          src: dataUri,
          url: dataUri,
          content: file.name,
        } as Partial<ImageElement>);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isTextType =
    element.type === 'text' ||
    element.type === 'bullet' ||
    element.type === 'subtitle' ||
    element.type === 'quote';

  return (
    <div className="w-full max-w-full sm:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col text-xs max-h-[75vh] md:max-h-[85vh] overflow-hidden select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 flex-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider text-[11px]">
            {element.type} Properties
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateElement(element.id)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Duplicate Element (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteElement(element.id)}
            className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Delete Element (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer ml-1"
              title="Close Properties Panel"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 scrollbar-thin">
        {/* 1. Spatial Positioning & Sizing */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Position & Geometry (in)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 w-4">X</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="10"
                value={element.x !== undefined ? Number(element.x.toFixed(2)) : 0.8}
                onChange={(e) => handlePropChange({ x: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 w-4">Y</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="5.625"
                value={element.y !== undefined ? Number(element.y.toFixed(2)) : 1.5}
                onChange={(e) => handlePropChange({ y: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 w-4">W</span>
              <input
                type="number"
                step="0.05"
                min="0.2"
                max="10"
                value={element.w !== undefined ? Number(element.w.toFixed(2)) : 4.0}
                onChange={(e) => handlePropChange({ w: Math.max(0.2, parseFloat(e.target.value) || 0.2) })}
                className="w-full bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-lg px-2 py-1.5 border border-slate-200/80 dark:border-slate-700">
              <span className="text-[10px] font-mono text-slate-400 w-4">H</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5.625"
                value={element.h !== undefined ? Number(element.h.toFixed(2)) : 1.5}
                onChange={(e) => handlePropChange({ h: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
                className="w-full bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Rotation stepper */}
          <div className="mt-2 flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium">Rotation</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="5"
                min="-360"
                max="360"
                value={element.rotation || 0}
                onChange={(e) => handlePropChange({ rotation: parseInt(e.target.value) || 0 })}
                className="w-16 bg-transparent text-right font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100"
              />
              <span className="text-slate-400 text-[10px]">°</span>
              <button
                onClick={() => handlePropChange({ rotation: ((element.rotation || 0) + 90) % 360 })}
                className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700"
                title="Rotate 90 degrees"
              >
                +90°
              </button>
            </div>
          </div>
        </div>

        {/* 2. Layer & Alignment Controls */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Arrangement & Align
          </div>
          {/* Layer Order */}
          <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => onLayerChange(element.id, 'front')}
              className="p-1.5 flex flex-col items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Bring to Front"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
              <span className="text-[9px] mt-0.5">Front</span>
            </button>
            <button
              onClick={() => onLayerChange(element.id, 'forward')}
              className="p-1.5 flex flex-col items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Bring Forward"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span className="text-[9px] mt-0.5">Forward</span>
            </button>
            <button
              onClick={() => onLayerChange(element.id, 'backward')}
              className="p-1.5 flex flex-col items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Send Backward"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span className="text-[9px] mt-0.5">Back</span>
            </button>
            <button
              onClick={() => onLayerChange(element.id, 'back')}
              className="p-1.5 flex flex-col items-center justify-center rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Send to Back"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
              <span className="text-[9px] mt-0.5">Bottom</span>
            </button>
          </div>

          {/* Quick Align */}
          <div className="grid grid-cols-6 gap-1 mt-1.5 p-0.5 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300 text-center">
            <button
              onClick={() => onAlignElement(element.id, 'left')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Align to Left Margin"
            >
              Left
            </button>
            <button
              onClick={() => onAlignElement(element.id, 'center')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors font-bold text-indigo-600 dark:text-indigo-400"
              title="Align to Slide Center"
            >
              Center
            </button>
            <button
              onClick={() => onAlignElement(element.id, 'right')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Align to Right Margin"
            >
              Right
            </button>
            <button
              onClick={() => onAlignElement(element.id, 'top')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Align to Top"
            >
              Top
            </button>
            <button
              onClick={() => onAlignElement(element.id, 'middle')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Align to Middle"
            >
              Mid
            </button>
            <button
              onClick={() => onAlignElement(element.id, 'bottom')}
              className="py-1 rounded hover:bg-white dark:hover:bg-slate-700 transition-colors"
              title="Align to Bottom"
            >
              Bot
            </button>
          </div>
        </div>

        {/* 3. Text & Typography Controls */}
        {isTextType && (
          <div className="space-y-3">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Text & Typography
            </div>

            {/* Content Textarea */}
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Content
              </label>
              <textarea
                value={element.content}
                onChange={(e) => handlePropChange({ content: e.target.value })}
                rows={3}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                placeholder="Type slide text content..."
              />
            </div>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Font</label>
                <select
                  value={element.fontFamily || 'Arial'}
                  onChange={(e) => handlePropChange({ fontFamily: e.target.value })}
                  className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Size (pt)</label>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1">
                  <input
                    type="number"
                    min="8"
                    max="96"
                    value={element.fontSize || (element.type === 'subtitle' ? 18 : 14)}
                    onChange={(e) => handlePropChange({ fontSize: parseInt(e.target.value) || 14 })}
                    className="w-full bg-transparent font-mono text-xs focus:outline-none text-slate-800 dark:text-slate-100 text-right pr-1"
                  />
                  <span className="text-slate-400 text-[10px]">pt</span>
                </div>
              </div>
            </div>

            {/* Style Toggles & Alignment */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  onClick={() => handlePropChange({ bold: !element.bold })}
                  className={`p-1.5 rounded transition-colors ${
                    element.bold
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Bold"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePropChange({ italic: !element.italic })}
                  className={`p-1.5 rounded transition-colors ${
                    element.italic
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePropChange({ underline: !element.underline })}
                  className={`p-1.5 rounded transition-colors ${
                    element.underline
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  onClick={() => handlePropChange({ align: 'left' })}
                  className={`p-1.5 rounded transition-colors ${
                    (element.align || 'left') === 'left'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePropChange({ align: 'center' })}
                  className={`p-1.5 rounded transition-colors ${
                    element.align === 'center'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePropChange({ align: 'right' })}
                  className={`p-1.5 rounded transition-colors ${
                    element.align === 'right'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handlePropChange({ align: 'justify' })}
                  className={`p-1.5 rounded transition-colors ${
                    element.align === 'justify'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title="Justify"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
              <span className="text-[11px] text-slate-600 dark:text-slate-300">Line Spacing</span>
              <div className="flex items-center gap-1">
                {[1.0, 1.15, 1.25, 1.5].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => handlePropChange({ lineSpacing: sp })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      (element.lineSpacing || 1.15) === sp
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Font Color</label>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => handlePropChange({ color: theme.accentColor })}
                  className="w-5 h-5 rounded-full border border-black/10 shadow-2xs relative"
                  style={{ backgroundColor: theme.accentColor }}
                  title="Theme Accent"
                />
                <button
                  onClick={() => handlePropChange({ color: theme.titleColor })}
                  className="w-5 h-5 rounded-full border border-black/10 shadow-2xs relative"
                  style={{ backgroundColor: theme.titleColor }}
                  title="Theme Title Color"
                />
                <button
                  onClick={() => handlePropChange({ color: theme.bodyColor })}
                  className="w-5 h-5 rounded-full border border-black/10 shadow-2xs relative"
                  style={{ backgroundColor: theme.bodyColor }}
                  title="Theme Body Color"
                />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => handlePropChange({ color: c })}
                    className={`w-5 h-5 rounded-full border border-black/10 shadow-2xs transition-transform hover:scale-110 ${
                      element.color === c ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={element.color || theme.bodyColor}
                  onChange={(e) => handlePropChange({ color: e.target.value })}
                  className="w-5 h-5 rounded-full border-none cursor-pointer p-0 bg-transparent"
                  title="Custom Color"
                />
              </div>
            </div>

            {/* Hyperlink */}
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Hyperlink URL</label>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5">
                <Link className="w-3.5 h-3.5 text-slate-400 flex-none" />
                <input
                  type="url"
                  value={element.link || ''}
                  onChange={(e) => handlePropChange({ link: e.target.value || undefined })}
                  placeholder="https://..."
                  className="w-full bg-transparent text-xs focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Image Properties */}
        {element.type === 'image' && (() => {
          const img = element as ImageElement;
          return (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Image Settings
              </div>

              {/* Image Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-white/5 flex items-center justify-center p-1">
                <img
                  src={img.src || img.url}
                  alt={img.alt || 'Slide asset'}
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>

              {/* Replace Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Replace Image from Device</span>
              </button>

              {/* Image URL Input */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Or Paste Image URL / Data URI</label>
                <input
                  type="text"
                  value={img.src || ''}
                  onChange={(e) => handlePropChange({ src: e.target.value, url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none font-mono"
                />
              </div>

              {/* Image Fit */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fit Mode</label>
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(['contain', 'cover', 'fill'] as const).map((fit) => (
                    <button
                      key={fit}
                      onClick={() => handlePropChange({ fit })}
                      className={`py-1 rounded text-xs capitalize transition-colors ${
                        (img.fit || 'contain') === fit
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5. Shape Properties */}
        {element.type === 'shape' && (() => {
          const shape = element as ShapeElement;
          return (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Shape Properties
              </div>

              {/* Shape Type */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Shape Type</label>
                <select
                  value={shape.shapeType || 'rect'}
                  onChange={(e) =>
                    handlePropChange({
                      shapeType: e.target.value as ShapeType,
                      content: e.target.value,
                    } as Partial<ShapeElement>)
                  }
                  className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer capitalize"
                >
                  {(['rect', 'round-rect', 'circle', 'ellipse', 'line', 'arrow', 'triangle', 'star'] as const).map(
                    (st) => (
                      <option key={st} value={st}>
                        {st.replace('-', ' ')}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Fill Color */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fill Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="color"
                    value={shape.fillColor || theme.accentColor}
                    onChange={(e) =>
                      handlePropChange({
                        fillColor: e.target.value,
                        fillHex: e.target.value.replace('#', ''),
                      } as Partial<ShapeElement>)
                    }
                    className="w-7 h-7 rounded-lg border-none cursor-pointer p-0 bg-transparent flex-none"
                  />
                  {PRESET_COLORS.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        handlePropChange({
                          fillColor: c,
                          fillHex: c.replace('#', ''),
                        } as Partial<ShapeElement>)
                      }
                      className="w-5 h-5 rounded-full border border-black/10 shadow-2xs hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Color & Thickness */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Border Stroke & Width</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={shape.strokeColor || theme.border}
                    onChange={(e) =>
                      handlePropChange({
                        strokeColor: e.target.value,
                        strokeHex: e.target.value.replace('#', ''),
                      } as Partial<ShapeElement>)
                    }
                    className="w-7 h-7 rounded-lg border-none cursor-pointer p-0 bg-transparent flex-none"
                  />
                  <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={shape.strokeWidth !== undefined ? shape.strokeWidth : 1}
                      onChange={(e) =>
                        handlePropChange({ strokeWidth: parseInt(e.target.value) || 0 } as Partial<ShapeElement>)
                      }
                      className="w-full"
                    />
                    <span className="text-[10px] font-mono ml-2 w-6 text-right">
                      {shape.strokeWidth !== undefined ? shape.strokeWidth : 1}px
                    </span>
                  </div>
                </div>
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono">
                    {Math.round((shape.opacity !== undefined ? shape.opacity : 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={shape.opacity !== undefined ? shape.opacity : 1}
                  onChange={(e) =>
                    handlePropChange({ opacity: parseFloat(e.target.value) || 1 } as Partial<ShapeElement>)
                  }
                  className="w-full"
                />
              </div>
            </div>
          );
        })()}

        {/* 6. Table Properties */}
        {element.type === 'table' && (() => {
          const table = element as TableElement;
          const headers = table.headers || ['Col 1', 'Col 2'];
          const rows = table.rows || [['A', 'B']];

          const updateTable = (newHeaders: string[], newRows: string[][]) => {
            onUpdateElement({
              ...table,
              headers: newHeaders,
              rows: newRows,
            });
          };

          const addColumn = () => {
            const nextColName = `Col ${headers.length + 1}`;
            const newHeaders = [...headers, nextColName];
            const newRows = rows.map((r) => [...r, '-']);
            updateTable(newHeaders, newRows);
          };

          const removeColumn = () => {
            if (headers.length <= 1) return;
            const newHeaders = headers.slice(0, -1);
            const newRows = rows.map((r) => r.slice(0, -1));
            updateTable(newHeaders, newRows);
          };

          const addRow = () => {
            const newRow = Array(headers.length).fill('Data');
            updateTable(headers, [...rows, newRow]);
          };

          const removeRow = () => {
            if (rows.length <= 1) return;
            updateTable(headers, rows.slice(0, -1));
          };

          return (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Table Structure ({headers.length} cols × {rows.length} rows)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={addRow}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Plus className="w-3 h-3 text-emerald-500" />
                  <span>Row</span>
                </button>
                <button
                  onClick={removeRow}
                  disabled={rows.length <= 1}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 rounded-md text-xs text-rose-500"
                  title="Remove Last Row"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  onClick={addColumn}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Plus className="w-3 h-3 text-indigo-500" />
                  <span>Column</span>
                </button>
                <button
                  onClick={removeColumn}
                  disabled={headers.length <= 1}
                  className="py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 rounded-md text-xs text-rose-500"
                  title="Remove Last Column"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>

              {/* Table cell editor */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div className="text-[10px] text-slate-400 font-medium">Headers</div>
                <div className="grid grid-cols-2 gap-1">
                  {headers.map((h, i) => (
                    <input
                      key={i}
                      value={h}
                      onChange={(e) => {
                        const newHeaders = [...headers];
                        newHeaders[i] = e.target.value;
                        updateTable(newHeaders, rows);
                      }}
                      className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 rounded text-xs border border-indigo-200 dark:border-indigo-800 font-semibold text-indigo-700 dark:text-indigo-300"
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 7. Chart Properties */}
        {element.type === 'chart' && (() => {
          const chart = element as ChartElement;
          const data = chart.data || [];

          const updateChart = (patch: Partial<ChartElement>) => {
            onUpdateElement({ ...chart, ...patch } as ChartElement);
          };

          const addDataItem = () => {
            const newItem = { label: `Item ${data.length + 1}`, value: 50 };
            updateChart({ data: [...data, newItem] });
          };

          const removeDataItem = (idx: number) => {
            if (data.length <= 1) return;
            updateChart({ data: data.filter((_, i) => i !== idx) });
          };

          return (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Chart Data & Type
              </div>

              {/* Chart Type */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Chart Type</label>
                <select
                  value={chart.chartType || 'bar'}
                  onChange={(e) => updateChart({ chartType: e.target.value as ChartType })}
                  className="w-full px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-xs focus:outline-none cursor-pointer capitalize"
                >
                  {(['bar', 'column', 'pie', 'doughnut', 'line', 'area'] as const).map((ct) => (
                    <option key={ct} value={ct}>
                      {ct} Chart
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Chart Title</label>
                <input
                  type="text"
                  value={chart.title || ''}
                  onChange={(e) => updateChart({ title: e.target.value })}
                  placeholder="Chart Title..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none"
                />
              </div>

              {/* Data series */}
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Data Series ({data.length})</span>
                  <button
                    onClick={addDataItem}
                    className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const updated = [...data];
                          updated[i] = { ...item, label: e.target.value };
                          updateChart({ data: updated });
                        }}
                        className="flex-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs"
                      />
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => {
                          const updated = [...data];
                          updated[i] = { ...item, value: parseFloat(e.target.value) || 0 };
                          updateChart({ data: updated });
                        }}
                        className="w-16 px-1.5 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-right"
                      />
                      <button
                        onClick={() => removeDataItem(i)}
                        disabled={data.length <= 1}
                        className="p-1 text-slate-400 hover:text-rose-500 disabled:opacity-20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
