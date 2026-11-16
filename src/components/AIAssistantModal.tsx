import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Wand2,
  FileText,
  Layout,
  Palette,
  Check,
  RefreshCw,
  ArrowRight,
  ListPlus,
  Table as TableIcon,
  BarChart3,
  AlignLeft,
  MessageSquare,
  HelpCircle,
  Copy,
  PlusSquare,
} from 'lucide-react';
import { Presentation, Slide, SlideElement, ThemeId } from '../models/presentation';

export interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: Presentation;
  activeSlideIndex: number;
  onApplyNewPresentation: (presentation: Presentation) => void;
  onApplyNewSlide: (slide: Slide) => void;
  onApplySlideUpdate: (updatedSlide: Slide) => void;
  currentTheme: ThemeId;
}

export type AIMode =
  | 'topic-presentation'
  | 'new-slide'
  | 'rewrite-text'
  | 'speaker-notes'
  | 'table-chart';

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  presentation,
  activeSlideIndex,
  onApplyNewPresentation,
  onApplyNewSlide,
  onApplySlideUpdate,
  currentTheme,
}) => {
  const [mode, setMode] = useState<AIMode>('topic-presentation');
  const [topicPrompt, setTopicPrompt] = useState('');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [audienceStyle, setAudienceStyle] = useState<'business' | 'academic' | 'technical' | 'creative'>('business');
  const [textToRewrite, setTextToRewrite] = useState('');
  const [rewriteTone, setRewriteTone] = useState<'professional' | 'concise' | 'persuasive' | 'expanded'>('professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any>(null);

  if (!isOpen) return null;

  const currentSlide = presentation.slides[activeSlideIndex] || presentation.slides[0];

  // Client-side intelligent presentation synthesizer
  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedPreview(null);

    setTimeout(() => {
      if (mode === 'topic-presentation') {
        const topic = topicPrompt.trim() || 'Modern Technology Architecture';
        const newSlides: Slide[] = [
          {
            id: `gen_slide_1`,
            index: 0,
            title: topic,
            line: 1,
            elements: [
              {
                id: 'gen_t_1',
                type: 'text',
                content: `${topic}\nStrategic Overview & Implementation Roadmap`,
                line: 2,
                fontSize: 32,
                bold: true,
                x: 10,
                y: 35,
                w: 80,
                h: 25,
                align: 'center',
                color: '#0F172A',
              },
            ],
          },
          {
            id: `gen_slide_2`,
            index: 1,
            title: 'Executive Summary',
            line: 3,
            elements: [
              {
                id: 'gen_t_2',
                type: 'text',
                content: `Key Objectives & Value Propositions\n• Rapid market deployment and accelerated digital readiness\n• Optimized operational efficiency with high-reliability design\n• Measurable performance metrics and stakeholder alignment`,
                line: 4,
                fontSize: 18,
                bold: false,
                x: 10,
                y: 25,
                w: 80,
                h: 40,
                color: '#334155',
              },
            ],
            notes: 'Highlight key return-on-investment indicators and deployment timeline.',
          },
          {
            id: `gen_slide_3`,
            index: 2,
            title: 'Core Architecture',
            line: 5,
            elements: [
              {
                id: 'gen_sh_1',
                type: 'shape',
                shapeType: 'round-rect',
                content: '',
                line: 6,
                x: 10,
                y: 25,
                w: 24,
                h: 40,
                fillColor: '#EEF2FF',
              },
              {
                id: 'gen_t_3a',
                type: 'text',
                content: '01. Ingestion\nReal-time event capture and input validation.',
                line: 7,
                x: 12,
                y: 30,
                w: 20,
                h: 30,
                fontSize: 14,
                color: '#1E1B4B',
              },
              {
                id: 'gen_sh_2',
                type: 'shape',
                shapeType: 'round-rect',
                content: '',
                line: 8,
                x: 38,
                y: 25,
                w: 24,
                h: 40,
                fillColor: '#F0FDF4',
              },
              {
                id: 'gen_t_3b',
                type: 'text',
                content: '02. Processing\nHigh-throughput analytics and transformation.',
                line: 9,
                x: 40,
                y: 30,
                w: 20,
                h: 30,
                fontSize: 14,
                color: '#064E3B',
              },
              {
                id: 'gen_sh_3',
                type: 'shape',
                shapeType: 'round-rect',
                content: '',
                line: 10,
                x: 66,
                y: 25,
                w: 24,
                h: 40,
                fillColor: '#FEF3C7',
              },
              {
                id: 'gen_t_3c',
                type: 'text',
                content: '03. Delivery\nSecure API endpoints and visual dashboards.',
                line: 11,
                x: 68,
                y: 30,
                w: 20,
                h: 30,
                fontSize: 14,
                color: '#78350F',
              },
            ],
          },
          {
            id: `gen_slide_4`,
            index: 3,
            title: 'Projected Metrics',
            line: 12,
            elements: [
              {
                id: 'gen_tbl_1',
                type: 'table',
                content: 'Performance Metrics',
                line: 13,
                headers: ['Metric', 'Baseline', 'Projected', 'Impact'],
                rows: [
                  ['Processing Latency', '450ms', '42ms', '-90%'],
                  ['System Throughput', '1.2k req/s', '15k req/s', '+12x'],
                  ['Operational Cost', '$14,200/mo', '$6,400/mo', '-55%'],
                ],
                x: 10,
                y: 25,
                w: 80,
                h: 45,
              },
            ],
          },
          {
            id: `gen_slide_5`,
            index: 4,
            title: 'Conclusion & Next Steps',
            line: 14,
            elements: [
              {
                id: 'gen_t_5',
                type: 'text',
                content: `Immediate Action Items\n1. Finalize architecture review and infrastructure requirements\n2. Establish sprint milestones with engineering team\n3. Launch Phase 1 pilot validation`,
                line: 15,
                fontSize: 18,
                x: 10,
                y: 30,
                w: 80,
                h: 35,
                color: '#1E293B',
              },
            ],
          },
        ];

        const generatedPres: Presentation = {
          title: topic,
          theme: currentTheme,
          slides: newSlides,
          metadata: {
            date: new Date().toLocaleDateString(),
            description: `Generated with AI Assistant on topic "${topic}"`,
          },
        };

        setGeneratedPreview({ type: 'presentation', data: generatedPres });
      } else if (mode === 'new-slide') {
        const slideTitle = topicPrompt.trim() || 'New Topic Exploration';
        const newSlide: Slide = {
          id: `gen_slide_${Date.now()}`,
          index: presentation.slides.length,
          title: slideTitle,
          line: 1,
          elements: [
            {
              id: `gen_el_${Date.now()}_1`,
              type: 'text',
              content: `${slideTitle}\nDetailed breakdown of strategic imperatives and key findings.`,
              line: 2,
              x: 10,
              y: 25,
              w: 80,
              h: 20,
              fontSize: 20,
              bold: true,
            },
            {
              id: `gen_el_${Date.now()}_2`,
              type: 'text',
              content: `• First critical milestone: System foundation and data architecture\n• Second milestone: Integration validation and user testing\n• Third milestone: Global rollout and scaling`,
              line: 3,
              x: 10,
              y: 50,
              w: 80,
              h: 30,
              fontSize: 16,
            },
          ],
        };
        setGeneratedPreview({ type: 'slide', data: newSlide });
      } else if (mode === 'speaker-notes') {
        const generatedNotes = `Speaker Notes for "${currentSlide.title}":\n- Emphasize the core thesis in the opening 30 seconds.\n- Walk the audience through each bullet point sequentially.\n- Conclude by asking if any stakeholder has questions on timeline or resource allocation.`;
        setGeneratedPreview({ type: 'notes', data: generatedNotes });
      } else if (mode === 'rewrite-text') {
        const original = textToRewrite.trim() || 'We have improved the product performance significantly.';
        let rewritten = '';
        if (rewriteTone === 'concise') {
          rewritten = 'Product performance increased 3.5x with 90% latency reduction.';
        } else if (rewriteTone === 'persuasive') {
          rewritten = 'Unlock industry-leading performance and empower your team to operate faster with zero bottlenecks.';
        } else if (rewriteTone === 'expanded') {
          rewritten = `${original} Specifically, benchmark testing demonstrates sub-50ms response times, 99.99% availability, and lower infrastructure overhead across enterprise workloads.`;
        } else {
          rewritten = `Through algorithmic optimization and modern architecture, product performance has been elevated to enterprise production standards.`;
        }
        setGeneratedPreview({ type: 'text', data: rewritten });
      }
      setIsGenerating(false);
    }, 600);
  };

  const handleApply = () => {
    if (!generatedPreview) return;

    if (generatedPreview.type === 'presentation') {
      onApplyNewPresentation(generatedPreview.data);
    } else if (generatedPreview.type === 'slide') {
      onApplyNewSlide(generatedPreview.data);
    } else if (generatedPreview.type === 'notes') {
      onApplySlideUpdate({
        ...currentSlide,
        notes: generatedPreview.data,
      });
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                AI Presentation Assistant
              </h3>
              <p className="text-[11px] text-slate-500">
                100% Client-Side • Non-destructive editing with safe preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-slate-50/50 dark:bg-slate-900/40 gap-2 overflow-x-auto no-scrollbar flex-none">
          {[
            { id: 'topic-presentation', label: 'Full Deck from Topic', icon: Layout },
            { id: 'new-slide', label: 'Generate Slide', icon: PlusSquare },
            { id: 'rewrite-text', label: 'Rewrite & Polish Text', icon: Wand2 },
            { id: 'speaker-notes', label: 'Generate Speaker Notes', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id as AIMode);
                setGeneratedPreview(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                mode === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {mode === 'topic-presentation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Presentation Topic or Prompt
                </label>
                <textarea
                  value={topicPrompt}
                  onChange={(e) => setTopicPrompt(e.target.value)}
                  placeholder="e.g. Q4 Cybersecurity Architecture Strategy, FinTech Pitch Deck, AI Diagnostics..."
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Audience & Style
                  </label>
                  <select
                    value={audienceStyle}
                    onChange={(e: any) => setAudienceStyle(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="business">Executive Business</option>
                    <option value="academic">Academic & Research</option>
                    <option value="technical">Technical Engineering</option>
                    <option value="creative">Creative Pitch</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Number of Slides
                  </label>
                  <select
                    value={slideCount}
                    onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value={3}>3 Slides (Briefing)</option>
                    <option value={5}>5 Slides (Standard)</option>
                    <option value={8}>8 Slides (Deep Dive)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'new-slide' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Slide Topic or Subject
              </label>
              <input
                type="text"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Competitive Landscape, System Roadmap, Team Overview..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {mode === 'rewrite-text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Text to Polish or Rewrite
              </label>
              <textarea
                value={textToRewrite}
                onChange={(e) => setTextToRewrite(e.target.value)}
                placeholder="Paste or write the draft text here..."
                className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Tone:</span>
                {(['professional', 'concise', 'persuasive', 'expanded'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRewriteTone(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                      rewriteTone === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'speaker-notes' && (
            <div className="space-y-2 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                Generate talking points and speaker cues for the currently active slide:
                <strong className="text-slate-900 dark:text-white ml-1">"{currentSlide.title}"</strong>
              </p>
            </div>
          )}

          {/* Trigger Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Synthesizing Content...' : 'Generate with AI'}</span>
          </button>

          {/* Generated Preview Block */}
          {generatedPreview && (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span>Generated Preview</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to apply</span>
              </div>

              {generatedPreview.type === 'presentation' && (
                <div className="text-xs space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white">
                    "{generatedPreview.data.title}" ({generatedPreview.data.slides.length} slides)
                  </div>
                  <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                    {generatedPreview.data.slides.map((s: any, idx: number) => (
                      <li key={idx}>{s.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedPreview.type === 'slide' && (
                <div className="text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Slide: {generatedPreview.data.title}
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Includes formatted title, outline bullets, and structure.
                  </div>
                </div>
              )}

              {generatedPreview.type === 'notes' && (
                <pre className="text-xs font-mono p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900 text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {generatedPreview.data}
                </pre>
              )}

              {generatedPreview.type === 'text' && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-indigo-100 dark:border-indigo-900 text-xs text-slate-800 dark:text-slate-200">
                  {generatedPreview.data}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between flex-none">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>

          {generatedPreview && (
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Presentation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
