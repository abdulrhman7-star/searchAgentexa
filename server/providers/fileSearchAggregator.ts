import {
  FileProvider,
  FileQuery,
  FileResult,
  normalizeUrlForDedupe,
} from '../../lib/providers/file-provider';
import { ArchiveOrgProvider } from './archiveProvider';
import { GofileProvider } from './gofileProvider';
import {
  MediafireProvider,
  GoogleDriveProvider,
  DropboxProvider,
  MegaProvider,
  FourSharedProvider,
  OpenWebFileProvider,
} from './otherProviders';

export class FileProviderRegistry {
  private providers: FileProvider[] = [];

  constructor() {
    this.register(new ArchiveOrgProvider());
    this.register(new GofileProvider());
    this.register(new MediafireProvider());
    this.register(new GoogleDriveProvider());
    this.register(new DropboxProvider());
    this.register(new MegaProvider());
    this.register(new FourSharedProvider());
    this.register(new OpenWebFileProvider());
  }

  register(provider: FileProvider) {
    this.providers.push(provider);
  }

  getProviders(): FileProvider[] {
    return this.providers;
  }

  async searchAll(query: FileQuery): Promise<FileResult[]> {
    if (!query.query || !query.query.trim()) return [];

    // Filter providers that support this query
    const activeProviders = this.providers.filter((p) => p.supports(query));

    // Parallel search across all active providers
    const promises = activeProviders.map(async (provider) => {
      try {
        return await provider.search(query);
      } catch (err: any) {
        console.warn(`[FileProviderRegistry] ${provider.id} error:`, err.message);
        return [];
      }
    });

    const resultsByProvider = await Promise.allSettled(promises);
    const combined: FileResult[] = [];

    for (const res of resultsByProvider) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    }

    // 1. Deduplication by normalized URL
    const seen = new Set<string>();
    const deduplicated: FileResult[] = [];

    for (const item of combined) {
      const norm = normalizeUrlForDedupe(item.url || item.landingUrl);
      if (!seen.has(norm)) {
        seen.add(norm);
        deduplicated.push(item);
      }
    }

    // 2. Filter: File types (if specified)
    let filtered = deduplicated;
    if (query.fileTypes && query.fileTypes.length > 0) {
      const allowedExts = new Set(query.fileTypes.map((t) => t.toLowerCase()));
      filtered = filtered.filter((item) => {
        if (!item.ext) return true; // Keep if unknown
        return allowedExts.has(item.ext.toLowerCase());
      });
    }

    // 3. Filter: Size Range (minSizeMb, maxSizeMb)
    if (query.minSizeMb !== undefined && !isNaN(query.minSizeMb) && query.minSizeMb > 0) {
      const minBytes = query.minSizeMb * 1024 * 1024;
      filtered = filtered.filter((item) => item.sizeBytes === undefined || item.sizeBytes >= minBytes);
    }
    if (query.maxSizeMb !== undefined && !isNaN(query.maxSizeMb) && query.maxSizeMb > 0) {
      const maxBytes = query.maxSizeMb * 1024 * 1024;
      filtered = filtered.filter((item) => item.sizeBytes === undefined || item.sizeBytes <= maxBytes);
    }

    // 4. Filter: Date Added
    if (query.dateAdded && query.dateAdded !== 'any') {
      const now = Date.now();
      let threshold = 0;
      if (query.dateAdded === '24h') threshold = now - 24 * 60 * 60 * 1000;
      else if (query.dateAdded === 'week') threshold = now - 7 * 24 * 60 * 60 * 1000;
      else if (query.dateAdded === 'month') threshold = now - 30 * 24 * 60 * 60 * 1000;
      else if (query.dateAdded === 'year') threshold = now - 365 * 24 * 60 * 60 * 1000;
      else if (query.dateAdded === 'custom' && query.customStartDate) {
        threshold = new Date(query.customStartDate).getTime();
      }

      if (threshold > 0) {
        filtered = filtered.filter((item) => {
          if (!item.uploadedAt) return true;
          const uploadTime = new Date(item.uploadedAt).getTime();
          return !isNaN(uploadTime) && uploadTime >= threshold;
        });
      }
    }

    // 5. Filter: Language
    if (query.language && query.language !== 'any') {
      filtered = filtered.filter((item) => {
        if (!item.language || item.language === 'other') return true;
        return item.language === query.language;
      });
    }

    // 6. Filter: Safety (Hide flagged / copyright-risky results)
    if (query.hideFlagged !== false) {
      filtered = filtered.filter((item) => {
        return (item.safetyScore || 1) >= 0.65;
      });
    }

    // 7. Sort
    const sort = query.sort || 'relevance';
    const queryTokens = query.query.toLowerCase().split(/\s+/).filter(Boolean);

    filtered.sort((a, b) => {
      if (sort === 'newest') {
        const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return bTime - aTime;
      }
      if (sort === 'size') {
        return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      }
      if (sort === 'popularity') {
        return (b.popularity || 0) - (a.popularity || 0);
      }
      // Relevance default
      let aScore = a.safetyScore || 0.8;
      let bScore = b.safetyScore || 0.8;

      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      for (const tok of queryTokens) {
        if (aTitle.includes(tok)) aScore += 0.5;
        if (bTitle.includes(tok)) bScore += 0.5;
      }

      // Prioritize direct archive / gofile / gdrive / dropbox
      if (['archive', 'gdrive', 'dropbox'].includes(a.provider)) aScore += 0.2;
      if (['archive', 'gdrive', 'dropbox'].includes(b.provider)) bScore += 0.2;

      return bScore - aScore;
    });

    return filtered;
  }
}

export const globalFileRegistry = new FileProviderRegistry();
