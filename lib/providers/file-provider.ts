// lib/providers/file-provider.ts

export type FilePlatform =
  | 'archive'
  | 'gofile'
  | 'mediafire'
  | 'gdrive'
  | 'dropbox'
  | 'mega'
  | '4shared'
  | 'web';

export interface FileResult {
  id: string;                 // stable hash of normalized URL
  title: string;              // file name
  url: string;                // direct download URL if possible
  landingUrl: string;         // page on the host
  provider: FilePlatform;
  mime?: string;
  ext?: string;
  sizeBytes?: number;
  uploadedAt?: string;        // ISO date
  thumbnail?: string;
  language?: string;
  safetyScore?: number;       // 0..1 (1 = safest)
  popularity?: number;
  raw?: unknown;
}

export interface FileQuery {
  query: string;
  platforms?: FilePlatform[];
  fileTypes?: string[];       // e.g. ['pdf', 'docx', 'zip']
  minSizeMb?: number;
  maxSizeMb?: number;
  dateAdded?: 'any' | '24h' | 'week' | 'month' | 'year' | 'custom' | string;
  customStartDate?: string;
  customEndDate?: string;
  language?: 'any' | 'en' | 'ar';
  hideFlagged?: boolean;
  sort?: 'relevance' | 'newest' | 'size' | 'popularity';
  limit?: number;
}

export interface FileProvider {
  id: string;
  label: string;
  supports(q: FileQuery): boolean;
  search(q: FileQuery): Promise<FileResult[]>;
}

/**
 * Format bytes into human readable string (KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return 'Unknown size';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Normalizes URL for deduplication
 */
export function normalizeUrlForDedupe(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    let cleaned = parsed.toString().replace(/\/$/, '');
    return cleaned.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

/**
 * Generate stable hash id from a string
 */
export function generateStableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `file_${Math.abs(hash).toString(36)}`;
}

/**
 * Extract file extension from URL or filename
 */
export function extractExtension(nameOrUrl: string): string | undefined {
  if (!nameOrUrl) return undefined;
  const clean = nameOrUrl.split('?')[0].split('#')[0];
  const parts = clean.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase();
    if (ext && ext.length <= 8 && /^[a-z0-9]+$/i.test(ext)) {
      return ext;
    }
  }
  return undefined;
}

/**
 * Inferred MIME type from extension
 */
export function getMimeFromExtension(ext?: string): string {
  if (!ext) return 'application/octet-stream';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    epub: 'application/epub+zip',
    txt: 'text/plain',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar.gz': 'application/gzip',
    iso: 'application/x-iso9660-image',
    dmg: 'application/x-apple-diskimage',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    apk: 'application/vnd.android.package-archive',
    exe: 'application/x-msdownload',
    msi: 'application/x-msi',
    deb: 'application/vnd.debian.binary-package',
    rpm: 'application/x-rpm',
    torrent: 'application/x-bittorrent',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Detects whether text is primarily Arabic or English
 */
export function detectLanguage(text?: string): 'ar' | 'en' | 'other' {
  if (!text) return 'other';
  const arabicRegex = /[\u0600-\u06FF]/;
  if (arabicRegex.test(text)) return 'ar';
  if (/[a-zA-Z]/.test(text)) return 'en';
  return 'other';
}
