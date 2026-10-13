import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * Generates an elegant procedural SVG presentation background based on prompt keywords and aspect ratio
 */
function generateProceduralGraphic(prompt: string, aspectRatio: string = '16:9', style: string = 'abstract'): string {
  const is169 = aspectRatio === '16:9';
  const is11 = aspectRatio === '1:1';
  const width = is169 ? 1920 : is11 ? 1200 : 1600;
  const height = is169 ? 1080 : 1200;

  const lower = prompt.toLowerCase();

  // Palette selection based on prompt
  let c1 = '#0f172a'; // dark slate
  let c2 = '#1e1b4b'; // deep indigo
  let c3 = '#312e81'; // vibrant indigo
  let accent1 = '#6366f1';
  let accent2 = '#a855f7';

  if (lower.includes('sunset') || lower.includes('warm') || lower.includes('orange') || lower.includes('gold')) {
    c1 = '#1c1917';
    c2 = '#431407';
    c3 = '#7c2d12';
    accent1 = '#f97316';
    accent2 = '#fbbf24';
  } else if (lower.includes('cyber') || lower.includes('neon') || lower.includes('tech') || lower.includes('futuristic')) {
    c1 = '#030712';
    c2 = '#082f49';
    c3 = '#172554';
    accent1 = '#06b6d4';
    accent2 = '#3b82f6';
  } else if (lower.includes('nature') || lower.includes('green') || lower.includes('forest') || lower.includes('emerald')) {
    c1 = '#052e16';
    c2 = '#064e3b';
    c3 = '#065f46';
    accent1 = '#10b981';
    accent2 = '#34d399';
  } else if (lower.includes('minimal') || lower.includes('white') || lower.includes('light') || lower.includes('clean')) {
    c1 = '#f8fafc';
    c2 = '#f1f5f9';
    c3 = '#e2e8f0';
    accent1 = '#64748b';
    accent2 = '#94a3b8';
  }

  const isLight = lower.includes('minimal') || lower.includes('white') || lower.includes('light') || lower.includes('clean');
  const textColor = isLight ? '#334155' : '#f8fafc';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${accent1}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${accent1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="75%" cy="75%" r="65%">
      <stop offset="0%" stop-color="${accent2}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${accent2}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${accent1}" stroke-opacity="0.07" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Base Gradient Background -->
  <rect width="100%" height="100%" fill="url(#mainBg)"/>

  <!-- Grid overlay for tech / geometric feel -->
  <rect width="100%" height="100%" fill="url(#gridPattern)"/>

  <!-- Ambient Light Orbs -->
  <circle cx="${width * 0.25}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.45}" fill="url(#glow1)"/>
  <circle cx="${width * 0.78}" cy="${height * 0.65}" r="${Math.min(width, height) * 0.5}" fill="url(#glow2)"/>

  <!-- Fluid Decorative Curves -->
  <path d="M -100 ${height * 0.8} Q ${width * 0.3} ${height * 0.4} ${width * 0.6} ${height * 0.7} T ${width + 100} ${height * 0.3}"
        fill="none" stroke="${accent1}" stroke-opacity="0.25" stroke-width="3" />
  <path d="M -100 ${height * 0.85} Q ${width * 0.35} ${height * 0.45} ${width * 0.65} ${height * 0.75} T ${width + 100} ${height * 0.35}"
        fill="none" stroke="${accent2}" stroke-opacity="0.2" stroke-width="2" />

  <!-- Subtle Minimal Geometric Accent -->
  <g opacity="0.15" stroke="${accent1}" fill="none" stroke-width="1.5">
    <polygon points="${width * 0.82},${height * 0.18} ${width * 0.88},${height * 0.28} ${width * 0.76},${height * 0.28}" />
    <circle cx="${width * 0.15}" cy="${height * 0.82}" r="32" />
    <rect x="${width * 0.85}" y="${height * 0.78}" width="40" height="40" rx="8" transform="rotate(25 ${width * 0.85 + 20} ${height * 0.78 + 20})" />
  </g>
</svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * POST /api/generate-image
 * Generates an image using Gemini 3.1 Flash Lite Image model, with intelligent fallback
 */
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '16:9', type = 'background', style = 'modern abstract' } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const trimmedPrompt = prompt.trim();
    const enrichedPrompt = `${trimmedPrompt}, ${style} style, suitable for presentation slide ${type}, high resolution, clean presentation graphics, no watermarks, no distorted artifacts`;

    let generatedImageUrl: string | null = null;
    let isProcedural = false;

    // Try Gemini image model if API key is provided
    if (process.env.GEMINI_API_KEY) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: enrichedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio === '1:1' ? '1:1' : aspectRatio === '4:3' ? '4:3' : '16:9',
            },
          },
        });

        // Search candidate parts for inlineData
        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (generatedImageUrl) break;
        }
      } catch (_geminiError: any) {
        // When running on free tier without image generation quota or before paid key selection,
        // seamlessly fall back to high-res procedural presentation graphic without polluting stderr
      }
    }

    // If Gemini image was not returned (quota/plan limit or key unconfigured), generate procedural image
    if (!generatedImageUrl) {
      isProcedural = true;
      generatedImageUrl = generateProceduralGraphic(trimmedPrompt, aspectRatio, style);
    }

    return res.json({
      success: true,
      imageUrl: generatedImageUrl,
      isProcedural,
      prompt: trimmedPrompt,
      aspectRatio,
      type,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      error: 'Failed to generate image',
      details: error?.message || 'Internal server error',
    });
  }
});

// Mount Vite middleware or static files
async function startServer() {
  if (isProd) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Code2PPT Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
