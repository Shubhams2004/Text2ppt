import React, { useState } from 'react';
import {
  Layers,
  FileDown,
  FileType,
  Sparkles,
  Check,
  Copy,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sliders,
  Eye,
  Archive,
  FolderOpen,
  Sun,
  Moon,
  FileText,
  AlertTriangle,
  Palette,
  Play,
  Maximize2,
  ChevronDown,
  Laptop,
  Smartphone,
  CheckCircle2,
  Table as TableIcon,
  BarChart3,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { SAMPLE_PRESENTATIONS } from '../examples/samplePresentations';
import { THEMES } from '../themes/presentationThemes';

interface LandingPageProps {
  onOpenStudio: () => void;
  onLoadSampleAndOpen: (code: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenStudio,
  onLoadSampleAndOpen,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<
    'dsl' | 'visual' | 'simple' | 'batch' | 'quality' | 'export'
  >('dsl');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [selectedDemoIndex, setSelectedDemoIndex] = useState<number>(0);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const interactiveDemos = [
    {
      title: 'Startup Pitch Deck',
      subtitle: 'Split layout with metrics and bold typography',
      theme: 'Ocean',
      themeColor: '#0284c7',
      code: `presentation "Project Nova: AI Edge"
theme "ocean"

slide "Project Nova" layout="title"
subtitle "Real-time on-device intelligence without cloud latency"

slide "Core Breakthroughs" layout="two-column"
bullet "Sub-10ms neural execution on consumer hardware"
bullet "100% offline operational privacy compliance"
bullet "Zero recurring API token costs"
bullet "WebGPU acceleration fallback"`,
      preview: {
        slideTitle: 'Core Breakthroughs',
        layout: 'Two-Column',
        theme: 'Ocean Blue',
        bullets: [
          'Sub-10ms neural execution on consumer hardware',
          '100% offline operational privacy compliance',
          'Zero recurring API token costs',
          'WebGPU acceleration fallback',
        ],
        footer: 'Project Nova • Slide 2 of 4',
      },
      rawPresetCode: SAMPLE_PRESENTATIONS[2]?.code || SAMPLE_PRESENTATIONS[0].code,
    },
    {
      title: 'AI in Healthcare',
      subtitle: 'Modern clinical genomics & drug discovery',
      theme: 'Emerald',
      themeColor: '#059669',
      code: `presentation "AI in Healthcare"
theme "emerald"

slide "Next-Gen Medicine" layout="title"
subtitle "Accelerating clinical research & diagnostics"

slide "Key Application Pillars"
bullet "Automated radiology & pathology triage"
bullet "De novo drug target discovery"
bullet "Precision oncology & genomic variant classification"
bullet "Ambient clinical voice transcription"`,
      preview: {
        slideTitle: 'Key Application Pillars',
        layout: 'Standard',
        theme: 'Emerald Green',
        bullets: [
          'Automated radiology & pathology triage',
          'De novo drug target discovery',
          'Precision oncology & genomic variant classification',
          'Ambient clinical voice transcription',
        ],
        footer: 'AI in Healthcare • Slide 2 of 3',
      },
      rawPresetCode: SAMPLE_PRESENTATIONS[1]?.code || SAMPLE_PRESENTATIONS[0].code,
    },
    {
      title: 'Minimal Executive Brief',
      subtitle: 'Clean high-contrast corporate presentation',
      theme: 'Minimal',
      themeColor: '#475569',
      code: `presentation "Q3 Strategic Review"
theme "minimal"

slide "Executive Summary"
text "Deliver consistent double-digit operating margin expansion."
subtitle "Fiscal Year 2026 Key Objectives"

slide "Milestones"
bullet "Enterprise retention at 118% net dollar rate"
bullet "Platform availability verified at 99.98%"
bullet "Reduced customer onboarding from 14 to 3 days"`,
      preview: {
        slideTitle: 'Milestones',
        layout: 'Bullet List',
        theme: 'Minimal Monochrome',
        bullets: [
          'Enterprise retention at 118% net dollar rate',
          'Platform availability verified at 99.98%',
          'Reduced customer onboarding from 14 to 3 days',
        ],
        footer: 'Q3 Strategic Review • Slide 2 of 2',
      },
      rawPresetCode: SAMPLE_PRESENTATIONS[0]?.code || '',
    },
  ];

  const currentDemo = interactiveDemos[selectedDemoIndex];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs shadow-indigo-600/30 flex-none">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight">
                  Code2PPT
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                  STUDIO
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Code-to-PowerPoint Presentation Studio
              </p>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#about"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              About
            </a>
            <a
              href="#features"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Features
            </a>
            <a
              href="#how-to-use"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              How to Use
            </a>
            <a
              href="#syntax"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              DSL Syntax
            </a>
            <a
              href="#faq"
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle dark/light mode"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>
            )}

            <button
              onClick={onOpenStudio}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-xs shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Pill-free category indicator */}
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Zap className="w-4 h-4" />
              <span>Declarative Slide Authoring & Visual Studio</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
              Turn Code and Plain Text into{' '}
              <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/40 decoration-wavy underline-offset-6">
                Editable PowerPoint & PDF
              </span>{' '}
              Presentations.
            </h1>

            <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
              Code2PPT Studio lets you write clean presentation code or paste outlines, edit visually
              with direct-manipulation handles, run automated WCAG quality checks, and export native
              16:9 widescreen PowerPoint (<code className="font-mono text-indigo-600 dark:text-indigo-400">.pptx</code>)
              and vector PDF (<code className="font-mono text-rose-600 dark:text-rose-400">.pdf</code>) decks.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenStudio}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-base shadow-sm transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Open Studio Editor</span>
              </button>

              <a
                href="#how-to-use"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-base transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <span>Read How-To Guide</span>
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>100% Client-Side Privacy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>True Vector Editable PPTX</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                <span>Automated WCAG 2.1 Checks</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>Mobile-First Touch Editing</span>
              </div>
            </div>
          </div>

          {/* Interactive Code-to-Slide Preview Showcase */}
          <div className="mt-12 lg:mt-16 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            {/* Window Topbar */}
            <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                  Live Interactive Demonstration
                </span>
              </div>

              {/* Demo selector buttons */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-medium">
                {interactiveDemos.map((demo, idx) => (
                  <button
                    key={demo.title}
                    onClick={() => setSelectedDemoIndex(idx)}
                    className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                      selectedDemoIndex === idx
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {demo.title}
                  </button>
                ))}
              </div>

              <button
                onClick={() => onLoadSampleAndOpen(currentDemo.rawPresetCode)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>Edit This in Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Showcase Grid: Code on left, Visual Slide on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
              {/* Left Column: Code DSL */}
              <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950 text-slate-200 font-mono text-xs sm:text-sm flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
                <div>
                  <div className="flex items-center justify-between text-slate-400 pb-3 mb-3 border-b border-slate-800 text-xs">
                    <span className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      DSL Source Code
                    </span>
                    <button
                      onClick={() => copyToClipboard(currentDemo.code, 999)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy code to clipboard"
                    >
                      {copiedIndex === 999 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre leading-relaxed text-indigo-200/90 font-mono">
                    {currentDemo.code}
                  </pre>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span>Theme: {currentDemo.theme}</span>
                  <span className="text-indigo-400">Compiles in &lt;10ms</span>
                </div>
              </div>

              {/* Right Column: Visual Slide Preview */}
              <div className="lg:col-span-7 p-6 sm:p-8 bg-slate-100 dark:bg-slate-900/50 flex flex-col items-center justify-center">
                <div className="w-full max-w-xl aspect-video rounded-xl shadow-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all">
                  {/* Subtle theme accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: currentDemo.themeColor }}
                  />

                  {/* Slide Header */}
                  <div>
                    <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1">
                      {currentDemo.preview.layout}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {currentDemo.preview.slideTitle}
                    </h3>
                  </div>

                  {/* Slide Content Bullets */}
                  <div className="my-auto space-y-2.5 sm:space-y-3">
                    {currentDemo.preview.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2.5">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5 flex-none"
                          style={{ backgroundColor: currentDemo.themeColor }}
                        />
                        <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
                          {bullet}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Slide Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{currentDemo.preview.footer}</span>
                    <span className="font-mono text-[10px]">16:9 Widescreen</span>
                  </div>
                </div>

                {/* Direct action below preview */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => onLoadSampleAndOpen(currentDemo.rawPresetCode)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch in Editor</span>
                  </button>
                  <span className="text-xs text-slate-500">
                    Exports directly to real PowerPoint (.pptx) & PDF
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About the Website Section ───────────────────────────────────── */}
      <section id="about" className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              About Code2PPT Studio
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              A Modern, Fast, and Private Web Studio for Presentation Builders
            </p>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Code2PPT Studio was engineered for engineers, product managers, researchers, and content creators
              who want presentation decks created rapidly with code precision rather than wrestling with heavy,
              slow desktop GUI software.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                100% Client-Side & Private
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Everything runs directly in your local browser sandbox. Slides, text, diagrams, and files
                are never uploaded to any remote server or cloud database. Your internal company roadmaps and confidential data remain on your machine.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Dual Editing Modes
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Enjoy declarative code editing with instant sub-millisecond parsing alongside full WYSIWYG
                direct-manipulation on canvas: drag elements, resize with 8 handles, rotate with angle knobs, and double-click to edit text.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Genuine PowerPoint & PDF
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We generate real vector XML Microsoft PowerPoint (<code className="font-mono text-xs">.pptx</code>)
                files—not bitmap screenshots. Edit text boxes, recolor vector shapes, and adjust animations inside Microsoft 365, Google Slides, or Apple Keynote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Core Features Breakdown ─────────────────────────────────────── */}
      <section id="features" className="py-16 md:py-24 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Engineered for Production
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Everything You Need to Build High-Impact Decks
            </p>
            <p className="text-base text-slate-600 dark:text-slate-300">
              From automated WCAG compliance to multi-presentation batch production, Code2PPT Studio is packed with capabilities.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white">Visual Canvas Manipulation</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Click any slide element to inspect its coordinates. Drag to reposition, drag corner/edge handles
                to resize, rotate with the top knob, and double-click to edit text directly on canvas.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">WCAG Contrast & Quality Checks</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Automatic real-time validation checks for WCAG AA (4.5:1 / 3:1) color contrast violations,
                unintended bounding-box overlaps, and broken/unreachable image URIs before exporting.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Archive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white">Batch Deck Engine & ZIP Export</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Define up to 20 presentations in one document using <code className="font-mono text-xs">=== presentation ===</code>.
                Switch between decks instantly and download all decks in a single compressed <code className="font-mono text-xs">.zip</code> archive.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Palette className="w-5 h-5 text-emerald-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">10+ Professional Curated Themes</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Choose between Corporate, Minimal, Ocean, Emerald, Crimson, Sunset, Cyberpunk, Midnight,
                Nord, and Lavender themes with coordinated color tokens and typography.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <FolderOpen className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-slate-900 dark:text-white">Project Backups & File Import</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Save complete project snapshots as offline <code className="font-mono text-xs">.code2ppt.json</code> files.
                Import Markdown (<code className="font-mono text-xs">.md</code>) or spreadsheet CSVs to convert tabular data into slides instantly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white">Mobile-First Touch Architecture</h4>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Built specifically for phones and tablets starting at 320px width. Features 44×44px touch targets,
                collapsible slide trays, swipe navigation, safe-area keyboard awareness, and bottom sheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How to Use the Website ──────────────────────────────────────── */}
      <section id="how-to-use" className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Comprehensive User Manual
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              How to Use Code2PPT Studio
            </p>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Follow this step-by-step walkthrough to master code-driven presentations, visual canvas editing,
              and batch generation.
            </p>
          </div>

          {/* Interactive Guide Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
            {[
              { id: 'dsl', label: '1. Writing Code (DSL)', icon: Code2Icon },
              { id: 'visual', label: '2. Visual Canvas Editing', icon: Sliders },
              { id: 'simple', label: '3. Simple Text Outliner', icon: FileText },
              { id: 'batch', label: '4. Batch Decks Engine', icon: Archive },
              { id: 'quality', label: '5. Quality & WCAG Audits', icon: AlertTriangle },
              { id: 'export', label: '6. Exports & Backups', icon: FileDown },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveGuideTab(tab.id as typeof activeGuideTab)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  activeGuideTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            {activeGuideTab === 'dsl' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Writing Presentations with Code (DSL Mode)
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Code mode provides granular control over slide structure, transitions, layouts, shapes, tables, and charts.
                    </p>
                  </div>
                  <button
                    onClick={onOpenStudio}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                  >
                    <span>Try in Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Step by step instructions */}
                  <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Step 1: Declare your presentation title & theme
                      </div>
                      <p className="text-xs">
                        Start your code with <code className="font-mono text-indigo-600 dark:text-indigo-400">presentation &quot;My Deck Title&quot;</code> and an optional <code className="font-mono text-indigo-600 dark:text-indigo-400">theme &quot;ocean&quot;</code>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Step 2: Add slides with headings and layouts
                      </div>
                      <p className="text-xs">
                        Use <code className="font-mono text-indigo-600 dark:text-indigo-400">slide &quot;Title&quot;</code> or markdown <code className="font-mono text-indigo-600 dark:text-indigo-400"># Title</code>. Specify layouts like <code className="font-mono text-indigo-600 dark:text-indigo-400">layout=&quot;two-column&quot;</code>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Step 3: Add bullets, text blocks, or shapes
                      </div>
                      <p className="text-xs">
                        Write <code className="font-mono text-indigo-600 dark:text-indigo-400">bullet &quot;Key point&quot;</code> or <code className="font-mono text-indigo-600 dark:text-indigo-400">- Key point</code>. Add vector shapes with <code className="font-mono text-indigo-600 dark:text-indigo-400">shape &quot;rectangle&quot;</code>.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Step 4: Separate slides with blank lines or &quot;---&quot;
                      </div>
                      <p className="text-xs">
                        Each new <code className="font-mono text-indigo-600 dark:text-indigo-400">slide &quot;...&quot;</code> or <code className="font-mono text-indigo-600 dark:text-indigo-400">---</code> creates a fresh 16:9 canvas.
                      </p>
                    </div>
                  </div>

                  {/* Sample code card */}
                  <div className="bg-slate-950 rounded-xl p-4 sm:p-5 text-slate-200 font-mono text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2 mb-3">
                        <span className="font-sans font-medium text-slate-300">Complete Starter Syntax</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `presentation "Q3 Launch"\ntheme "ocean"\n\nslide "Product Launch" layout="title"\nsubtitle "Autonomous Edge Hardware Platform"\n\nslide "Key Deliverables" layout="two-column"\nbullet "Firmware v2.4 deployment"\nbullet "99.98% runtime telemetry uptime"\nbullet "Zero security regressions"\nbullet "Enterprise support SLA enabled"\n\nslide "Financial Metrics"\ntext "Exceeded Q3 ARR targets by 14%."\nshape "rectangle" x=10 y=60 w=80 h=20 fill="#0284c7"`,
                              1
                            )
                          }
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedIndex === 1 ? 'Copied' : 'Copy Code'}</span>
                        </button>
                      </div>
                      <pre className="text-indigo-200/90 whitespace-pre overflow-x-auto leading-relaxed">
{`presentation "Q3 Launch"
theme "ocean"

slide "Product Launch" layout="title"
subtitle "Autonomous Edge Hardware Platform"

slide "Key Deliverables" layout="two-column"
bullet "Firmware v2.4 deployment"
bullet "99.98% runtime telemetry uptime"
bullet "Zero security regressions"
bullet "Enterprise support SLA enabled"

slide "Financial Metrics"
text "Exceeded Q3 ARR targets by 14%."
shape "rectangle" x=10 y=60 w=80 h=20 fill="#0284c7"`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'visual' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Direct-Manipulation Visual Canvas
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Interact directly with elements on the slide canvas without typing a single line of code.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Select & Inspect</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Click or tap any text box, shape, image, table, or chart to reveal its active selection ring and coordinate anchors.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Drag to Reposition</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Drag elements freely across the slide. Alignment guide lines automatically assist you in snapping to center or margins.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Resize & Rotate</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Use the 8 perimeter handles to stretch or shrink any object. Drag the circular rotation knob at the top to tilt.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">Double-Click Inline Edit</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Double-click on any slide heading, subtitle, or bullet point to modify its text directly on the slide surface.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                  <span>
                    💡 <strong>Pro-Tip:</strong> Any visual change made on the canvas immediately updates the underlying code in real-time, keeping code and canvas 100% in sync!
                  </span>
                  <button
                    onClick={onOpenStudio}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 cursor-pointer ml-4 flex-none"
                  >
                    Open Canvas
                  </button>
                </div>
              </div>
            )}

            {activeGuideTab === 'simple' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Simple Text Mode (Auto-Outliner)
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Paste raw notes, brainstorm lists, or meeting transcripts; Code2PPT automatically converts them into formatted slides.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <p>
                      If you don&apos;t want to learn DSL syntax, switch to the <strong>Simple Text</strong> tab in the studio editor.
                    </p>
                    <ul className="space-y-2 list-disc list-inside text-xs leading-relaxed">
                      <li>Use standard markdown headings (<code className="font-mono"># Title</code>) to indicate new slides.</li>
                      <li>Use regular bullet dashes (<code className="font-mono">- Item</code>) for bullet lists.</li>
                      <li>Empty lines or triple dashes (<code className="font-mono">---</code>) naturally separate distinct thoughts.</li>
                      <li>The smart layout engine automatically detects list length and prevents visual text overflow.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-950 rounded-xl p-4 text-slate-200 font-mono text-xs">
                    <div className="text-slate-400 border-b border-slate-800 pb-2 mb-2 font-sans font-medium text-slate-300">
                      Plain Text Example Input:
                    </div>
                    <pre className="text-emerald-300/90 whitespace-pre leading-relaxed">
{`# Growth Marketing Strategy

- Target Enterprise B2B developers
- Double down on developer community content
- Weekly open office hours & webinars

# Product Roadmap

- Mobile-first visual studio
- Automated WCAG contrast checks
- Multi-deck batch export engine`}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'batch' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Batch Presentations Engine & ZIP Archive
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Produce up to 20 unique presentation decks simultaneously in a single document.
                  </p>
                </div>

                <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                    <div className="font-bold text-slate-900 dark:text-white mb-1">
                      Deck Separator Syntax:
                    </div>
                    <p className="text-xs mb-2">
                      Separate each distinct presentation deck with three equal signs and the presentation name:
                    </p>
                    <code className="block p-2.5 rounded-lg bg-slate-950 text-indigo-300 font-mono text-xs">
                      === presentation: Client Pitch - Acme Corp ===
                    </code>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">Deck Selector Dropdown</div>
                      <p className="text-slate-500">
                        When in Batch mode, a dropdown appears in the toolbar allowing you to preview any deck instantly.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">1-Click ZIP Archive</div>
                      <p className="text-slate-500">
                        Click &quot;Export All as ZIP&quot; to compile all decks into individual PowerPoint files bundled inside a .zip file.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="font-bold text-slate-900 dark:text-white mb-1">Individual PPTX / PDF</div>
                      <p className="text-slate-500">
                        You can also export each selected deck individually without affecting the other decks.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeGuideTab === 'quality' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Automated Quality & WCAG 2.1 Contrast Auditing
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Real-time auditing prevents bad color contrast, overlapping objects, and missing images before presenting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>WCAG Contrast Warnings</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Measures relative luminance using the official WCAG 2.1 formula. Flags any text that fails 4.5:1 (normal text) or 3:1 (large text) against its slide or box background.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-indigo-800 dark:text-indigo-300 text-sm">
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span>Spatial Overlap Detection</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Computes bounding box intersections between non-contained elements on the same slide. Alerts you when text accidentally collides with shapes or other text frames.
                    </p>
                  </div>

                  <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300 text-sm">
                      <FileDown className="w-4 h-4 text-rose-600" />
                      <span>Broken Image URI Checks</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Validates image URLs and base64 data URIs. Catches truncated data buffers or unreachable media links before you send the presentation to stakeholders.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  * Note: Quality warnings are non-blocking advisory suggestions. They never halt editing or prevent you from downloading your files.
                </div>
              </div>
            )}

            {activeGuideTab === 'export' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Exporting & Project Storage
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Export high-fidelity deliverables and manage project backups with zero cloud dependencies.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <FileDown className="w-5 h-5 text-indigo-600 flex-none mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          PowerPoint (.pptx) Export
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Click &quot;PPTX&quot; in the header or press <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+S</kbd>. Generates genuine vector Office Open XML presentation files.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <FileType className="w-5 h-5 text-rose-600 flex-none mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          Vector PDF (.pdf) Export
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Click &quot;PDF&quot; in the header or press <kbd className="font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Ctrl+P</kbd>. Generates clean, print-ready 16:9 widescreen presentation PDFs.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <FolderOpen className="w-5 h-5 text-amber-500 flex-none mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          Project Backups (.json)
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Use <code className="text-xs font-mono">Project &rarr; Save Project</code> to store an offline JSON backup. Reopen it at any time to resume editing exactly where you left off.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Archive className="w-5 h-5 text-emerald-500 flex-none mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          Import Markdown & CSV
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          Directly import existing <code className="text-xs font-mono">.md</code> documents or spreadsheet <code className="text-xs font-mono">.csv</code> files to auto-generate tables and structured presentation slides.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Complete DSL Syntax Reference ───────────────────────────────── */}
      <section id="syntax" className="py-16 md:py-24 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Language Specification
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Code2PPT DSL Syntax Reference
            </p>
            <p className="text-base text-slate-600 dark:text-slate-300">
              The Code2PPT DSL is designed to be human-readable, terse, and expressive. Here is the full keyword dictionary:
            </p>
          </div>

          <div className="mt-12 overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6 font-semibold">Directive / Keyword</th>
                  <th className="py-3.5 px-4 sm:px-6 font-semibold">Example Syntax</th>
                  <th className="py-3.5 px-4 sm:px-6 font-semibold">Description & Supported Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    presentation
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    presentation &quot;Quarterly Review&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Sets the document title and default filename on export.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    theme
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    theme &quot;ocean&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Applies color scheme. Supported: <code className="font-mono">default</code>, <code className="font-mono">minimal</code>, <code className="font-mono">ocean</code>, <code className="font-mono">emerald</code>, <code className="font-mono">crimson</code>, <code className="font-mono">sunset</code>, <code className="font-mono">cyberpunk</code>, <code className="font-mono">midnight</code>, <code className="font-mono">nord</code>, <code className="font-mono">lavender</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    slide
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    slide &quot;Slide Title&quot; layout=&quot;two-column&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Creates a new slide. Optional layout: <code className="font-mono">title</code>, <code className="font-mono">default</code>, <code className="font-mono">two-column</code>, <code className="font-mono">split-left</code>, <code className="font-mono">split-right</code>, <code className="font-mono">quote</code>, <code className="font-mono">stats</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    bullet
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    bullet &quot;Key takeaway point&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Adds a bullet item to the current slide. Markdown shorthand: <code className="font-mono">- Text</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    subtitle
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    subtitle &quot;Subheading text here&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Adds a secondary subtitle under the slide heading.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    text
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    text &quot;Custom text block&quot; size=18 bold=true
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Free-form paragraph. Attributes: <code className="font-mono">size</code>, <code className="font-mono">bold</code>, <code className="font-mono">italic</code>, <code className="font-mono">color</code>, <code className="font-mono">align</code>, <code className="font-mono">x</code>, <code className="font-mono">y</code>, <code className="font-mono">w</code>, <code className="font-mono">h</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    shape
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    shape &quot;rectangle&quot; fill=&quot;#4F46E5&quot; x=10 y=20 w=30 h=20
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Inserts vector shape: <code className="font-mono">rectangle</code>, <code className="font-mono">circle</code>, <code className="font-mono">triangle</code>, <code className="font-mono">arrow</code>, <code className="font-mono">star</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    image
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    image &quot;https://site.com/photo.png&quot; x=50 y=20 w=40 h=30
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Adds image from URL or base64 data URI. Also supports markdown <code className="font-mono">![Alt](URL)</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    table
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    table headers=&quot;Q1,Q2,Q3&quot; rows=&quot;10,20,30;40,50,60&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Renders an editable vector table. Also supports standard markdown pipe tables.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    chart
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    chart &quot;bar&quot; title=&quot;Revenue&quot; data=&quot;Q1:100,Q2:150&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Creates native vector chart. Types: <code className="font-mono">bar</code>, <code className="font-mono">line</code>, <code className="font-mono">pie</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    transition
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    transition &quot;fade&quot; speed=&quot;normal&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Slide transition animation. Styles: <code className="font-mono">fade</code>, <code className="font-mono">slide-left</code>, <code className="font-mono">zoom</code>, <code className="font-mono">push</code>.
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    speaker-notes
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 font-mono text-xs">
                    speaker-notes &quot;Emphasize 20% margin gain&quot;
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-xs sm:text-sm">
                    Private presenter notes embedded into PowerPoint export.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Ready Sample Presets ────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Pre-built Templates
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Get Started with Verified Presets
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click any template to load it directly into the Studio Editor and start customizing.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_PRESENTATIONS.map((preset) => (
              <div
                key={preset.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-500/50 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 dark:text-white text-base">
                      {preset.name}
                    </span>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {preset.description}
                  </p>
                </div>

                <button
                  onClick={() => onLoadSampleAndOpen(preset.code)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white text-xs font-semibold transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Open Preset in Studio</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Got Questions?
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Clear answers regarding security, format compatibility, and editing capabilities.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Are the exported PowerPoint (.pptx) files fully editable in Microsoft PowerPoint and Google Slides?',
                a: 'Yes! Unlike tools that take raster image snapshots of HTML slides, Code2PPT generates true OpenXML PowerPoint presentation structures using vector shapes, native text frames, font styling, and native layouts. You can open them in Microsoft 365, PowerPoint 2016+, Google Slides, LibreOffice Impress, or Apple Keynote and continue editing freely.',
              },
              {
                q: 'Does Code2PPT send any of my presentation text or data to a remote cloud server?',
                a: 'Never. Code2PPT Studio is an entirely client-side web application. All parsing, canvas rendering, WCAG quality checks, and PPTX/PDF file assembly run locally in your web browser. No telemetry or content is transmitted over the internet.',
              },
              {
                q: 'Can I use Code2PPT on a mobile phone or Android device?',
                a: 'Yes. The interface is mobile-first and responsive down to 320px viewport widths. You can switch between Code and Slide Preview, drag and resize elements using touch handles, edit text with a bottom properties sheet, and download PPTX/PDF files right on your mobile browser.',
              },
              {
                q: 'How does the Batch Mode work?',
                a: 'Batch Mode allows you to write multiple presentations in a single document by separating each presentation block with "=== presentation: Name ===". You can switch between decks using the deck picker in the editor and download all presentations at once as a consolidated .zip archive.',
              },
              {
                q: 'How do the WCAG color contrast checks work?',
                a: 'The studio evaluates text color against effective background color using the official W3C WCAG 2.1 relative luminance algorithm. It warns if contrast is below 4.5:1 for normal text or 3:1 for large headings so you can guarantee high readability in projection rooms or virtual meetings.',
              },
              {
                q: 'What keyboard shortcuts are available?',
                a: 'Ctrl+S (or Cmd+S on Mac) exports PowerPoint (.pptx), Ctrl+P exports PDF, Ctrl+Z performs Undo, Ctrl+Y performs Redo, and Ctrl+/ opens the syntax cheat sheet.',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full text-left p-5 font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform flex-none ${
                      openFaqIndex === idx ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {openFaqIndex === idx && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final Call to Action ────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ready to Build Your Next Presentation from Code?
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Zero sign-up required. Launch the studio, type your slides, and download presentation-ready
            PowerPoint or vector PDF files in seconds.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenStudio}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Launch Studio Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-200">Code2PPT Studio</span>
            <span>• 100% Client-Side In-Browser Presentation Engine</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onOpenStudio}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
            >
              Studio Editor
            </button>
            <a href="#how-to-use" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Guide
            </a>
            <a href="#syntax" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Syntax
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              FAQ
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper icon component for tabs
const Code2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
