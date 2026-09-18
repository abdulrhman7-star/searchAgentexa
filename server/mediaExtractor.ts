import * as cheerio from 'cheerio';
import axios from 'axios';
import Exa, { Exa as ExaNamed } from 'exa-js';
import { ImageMedia, VideoMedia, ExtractedMediaResult } from '../src/types';

const EXA_API_KEY = process.env.EXA_API_KEY || '4ac51eb4-9511-4199-a90c-6698310fb9d1';
const ExaConstructor: any = ExaNamed || Exa || (Exa as any)?.default;
const exa = new ExaConstructor(EXA_API_KEY);

export const KNOWN_FILE_HOSTS: Record<string, string> = {
  'gofile.io': 'Gofile',
  'archive.org': 'Internet Archive',
  'mediafire.com': 'MediaFire',
  'mega.nz': 'MEGA',
  'huggingface.co': 'Hugging Face',
  'zenodo.org': 'Zenodo',
  'osf.io': 'OSF Preprints & Data',
  'github.com': 'GitHub Files',
  'sourceforge.net': 'SourceForge',
  'dropbox.com': 'Dropbox',
  'drive.google.com': 'Google Drive',
};

export const PUBLIC_FILE_HOST_DOMAINS = Object.keys(KNOWN_FILE_HOSTS);

/**
 * Generic retry helper with exponential backoff for network requests
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 500,
  taskName: string = 'Network Operation'
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > retries) {
        console.error(`[${taskName}] Failed after ${retries} retries:`, err.message || err);
        throw err;
      }
      console.warn(
        `[${taskName}] Attempt ${attempt}/${retries} failed: ${err.message || err}. Retrying in ${delayMs * attempt}ms...`
      );
      await new Promise((res) => setTimeout(res, delayMs * attempt));
    }
  }
  throw new Error(`[${taskName}] Maximum retries exceeded.`);
}

export interface MediaResult {
  title: string;
  url: string;
  highlights?: string[];
  images: ImageMedia[];
  videos: VideoMedia[];
  summary?: string;
  [key: string]: any;
}

/**
 * Deep crawl function with timeout and retry handling using axios + cheerio
 */
export async function deepCrawlPage(pageUrl: string, timeoutMs: number = 10000): Promise<{ images: string[]; videos: string[] }> {
  try {
    const response = await withRetry(
      () =>
        axios.get(pageUrl, {
          timeout: timeoutMs,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }),
      1,
      500,
      `Deep Crawl (${pageUrl})`
    );

    const $ = cheerio.load(response.data);
    const images: string[] = [];
    const videos: string[] = [];

    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) images.push(src);
    });

    $('video, source, iframe').each((_, el) => {
      const src = $(el).attr('src');
      if (src) videos.push(src);
    });

    return { images, videos };
  } catch (error) {
    console.warn(`[Deep Crawl] Timeout or error crawling ${pageUrl}:`, error instanceof Error ? error.message : error);
    return { images: [], videos: [] };
  }
}

export async function searchExa(query: string, options: any = {}): Promise<MediaResult[] & { results: MediaResult[]; exaResponse: any; totalImagesCount: number; totalVideosCount: number }> {
  const {
    type = 'auto',
    category = 'all',
    numResults = 5,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    endPublishedDate,
    enableCrawl = true,
  } = options;

  const searchQuery = query.trim();
  let exaCategory: string | undefined = undefined;

  if (category === 'news') {
    exaCategory = 'news';
  } else if (category === 'papers') {
    exaCategory = 'publication';
  } else if (category === 'people') {
    exaCategory = 'people';
  }

  const isCategoryRestricted = exaCategory === 'company' || exaCategory === 'people';

  const exaOptions: any = {
    type: type as any,
    numResults: Math.min(Math.max(Number(numResults) || 5, 1), 50),
    contents: {
      highlights: true,
      summary: true,
      extras: {
        imageLinks: 10,
        links: 20,
      },
    },
  };

  if (exaCategory) {
    exaOptions.category = exaCategory;
  }

  if (!isCategoryRestricted) {
    if (includeDomains && Array.isArray(includeDomains) && includeDomains.length > 0) {
      exaOptions.includeDomains = includeDomains;
    } else if (category === 'filehosts') {
      exaOptions.includeDomains = [
        'gofile.io',
        'archive.org',
        'mediafire.com',
        'mega.nz',
        'huggingface.co',
        'zenodo.org',
        'github.com',
        'sourceforge.net',
      ];
    }
    if (excludeDomains && Array.isArray(excludeDomains) && excludeDomains.length > 0) {
      exaOptions.excludeDomains = excludeDomains;
    }
    if (startPublishedDate) {
      exaOptions.startPublishedDate = startPublishedDate;
    }
    if (endPublishedDate) {
      exaOptions.endPublishedDate = endPublishedDate;
    }
  }

  const finalQuery = category === 'pdfs' && !searchQuery.toLowerCase().includes('filetype:pdf')
    ? `${searchQuery} filetype:pdf`
    : searchQuery;

  const exaResponse = await withRetry(
    () => exa.search(finalQuery, exaOptions),
    2,
    600,
    `Exa Search ("${searchQuery}")`
  );
  const rawResults = (exaResponse as any)?.results || [];

  const videoDomainsAndExts = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'tiktok.com',
    'dailymotion.com',
    'twitch.tv',
  ];

  const processedResultsPromises = rawResults.map(async (rawItem: any, index: number) => {
    const itemUrl = rawItem.url || rawItem.id;

    const baseMedia = processMediaExtraction(
      itemUrl,
      undefined,
      rawItem.extras?.imageLinks,
      rawItem.extras?.links,
      rawItem.image
    );

    let finalImages = [...baseMedia.images];
    let finalVideos = [...baseMedia.videos];

    // Additional video link filtering from result.extras.links based on prompt specifications
    if (rawItem.extras?.links && Array.isArray(rawItem.extras.links)) {
      for (const link of rawItem.extras.links) {
        if (typeof link === 'string') {
          const lower = link.toLowerCase();
          const matchesDomain = videoDomainsAndExts.some((d) => lower.includes(d));
          const matchesExt = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.m3u8') || lower.endsWith('.mpd');

          if (matchesDomain || matchesExt) {
            const classified = classifyVideoUrl(link, itemUrl);
            if (classified && !finalVideos.some((v) => v.url === classified.url)) {
              finalVideos.push(classified);
            }
          }
        }
      }
    }

    let crawledMedia = false;

    if (enableCrawl && index < 6) {
      try {
        const liveExtracted = await crawlAndExtractMedia(itemUrl, 2000);
        if (liveExtracted) {
          crawledMedia = true;
          for (const img of liveExtracted.images) {
            if (!finalImages.some((existing) => existing.url === img.url)) {
              finalImages.push(img);
            }
          }
          for (const vid of liveExtracted.videos) {
            if (!finalVideos.some((existing) => existing.url === vid.url)) {
              finalVideos.push(vid);
            }
          }
        }
      } catch {
        // Ignore single page crawl timeouts
      }
    }

    let isPublicFileHost = false;
    let fileHostName: string | undefined;

    try {
      const parsedHostname = new URL(itemUrl).hostname.replace('www.', '').toLowerCase();
      for (const [hostDomain, label] of Object.entries(KNOWN_FILE_HOSTS)) {
        if (parsedHostname === hostDomain || parsedHostname.endsWith('.' + hostDomain)) {
          isPublicFileHost = true;
          fileHostName = label;
          break;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    const itemResult: MediaResult = {
      id: rawItem.id || itemUrl,
      title: rawItem.title || 'Untitled Result',
      url: itemUrl,
      publishedDate: rawItem.publishedDate || null,
      author: rawItem.author || null,
      image: rawItem.image || (finalImages[0]?.url || null),
      favicon: rawItem.favicon || `https://www.google.com/s2/favicons?domain=${new URL(itemUrl).hostname}&sz=32`,
      text: rawItem.text || undefined,
      summary: rawItem.summary || undefined,
      highlights: rawItem.highlights || [],
      highlightScores: rawItem.highlightScores || [],
      score: rawItem.score || undefined,
      images: finalImages,
      videos: finalVideos,
      links: rawItem.extras?.links || [],
      crawledMedia,
      isPublicFileHost,
      fileHostName,
    };

    return itemResult;
  });

  const processedResults: MediaResult[] = await Promise.all(processedResultsPromises);

  let totalImagesCount = 0;
  let totalVideosCount = 0;
  processedResults.forEach((r) => {
    totalImagesCount += r.images.length;
    totalVideosCount += r.videos.length;
  });

  // Attach properties to array so both direct MediaResult[] usage and destructuring work
  const resultMap = processedResults as MediaResult[] & {
    results: MediaResult[];
    exaResponse: any;
    totalImagesCount: number;
    totalVideosCount: number;
  };

  resultMap.results = processedResults;
  resultMap.exaResponse = exaResponse;
  resultMap.totalImagesCount = totalImagesCount;
  resultMap.totalVideosCount = totalVideosCount;

  return resultMap;
}

// Utility to normalize relative URLs to absolute URLs
function toAbsoluteUrl(relativeOrAbsoluteUrl: string, baseUrl: string): string | null {
  if (!relativeOrAbsoluteUrl || relativeOrAbsoluteUrl.trim().startsWith('data:')) {
    return null;
  }
  try {
    const cleanUrl = relativeOrAbsoluteUrl.trim();
    if (cleanUrl.startsWith('//')) {
      return `https:${cleanUrl}`;
    }
    const parsed = new URL(cleanUrl, baseUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // Ignore invalid URLs
  }
  return null;
}

// Extract YouTube Video ID
function extractYouTubeId(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1]?.split('?')[0] || null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1]?.split('?')[0] || null;
      }
      if (parsed.pathname.startsWith('/v/')) {
        return parsed.pathname.split('/v/')[1]?.split('?')[0] || null;
      }
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('?')[0] || null;
    }
  } catch {
    // Regex fallback
    const match = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match) return match[1];
  }
  return null;
}

// Extract Vimeo Video ID
function extractVimeoId(urlStr: string): string | null {
  try {
    const match = urlStr.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  return null;
}

// Extract TikTok Video ID
function extractTikTokId(urlStr: string): string | null {
  try {
    const match = urlStr.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    if (match) return match[1];
    const matchEmbed = urlStr.match(/tiktok\.com\/embed\/v2\/(\d+)/);
    if (matchEmbed) return matchEmbed[1];
  } catch {
    // ignore
  }
  return null;
}

// Classify and create VideoMedia object from URL or element
export function classifyVideoUrl(urlStr: string, pageUrl: string, title?: string): VideoMedia | null {
  const absUrl = toAbsoluteUrl(urlStr, pageUrl);
  if (!absUrl) return null;

  const lower = absUrl.toLowerCase();

  // 1. YouTube
  const ytId = extractYouTubeId(absUrl);
  if (ytId) {
    return {
      url: absUrl,
      platform: 'youtube',
      videoId: ytId,
      title: title || `YouTube Video (${ytId})`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  // 2. Vimeo
  const vimeoId = extractVimeoId(absUrl);
  if (vimeoId) {
    return {
      url: absUrl,
      platform: 'vimeo',
      videoId: vimeoId,
      title: title || `Vimeo Video (${vimeoId})`,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`,
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  // 3. TikTok
  const tiktokId = extractTikTokId(absUrl);
  if (tiktokId || lower.includes('tiktok.com')) {
    return {
      url: absUrl,
      platform: 'tiktok',
      videoId: tiktokId || undefined,
      title: title || 'TikTok Video',
      embedUrl: tiktokId ? `https://www.tiktok.com/embed/v2/${tiktokId}` : absUrl,
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  // 4. Twitch
  if (lower.includes('twitch.tv')) {
    return {
      url: absUrl,
      platform: 'twitch',
      title: title || 'Twitch Video',
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  // 5. Dailymotion
  if (lower.includes('dailymotion.com')) {
    const dmMatch = absUrl.match(/video\/([\w]+)/);
    const dmId = dmMatch ? dmMatch[1] : null;
    return {
      url: absUrl,
      platform: 'dailymotion',
      videoId: dmId || undefined,
      title: title || 'Dailymotion Video',
      embedUrl: dmId ? `https://www.dailymotion.com/embed/video/${dmId}` : absUrl,
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  // 6. Direct Video Stream / Files (.mp4, .webm, .m3u8, .mpd, .mov)
  if (lower.includes('.m3u8')) {
    return {
      url: absUrl,
      platform: 'hls',
      title: title || 'HLS Video Stream (.m3u8)',
      sourceUrl: absUrl,
      format: 'm3u8'
    };
  }

  if (lower.includes('.mpd')) {
    return {
      url: absUrl,
      platform: 'dash',
      title: title || 'DASH Video Stream (.mpd)',
      sourceUrl: absUrl,
      format: 'mpd'
    };
  }

  if (lower.match(/\.(mp4|webm|mov|ogg)(\?|$)/)) {
    const ext = lower.includes('.webm') ? 'webm' : lower.includes('.mov') ? 'mov' : 'mp4';
    return {
      url: absUrl,
      platform: 'html5',
      title: title || `HTML5 Video (${ext.toUpperCase()})`,
      sourceUrl: absUrl,
      format: ext as any
    };
  }

  // 7. Social video platforms (Facebook, Instagram, X/Twitter)
  if (lower.includes('instagram.com/reel') || lower.includes('instagram.com/p/')) {
    return {
      url: absUrl,
      platform: 'instagram',
      title: title || 'Instagram Reel / Video',
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  if (lower.includes('facebook.com') && (lower.includes('/videos/') || lower.includes('/watch'))) {
    return {
      url: absUrl,
      platform: 'facebook',
      title: title || 'Facebook Video',
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  if ((lower.includes('twitter.com') || lower.includes('x.com')) && (lower.includes('/status/') || lower.includes('/i/status/'))) {
    return {
      url: absUrl,
      platform: 'x',
      title: title || 'X / Twitter Video',
      sourceUrl: absUrl,
      format: 'embed'
    };
  }

  return null;
}

// Extract media from provided HTML content and Exa links/imageLinks
export function processMediaExtraction(
  pageUrl: string,
  htmlContent?: string,
  exaImageLinks?: string[],
  exaLinks?: string[],
  pageHeroImage?: string | null
): ExtractedMediaResult {
  const images: ImageMedia[] = [];
  const videos: VideoMedia[] = [];
  const seenImages = new Set<string>();
  const seenVideos = new Set<string>();

  const addImage = (img: ImageMedia) => {
    if (!img.url || seenImages.has(img.url)) return;
    // Basic filter against tiny spacer pixel GIFs or tracking SVG data icons
    if (img.url.includes('spacer.gif') || img.url.includes('blank.gif') || img.url.includes('1x1')) return;
    seenImages.add(img.url);
    images.push(img);
  };

  const addVideo = (vid: VideoMedia) => {
    if (!vid.url || seenVideos.has(vid.url)) return;
    seenVideos.add(vid.url);
    videos.push(vid);
  };

  // 1. Process explicit Exa pageHeroImage first
  if (pageHeroImage) {
    const abs = toAbsoluteUrl(pageHeroImage, pageUrl);
    if (abs) {
      addImage({ url: abs, type: 'og', title: 'Page Feature Image', sourceUrl: pageUrl });
    }
  }

  // 2. Process Exa imageLinks
  if (exaImageLinks && Array.isArray(exaImageLinks)) {
    for (const link of exaImageLinks) {
      const abs = toAbsoluteUrl(link, pageUrl);
      if (abs) {
        addImage({ url: abs, type: 'exa', title: 'Exa Extracted Image', sourceUrl: pageUrl });
      }
    }
  }

  // 3. Process Exa page links for videos
  if (exaLinks && Array.isArray(exaLinks)) {
    for (const link of exaLinks) {
      const vid = classifyVideoUrl(link, pageUrl);
      if (vid) {
        addVideo(vid);
      }
    }
  }

  // 4. Parse HTML content if provided
  let ogTitle: string | undefined;
  let ogDescription: string | undefined;

  if (htmlContent) {
    try {
      const $ = cheerio.load(htmlContent);

      ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text() || undefined;
      ogDescription = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || undefined;

      // Extract OG Image
      const ogImg = $('meta[property="og:image"]').attr('content') || $('meta[name="og:image"]').attr('content');
      if (ogImg) {
        const abs = toAbsoluteUrl(ogImg, pageUrl);
        if (abs) addImage({ url: abs, type: 'og', title: 'OpenGraph Image', sourceUrl: pageUrl });
      }

      // Extract Twitter Card Image
      const twitterImg = $('meta[name="twitter:image"]').attr('content') || $('meta[property="twitter:image"]').attr('content') || $('meta[name="twitter:image:src"]').attr('content');
      if (twitterImg) {
        const abs = toAbsoluteUrl(twitterImg, pageUrl);
        if (abs) addImage({ url: abs, type: 'twitter', title: 'Twitter Card Image', sourceUrl: pageUrl });
      }

      // Extract JSON-LD images
      $('script[type="application/ld+json"]').each((_, elem) => {
        try {
          const jsonText = $(elem).html();
          if (jsonText) {
            const data = JSON.parse(jsonText);
            const extractLdImages = (obj: any) => {
              if (!obj) return;
              if (typeof obj === 'string' && (obj.startsWith('http') || obj.startsWith('/'))) {
                const abs = toAbsoluteUrl(obj, pageUrl);
                if (abs) addImage({ url: abs, type: 'jsonld', title: 'JSON-LD Schema Image', sourceUrl: pageUrl });
              } else if (Array.isArray(obj)) {
                obj.forEach(extractLdImages);
              } else if (typeof obj === 'object') {
                if (obj.image) extractLdImages(obj.image);
                if (obj.thumbnailUrl) extractLdImages(obj.thumbnailUrl);
                if (obj.logo) extractLdImages(obj.logo);
              }
            };
            extractLdImages(data);
          }
        } catch {
          // ignore JSON syntax errors
        }
      });

      // Extract <img> tags with src, data-src, and srcset
      $('img').each((_, elem) => {
        const $img = $(elem);
        const alt = $img.attr('alt') || $img.attr('title') || undefined;
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('data-original');
        if (src) {
          const abs = toAbsoluteUrl(src, pageUrl);
          if (abs) addImage({ url: abs, type: 'img', alt, sourceUrl: pageUrl });
        }

        // Parse srcset
        const srcset = $img.attr('srcset') || $img.attr('data-srcset');
        if (srcset) {
          const parts = srcset.split(',');
          for (const part of parts) {
            const urlPart = part.trim().split(/\s+/)[0];
            if (urlPart) {
              const abs = toAbsoluteUrl(urlPart, pageUrl);
              if (abs) addImage({ url: abs, type: 'img', alt, sourceUrl: pageUrl });
            }
          }
        }
      });

      // Extract inline CSS background-image
      $('[style*="background"]').each((_, elem) => {
        const style = $(elem).attr('style');
        if (style) {
          const match = style.match(/background(?:-image)?\s*:\s*url\((['"]?)(.*?)\1\)/i);
          if (match && match[2]) {
            const abs = toAbsoluteUrl(match[2], pageUrl);
            if (abs) addImage({ url: abs, type: 'css', title: 'CSS Background Image', sourceUrl: pageUrl });
          }
        }
      });

      // Extract video elements <video> and <source>
      $('video').each((_, elem) => {
        const $vid = $(elem);
        const src = $vid.attr('src');
        const poster = $vid.attr('poster');
        const posterAbs = poster ? toAbsoluteUrl(poster, pageUrl) : null;
        if (posterAbs) {
          addImage({ url: posterAbs, type: 'img', title: 'Video Poster Image', sourceUrl: pageUrl });
        }

        if (src) {
          const vObj = classifyVideoUrl(src, pageUrl);
          if (vObj) {
            if (posterAbs && !vObj.thumbnailUrl) vObj.thumbnailUrl = posterAbs;
            addVideo(vObj);
          }
        }

        $vid.find('source').each((__, srcElem) => {
          const sourceSrc = $(srcElem).attr('src');
          if (sourceSrc) {
            const vObj = classifyVideoUrl(sourceSrc, pageUrl);
            if (vObj) {
              if (posterAbs && !vObj.thumbnailUrl) vObj.thumbnailUrl = posterAbs;
              addVideo(vObj);
            }
          }
        });
      });

      // Extract video <iframe> embeds (YouTube, Vimeo, TikTok, Twitch, etc.)
      $('iframe').each((_, elem) => {
        const iframeSrc = $(elem).attr('src') || $(elem).attr('data-src');
        if (iframeSrc) {
          const vObj = classifyVideoUrl(iframeSrc, pageUrl);
          if (vObj) {
            addVideo(vObj);
          }
        }
      });

      // Extract anchor <a> links for video files or external video URLs
      $('a[href]').each((_, elem) => {
        const href = $(elem).attr('href');
        const linkText = $(elem).text().trim() || undefined;
        if (href) {
          const vObj = classifyVideoUrl(href, pageUrl, linkText);
          if (vObj) {
            addVideo(vObj);
          }
        }
      });

    } catch (err) {
      console.warn(`Error parsing HTML for ${pageUrl}:`, err);
    }
  }

  return {
    images,
    videos,
    ogTitle,
    ogDescription,
    canonicalUrl: pageUrl
  };
}

// Fast page HTML crawler with strict timeout to enrich search result media
export async function crawlAndExtractMedia(url: string, timeoutMs: number = 2500): Promise<ExtractedMediaResult | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 ExaMediaBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    clearTimeout(timer);

    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('html')) return null;

    const html = await response.text();
    return processMediaExtraction(url, html);
  } catch {
    return null;
  }
}
