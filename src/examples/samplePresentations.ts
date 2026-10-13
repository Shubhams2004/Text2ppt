export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SAMPLE_PRESENTATIONS: SamplePreset[] = [
  {
    id: 'basic',
    name: 'Default Starter',
    description: 'Minimal introductory presentation matching the Code2PPT syntax specification',
    code: `presentation "My Presentation"

slide "Introduction"
text "This presentation was generated from code."

slide "Key Points"
bullet "Point one"
bullet "Point two"
bullet "Point three"`,
  },
  {
    id: 'ai-healthcare',
    name: 'AI in Healthcare',
    description: 'Medical diagnosis, drug discovery, and intelligent patient care',
    code: `presentation "AI in Healthcare"
theme "emerald"

slide "AI in Healthcare"
bullet "Medical diagnosis"
bullet "Drug discovery"
bullet "Precision treatment & genomics"
bullet "Automated clinical workflows"`,
  },
  {
    id: 'product-pitch',
    name: 'Project Pitch',
    description: 'A multi-slide startup pitch showcasing two-column layout and subtitles',
    code: `presentation "Project Nova: AI Edge Engine"
theme "ocean"

slide "Project Nova" layout="title"
subtitle "The Next-Generation Micro-Inference Platform for Edge Hardware"

slide "Executive Summary"
text "Project Nova enables real-time on-device artificial intelligence without cloud roundtrips."
subtitle "Sub-10ms neural execution with zero cloud bandwidth requirements."

slide "Problem & Solution" layout="two-column"
bullet "Cloud API calls introduce 150-400ms latency"
bullet "Offline hardware cannot execute cloud workflows"
bullet "On-device zero-network micro-kernel"
bullet "Hardware-accelerated WebGPU fallback pipeline"

slide "Strategic Roadmap"
transition "fade"
bullet "Q1: Developer Preview & Core SDK release"
bullet "Q2: Automated model quantization pipeline"
bullet "Q3: Enterprise security & on-premise orchestrator"
quote "Empowering every connected device with instantaneous intelligence."`,
  },
  {
    id: 'architecture-brief',
    name: 'Architecture Brief',
    description: 'Technical presentation showcasing system components',
    code: `presentation "Code2PPT Architecture"
theme "modern"

slide "System Overview"
text "Code2PPT operates purely client-side without servers, databases, or cloud dependencies."
subtitle "Fast, private, and deterministic presentation generation."

slide "Core Pipeline"
transition "fade"
bullet "Lexer & Parser: Validates DSL syntax and builds AST"
bullet "Presentation Model: Strongly-typed intermediate representation"
bullet "Preview Engine: Live synchronized 16:9 React canvas"
bullet "PptxGenJS Bridge: Converts AST into binary PowerPoint .pptx"

slide "Browser-First Benefits"
transition "push" dir="left"
bullet "Zero telemetry or server roundtrips"
bullet "Instant live preview updates while typing"
bullet "Native Microsoft PowerPoint compatibility (.pptx)"
bullet "Deployable statically to GitHub Pages"`,
  },
];

export const DEFAULT_CODE = SAMPLE_PRESENTATIONS[0].code;

export const DEFAULT_SIMPLE_TEXT = `Title: AI in Healthcare

Applications
- Medical diagnosis
- Drug discovery
- Patient monitoring

Benefits
- Faster analysis
- Better decision support

Clinical Impact
Artificial intelligence algorithms now analyze clinical records and radiographic scans with superior consistency and speed.
- Over 90% diagnostic agreement
- Streamlined emergency triage`;

export const DEFAULT_BATCH_TEXT = `PRESENTATION: 1
TITLE: Biology Basics

SLIDE: Introduction
TEXT: Biology is the study of life and living organisms.

SLIDE: Characteristics of Life
BULLETS:
- Growth and development
- Reproduction
- Cellular metabolism

PRESENTATION: 2
TITLE: Cell Biology

SLIDE: Cell Structure
TEXT: Cells contain specialized structures performing distinct functions.

SLIDE: Organelles
BULLETS:
- Nucleus (genetic storage)
- Mitochondria (cellular respiration)
- Ribosomes (protein synthesis)

PRESENTATION: 3
TITLE: Genetics & DNA

SLIDE: DNA Architecture
TEXT: The double helix encodes hereditary instructions in nucleotide base pairs.

SLIDE: Gene Expression
BULLETS:
- Transcription from DNA to mRNA
- Translation at ribosomes
- Epigenetic gene regulation`;

