import assert from "node:assert/strict";

import {
  normalizeTelegramPrefs,
  filterArticlesForTelegramSubscriber
} from "../.tmp-test/services/telegram-prefs.js";

const prefs = normalizeTelegramPrefs({ symbols: ["vnm"], minImpact: 150, breakingOnly: true });
assert.deepEqual(prefs.symbols, ["VNM"]);
assert.equal(prefs.minImpact, 100);
assert.equal(prefs.breakingOnly, true);

const articles = [
  {
    title: "VNM news",
    summaryVi: "VNM",
    snippet: "",
    url: "https://example.com/1",
    sourceId: "x",
    sourceName: "A",
    publishedAt: "2026-06-26T01:00:00Z",
    contentLimited: false,
    imageUrl: null,
    sourceCount: 3,
    sourceNames: ["A", "B", "C"],
    confirmationLevel: "confirmed",
    confirmationLabel: "Confirmed"
  },
  {
    title: "Other",
    summaryVi: "macro",
    snippet: "",
    url: "https://example.com/2",
    sourceId: "x",
    sourceName: "A",
    publishedAt: "2026-06-26T02:00:00Z",
    contentLimited: false,
    imageUrl: null,
    sourceCount: 1,
    sourceNames: ["A"],
    confirmationLevel: "single",
    confirmationLabel: "Single"
  }
];

const symFiltered = filterArticlesForTelegramSubscriber(articles, normalizeTelegramPrefs({ symbols: ["VNM"] }));
assert.equal(symFiltered.length, 1);

const breakingFiltered = filterArticlesForTelegramSubscriber(
  articles,
  normalizeTelegramPrefs({ symbols: [], breakingOnly: true })
);
assert.equal(breakingFiltered.length, 1);
assert.equal(breakingFiltered[0].confirmationLevel, "confirmed");

console.log("telegram-prefs tests passed");
