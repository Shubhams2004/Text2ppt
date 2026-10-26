export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'business' | 'general';
  slideCount: number;
  theme: string;
  code: string;
}

export const SAMPLE_PRESENTATIONS: SamplePreset[] = [
  {
    id: 'basic',
    name: 'Default Starter',
    description: 'Minimal introductory presentation matching Code2PPT syntax',
    category: 'general',
    slideCount: 2,
    theme: 'modern',
    code: `presentation "My Presentation"

slide "Introduction"
text "This presentation was generated from code."

slide "Key Points"
bullet "Point one"
bullet "Point two"
bullet "Point three"`,
  },
  {
    id: 'thesis-defense',
    name: 'Academic Thesis Defense',
    description: 'Structured research presentation with literature gap, methodology, and empirical findings',
    category: 'academic',
    slideCount: 4,
    theme: 'slate',
    code: `presentation "Deep Learning for Real-Time Sensor Telemetry"
theme "slate"

slide "Thesis Defense: Deep Learning at the Edge" layout="title"
subtitle "Author: Alex Rivera · Department of Computer Science · Graduate Defense 2026"

slide "Research Problem & Motivation" layout="two-column"
text "Current Limitations in Sensor Networks" bold=true
bullet "Cloud latency exceeds 250ms for mission-critical feedback"
bullet "Bandwidth saturation prevents continuous full-spectrum streaming"
text "Proposed Investigation" bold=true
bullet "Quantized on-device neural filtering for local anomaly detection"
bullet "Sub-5ms deterministic inference on embedded RISC-V nodes"

slide "Experimental Methodology & Data"
text "Rigorous Validation across 12,000 Experimental Sensor Cycles"
bullet "Benchmark against conventional Kalman filtering and baseline CNNs"
bullet "Zero false negatives recorded under noisy vibrational loads"
quote "Local inference preserves precision while slashing edge network transit by 94%."

slide "Conclusions & Future Work"
bullet "Empirical proofs demonstrate sub-milliwatt power envelope"
bullet "Open-source benchmark harness released to scientific community"
bullet "Next phase: Distributed federated model aggregation across nodes"`,
  },
  {
    id: 'cs-algorithms',
    name: 'CS & Algorithms Lecture',
    description: 'Coursework lecture template featuring monospace code snippets and asymptotic complexity',
    category: 'academic',
    slideCount: 3,
    theme: 'modern',
    code: `presentation "Advanced Data Structures & Graph Algorithms"
theme "modern"

slide "Lecture 14: Shortest Paths" layout="title"
subtitle "CS 301 · Graph Theory & Computational Complexity"

slide "Dijkstra with Priority Queue" layout="two-column"
text "Algorithm Complexity" bold=true
bullet "Time Complexity: O((V + E) log V) with Binary Heap"
bullet "Space Complexity: O(V) auxiliary distance array"
bullet "Requires non-negative edge weights for optimality guarantee"
text "def dijkstra(graph, start):\\n    dist = {v: float('inf') for v in graph}\\n    dist[start] = 0\\n    pq = [(0, start)]\\n    while pq:\\n        d, u = heapq.heappop(pq)\\n        if d > dist[u]: continue\\n        for v, w in graph[u]:\\n            if dist[u] + w < dist[v]:\\n                dist[v] = dist[u] + w\\n                heapq.heappush(pq, (dist[v], v))\\n    return dist" font="Courier New" size=11

slide "Key Takeaways for Students"
bullet "Greedy choice property holds because visited nodes are finalized"
bullet "For negative edge weights, utilize the Bellman-Ford algorithm O(V*E)"
bullet "Assignment 4 problem set is due this Thursday at 11:59 PM"`,
  },
  {
    id: 'product-pitch',
    name: 'Executive Pitch Deck',
    description: 'Strategic investor and executive pitch featuring executive summary and roadmap',
    category: 'business',
    slideCount: 4,
    theme: 'ocean',
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
    id: 'kpi-dashboard',
    name: 'Executive KPI Dashboard',
    description: 'Quarterly financial metrics, customer retention, and unit economics',
    category: 'business',
    slideCount: 3,
    theme: 'emerald',
    code: `presentation "Executive KPI & Growth Metrics"
theme "emerald"

slide "Executive Performance" layout="two-column"
text "Financial & Retention Benchmarks" bold=true size=18
bullet "Annual Recurring Revenue: $24.8M (+48% YoY)"
bullet "Net Revenue Retention: 124% across enterprise tier"
bullet "Customer Acquisition Cost payback within 7 months"
bullet "Gross Margin expanded from 72% to 79%"

slide "Customer Expansion Cohorts"
text "Enterprise expansion remains the primary driver of recurring revenue."
bullet "Average contract value increased by 31% year-over-year"
bullet "Multi-year enterprise commitments now represent 68% of bookings"
bullet "Zero churn recorded in the top 50 revenue accounts"

slide "Strategic Capital Allocation"
bullet "45% allocated to R&D and core platform scalability"
bullet "35% focused on international go-to-market expansion"
bullet "20% contingency reserve maintaining 24-month runway"`,
  },
  {
    id: 'architecture-brief',
    name: 'Architecture Modernization',
    description: 'Side-by-side legacy vs modern cloud architecture comparison',
    category: 'business',
    slideCount: 3,
    theme: 'modern',
    code: `presentation "Architecture Modernization"
theme "ocean"

slide "Architecture Comparison" layout="two-column"
text "Legacy Architecture Constraints:" bold=true
bullet "Single point of failure and monolithic coupling"
bullet "Deployment bottlenecks and brittle database schemas"
bullet "Manual operational scaling under unexpected peak load"
text "Modern Event-Driven Microservices:" bold=true
bullet "Scale-to-zero serverless functions with isolated state"
bullet "Sub-second cold start with strict type guarantees"
bullet "Automated CI/CD validation gates on every commit"

slide "Zero-Downtime Migration Strategy"
bullet "Phase 1: Dual-write to new streaming event bus"
bullet "Phase 2: Gradual traffic shaping via Canary routing"
bullet "Phase 3: Final legacy database decommissioning"

slide "Engineering Benchmarks"
bullet "99.99% system availability achieved across all regions"
bullet "P99 API response latency dropped from 420ms to 38ms"`,
  },
  {
    id: 'ai-healthcare',
    name: 'AI in Healthcare & Biotech',
    description: 'Medical diagnostics, drug discovery, and intelligent patient care',
    category: 'academic',
    slideCount: 3,
    theme: 'emerald',
    code: `presentation "AI in Healthcare"
theme "emerald"

slide "AI in Healthcare"
bullet "Medical diagnosis via computer vision & MRI scans"
bullet "Accelerated drug discovery & molecular docking"
bullet "Precision treatment & targeted oncology genomics"
bullet "Automated clinical workflows and emergency triage"

slide "Diagnostic Impact"
text "Deep convolutional networks now match board-certified radiologists on chest radiography."
bullet "Over 92% diagnostic agreement in early trial validation"
bullet "Turnaround time reduced from 4 hours to under 3 minutes"

slide "Regulatory & Ethical Safeguards"
bullet "HIPAA and GDPR-compliant local inference isolation"
bullet "Model interpretability maps generated for clinicians"
bullet "Continuous human-in-the-loop audit oversight"`,
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

