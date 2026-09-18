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

export class ArchiveOrgProvider implements FileProvider {
  id = 'archive';
  label = 'Archive.org';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('archive');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    try {
      const trimmed = q.query.trim();
      if (!trimmed) return [];

      // Build Solr query for Archive.org
      let solrQuery = `(${trimmed.replace(/[^\w\s\u0600-\u06FF]/g, ' ')})`;

      // If specific file types are requested, enhance query
      if (q.fileTypes && q.fileTypes.length > 0) {
        const formats = q.fileTypes
          .map((ft) => {
            const upper = ft.toUpperCase();
            if (upper === 'PDF') return 'format:(PDF OR "Text PDF")';
            if (upper === 'EPUB') return 'format:EPUB';
            if (upper === 'ZIP') return 'format:ZIP';
            if (upper === 'MP3') return 'format:("VBR MP3" OR MP3)';
            if (upper === 'MP4') return 'format:("h.264" OR MP4)';
            if (upper === 'TORRENT') return 'format:"Archive BitTorrent"';
            return `format:*${upper}*`;
          })
          .join(' OR ');
        solrQuery += ` AND (${formats})`;
      }

      const rows = Math.min(q.limit || 20, 30);
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
        solrQuery
      )}&fl[]=identifier,title,description,mediatype,publicdate,downloads,item_size,format&sort[]=downloads+desc&output=json&rows=${rows}`;

      const response = await axios.get(url, {
        timeout: 7000,
        headers: {
          'User-Agent': 'AntigravitySearch/2.0 (Files & Documents Search; mailto:info@example.com)',
        },
      });

      const docs = response.data?.response?.docs;
      if (!Array.isArray(docs)) return [];

      const results: FileResult[] = docs.map((doc: any) => {
        const id = doc.identifier;
        const landingUrl = `https://archive.org/details/${id}`;
        const downloadUrl = `https://archive.org/download/${id}`;
        const normalized = normalizeUrlForDedupe(landingUrl);

        // Determine best extension from formats or mediatype
        let ext: string | undefined = undefined;
        let mime: string | undefined = undefined;

        if (Array.isArray(doc.format)) {
          const lowerFormats = doc.format.map((f: string) => f.toLowerCase());
          if (lowerFormats.some((f: string) => f.includes('pdf'))) ext = 'pdf';
          else if (lowerFormats.some((f: string) => f.includes('epub'))) ext = 'epub';
          else if (lowerFormats.some((f: string) => f.includes('zip'))) ext = 'zip';
          else if (lowerFormats.some((f: string) => f.includes('mp3'))) ext = 'mp3';
          else if (lowerFormats.some((f: string) => f.includes('mp4') || f.includes('h.264'))) ext = 'mp4';
          else if (lowerFormats.some((f: string) => f.includes('bittorrent'))) ext = 'torrent';
        }

        if (!ext && doc.mediatype) {
          if (doc.mediatype === 'texts') ext = 'pdf';
          else if (doc.mediatype === 'audio') ext = 'mp3';
          else if (doc.mediatype === 'movies') ext = 'mp4';
          else if (doc.mediatype === 'software') ext = 'iso';
        }

        if (ext) {
          mime = getMimeFromExtension(ext);
        }

        const title = doc.title || id.replace(/[-_]/g, ' ');
        const lang = detectLanguage(title + ' ' + (doc.description || ''));

        return {
          id: generateStableId(normalized),
          title: title,
          url: downloadUrl,
          landingUrl: landingUrl,
          provider: 'archive' as const,
          mime: mime || 'application/octet-stream',
          ext: ext || 'pdf',
          sizeBytes: doc.item_size ? Number(doc.item_size) : undefined,
          uploadedAt: doc.publicdate ? new Date(doc.publicdate).toISOString() : undefined,
          thumbnail: `https://archive.org/services/img/${id}`,
          language: lang,
          safetyScore: 0.98,
          popularity: doc.downloads ? Number(doc.downloads) : 0,
          raw: { mediatype: doc.mediatype, formats: doc.format },
        };
      });

      return results;
    } catch (err: any) {
      console.warn('[ArchiveOrgProvider] Search error:', err.message);
      return [];
    }
  }
}
