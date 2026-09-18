import { FileResult, FileQuery, FilePlatform } from '../lib/providers/file-provider';

export type { FileResult, FileQuery, FilePlatform };

export type SearchType = 'auto' | 'fast' | 'instant' | 'deep-lite' | 'deep' | 'deep-reasoning';

export type CategoryTab = 'all' | 'filehosts' | 'images' | 'videos' | 'news' | 'papers' | 'people' | 'pdfs';

export interface ImageMedia {
  url: string;
  type: 'og' | 'twitter' | 'img' | 'css' | 'jsonld' | 'exa';
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  sourceUrl?: string;
}

export interface VideoMedia {
  url: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  platform: 'youtube' | 'vimeo' | 'tiktok' | 'twitch' | 'dailymotion' | 'facebook' | 'instagram' | 'x' | 'html5' | 'hls' | 'dash' | 'other';
  title?: string;
  videoId?: string;
  sourceUrl?: string;
  format?: 'mp4' | 'webm' | 'm3u8' | 'mpd' | 'mov' | 'embed';
}

export interface ExtractedMediaResult {
  images: ImageMedia[];
  videos: VideoMedia[];
  ogTitle?: string;
  ogDescription?: string;
  canonicalUrl?: string;
  favicon?: string;
}

export interface ImageColorInfo {
  hex: string;
  name: string;
  percentage?: number;
}

export interface VisionAnalysisResult {
  ocr: string[];
  description: string;
  entities: string[];
  logos: string[];
  colors: ImageColorInfo[];
  keywords: string[];
  generatedQueries: {
    exaQuery: string;
    videoQuery: string;
    imageQuery: string;
  };
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  publishedDate?: string | null;
  author?: string | null;
  image?: string | null;
  favicon?: string | null;
  text?: string;
  summary?: string;
  highlights?: string[];
  highlightScores?: number[];
  score?: number;
  relevanceReason?: string;
  images: ImageMedia[];
  videos: VideoMedia[];
  links?: string[];
  crawledMedia?: boolean;
  isPublicFileHost?: boolean;
  fileHostName?: string;
}

export interface AIAnswerGrounding {
  field?: string;
  citations: { url: string; title: string }[];
  confidence?: string;
}

export interface AIAnswer {
  content: string;
  summaryBulletPoints?: string[];
  grounding?: AIAnswerGrounding[];
  keyTakeaways?: string[];
}

export interface ExaSearchResponse {
  query: string;
  requestId?: string;
  searchType: SearchType;
  category: CategoryTab;
  results: SearchResultItem[];
  files?: FileResult[];
  aiAnswer?: AIAnswer | null;
  visionAnalysis?: VisionAnalysisResult | null;
  sourceImage?: string | null;
  costDollars?: number;
  totalImagesCount: number;
  totalVideosCount: number;
  totalFilesCount?: number;
  durationMs: number;
  cached?: boolean;
}

export interface SearchFilterParams {
  query: string;
  type?: SearchType;
  category?: CategoryTab;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  enableCrawl?: boolean;
  filePlatforms?: FilePlatform[];
  fileTypes?: string[];
  minSizeMb?: number;
  maxSizeMb?: number;
  dateAdded?: string;
  customStartDate?: string;
  customEndDate?: string;
  fileLanguage?: 'any' | 'en' | 'ar';
  hideFlaggedFiles?: boolean;
  fileSort?: 'relevance' | 'newest' | 'size' | 'popularity';
}
