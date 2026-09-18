import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { MediaResult } from './server/mediaExtractor';

let isOpenAiDisabledDueToQuota = false;
let lastOpenAiQuotaErrorTime = 0;
let isGeminiDisabledDueToQuota = false;
let lastGeminiQuotaErrorTime = 0;
let isGeminiKeyInvalid = false;

/**
 * Generates a smart AI answer using Gemini 3.8 Flash or OpenAI's gpt-4o-mini,
 * with graceful fallback to structured search synthesis.
 */
export async function generateSmartAnswer(query: string, results: MediaResult[]): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const contextSnippets = results
    .slice(0, 8)
    .map(
      (r, index) =>
        `[Source ${index + 1}]
Title: ${r.title}
URL: ${r.url}
Summary: ${r.summary || 'N/A'}
Highlights: ${r.highlights && r.highlights.length > 0 ? r.highlights.join(' ') : 'N/A'}`
    )
    .join('\n\n');

  // 1. Try Gemini 3.8 Flash first if key is present, valid, and not quota-blocked
  const isGeminiCooldownOver = Date.now() - lastGeminiQuotaErrorTime > 15 * 60 * 1000;
  if (isGeminiCooldownOver) {
    isGeminiDisabledDueToQuota = false;
  }

  if (geminiKey && !isGeminiDisabledDueToQuota && !isGeminiKeyInvalid) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const geminiPrompt = `Synthesize a comprehensive, direct, and factual AI answer for the user search query: "${query}".
Context from search results:
${contextSnippets}

Format your response as a clear markdown summary followed by 3-4 key takeaway bullet points. Include Markdown citations with source URLs.`;

      const geminiRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: geminiPrompt,
      });

      if (geminiRes.text) {
        return geminiRes.text;
      }
    } catch (geminiErr: any) {
      const errMsg = typeof geminiErr === 'string' ? geminiErr : geminiErr?.message || JSON.stringify(geminiErr || {});
      
      if (
        errMsg.includes('leaked') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('403') ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('not valid')
      ) {
        isGeminiKeyInvalid = true;
        console.info('[AI Synthesizer] Gemini API key is inactive or restricted. Gracefully switching to secondary synthesis.');
      } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        isGeminiDisabledDueToQuota = true;
        lastGeminiQuotaErrorTime = Date.now();
        console.info('[AI Synthesizer] Gemini API quota reached. Gracefully switching to secondary synthesis.');
      } else {
        console.info('[AI Synthesizer] Gemini synthesis unavailable; proceeding with search result synthesis.');
      }
    }
  }

  // 2. Try OpenAI if key is present and not currently quota-blocked (reset after 15 mins)
  const isCooldownOver = Date.now() - lastOpenAiQuotaErrorTime > 15 * 60 * 1000;
  if (isCooldownOver) {
    isOpenAiDisabledDueToQuota = false;
  }

  if (openAiKey && !isOpenAiDisabledDueToQuota) {
    try {
      const openai = new OpenAI({ apiKey: openAiKey });

      const systemPrompt = `You are an intelligent search assistant. Your task is to analyze the provided search results and synthesize a concise, factual, and direct answer to the user's query. Always cite key sources using Markdown links like [Source Title](URL).`;

      const userPrompt = `Query: "${query}"

Search Results:
${contextSnippets}

Synthesize a helpful, well-structured answer with source citations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      });

      if (completion.choices[0]?.message?.content) {
        return completion.choices[0].message.content;
      }
    } catch (error: any) {
      if (error?.status === 429 || error?.code === 'insufficient_quota' || error?.message?.includes('quota')) {
        isOpenAiDisabledDueToQuota = true;
        lastOpenAiQuotaErrorTime = Date.now();
      }
    }
  }

  // 3. Robust local synthesis fallback from Exa summaries & highlights
  if (!results || results.length === 0) {
    return `No relevant search results found for **"${query}"**.`;
  }

  const topResults = results.slice(0, 5);
  const summaryBullets = topResults
    .map((r) => {
      const textSnippet =
        r.summary ||
        (r.highlights && r.highlights.length > 0 ? r.highlights.join(' ') : 'Extracted relevant content.');
      return `- **[${r.title}](${r.url})**: ${textSnippet}`;
    })
    .join('\n');

  return `### Key Synthesized Insights for "${query}"\n\n${summaryBullets}`;
}

/**
 * Generates an AI summary specifically for visual image-based search results
 */
export async function generateImageSearchAnswer(
  vision: {
    description: string;
    entities: string[];
    ocr: string[];
    colors: { hex: string; name: string }[];
    keywords: string[];
  },
  results: MediaResult[]
): Promise<string> {
  const topSources = results.slice(0, 5);
  const entitiesList = vision.entities.length > 0 ? vision.entities.join(', ') : 'Central Subject';
  const colorList = vision.colors.slice(0, 3).map((c) => `${c.name} (${c.hex})`).join(', ');

  const resultBullets = topSources
    .map((r) => {
      const snippet = r.summary || (r.highlights && r.highlights[0]) || 'Matched via visual query similarity.';
      return `- **[${r.title}](${r.url})**: ${snippet}`;
    })
    .join('\n');

  return `### 👁️ AI Visual Search & Semantic Matching

**Visual Identification**: ${vision.description}

- **Recognized Entities & Products**: ${entitiesList}
${vision.ocr.length > 0 ? `- **Detected Text (OCR)**: "${vision.ocr.join('", "')}"\n` : ''}- **Dominant Palette**: ${colorList}
- **Keywords**: ${vision.keywords.slice(0, 6).join(', ')}

#### Top Matched Web & Media Sources:
${resultBullets}`;
}

