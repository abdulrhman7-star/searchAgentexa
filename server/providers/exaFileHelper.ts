import axios from 'axios';
import {
  FileResult,
  generateStableId,
  normalizeUrlForDedupe,
  extractExtension,
  getMimeFromExtension,
  detectLanguage,
  FilePlatform,
} from '../../lib/providers/file-provider';

export async function searchExaFiles(params: {
  query: string;
  provider: FilePlatform;
  includeDomains?: string[];
  fileTypes?: string[];
  limit?: number;
  safetyBase?: number;
}): Promise<FileResult[]> {
  const exaKey = process.env.EXA_API_KEY || process.env.VITE_EXA_API_KEY;
  if (!exaKey) return [];

  try {
    let q = params.query.trim();
    if (params.fileTypes && params.fileTypes.length > 0) {
      q += ` (${params.fileTypes.join(' OR ')})`;
    }

    const payload: any = {
      query: q,
      numResults: Math.min(params.limit || 10, 20),
      useAutoprompt: true,
      type: 'neural',
      contents: {
        highlights: { numSentences: 1 },
        summary: true,
      },
    };

    if (params.includeDomains && params.includeDomains.length > 0) {
      payload.includeDomains = params.includeDomains;
    }

    const res = await axios.post('https://api.exa.ai/search', payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': exaKey,
      },
      timeout: 8000,
    });

    const items = res.data?.results;
    if (!Array.isArray(items)) return [];

    const results: FileResult[] = [];

    for (const item of items) {
      const itemUrl = item.url;
      const norm = normalizeUrlForDedupe(itemUrl);

      let ext = extractExtension(itemUrl) || extractExtension(item.title);
      if (!ext && params.fileTypes && params.fileTypes.length === 1) {
        ext = params.fileTypes[0].toLowerCase();
      }

      let directUrl = itemUrl;
      let landingUrl = itemUrl;

      // Platform specific URL transformations
      if (params.provider === 'gdrive') {
        const fileIdMatch = itemUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || itemUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
      } else if (params.provider === 'dropbox') {
        if (itemUrl.includes('dropbox.com')) {
          directUrl = itemUrl.replace(/[?&]dl=0/, '') + (itemUrl.includes('?') ? '&dl=1' : '?dl=1');
        }
      } else if (params.provider === 'gofile') {
        landingUrl = itemUrl;
        directUrl = itemUrl;
      }

      // Infer mime type
      const mime = getMimeFromExtension(ext);
      const title = (item.title || 'Untitled Document').replace(/\s*[-–|].*$/, '').trim();
      const lang = detectLanguage(title + ' ' + (item.summary || ''));

      // Safety heuristics
      let safetyScore = params.safetyBase || 0.88;
      const lowerExt = (ext || '').toLowerCase();
      if (['exe', 'apk', 'bat', 'cmd', 'scr', 'msi'].includes(lowerExt)) {
        safetyScore = Math.max(0.4, safetyScore - 0.25);
      } else if (['pdf', 'epub', 'docx', 'xlsx', 'txt', 'csv', 'json'].includes(lowerExt)) {
        safetyScore = Math.min(0.99, safetyScore + 0.08);
      }

      results.push({
        id: generateStableId(norm),
        title: title || item.title,
        url: directUrl,
        landingUrl: landingUrl,
        provider: params.provider,
        mime,
        ext: ext || 'pdf',
        uploadedAt: item.publishedDate || undefined,
        language: lang,
        safetyScore: Number(safetyScore.toFixed(2)),
        popularity: Math.floor(Math.random() * 50) + 10,
        raw: { highlights: item.highlights, summary: item.summary },
      });
    }

    return results;
  } catch (err: any) {
    console.warn(`[searchExaFiles:${params.provider}] Non-fatal error:`, err.message);
    return [];
  }
}
