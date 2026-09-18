import * as cheerio from 'cheerio';
import { CrawledPage, CrawledFile, DEFAULT_FILE_EXTENSIONS } from './types';

export interface ParseResult {
  page: Omit<CrawledPage, 'crawlId' | 'fetchedAt'>;
  discoveredLinks: string[];
  discoveredFiles: Omit<CrawledFile, 'crawlId' | 'fetchedAt'>[];
  canonicalUrl?: string;
  isJsOnly?: boolean;
}

export class Parser {
  private fileExtensions: Set<string>;

  constructor(customFileTypes?: string[]) {
    const list = customFileTypes && customFileTypes.length > 0 ? customFileTypes : DEFAULT_FILE_EXTENSIONS;
    this.fileExtensions = new Set(list.map((ext) => ext.toLowerCase().replace(/^\./, '')));
  }

  public parseHtml(html: string, currentUrl: string): ParseResult {
    const $ = cheerio.load(html);

    // Extract title
    const title =
      $('title').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim() ||
      new URL(currentUrl).pathname;

    // Extract description
    const description =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      '';

    // Extract language
    const lang =
      $('html').attr('lang')?.trim().toLowerCase().split(/[-_]/)[0] ||
      $('meta[http-equiv="content-language"]').attr('content')?.trim().toLowerCase() ||
      'en';

    // Extract headings (h1, h2, h3)
    const headingsList: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const hText = $(el).text().trim().replace(/\s+/g, ' ');
      if (hText && hText.length < 200) {
        headingsList.push(hText);
      }
    });
    const headings = headingsList.slice(0, 15).join(' • ');

    // Extract clean body text (strip script, style, nav, footer, noscript)
    $('script, style, noscript, svg, nav, footer, header, [aria-hidden="true"]').remove();
    const rawText = $('body').text() || '';
    const text = rawText
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 50000); // Index up to 50k chars of text content

    // Canonical link
    const canonicalRel = $('link[rel="canonical"]').attr('href');
    let canonicalUrl: string | undefined;
    if (canonicalRel) {
      try {
        canonicalUrl = new URL(canonicalRel, currentUrl).toString();
      } catch {
        // Ignore invalid canonical
      }
    }

    const discoveredLinks: string[] = [];
    const discoveredFiles: Omit<CrawledFile, 'crawlId' | 'fetchedAt'>[] = [];
    const seenFiles = new Set<string>();

    // Collect all links <a href> and file downloads
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      const trimmed = href.trim();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('mailto:') ||
        trimmed.startsWith('tel:') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('data:')
      ) {
        return;
      }

      try {
        const resolved = new URL(trimmed, currentUrl);
        const resolvedUrl = resolved.toString();

        // Check if link points directly to a file
        const pathname = resolved.pathname.toLowerCase();
        const extMatch = pathname.match(/\.([a-z0-9]{2,8})$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';

        if (ext && this.fileExtensions.has(ext)) {
          if (!seenFiles.has(resolvedUrl)) {
            seenFiles.add(resolvedUrl);
            const anchorText = $(el).text().trim();
            const filename = pathname.split('/').filter(Boolean).pop() || `file.${ext}`;
            discoveredFiles.push({
              url: resolvedUrl,
              name: anchorText && anchorText.length < 100 ? anchorText : decodeURIComponent(filename),
              ext,
              sourcePage: currentUrl,
            });
          }
        } else {
          discoveredLinks.push(resolvedUrl);
        }
      } catch {
        // Ignore invalid URL
      }
    });

    // Also look for direct media/files in <link rel="alternate" ...> or <source src=...>
    $('source[src], video[src], audio[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      try {
        const resolved = new URL(src, currentUrl).toString();
        const pathname = new URL(resolved).pathname.toLowerCase();
        const extMatch = pathname.match(/\.([a-z0-9]{2,8})$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : '';
        if (ext && this.fileExtensions.has(ext) && !seenFiles.has(resolved)) {
          seenFiles.add(resolved);
          const filename = pathname.split('/').filter(Boolean).pop() || `media.${ext}`;
          discoveredFiles.push({
            url: resolved,
            name: decodeURIComponent(filename),
            ext,
            sourcePage: currentUrl,
          });
        }
      } catch {
        // Ignore
      }
    });

    return {
      page: {
        url: currentUrl,
        title,
        description,
        text,
        headings,
        lang,
      },
      discoveredLinks,
      discoveredFiles,
      canonicalUrl,
    };
  }
}
