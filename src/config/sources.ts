import type { NewsSourceConfig } from "../types";

// Add/remove feeds here. Prefer official RSS feeds over page scraping.
export const NEWS_SOURCES: NewsSourceConfig[] = [
  {
    id: "vietstock",
    name: "Vietstock",
    type: "rss",
    url: "https://vietstock.vn/rss/chung-khoan.rss",
    feedUrl: "https://vietstock.vn/rss/chung-khoan.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "cafef-thi-truong-chung-khoan",
    name: "CafeF",
    type: "rss",
    url: "https://cafef.vn/thi-truong-chung-khoan.rss",
    feedUrl: "https://cafef.vn/thi-truong-chung-khoan.rss",
    baseUrl: "https://cafef.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vnexpress-kinh-doanh",
    name: "VNExpress Kinh Doanh",
    type: "rss",
    url: "https://vnexpress.net/rss/kinh-doanh.rss",
    feedUrl: "https://vnexpress.net/rss/kinh-doanh.rss",
    baseUrl: "https://vnexpress.net",
    enabled: true,
    isDefault: true
  },
  {
    id: "hose-tin-hoat-dong",
    name: "HOSE",
    type: "rss",
    url: "https://www.hsx.vn/Modules/Cms/Web/ArticleInCategory/28ca0f0f-7ce1-4ab9-b80d-b517fce9f9f8?exclude=00000000-0000-0000-0000-000000000000&lim=True",
    feedUrl: "https://www.hsx.vn/Modules/Cms/Web/ArticleInCategory/28ca0f0f-7ce1-4ab9-b80d-b517fce9f9f8?exclude=00000000-0000-0000-0000-000000000000&lim=True",
    baseUrl: "https://www.hsx.vn",
    enabled: false,
    isDefault: true
  },
  {
    id: "vndirect-market-news",
    name: "VNDIRECT Market News",
    type: "html_list",
    baseUrl: "https://www.vndirect.com.vn",
    listUrl: "https://www.vndirect.com.vn/en/market-news/",
    enabled: false,
    allowCrawl: true,
    respectRobots: true,
    extractorKey: "generic-market-news",
    notes: "Selective HTML crawl. Enable only after validation against robots/terms.",
    isDefault: true
  }
];

export const MEDIA_SOURCES = [
  {
    id: "vietstock-brief-market",
    name: "Vietstock Nhận định thị trường",
    type: "rss" as const,
    url: "https://vietstock.vn/1636/nhan-dinh-phan-tich/nhan-dinh-thi-truong.rss"
  },
  {
    id: "vietstock-brief-fundamental",
    name: "Vietstock Phân tích cơ bản",
    type: "rss" as const,
    url: "https://vietstock.vn/582/nhan-dinh-phan-tich/phan-tich-co-ban.rss"
  },
  {
    id: "vietstock-media",
    name: "Vietstock",
    type: "rss" as const,
    url: "https://vietstock.vn/rss/chung-khoan.rss"
  },
  {
    id: "cafef-media",
    name: "CafeF",
    type: "rss" as const,
    url: "https://cafef.vn/thi-truong-chung-khoan.rss"
  },
  {
    id: "stockscafe-youtube",
    name: "StocksCafe YouTube",
    type: "youtube" as const,
    url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCv-lMahkCfXzmNzk8uijT8A"
  },
  {
    id: "reuters-business",
    name: "Reuters Business",
    type: "rss" as const,
    url: "http://feeds.reuters.com/reuters/businessNews"
  },
  {
    id: "reuters-company",
    name: "Reuters Company News",
    type: "rss" as const,
    url: "http://feeds.reuters.com/reuters/companyNews"
  },
  {
    id: "cnbc-us-markets",
    name: "CNBC U.S. Markets",
    type: "rss" as const,
    url: "https://www.cnbc.com/id/15837362/device/rss/rss.html"
  }
];
