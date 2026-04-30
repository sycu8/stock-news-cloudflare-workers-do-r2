export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ASSETS?: R2Bucket;
  /** Cloudflare Images transform binding (see wrangler.toml [images]) */
  IMAGES?: import("@cloudflare/workers-types").ImagesBinding;
  AI?: Ai;
  OPENAI_API_KEY?: string;
  /** Default OpenAI model when task-specific vars are unset. */
  OPENAI_MODEL?: string;
  /** OpenAI model for article summaries + daily report text (optional). */
  OPENAI_MODEL_SUMMARY?: string;
  /** OpenAI model for `/api/news/explain` style reasoning (optional). */
  OPENAI_MODEL_EXPLAIN?: string;
  /** OpenAI model for EN translations (optional). */
  OPENAI_MODEL_TRANSLATE?: string;
  /** AI Gateway slug (Workers `AI.run` gateway + OpenAI path segment when account id set). */
  AI_GATEWAY_ID?: string;
  /** Cloudflare account id (hex) for `gateway.ai.cloudflare.com/v1/{account}/{gateway}/...`. */
  AI_GATEWAY_ACCOUNT_ID?: string;
  /**
   * Token for `cf-aig-authorization` on gateway OpenAI requests.
   * Create under AI Gateway → Settings / API tokens.
   */
  CF_AIG_TOKEN?: string;
  /** @deprecated Use CF_AIG_TOKEN; if both set, CF_AIG_TOKEN wins. */
  AI_GATEWAY_API_TOKEN?: string;
  /**
   * When `"false"`, allow AI Gateway cache for Workers AI (default: skip cache, matches prior behavior).
   */
  AI_GATEWAY_SKIP_CACHE?: string;
  WORKERS_AI_MODEL_SUMMARY?: string;
  /**
   * When `"true"` and `OPENAI_API_KEY` is set, news explain tries OpenAI before Workers AI
   * (use with `OPENAI_MODEL_EXPLAIN` for a stronger model on explain only).
   */
  AI_EXPLAIN_OPENAI_FIRST?: string;
  /** Workers AI model for news impact explain (optional; else same as summary). */
  WORKERS_AI_MODEL_EXPLAIN?: string;
  /** Workers AI model for generated thumbnails (optional). */
  WORKERS_AI_MODEL_IMAGE?: string;
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
  /** Seed URLs for website crawl container used by AI Search (comma-separated). */
  WEBSITE_CRAWL_SEEDS?: string;
  /**
   * RFC 9728: comma-separated HTTPS OAuth/OIDC issuer identifiers (RFC 8414).
   * When unset, metadata uses this deployment’s origin (see `/.well-known/oauth-authorization-server`).
   */
  OAUTH_AUTHORIZATION_SERVERS?: string;
  /** RFC 9728: space- or comma-separated scope strings advertised as supported. */
  OAUTH_SCOPES_SUPPORTED?: string;
  /**
   * Web Bot Auth: Ed25519 private JWK JSON (`kty`, `crv`, `d`, `x`) for signing
   * `/.well-known/http-message-signatures-directory` and outbound bot requests.
   * When unset, a documented RFC 9421 test keypair is used (replace for production).
   */
  WEB_BOT_AUTH_ED25519_PRIVATE_JWK?: string;
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

export interface FxRatePoint {
  date: string;
  value: number;
}

export interface FxMarketSnapshot {
  fetchedAt: string;
  sourceUrl: string;
  usdVnd1D: FxRatePoint[];
  usdVnd1W: FxRatePoint[];
  usdVnd1M: FxRatePoint[];
  usdVnd1Y: FxRatePoint[];
  sgdVnd1D: FxRatePoint[];
  sgdVnd1W: FxRatePoint[];
  sgdVnd1M: FxRatePoint[];
  sgdVnd1Y: FxRatePoint[];
  jpyVnd1D: FxRatePoint[];
  jpyVnd1W: FxRatePoint[];
  jpyVnd1M: FxRatePoint[];
  jpyVnd1Y: FxRatePoint[];
  cnyVnd1D: FxRatePoint[];
  cnyVnd1W: FxRatePoint[];
  cnyVnd1M: FxRatePoint[];
  cnyVnd1Y: FxRatePoint[];
}

export interface GoldPriceRow {
  brand: string;
  buy: string;
  sell: string;
  yesterdayBuy?: string | null;
  yesterdaySell?: string | null;
}

export interface GoldMarketSnapshot {
  fetchedAt: string;
  sourceUrl: string;
  sourceLabel: string;
  updatedAtLabel: string | null;
  rows: GoldPriceRow[];
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
