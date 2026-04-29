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
    id: "vietstock-kinh-te-dau-tu-the-gioi",
    name: "Vietstock Kinh te dau tu (The gioi)",
    type: "rss",
    url: "https://vietstock.vn/768/kinh-te/kinh-te-dau-tu.rss",
    feedUrl: "https://vietstock.vn/768/kinh-te/kinh-te-dau-tu.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-kinh-te-vi-mo",
    name: "Vietstock Kinh te vi mo",
    type: "rss",
    url: "https://vietstock.vn/761/kinh-te/vi-mo.rss",
    feedUrl: "https://vietstock.vn/761/kinh-te/vi-mo.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-chung-khoan-the-gioi",
    name: "Vietstock Chung khoan the gioi",
    type: "rss",
    url: "https://vietstock.vn/773/the-gioi/chung-khoan-the-gioi.rss",
    feedUrl: "https://vietstock.vn/773/the-gioi/chung-khoan-the-gioi.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-tai-chinh-quoc-te",
    name: "Vietstock Tai chinh quoc te",
    type: "rss",
    url: "https://vietstock.vn/772/the-gioi/tai-chinh-quoc-te.rss",
    feedUrl: "https://vietstock.vn/772/the-gioi/tai-chinh-quoc-te.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-kinh-te-nganh",
    name: "Vietstock Kinh te nganh",
    type: "rss",
    url: "https://vietstock.vn/775/the-gioi/kinh-te-nganh.rss",
    feedUrl: "https://vietstock.vn/775/the-gioi/kinh-te-nganh.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-ngan-hang",
    name: "Vietstock Ngan hang",
    type: "rss",
    url: "https://vietstock.vn/757/tai-chinh/ngan-hang.rss",
    feedUrl: "https://vietstock.vn/757/tai-chinh/ngan-hang.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-bao-hiem",
    name: "Vietstock Bao hiem",
    type: "rss",
    url: "https://vietstock.vn/3113/tai-chinh/bao-hiem.rss",
    feedUrl: "https://vietstock.vn/3113/tai-chinh/bao-hiem.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-thue-va-ngan-sach",
    name: "Vietstock Thue va ngan sach",
    type: "rss",
    url: "https://vietstock.vn/758/tai-chinh/thue-va-ngan-sach.rss",
    feedUrl: "https://vietstock.vn/758/tai-chinh/thue-va-ngan-sach.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-nhan-dinh-thi-truong",
    name: "Vietstock Nhan dinh thi truong",
    type: "rss",
    url: "https://vietstock.vn/1636/nhan-dinh-phan-tich/nhan-dinh-thi-truong.rss",
    feedUrl: "https://vietstock.vn/1636/nhan-dinh-phan-tich/nhan-dinh-thi-truong.rss",
    baseUrl: "https://vietstock.vn",
    enabled: true,
    isDefault: true
  },
  {
    id: "vietstock-tai-san-so",
    name: "Vietstock Tai san so",
    type: "rss",
    url: "https://vietstock.vn/16312/tai-chinh/tai-san-so.rss",
    feedUrl: "https://vietstock.vn/16312/tai-chinh/tai-san-so.rss",
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
