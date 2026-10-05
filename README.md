https://shubhams2004.github.io/Text2ppt/
# Code2PPT

> Text2PPT is the newer version of Code2PPT — transform simple text into beautiful, editable PowerPoint presentations.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Status](https://img.shields.io/badge/status-active%20development-blue.svg)]()

## 🎯 What is Code2PPT?

Code2PPT is the original project that pioneered simple text-to-presentation conversion. **Text2PPT is its newer version**, continuing the same mission with a cleaner focus and improved workflow.

Paste your content, get an editable `.pptx` file—no design skills required.

**Perfect for:**
- 📊 Quick presentation drafts
- 🤖 AI-generated content → slides
- 📝 Documentation → presentations
- 🔄 Batch presentation generation

## ✨ Features

| Feature | Status |
|---------|--------|
| Simple text → PPTX | 🔜 Coming Next |
| 7 professional layouts | ✅ |
| Text wrapping & overflow handling | ✅ |
| Editable PowerPoint output | ✅ |
| Batch import (20+ presentations) | 📋 Planned |
| Images, shapes, tables, charts | 📋 Planned |
| Design themes | 📋 Planned |
| Markdown/JSON/CSV input | 📋 Planned |
| AI workflow integration | 📋 Planned |

## 🗺️ Roadmap

### Phase 1 ✅ Foundation
- [x] Parser
- [x] Presentation model
- [x] Basic PPTX generation

### Phase 2 ✅ Layout Engine
- [x] Positioning
- [x] Text wrapping
- [x] Fit/overflow handling

### Phase 3 ✅ Slide Layouts
- [x] 7 layout types
- [x] Preview + PPTX renderer

### Phase 4 🔜 Simple Text → PPT *(Next)*
- [ ] Paste simple text input
- [ ] Parse structure (titles, bullets, sections)
- [ ] Generate structured slides
- [ ] Export editable `.pptx`

**Example input:**
```text
Title: AI in Healthcare

Applications

· Medical diagnosis
· Drug discovery
· Patient monitoring

Benefits

· Faster analysis
· Better decision support

use this prompt in AI model to extract text to paste in text2ppt editor.

You are an expert content strategist specializing in converting raw documentation, articles, and notes into structured presentation inputs for Code2PPT / Text2PPT.

Your goal is to digest the source material provided below and output properly formatted Code2PPT text blocks following strict presentation design rules.

### RULES FOR SLIDE GENERATION
1. **Slide Title Mandatory:** Provide a concise, logical, and descriptive title for EVERY single slide.
2. **No Paragraphs:** Never output full paragraphs on slides. Translate all prose into brief, actionable bullet points.
3. **Bullet Limits:** Keep each slide to a MAXIMUM of 4–6 bullets.
4. **Conciseness:** Keep bullet points short, high-impact, and easy to read at a glance.
5. **Information Preservation:** Maintain key details, data points, and facts from the source text—do not strip essential meaning.
6. **No Hallucinations:** Use ONLY information present in the source material. Do NOT invent, assume, or add outside details.
7. **Multi-Slide Splitting:** If a topic or section is long, automatically break it across multiple distinct slides (e.g., "Market Trends (1/2)" and "Market Trends (2/2)", or split by sub-themes).
8. **Multi-Presentation Handling:** When a completely new major topic, module, or distinct section begins, start a brand-new presentation block.
9. **Self-Contained Presentations:** Ensure each generated presentation has its own clear Title slide and stands completely on its own.

---

### OUTPUT FORMAT REQUIREMENTS
Format your entire output using the exact simple text structure required by Code2PPT:

Title: [Main Presentation Title]

[Slide Title 1]

· [Bullet point 1]
· [Bullet point 2]
· [Bullet point 3]

[Slide Title 2]

· [Bullet point 1]
· [Bullet point 2]

---

### SOURCE TEXT
[PASTE YOUR SOURCE TEXT HERE]

