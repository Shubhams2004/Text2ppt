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
    description: 'A multi-slide startup or project pitch',
    code: `presentation "Project Nova: AI Edge Engine"
theme "ocean"

slide "Executive Summary"
text "Project Nova is the next-generation micro-inference platform designed for edge devices."
subtitle "Delivering sub-10ms response times without cloud latency."

slide "The Problem"
bullet "Cloud API calls introduce 150-400ms latency"
bullet "Offline devices cannot process intelligent workflows"
bullet "Bandwidth and telemetry costs scale non-linearly"
bullet "Privacy and compliance restrict outbound data transfer"

slide "Our Solution"
bullet "Zero-network on-device execution engine"
bullet "Ultra-compact 4-bit quantized neural runtimes"
bullet "Native integration with TypeScript and WebAssembly"
bullet "Hardware-accelerated WebGPU fallback pipeline"

slide "Roadmap & Next Steps"
bullet "Q1: Developer Preview & SDK release"
bullet "Q2: Automated quantization pipeline"
bullet "Q3: Enterprise security & deployment tier"
text "Contact the Nova team at dev@projectnova.internal"`,
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
bullet "Lexer & Parser: Validates DSL syntax and builds AST"
bullet "Presentation Model: Strongly-typed intermediate representation"
bullet "Preview Engine: Live synchronized 16:9 React canvas"
bullet "PptxGenJS Bridge: Converts AST into binary PowerPoint .pptx"

slide "Browser-First Benefits"
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

