import assert from "node:assert/strict";

import { NEWS_SOURCES } from "../.tmp-test/config/sources.js";
import {
  createSource,
  ensureDefaultSources,
  getDailyReport,
  insertSystemStatusSnapshot,
  logCrawlRun,
  toggleSource
} from "../.tmp-test/db.js";
import { fetchOptimizedRemoteImage } from "../.tmp-test/services/cf-image-fetch.js";
import { ensureOptimizedImageAsset } from "../.tmp-test/services/image-cache.js";
import { HSX_REQUEST_TIMEOUT_MS, getHSXMarketSnapshot, getStockChartRange, getVNIndexChartPoints } from "../.tmp-test/services/hsx-market.js";
import { loadInvestorSnapshotFromR2 } from "../.tmp-test/services/investor-intel.js";
import {
  isMissingR2Key,
  isTransientD1Error,
  r2ObjectExists,
  readR2Object,
  resetMissingR2KeyWarningForTests,
  retryDelayMs
} from "../.tmp-test/utils/resilience.js";

process.env.HSX_RETRY_BASE_MS = "0";

function kv(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    store,
    async get(key, type) {
      if (!store.has(key)) return null;
      const raw = store.get(key);
      return type === "json" ? JSON.parse(raw) : raw;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    }
  };
}

function chartBody(symbol, closePrice = 12) {
  return {
    success: true,
    data: [
      {
        chartPoints: [
          {
            stockSymbol: symbol,
            time: 1_700_000_000_000,
            openPrice: 10,
            closePrice,
            highPrice: 13,
            lowPrice: 9,
            totalShare: 100
          }
        ]
      }
    ]
  };
}

function topBody() {
  return {
    success: true,
    data: [{ id: "SSI", cell: ["SSI", "25.1", "1000", "1.2", "10"] }]
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function timeoutError() {
  const error = new Error("The operation was aborted due to timeout");
  error.name = "TimeoutError";
  return error;
}

function chartRange(url) {
  const parsed = new URL(String(url));
  const from = Date.parse(`${parsed.searchParams.get("fromDate")}T00:00:00Z`);
  const to = Date.parse(`${parsed.searchParams.get("toDate")}T00:00:00Z`);
  const days = Math.round((to - from) / 86_400_000);
  if (days <= 10) return "1w";
  if (days <= 40) return "1m";
  return "1y";
}

function point(symbol, closePrice) {
  return {
    symbol,
    time: 1_700_000_000_000,
    openPrice: 10,
    closePrice,
    highPrice: 13,
    lowPrice: 9,
    volume: 100
  };
}

const originalFetch = globalThis.fetch;
const originalTimeout = AbortSignal.timeout.bind(AbortSignal);
const timeouts = [];
AbortSignal.timeout = (ms) => {
  timeouts.push(ms);
  return originalTimeout(ms);
};

try {
  assert.equal(retryDelayMs(0, () => 0), 0);
  delete process.env.HSX_RETRY_BASE_MS;
  assert.equal(retryDelayMs(0, () => 0), 250);
  assert.equal(retryDelayMs(1, () => 0), 500);
  assert.equal(retryDelayMs(2, () => 0), 1000);
  assert.equal(retryDelayMs(0, () => 1), 325);
  assert.ok(retryDelayMs(0, () => 0.5) > 250);
  process.env.HSX_RETRY_BASE_MS = "0";

  assert.equal(isTransientD1Error(new Error("D1 DB storage caused object to be reset")), true);
  assert.equal(isTransientD1Error(new Error("no such table: news_sources")), false);
  assert.equal(HSX_REQUEST_TIMEOUT_MS, 12_000);

  {
    const cache = kv();
    let attempts = 0;
    globalThis.fetch = async (url) => {
      attempts += 1;
      const href = String(url);
      if (href.includes("top/main-volume")) {
        if (attempts === 1) return jsonResponse({ success: false }, 530);
        return jsonResponse(topBody());
      }
      throw new Error(`unexpected url ${href}`);
    };
    const snapshot = await getHSXMarketSnapshot({ CACHE: cache }, { ranges: [] });
    assert.equal(attempts, 2);
    assert.equal(snapshot.topVolume[0].symbol, "SSI");
    assert.ok(Date.now() - Date.parse(snapshot.fetchedAt) < 60_000);
    assert.ok(timeouts.every((ms) => ms === HSX_REQUEST_TIMEOUT_MS));
    assert.ok(cache.store.has("hsx:top-volume:last-good"));
  }

  {
    timeouts.length = 0;
    const staleAt = "2026-10-01T00:00:00.000Z";
    const cache = kv({
      "hsx:vnindex:1y:last-good": JSON.stringify({ fetchedAt: staleAt, rows: [point("VNINDEX", 88)] })
    });
    const attempts = { "1y": 0, other: 0 };
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes("top/main-volume")) return jsonResponse(topBody());
      const range = chartRange(href);
      if (range === "1y") {
        attempts["1y"] += 1;
        throw timeoutError();
      }
      attempts.other += 1;
      return jsonResponse(chartBody("VNINDEX", range === "1w" ? 11 : 22));
    };
    const snapshot = await getHSXMarketSnapshot({ CACHE: cache });
    assert.equal(attempts["1y"], 3);
    assert.equal(attempts.other, 2);
    assert.equal(snapshot.vnindex1W[0].closePrice, 11);
    assert.equal(snapshot.vnindex1M[0].closePrice, 22);
    assert.equal(snapshot.vnindex1Y[0].closePrice, 88);
    assert.equal(snapshot.topVolume[0].symbol, "SSI");
    assert.equal(snapshot.fetchedAt, staleAt);
    const stored = JSON.parse(cache.store.get("hsx:snapshot:last-good"));
    assert.equal(stored.fetchedAt, staleAt);
    assert.ok(timeouts.includes(HSX_REQUEST_TIMEOUT_MS));
  }

  {
    const before = Date.now();
    const cache = kv({
      "hsx:vnindex:1y:last-good": JSON.stringify([point("VNINDEX", 64)])
    });
    globalThis.fetch = async (url) => {
      const href = String(url);
      if (href.includes("top/main-volume")) return jsonResponse(topBody());
      if (chartRange(href) === "1y") throw timeoutError();
      return jsonResponse(chartBody("VNINDEX", 11));
    };
    const snapshot = await getHSXMarketSnapshot({ CACHE: cache });
    assert.equal(snapshot.vnindex1Y[0].closePrice, 64);
    assert.ok(Date.parse(snapshot.fetchedAt) < before - 1000);
  }

  {
    const fetchedAt = "2026-10-17T01:02:03.000Z";
    const cache = kv({
      "hsx:snapshot:last-good": JSON.stringify({
        fetchedAt,
        topVolume: [{ symbol: "NVL", price: "10", volume: "1", ratioPct: "1", lot: "1" }],
        vnindex1W: [point("VNINDEX", 7)],
        vnindex1M: [],
        vnindex1Y: [point("VNINDEX", 9)],
        statsUrl: "https://www.hsx.vn/stats",
        chartUrl: "https://www.hsx.vn/chart"
      })
    });
    globalThis.fetch = async () => {
      throw timeoutError();
    };
    const snapshot = await getHSXMarketSnapshot({ CACHE: cache });
    assert.equal(snapshot.fetchedAt, fetchedAt);
    assert.equal(snapshot.topVolume[0].symbol, "NVL");
    assert.equal(snapshot.vnindex1Y[0].closePrice, 9);
  }

  {
    const cache = kv({
      "hsx:stock-chart:NVL:1m:last-good": JSON.stringify([point("NVL", 41)])
    });
    const seen = [];
    globalThis.fetch = async (url) => {
      const symbol = new URL(String(url)).searchParams.get("symbolString").replace("|", "");
      seen.push(symbol);
      if (symbol === "NVL") throw timeoutError();
      if (symbol === "SSI") return jsonResponse(chartBody("SSI", 33));
      return jsonResponse({ success: false }, 522);
    };
    const [nvl, ssi, tpb] = await Promise.all([
      getStockChartRange({ CACHE: cache }, "NVL", "1m"),
      getStockChartRange({ CACHE: cache }, "SSI", "1m"),
      getStockChartRange({ CACHE: cache }, "TPB", "1m")
    ]);
    assert.equal(nvl[0].closePrice, 41);
    assert.equal(ssi[0].symbol, "SSI");
    assert.equal(tpb.length, 0);
    assert.ok(seen.includes("NVL") && seen.includes("SSI") && seen.includes("TPB"));
  }

  {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      return jsonResponse({ success: false }, 404);
    };
    const points = await getVNIndexChartPoints({ CACHE: kv() }, "1w");
    assert.equal(points.length, 0);
    assert.equal(attempts, 1);
  }

  {
    resetMissingR2KeyWarningForTests();
    const missing = new Error("The specified key does not exist.");
    assert.equal(isMissingR2Key({ message: "The specified key does not exist." }), true);

    // readR2Object: no head pre-check; get() returning null is a quiet miss.
    let heads = 0;
    assert.equal(
      await readR2Object(
        {
          async head() {
            heads += 1;
            return null;
          },
          async get() {
            return null;
          }
        },
        "optimized/article-thumb/missing.webp"
      ),
      null
    );
    assert.equal(heads, 0);
    assert.deepEqual(
      await readR2Object({ async get(key) { return { key }; } }, "intel/daily/2026-10-18.json"),
      { key: "intel/daily/2026-10-18.json" }
    );
    await assert.rejects(
      () => readR2Object({ async get() { throw new Error("R2 unavailable"); } }, "k"),
      /R2 unavailable/
    );

    // r2ObjectExists: list-based, exact key match, real errors still thrown.
    const listBucket = (keys) => ({
      async head() {
        throw new Error("head should not run");
      },
      async list({ prefix, limit }) {
        return { objects: keys.filter((k) => k.startsWith(prefix)).slice(0, limit).map((key) => ({ key })) };
      }
    });
    assert.equal(await r2ObjectExists(listBucket([]), "optimized/article-thumb/x.webp"), false);
    assert.equal(await r2ObjectExists(listBucket(["a/b.webp"]), "a/b.webp"), true);
    assert.equal(await r2ObjectExists(listBucket(["a/b.webp.bak"]), "a/b.webp"), false);
    await assert.rejects(
      () => r2ObjectExists({ async list() { throw new Error("R2 unavailable"); } }, "k"),
      /R2 unavailable/
    );

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.map(String).join(" "));
    try {
      resetMissingR2KeyWarningForTests();
      const bucket = {
        async get() {
          throw missing;
        }
      };
      assert.equal(await readR2Object(bucket, "missing-a"), null);
      assert.equal(await readR2Object(bucket, "missing-b"), null);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /treating further missing keys as cache misses/i);
    } finally {
      console.warn = originalWarn;
    }

    const logged = [];
    const originalError = console.error;
    console.error = (...args) => logged.push(args.map(String).join(" "));
    try {
      const snap = await loadInvestorSnapshotFromR2({ ASSETS: { async get() { return null; } } }, "2026-10-18");
      assert.equal(snap, null);
      assert.equal(logged.length, 0);
    } finally {
      console.error = originalError;
    }
  }

  {
    // Images transformations are gone: originals are stored and served, IMAGES is never called.
    const jpeg = new Uint8Array(180).fill(7);
    const stored = new Map();
    const bucket = {
      async head() {
        throw new Error("head should not run");
      },
      async list({ prefix }) {
        return { objects: [...stored.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
      },
      async put(key, body, opts) {
        stored.set(key, { body, contentType: opts.httpMetadata.contentType });
      }
    };
    const images = {
      input() {
        throw new Error("IMAGES binding should not be used");
      }
    };
    let fetches = 0;
    const calls = [];
    globalThis.fetch = async (_url, init) => {
      fetches += 1;
      calls.push(Boolean(init?.cf?.image));
      return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
    };

    const first = await ensureOptimizedImageAsset({
      env: { ASSETS: bucket, IMAGES: images },
      sourceUrl: "https://cdn.example/a.jpg",
      namespace: "article-thumb"
    });
    const firstAgain = await ensureOptimizedImageAsset({
      env: { ASSETS: bucket, IMAGES: images },
      sourceUrl: "https://cdn.example/a.jpg",
      namespace: "article-thumb"
    });
    assert.match(first, /^\/assets\/original\/article-thumb\/[a-f0-9]+$/);
    assert.equal(firstAgain, first);
    assert.equal(fetches, 1);
    assert.equal(stored.get(first.replace(/^\/assets\//, "")).contentType, "image/jpeg");

    // Legacy optimized WebP already in R2 is still reused without fetching.
    stored.set("optimized/media-thumb/legacy.webp", {});
    const { sha256Hex } = await import("../.tmp-test/utils/sha256.js");
    const legacyHash = await sha256Hex("https://cdn.example/legacy.jpg");
    stored.set(`optimized/media-thumb/${legacyHash}.webp`, {});
    const legacy = await ensureOptimizedImageAsset({
      env: { ASSETS: bucket },
      sourceUrl: "https://cdn.example/legacy.jpg",
      namespace: "media-thumb"
    });
    assert.equal(legacy, `/assets/optimized/media-thumb/${legacyHash}.webp`);
    assert.equal(fetches, 1);

    globalThis.fetch = async () => new Response("nope", { status: 404 });
    const missed = await ensureOptimizedImageAsset({
      env: { ASSETS: bucket },
      sourceUrl: "https://example.com/pic.jpg",
      namespace: "article-thumb"
    });
    assert.equal(missed, "https://example.com/pic.jpg");

    globalThis.fetch = async (_url, init) => {
      calls.push(Boolean(init?.cf?.image));
      return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
    };
    const served = await fetchOptimizedRemoteImage("https://cdn.example/d.jpg", { width: 400, accept: "image/webp" }, { IMAGES: images });
    assert.equal(served.headers.get("content-type"), "image/jpeg");
    assert.equal(await served.arrayBuffer().then((buf) => buf.byteLength), jpeg.byteLength);
    assert.ok(calls.every((usedCfImage) => usedCfImage === false));
  }

  {
    const healthy = d1Stub("D1 DB storage caused object to be reset", 0);
    await ensureDefaultSources(healthy.db);
    assert.equal(healthy.runs, NEWS_SOURCES.length);

    const reset = d1Stub("D1 DB storage caused object to be reset", 1);
    await assert.rejects(() => ensureDefaultSources(reset.db), /storage caused object to be reset/);
    assert.equal(reset.runs, 1);

    const permanent = d1Stub("no such table: news_sources", 5);
    await assert.rejects(() => ensureDefaultSources(permanent.db), /no such table/);
    assert.equal(permanent.runs, 1);

    const source = {
      id: "qa-source",
      name: "QA",
      type: "rss",
      baseUrl: null,
      feedUrl: "https://example.com/rss",
      listUrl: null,
      enabled: true,
      allowCrawl: false,
      respectRobots: true,
      extractorKey: null,
      notes: null,
      isDefault: false
    };
    const status = {
      reportDate: "2026-10-18",
      feedOkCount: 1,
      feedErrorCount: 0,
      feedTotalCount: 1,
      aiOk: true,
      articleCount: 1
    };
    const writes = [
      ["d1_error: storage reset", (db) => toggleSource(db, "vietstock")],
      ["network connection lost", (db) => logCrawlRun(db, { sourceId: "vietstock", status: "error", message: "x", fetchedCount: 0 })],
      ["D1_ERROR: timeout", (db) => insertSystemStatusSnapshot(db, status)],
      ["timeout while executing", (db) => createSource(db, source)]
    ];
    for (const [message, call] of writes) {
      const stub = d1Stub(message, 5);
      await assert.rejects(() => call(stub.db), new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.equal(stub.runs, 1, message);
    }

    for (const message of ["D1_ERROR: internal", "network connection lost", "statement timeout"]) {
      const stub = d1ReadStub(message);
      const report = await getDailyReport(stub.db, "2026-10-18");
      assert.equal(report, null);
      assert.equal(stub.reads, 2, message);
    }
  }

  console.log("upstream resilience tests passed");
} finally {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
}

function d1ReadStub(message) {
  let reads = 0;
  const stmt = {
    bind() {
      return stmt;
    },
    async all() {
      reads += 1;
      if (reads === 1) throw new Error(message);
      return { results: [] };
    }
  };
  return {
    db: {
      prepare() {
        return stmt;
      }
    },
    get reads() {
      return reads;
    }
  };
}

function d1Stub(message, failTimes) {
  let runs = 0;
  const db = {
    prepare() {
      return {
        bind() {
          return {
            async run() {
              runs += 1;
              if (runs <= failTimes) throw new Error(message);
              return { success: true };
            }
          };
        }
      };
    }
  };
  return {
    db,
    get runs() {
      return runs;
    }
  };
}
