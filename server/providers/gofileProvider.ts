import axios from 'axios';
import {
  FileProvider,
  FileQuery,
  FileResult,
  generateStableId,
  normalizeUrlForDedupe,
  extractExtension,
  getMimeFromExtension,
  detectLanguage,
} from '../../lib/providers/file-provider';
import { searchExaFiles } from './exaFileHelper';

export class GofileProvider implements FileProvider {
  id = 'gofile';
  label = 'Gofile';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('gofile');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    const results: FileResult[] = [];
    const token = process.env.GOFILE_API_TOKEN;
    const folderId = process.env.GOFILE_FOLDER_ID;

    // 1. Direct Gofile API search if token + folder configured
    if (token && folderId) {
      try {
        const searchUrl = `https://api.gofile.io/contents/search?contentId=${encodeURIComponent(
          folderId
        )}&searchedString=${encodeURIComponent(q.query.trim())}`;
        const res = await axios.get(searchUrl, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        });
        if (res.data?.status === 'ok' && res.data?.data) {
          const items = Object.values(res.data.data) as any[];
          for (const item of items) {
            const shareCode = item.code || item.id;
            const dl = item.directLink || item.downloadPage || (shareCode ? `https://gofile.io/d/${shareCode}` : '');
            const landing = shareCode ? `https://gofile.io/d/${shareCode}` : dl;
            const norm = normalizeUrlForDedupe(landing || dl);
            const ext = extractExtension(item.name || '') || (item.mimetype?.includes('pdf') ? 'pdf' : undefined);

            results.push({
              id: generateStableId(norm),
              title: item.name || 'Gofile Shared File',
              url: dl,
              landingUrl: landing,
              provider: 'gofile',
              mime: item.mimetype || getMimeFromExtension(ext),
              ext: ext || 'zip',
              sizeBytes: item.size || undefined,
              uploadedAt: item.createTime ? new Date(item.createTime * 1000).toISOString() : undefined,
              language: detectLanguage(item.name),
              safetyScore: 0.90,
              popularity: item.downloadCount || 10,
            });
          }
        }
      } catch (err: any) {
        console.warn('[GofileProvider] Direct search non-fatal error:', err.message);
      }
    }

    // 2. Fallback / Public web search via Exa for indexed gofile.io files
    if (results.length === 0) {
      const exaItems = await searchExaFiles({
        query: q.query,
        provider: 'gofile',
        includeDomains: ['gofile.io'],
        fileTypes: q.fileTypes,
        limit: q.limit || 12,
        safetyBase: 0.88,
      });
      results.push(...exaItems);
    }

    return results;
  }
}
