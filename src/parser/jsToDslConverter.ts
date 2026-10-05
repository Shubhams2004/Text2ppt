/**
 * Detects if the input code is raw JavaScript/TypeScript (specifically PptxGenJS code)
 */
export function isJavaScriptOrPptxCode(code: string): boolean {
  const indicators = [
    /import\s+.*pptxgen/i,
    /require\(.*pptxgen.*\)/i,
    /new\s+pptxgen/i,
    /\.addSlide\s*\(/i,
    /\.addText\s*\(/i,
    /\.writeFile\s*\(/i,
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /await\s+\w+\.write/i,
  ];

  let matches = 0;
  for (const regex of indicators) {
    if (regex.test(code)) {
      matches++;
    }
  }

  return matches >= 2;
}

interface ParsedSlideData {
  title?: string;
  items: Array<{ type: 'bullet' | 'text' | 'subtitle'; content: string }>;
}

/**
 * Converts PptxGenJS JavaScript/TypeScript code into Code2PPT DSL syntax
 */
export function convertPptxJsToDsl(jsCode: string): string {
  // 1. Extract presentation title if available
  let presentationTitle = '';

  const fileNameMatch = jsCode.match(/fileName\s*:\s*["']([^"']+)["']/i);
  if (fileNameMatch) {
    presentationTitle = fileNameMatch[1]
      .replace(/\.pptx$/i, '')
      .replace(/[-_]/g, ' ')
      .trim();
  }

  // 2. Extract slides and text items
  // Break into slides or collect all slide.addText calls
  const slides: ParsedSlideData[] = [];
  let currentSlide: ParsedSlideData | null = null;

  // Split lines or tokens
  const lines = jsCode.split('\n');

  // Regex to detect addSlide
  const addSlideRegex = /\.addSlide\s*\(/i;

  // Regex to extract addText("string", { ... }) or addText('string')
  const addTextRegex = /\.addText\s*\(\s*(["'`])((?:\\.|[^\\])*?)\1(?:\s*,\s*(\{[\s\S]*?\}))?\s*\)/;

  // Also check if addText is multiline
  // Let's also do a global regex search across full text for addText calls
  const fullText = jsCode;
  const slideBlocks = fullText.split(/\.addSlide\s*\(\s*\)/i);

  if (slideBlocks.length > 1) {
    // Process each slide block after the first addSlide
    for (let i = 1; i < slideBlocks.length; i++) {
      const block = slideBlocks[i];
      const slideData: ParsedSlideData = { items: [] };

      // Find all addText calls in this slide
      // Match .addText("string", options)
      const textMatches = block.matchAll(/\.addText\s*\(\s*(["'`])((?:\\.|[^\\])*?)\1(?:\s*,\s*(\{[\s\S]*?\}))?\s*\)/g);

      let foundSlideTitle = false;

      for (const match of textMatches) {
        const textContent = match[2].trim();
        const optionsRaw = match[3] || '';

        // Check if options indicate a title (e.g. fontSize >= 24 or bold: true or y < 1.2)
        const isBold = /bold\s*:\s*true/i.test(optionsRaw);
        const fontSizeMatch = optionsRaw.match(/fontSize\s*:\s*(\d+)/i);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 18;
        const isBullet = /bullet\s*:\s*true/i.test(optionsRaw);

        if (!foundSlideTitle && (isBold || fontSize >= 24 || !slideData.title)) {
          slideData.title = textContent;
          foundSlideTitle = true;
          if (!presentationTitle) {
            presentationTitle = textContent;
          }
        } else {
          // If bullet: true, or if it's item text
          const itemType = isBullet || fontSize <= 20 ? 'bullet' : 'text';
          slideData.items.push({
            type: itemType,
            content: textContent,
          });
        }
      }

      if (!slideData.title) {
        slideData.title = `Slide ${i}`;
      }

      slides.push(slideData);
    }
  } else {
    // Fallback: search lines
    let activeSlide: ParsedSlideData = { items: [] };

    for (const line of lines) {
      if (addSlideRegex.test(line)) {
        if (activeSlide.title || activeSlide.items.length > 0) {
          slides.push(activeSlide);
          activeSlide = { items: [] };
        }
      }

      const match = line.match(addTextRegex);
      if (match) {
        const text = match[2].trim();
        const opts = match[3] || '';
        const isBold = /bold\s*:\s*true/i.test(opts);
        const fontSizeMatch = opts.match(/fontSize\s*:\s*(\d+)/i);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 18;
        const isBullet = /bullet\s*:\s*true/i.test(opts);

        if (!activeSlide.title && (isBold || fontSize >= 24)) {
          activeSlide.title = text;
          if (!presentationTitle) presentationTitle = text;
        } else {
          activeSlide.items.push({
            type: isBullet || fontSize <= 20 ? 'bullet' : 'text',
            content: text,
          });
        }
      }
    }

    if (activeSlide.title || activeSlide.items.length > 0) {
      slides.push(activeSlide);
    }
  }

  // Format into Code2PPT DSL
  const outputLines: string[] = [];

  const finalPresTitle = presentationTitle || 'My Presentation';
  outputLines.push(`presentation "${finalPresTitle}"\n`);

  if (slides.length === 0) {
    outputLines.push(`slide "${finalPresTitle}"`);
    outputLines.push(`text "Converted presentation"`);
  } else {
    slides.forEach((s, idx) => {
      const title = s.title || `Slide ${idx + 1}`;
      outputLines.push(`slide "${title}"`);
      s.items.forEach((item) => {
        outputLines.push(`${item.type} "${item.content}"`);
      });
      outputLines.push('');
    });
  }

  return outputLines.join('\n').trim();
}
