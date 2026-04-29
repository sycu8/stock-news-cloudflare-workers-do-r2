export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS?: R2Bucket;
  /** Cloudflare Images transform binding (see wrangler.toml [images]) */
  IMAGES?: import("@cloudflare/workers-types").ImagesBinding;
  AI?: Ai;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  AI_GATEWAY_ID?: string;
  WORKERS_AI_MODEL_SUMMARY?: string;
  ADMIN_REFRESH_TOKEN: string;
  TZ?: string;
  WORKER_VERSION?: string;
  /** Telegram Bot API token (@BotFather); use `wrangler secret put TELEGRAM_BOT_TOKEN` */
  TELEGRAM_BOT_TOKEN?: string;
  /** Bot username without @; public, for https://t.me/<name> links */
  TELEGRAM_BOT_USERNAME?: string;
  /** Must match Telegram setWebhook secret_token; header X-Telegram-Bot-Api-Secret-Token */
  TELEGRAM_WEBHOOK_SECRET?: string;
  /** Cloudflare Images account hash for imagedelivery.net URLs */
  CF_IMAGES_ACCOUNT_HASH?: string;
  /** Variant name for hosted Images delivery */
  CF_IMAGES_VARIANT?: string;
}

export type NewsSourceType = "rss" | "html_list";

export interface NewsSourceConfig {
  id: string;
  name: string;
  type: NewsSourceType;
  url?: string;
  feedUrl?: string;
  baseUrl?: string;
  listUrl?: string;
  enabled: boolean;
  allowCrawl?: boolean;
  respectRobots?: boolean;
  extractorKey?: string;
  notes?: string;
  isDefault?: boolean;
}

export interface NormalizedArticle {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
  snippet: string;
  contentLimited: boolean;
}

export interface StoredArticle extends NormalizedArticle {
  id: number;
  summaryVi: string | null;
  imageUrl?: string | null;
  sourceCount?: number;
  sourceNames?: string[];
  confirmationLevel?: "confirmed" | "single" | "breaking";
  confirmationLabel?: string;
}

export interface DailyReport {
  reportDate: string;
  overviewVi: string;
  outlookVi: string;
  assumptionsVi: string;
  articleCount: number;
}

export interface ReportHistoryEntry {
  updatedAt: string;
  overviewVi: string;
  outlookVi: string;
  assumptionsVi: string;
  articleCount: number;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
    score: number;
  };
}

export interface MediaItemRecord {
  id?: number;
  kind: "youtube" | "news_image";
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  publishedAt: string;
  reportDate: string;
  summaryVi: string;
  imageUrl: string | null;
}

export interface CafeFMarketSnapshot {
  fetchedAt: string;
  marketDateLabel: string;
  overviewItems: string[];
  quickLinks: Array<{ label: string; url: string }>;
  toolLinks: Array<{ label: string; url: string }>;
  sections: string[];
  notes: string[];
  sourceUrl: string;
}

export interface HSXTopVolumeItem {
  symbol: string;
  price: string;
  volume: string;
  ratioPct: string;
  lot: string;
}

export interface HSXVNIndexPoint {
  symbol: string;
  time: number;
  openPrice: number;
  closePrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

export interface HSXMarketSnapshot {
  fetchedAt: string;
  topVolume: HSXTopVolumeItem[];
  vnindex1W: HSXVNIndexPoint[];
  vnindex1M: HSXVNIndexPoint[];
  vnindex1Y: HSXVNIndexPoint[];
  statsUrl: string;
  chartUrl: string;
}

export interface NewsSourceRecord {
  id: string;
  name: string;
  type: NewsSourceType;
  baseUrl: string | null;
  feedUrl: string | null;
  listUrl: string | null;
  enabled: boolean;
  allowCrawl: boolean;
  respectRobots: boolean;
  extractorKey: string | null;
  notes: string | null;
  isDefault: boolean;
  lastRunStatus?: string | null;
  lastRunAt?: string | null;
  lastRunMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrawlRunRecord {
  id: number;
  sourceId: string;
  status: "success" | "error";
  message: string;
  fetchedCount: number;
  createdAt: string;
}
