# Code2PPT Studio Production Readiness & UX Architecture

Comprehensive roadmap to bring Code2PPT Studio into production-grade reliability, user friendliness, and error resilience across academic, STEM, and professional business presentation workflows.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 clarification and govern this implementation plan:
> - **Primary Polish Focus**: Full audit across export pipelines, canvas editing reliability, and session recovery.
> - **Starter Content & Discovery**: Built-in template selector modal featuring categorized academic (thesis, coursework, STEM) and executive business presets.
> - **Data Protection & Recovery**: Seamless client-side autosave with an unobtrusive recovery banner and a canvas crash guard (React Error Boundary).

- **Confirmed Decision 1**: Client-side purity is preserved in full (100% browser-based with zero external servers, databases, or API keys).
- **Confirmed Decision 2**: Zero regression on mobile-first responsive touch architecture (320px–430px) and existing baseline of 155 passing unit tests.
- **Confirmed Decision 3**: Strict adherence to the Universal Frontend Design Constitution (anti-slop cleanliness, removal of decorative pulsing dots, zero static pill tags, and strict typographic hierarchy).

---

## 1. Overview & Core Concept

- **What It Does**: Code2PPT Studio allows users to generate, visually edit, and export native Microsoft PowerPoint (`.pptx`) and Adobe PDF (`.pdf`) presentations directly in the browser via simple code syntax, natural text, or drag-and-drop visual manipulation.
- **Target Audience**: 
  - *Academic Users & Students*: Coursework lectures, thesis defenses, scientific presentations with monospace code snippets, and rehearsed speech timings.
  - *Business Professionals*: Executive pitches, KPI dashboards, strategic roadmaps, and client decks with consistent brand styling.
- **Key Value**: Instant, private, deterministic presentation generation with zero vendor lock-in, zero cloud latency, and full local data sovereignty.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Onboarding & Template Discovery**:
   - User clicks **"Templates"** in the top bar to open the categorized template gallery modal.
   - User selects an academic preset (*Thesis Defense*, *STEM Lab Demo*, *Student Study Guide*) or a business preset (*Executive Pitch*, *KPI Dashboard*, *Modernization Brief*).
   - The presentation loads immediately into both the synchronized code editor and the live visual canvas.

2. **Editing & Formatting**:
   - Users can edit via code, markdown/simple text, or direct visual interaction.
   - Floating selection pill offers instant `[Edit]`, `[B]`, `[A+]`, `[A-]`, `[Format]`, and `[Duplicate]` actions with zero layout shift.
   - Canvas handles snap to 15° increments on shift-rotate, and element nudging operates via arrow keys (0.05" normal, 0.25" with Shift).

3. **Export & Error Handling**:
   - User triggers PPTX or PDF export via header dropdown or keyboard shortcuts (`Ctrl+S` / `Ctrl+P`).
   - If export succeeds: Clear, timed success toast confirms downloaded filename and slide count.
   - If export encounters an edge case (e.g. malformed external image or corrupt font): Non-blocking alert toast pinpoints the exact cause with actionable recovery instructions instead of silent failures.

4. **Crash Guard & Session Recovery**:
   - An unobtrusive top banner alerts users when a previous session is restored from IndexedDB / local storage, with an instant "Start Fresh" option.
   - If an unexpected error occurs during slide rendering, a local Canvas Error Boundary isolates the failure, displaying a clean "Slide Rendering Issue" message with a 1-click "Reset Element" button rather than crashing the entire studio.

### Visual Identity & Theme Discipline
- **Color Discipline (60-30-10)**:
  - *60% Dominant Neutral Canvas*: Light slate/off-white (`#f8fafc` / `#ffffff`) in light mode; deep slate (`#090d16` / `#0f172a`) in dark mode.
  - *30% Structural Surfaces*: Subtle 1px borders (`border-slate-200` / `border-slate-800`), clean white/charcoal cards with single-elevation depth.
  - *10% High-Intent Accent*: Indigo (`#4f46e5`) reserved strictly for active tabs, primary export actions, and selection bounding boxes.
- **Zero-Pill & Metadata Discipline**:
  - Remove decorative pulsing status dots (`animate-pulse`) from header storage indicators.
  - Render slide counters, storage status, and timestamps as unboxed typography with quiet typographic separators (`·`).
- **Typography & Scale**:
  - Display & Headings: `Plus Jakarta Sans` with bold visual authority.
  - Body & Notes: Readable `Plus Jakarta Sans` / `Inter` with 1.5 line-height.
  - Monospace Data & Code: Strict tabular numerals (`font-mono tabular-nums`, `Courier New`) for code blocks, timers, and KPI statistics.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Template Gallery Modal vs. Simple Dropdown
- **Chosen Approach**: Build a dedicated, full-screen accessible `TemplateModal.tsx` categorized into Academic and Business tabs with live thumbnail metadata.
- **Why**: The existing header dropdown is cramped on mobile and hides the breadth of academic and business templates. A visual modal allows first-time students and professionals to preview slide layouts before loading.
- **Alternatives Considered**: Keeping the tiny 4-item dropdown. Rejected because it under-represents capabilities and fails to showcase code, stat, and quote elements.

### Decision 2: Local Session Recovery Banner & Canvas Error Boundary
- **Chosen Approach**: Combine automated debounced IndexedDB autosave with an unobtrusive top recovery banner and a localized React Error Boundary around `Preview.tsx`.
- **Why**: Production presentation tools must never lose user edits or suffer white-screen application crashes due to a corrupted data URI or broken asset.
- **Alternatives Considered**: A complex multi-branch Git-like revision tree. Rejected as overly complex for a browser-based slide tool; a clean autosave snapshot with manual `.code2ppt.json` backup meets all user needs.

### Decision 3: Actionable Export Feedback Pipeline
- **Chosen Approach**: Wrap PPTX and PDF generation in structured result objects with informative success/error toasts, verifying dimensions and font safety before compiling.
- **Why**: Currently, any export failure only logs to `console.error()`, leaving the user with an indefinite spinner or silence.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Code2PPT Studio (App.tsx)                       │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Top Bar (Header.tsx)             │ Canvas Crash Guard (ErrorBoundary)  │
│  - Categorized Template Modal    │                                     │
│  - Export Actions (PPTX/PDF/ZIP) │                                     │
│  - Session Recovery Banner       │                                     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ Input Engines                    │ Live Visual Canvas (Preview.tsx)    │
│  - DSL Lexer & Parser            │  - Interactive Element Manipulation │
│  - Markdown / Simple Text Parser │  - Floating Selection Quick Pill    │
│  - Multi-Presentation Batch      │  - Rehearsal Stopwatch HUD (Timer)  │
├──────────────────────────────────┴─────────────────────────────────────┤
│ Validation & Quality Engine                                            │
│  - WCAG Contrast Ratio Checker   - Spatial Overlap Detection           │
│  - Broken Asset Guard            - Filler Text Auto-Cleaner            │
├────────────────────────────────────────────────────────────────────────┤
│ Client-Side Output Engines                                             │
│  - PptxGenJS (Native PowerPoint) - jsPDF (Vector Document)             │
│  - IndexedDB Project Backup      - JSZip (Batch Presentation Archive)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mutation Mapping
1. **`TemplateModal.tsx`**:
   - Triggers `onLoadPreset(code)` upon selection, resetting slide index to 0, updating canonical AST, and recording an undo checkpoint.
2. **`ErrorBoundary.tsx`**:
   - Catches lifecycle or rendering exceptions in `Preview.tsx` or `InteractiveElementItem`.
   - Displays a graceful fallback card with error explanation and a "Restore Safe Slide State" button.
3. **`App.tsx` (Autosave & Recovery Banner)**:
   - On mount, if local storage contains a valid previous project, display a subtle 1-line banner: *"Restored previous session (X slides) · [Start New Project]"*.
   - On export failure, display an informative toast: *"Export failed: [error message]. Try PDF export or check slide elements."*
4. **`Header.tsx` (Visual Polish)**:
   - Clean up storage badge to remove decorative animated pulsing dots in accordance with anti-slop rules.
   - Add "Templates" button opening the gallery modal.

---

## 5. Implementation Sequence & Verification Plan

1. **Step 1: Canvas Error Boundary**: Create `src/components/CanvasErrorBoundary.tsx` to guard against rendering failures.
2. **Step 2: Template Gallery Modal**: Build `src/components/TemplateModal.tsx` and integrate expanded academic & business presets.
3. **Step 3: Export Resilience & User Feedback**: Upgrade `handleExport` and `handleExportAllBatch` in `App.tsx` with error diagnostics and actionable toasts.
4. **Step 4: Session Recovery Banner**: Add unobtrusive session restoration prompt in `App.tsx` and strip decorative pulsing dots from `Header.tsx`.
5. **Step 5: Verification & Quality Check**:
   - Verify all 155 existing unit tests pass without regression (`npm test`).
   - Run linter & TypeScript check (`tsc --noEmit`).
   - Run production compilation check (`compile_applet`).
