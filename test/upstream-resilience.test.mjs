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
import {
  isImageTransformQuotaError,
  isImageTransformSkipped,
  resetImageTransformGuardForTests
} from "../.tmp-test/services/image-transform-guard.js";
import { HSX_REQUEST_TIMEOUT_MS, getHSXMarketSnapshot, getStockChartRange, getVNIndexChartPoints } from "../.tmp-test/services/hsx-market.js";
import { loadInvestorSnapshotFromR2 } from "../.tmp-test/services/investor-intel.js";
import {
  headR2Object,
  isMissingR2Key,
  isTransientD1Error,
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
    resetImageTransformGuardForTests();
    resetMissingR2KeyWarningForTests();
    const missing = new Error("The specified key does not exist.");
    assert.equal(isMissingR2Key({ message: "The specified key does not exist." }), true);
    let gets = 0;
    assert.equal(
      await readR2Object(
        {
          async head() {
            return null;
          },
          async get() {
            gets += 1;
            throw missing;
          }
        },
        "optimized/article-thumb/missing.webp"
      ),
      null
    );
    assert.equal(gets, 0);
    assert.equal(
      await readR2Object(
        {
          async head() {
            return { key: "present" };
          },
          async get() {
            throw missing;
          }
        },
        "intel/daily/2026-10-18.json"
      ),
      null
    );
    assert.equal(await headR2Object({ async head() { throw missing; } }, "optimized/article-thumb/x.webp"), null);
    assert.equal(
      await headR2Object(
        { async head() { throw { message: "NoSuchKey: The specified key does not exist." }; } },
        "optimized/article-thumb/y.webp"
      ),
      null
    );
    await assert.rejects(
      () =>
        readR2Object(
          {
            async head() {
              return { key: "k" };
            },
            async get() {
              throw new Error("R2 unavailable");
            }
          },
          "k"
        ),
      /R2 unavailable/
    );

    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args.map(String).join(" "));
    try {
      resetMissingR2KeyWarningForTests();
      const bucket = {
        async head() {
          throw missing;
        },
        async get() {
          throw new Error("get should not run");
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
      const snap = await loadInvestorSnapshotFromR2(
        {
          ASSETS: {
            async head() {
              throw missing;
            },
            async get() {
              throw missing;
            }
          }
        },
        "2026-10-18"
      );
      assert.equal(snap, null);
      assert.equal(logged.length, 0);
    } finally {
      console.error = originalError;
    }

    let fetched = 0;
    globalThis.fetch = async () => {
      fetched += 1;
      return new Response("nope", { status: 404 });
    };
    const missed = await ensureOptimizedImageAsset({
      env: {
        ASSETS: {
          async head() {
            throw missing;
          }
        }
      },
      sourceUrl: "https://example.com/pic.jpg",
      namespace: "article-thumb"
    });
    assert.equal(missed, "https://example.com/pic.jpg");
    assert.ok(fetched > 0);

    globalThis.fetch = async () => {
      throw new Error("fetch should not run on a cache hit");
    };
    const hit = await ensureOptimizedImageAsset({
      env: { ASSETS: { async head() { return { key: "present" }; } } },
      sourceUrl: "https://example.com/pic.jpg",
      namespace: "article-thumb"
    });
    assert.match(hit, /^\/assets\/optimized\/article-thumb\/.+\.webp$/);
  }

  {
    resetImageTransformGuardForTests();
    assert.equal(isImageTransformQuotaError(Object.assign(new Error("rejected"), { code: 9422 })), true);
    assert.equal(isImageTransformQuotaError(new Error("9422 usage limit was reached")), true);
    assert.equal(isImageTransformQuotaError(new Error("encode failed: unsupported")), false);
    const errors = [];
    const warnings = [];
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args) => errors.push(args.map(String).join(" "));
    console.warn = (...args) => warnings.push(args.map(String).join(" "));
    try {
      const jpeg = new Uint8Array(180).fill(7);
      let transforms = 0;
      const stored = new Map();
      const bucket = {
        async head(key) {
          return stored.has(key) ? { key } : null;
        },
        async put(key, body, opts) {
          stored.set(key, { body, contentType: opts.httpMetadata.contentType });
        }
      };
      const images = {
        input() {
          transforms += 1;
          return {
            transform() {
              return this;
            },
            output() {
              return this;
            },
            response() {
              throw new Error("9422 The transformation request is rejected because the usage limit was reached");
            }
          };
        }
      };
      globalThis.fetch = async () =>
        new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });

      const first = await ensureOptimizedImageAsset({
        env: { ASSETS: bucket, IMAGES: images },
        sourceUrl: "https://cdn.example/a.jpg",
        namespace: "article-thumb"
      });
      const second = await ensureOptimizedImageAsset({
        env: { ASSETS: bucket, IMAGES: images },
        sourceUrl: "https://cdn.example/b.jpg",
        namespace: "media-thumb"
      });
      const firstAgain = await ensureOptimizedImageAsset({
        env: { ASSETS: bucket, IMAGES: images },
        sourceUrl: "https://cdn.example/a.jpg",
        namespace: "article-thumb"
      });

      assert.match(first, /^\/assets\/original\/article-thumb\/[a-f0-9]+$/);
      assert.match(second, /^\/assets\/original\/media-thumb\/[a-f0-9]+$/);
      assert.equal(firstAgain, first);
      assert.equal(transforms, 1);
      assert.equal(isImageTransformSkipped(), true);
      assert.equal(stored.get(first.replace(/^\/assets\//, "")).contentType, "image/jpeg");
      assert.equal(errors.length, 0);
      assert.equal(warnings.filter((line) => line.includes("9422")).length, 1);

      resetImageTransformGuardForTests();
      let cfCalls = 0;
      globalThis.fetch = async (_url, init) => {
        if (init?.cf?.image) {
          cfCalls += 1;
          return new Response("quota", { status: 403, headers: { "cf-resized": "err=9422" } });
        }
        return new Response(jpeg, { status: 200, headers: { "content-type": "image/png" } });
      };
      const plainBucket = {
        async head() {
          return null;
        },
        async put(key, _body, opts) {
          stored.set(key, { contentType: opts.httpMetadata.contentType });
        }
      };
      const fromCf = await ensureOptimizedImageAsset({
        env: { ASSETS: plainBucket },
        sourceUrl: "https://cdn.example/c.png",
        namespace: "media-thumb"
      });
      const fromCfAgain = await ensureOptimizedImageAsset({
        env: { ASSETS: plainBucket },
        sourceUrl: "https://cdn.example/d.png",
        namespace: "media-thumb"
      });
      assert.match(fromCf, /^\/assets\/original\/media-thumb\//);
      assert.match(fromCfAgain, /^\/assets\/original\/media-thumb\//);
      assert.equal(cfCalls, 1);
      assert.equal(stored.get(fromCf.replace(/^\/assets\//, "")).contentType, "image/png");

      resetImageTransformGuardForTests();
      const webp = new Uint8Array(160).fill(3);
      let optimizedPuts = 0;
      globalThis.fetch = async () =>
        new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
      const optimized = await ensureOptimizedImageAsset({
        env: {
          ASSETS: {
            async head() {
              return null;
            },
            async put(key, body, opts) {
              optimizedPuts += 1;
              assert.match(key, /^optimized\/article-thumb\/.+\.webp$/);
              assert.equal(opts.httpMetadata.contentType, "image/webp");
              assert.equal(body.byteLength, webp.byteLength);
            }
          },
          IMAGES: {
            input() {
              return {
                transform() {
                  return this;
                },
                output() {
                  return this;
                },
                response() {
                  return new Response(webp, { status: 200, headers: { "content-type": "image/webp" } });
                }
              };
            }
          }
        },
        sourceUrl: "https://cdn.example/ok.jpg",
        namespace: "article-thumb"
      });
      assert.match(optimized, /^\/assets\/optimized\/article-thumb\/.+\.webp$/);
      assert.equal(optimizedPuts, 1);
      assert.equal(isImageTransformSkipped(), false);

      resetImageTransformGuardForTests();
      let inputCalls = 0;
      let resizeCalls = 0;
      globalThis.fetch = async (_url, init) => {
        if (init?.cf?.image) {
          resizeCalls += 1;
          return new Response(webp, { status: 200, headers: { "content-type": "image/webp" } });
        }
        return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
      };
      const resized = await fetchOptimizedRemoteImage(
        "https://cdn.example/fallback.jpg",
        { accept: "image/webp" },
        {
          IMAGES: {
            input() {
              inputCalls += 1;
              return {
                transform() {
                  return this;
                },
                output() {
                  return this;
                },
                response() {
                  throw new Error("encode failed: unsupported");
                }
              };
            }
          }
        }
      );
      assert.equal(inputCalls, 1);
      assert.equal(resizeCalls, 1);
      assert.equal(resized.headers.get("content-type"), "image/webp");
      assert.equal(isImageTransformSkipped(), false);

      resetImageTransformGuardForTests();
      const calls = [];
      globalThis.fetch = async (_url, init) => {
        calls.push(Boolean(init?.cf?.image));
        if (init?.cf?.image) {
          return new Response("quota", { status: 403, headers: { "cf-resized": "err=9422" } });
        }
        return new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } });
      };
      const served = await fetchOptimizedRemoteImage("https://cdn.example/d.jpg", {}, {});
      const servedNext = await fetchOptimizedRemoteImage("https://cdn.example/e.jpg", {}, {});
      assert.equal(served.headers.get("content-type"), "image/jpeg");
      assert.equal(servedNext.headers.get("content-type"), "image/jpeg");
      assert.deepEqual(calls, [true, false, false]);
      assert.equal(await served.arrayBuffer().then((buf) => buf.byteLength), jpeg.byteLength);
      assert.equal(errors.length, 0);
    } finally {
      console.error = originalError;
      console.warn = originalWarn;
      resetImageTransformGuardForTests();
    }
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
