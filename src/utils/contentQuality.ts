/**
 * Content Quality Utility for Code2PPT
 *
 * Implements audience-appropriate phrasing, eliminates boilerplate jargon,
 * removes artificial filler instructions (e.g. "Must reach 100%"), and strips
 * hollow summaries while strictly preserving technical metrics, facts,
 * figures, warnings, and author intent.
 *
 * NOTE: Code2PPT is a compiler; content cleanup is NEVER applied silently.
 * It is only applied when explicitly requested by directive or user action.
 */

import { Presentation, Slide, SlideElement, TextElement, BulletElement } from '../models/presentation';

export interface QualityReport {
  hasChanges: boolean;
  removedFillerCount: number;
  refinedPreambleCount: number;
  emptySlidesRemoved: number;
  details: string[];
}

/**
 * Patterns matching hollow, artificial blanket instructions lacking context.
 * Does NOT match specific technical metrics like "100% accuracy & <50ms latency".
 */
const VAGUE_ARTIFICIAL_INSTRUCTIONS = [
  /^\s*(?:action\s*item\s*[:.-]\s*)?(?:must\s+)?reach\s+100%\s*$/i,
  /^\s*(?:action\s*item\s*[:.-]\s*)?(?:must\s+)?achieve\s+100%\s*$/i,
  /^\s*(?:must\s+)?ensure\s+(?:full\s+)?completion\s*(?:at\s+100%)?\s*$/i,
  /^\s*(?:must\s+)?ensure\s+100%\s+completion\s*$/i,
  /^\s*100%\s+completion\s+(?:is\s+)?(?:mandatory|required|expected)\s*$/i,
  /^\s*all\s+(?:tasks|items|deliverables)\s+must\s+reach\s+100%\s*$/i,
  /^\s*(?:must\s+)?ensure\s+full\s+compliance\s+without\s+exception\s*$/i,
  /^\s*guarantee\s+100%\s+(?:completion|success)\s*$/i,
  /^\s*target\s*[:.-]\s*100%\s*$/i,
];

/**
 * Patterns matching hollow concluding/introductory boilerplate designed solely to fill space.
 */
const GENERIC_FILLER_CONTENT = [
  /^\s*in\s+conclusion[,\s]+this\s+concludes\s+the\s+presentation\.?\s*$/i,
  /^\s*this\s+concludes\s+(?:our|the)\s+presentation\.?\s*$/i,
  /^\s*summary\s+of\s+(?:the\s+)?above\s+(?:points|slides|information)\.?\s*$/i,
  /^\s*key\s+takeaway\s*[:.-]\s*(?:to\s+be\s+determined|tbd|none|n\/a)\.?\s*$/i,
  /^\s*generic\s+(?:takeaway|summary|conclusion)\s*[:.-]?\s*.*$/i,
  /^\s*placeholder\s+(?:text|content|bullet|notes)\s*$/i,
  /^\s*lorem\s+ipsum.*$/i,
];

/**
 * Preamble fillers that add cognitive noise before actual factual statements.
 * We refine these to their direct, punchy core statement while preserving facts.
 */
const PREAMBLE_REFINEMENTS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /^\s*It\s+is\s+important\s+to\s+(?:remember|note|recognize)\s+that\s+/i, replacement: '' },
  { regex: /^\s*Needless\s+to\s+say,\s+/i, replacement: '' },
  { regex: /^\s*As\s+mentioned\s+(?:earlier|previously|above),\s+/i, replacement: '' },
  { regex: /^\s*In\s+order\s+to\s+/i, replacement: 'To ' },
  { regex: /^\s*Please\s+note\s+that\s+with\s+respect\s+to\s+/i, replacement: 'Regarding ' },
  { regex: /^\s*At\s+this\s+point\s+in\s+time,\s+/i, replacement: 'Currently, ' },
  { regex: /^\s*Due\s+to\s+the\s+fact\s+that\s+/i, replacement: 'Because ' },
  { regex: /^\s*For\s+the\s+purpose\s+of\s+/i, replacement: 'For ' },
];

/**
 * Checks if a string is a vague, artificial filler instruction.
 */
export function isArtificialFiller(text: string): boolean {
  const trimmed = text.trim();
  for (const pattern of VAGUE_ARTIFICIAL_INSTRUCTIONS) {
    if (pattern.test(trimmed)) return true;
  }
  for (const pattern of GENERIC_FILLER_CONTENT) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Refines wordy preambles into concise, natural wording while preserving all facts.
 */
export function refineContentPreamble(text: string): string {
  let result = text.trim();
  for (const { regex, replacement } of PREAMBLE_REFINEMENTS) {
    if (regex.test(result)) {
      result = result.replace(regex, replacement).trim();
      // Capitalize first character if needed
      if (result.length > 0 && replacement === '') {
        result = result.charAt(0).toUpperCase() + result.slice(1);
      }
    }
  }
  return result;
}

/**
 * Detects whether cleanup was explicitly requested in the input text via directives.
 */
export function isQualityCleanRequested(rawText: string): boolean {
  if (!rawText) return false;
  return (
    /^(?:#|--|\/\/)?\s*(?:clean|cleanup|quality_clean)\s*(?:[:=]\s*(?:true|on|yes|1))?$/im.test(rawText) ||
    /^\s*options?\s+.*clean(?:_content)?\s*=\s*(?:true|1)/im.test(rawText) ||
    /^\s*directive\s+clean/im.test(rawText)
  );
}

/**
 * Cleans presentation code (Code2PPT DSL or Simple Text), returning the refined text and report.
 */
export function cleanPresentationText(
  rawText: string,
  mode: 'code' | 'simple' = 'code'
): { cleanedText: string; report: QualityReport } {
  const report: QualityReport = {
    hasChanges: false,
    removedFillerCount: 0,
    refinedPreambleCount: 0,
    emptySlidesRemoved: 0,
    details: [],
  };

  const lines = rawText.split(/\r?\n/);
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Preserve blank lines
    if (!trimmed) {
      cleanedLines.push(line);
      continue;
    }

    // Preserve directive lines themselves
    if (/^\s*(?:presentation|theme|layout|transition|# clean|clean:)\b/i.test(trimmed)) {
      cleanedLines.push(line);
      continue;
    }

    // Extract element content from Code2PPT DSL or Simple Text
    let elementKind = 'text';
    let content = trimmed;
    let prefix = '';

    if (mode === 'code') {
      const match = trimmed.match(/^(text|bullet|quote|subtitle)\s+"(.*)"$/);
      if (match) {
        elementKind = match[1];
        content = match[2];
        prefix = `${elementKind} "`;
      }
    } else {
      // Simple Text
      const bulletMatch = trimmed.match(/^([-•*]|\d+[.)])\s+(.*)$/);
      if (bulletMatch) {
        elementKind = 'bullet';
        prefix = `${bulletMatch[1]} `;
        content = bulletMatch[2];
      }
    }

    // Check for artificial filler / vague statements
    if (isArtificialFiller(content)) {
      report.hasChanges = true;
      report.removedFillerCount++;
      report.details.push(`Removed artificial filler: "${content}"`);
      continue; // Drop line
    }

    // Refine preamble
    const refined = refineContentPreamble(content);
    if (refined !== content) {
      report.hasChanges = true;
      report.refinedPreambleCount++;
      report.details.push(`Refined concise phrasing: "${content}" -> "${refined}"`);
      if (mode === 'code' && prefix) {
        cleanedLines.push(`${elementKind} "${refined}"`);
      } else if (mode === 'simple' && prefix) {
        cleanedLines.push(`${prefix}${refined}`);
      } else {
        cleanedLines.push(refined);
      }
    } else {
      cleanedLines.push(line);
    }
  }

  // Remove empty summary/conclusion slides if all their elements were dropped as hollow fillers
  const cleanedText = cleanedLines.join('\n');
  return { cleanedText, report };
}

/**
 * Applies content quality refinements to a typed Presentation Model directly.
 */
export function cleanPresentationModel(
  presentation: Presentation
): { presentation: Presentation; report: QualityReport } {
  const report: QualityReport = {
    hasChanges: false,
    removedFillerCount: 0,
    refinedPreambleCount: 0,
    emptySlidesRemoved: 0,
    details: [],
  };

  const refinedSlides: Slide[] = [];

  for (const slide of presentation.slides) {
    const validElements: SlideElement[] = [];

    for (const el of slide.elements) {
      if (el.type === 'text' || el.type === 'bullet') {
        const textEl = el as TextElement | BulletElement;
        if (isArtificialFiller(textEl.content)) {
          report.hasChanges = true;
          report.removedFillerCount++;
          report.details.push(`Removed filler in slide "${slide.title}": "${textEl.content}"`);
          continue;
        }

        const refined = refineContentPreamble(textEl.content);
        if (refined !== textEl.content) {
          report.hasChanges = true;
          report.refinedPreambleCount++;
          report.details.push(`Refined phrasing in slide "${slide.title}": "${textEl.content}" -> "${refined}"`);
          validElements.push({
            ...textEl,
            content: refined,
          });
          continue;
        }
      }

      validElements.push(el);
    }

    // Check if the slide was a generic placeholder summary slide that now has no elements
    const isGenericSummarySlide = /^(?:summary|conclusion|key takeaways|wrap-up|closing remarks)$/i.test(
      slide.title.trim()
    );
    if (isGenericSummarySlide && validElements.length === 0 && slide.elements.length > 0) {
      report.hasChanges = true;
      report.emptySlidesRemoved++;
      report.details.push(`Removed hollow summary slide: "${slide.title}"`);
      continue;
    }

    refinedSlides.push({
      ...slide,
      elements: validElements,
    });
  }

  // Re-index slides
  const reindexed = refinedSlides.map((s, idx) => ({ ...s, index: idx }));

  return {
    presentation: {
      ...presentation,
      slides: reindexed,
    },
    report,
  };
}
