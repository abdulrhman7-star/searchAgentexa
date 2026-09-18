import {
  FileProvider,
  FileQuery,
  FileResult,
} from '../../lib/providers/file-provider';
import { searchExaFiles } from './exaFileHelper';

export class MediafireProvider implements FileProvider {
  id = 'mediafire';
  label = 'MediaFire';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('mediafire');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    return searchExaFiles({
      query: q.query,
      provider: 'mediafire',
      includeDomains: ['mediafire.com'],
      fileTypes: q.fileTypes,
      limit: q.limit || 10,
      safetyBase: 0.86,
    });
  }
}

export class GoogleDriveProvider implements FileProvider {
  id = 'gdrive';
  label = 'Google Drive (public)';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('gdrive');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    return searchExaFiles({
      query: q.query,
      provider: 'gdrive',
      includeDomains: ['drive.google.com', 'docs.google.com'],
      fileTypes: q.fileTypes,
      limit: q.limit || 10,
      safetyBase: 0.95,
    });
  }
}

export class DropboxProvider implements FileProvider {
  id = 'dropbox';
  label = 'Dropbox (public)';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('dropbox');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    return searchExaFiles({
      query: q.query,
      provider: 'dropbox',
      includeDomains: ['dropbox.com'],
      fileTypes: q.fileTypes,
      limit: q.limit || 10,
      safetyBase: 0.93,
    });
  }
}

export class MegaProvider implements FileProvider {
  id = 'mega';
  label = 'Mega.nz';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('mega');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    return searchExaFiles({
      query: q.query,
      provider: 'mega',
      includeDomains: ['mega.nz'],
      fileTypes: q.fileTypes,
      limit: q.limit || 10,
      safetyBase: 0.85,
    });
  }
}

export class FourSharedProvider implements FileProvider {
  id = '4shared';
  label = '4shared';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('4shared');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    return searchExaFiles({
      query: q.query,
      provider: '4shared',
      includeDomains: ['4shared.com'],
      fileTypes: q.fileTypes,
      limit: q.limit || 10,
      safetyBase: 0.82,
    });
  }
}

export class OpenWebFileProvider implements FileProvider {
  id = 'web';
  label = 'Any / Open Web';

  supports(q: FileQuery): boolean {
    if (!q.platforms || q.platforms.length === 0) return true;
    return q.platforms.includes('web');
  }

  async search(q: FileQuery): Promise<FileResult[]> {
    let fileTerm = 'file download';
    if (q.fileTypes && q.fileTypes.length > 0) {
      fileTerm = q.fileTypes.join(' OR ');
    }

    return searchExaFiles({
      query: `${q.query} (${fileTerm})`,
      provider: 'web',
      fileTypes: q.fileTypes,
      limit: q.limit || 15,
      safetyBase: 0.89,
    });
  }
}
