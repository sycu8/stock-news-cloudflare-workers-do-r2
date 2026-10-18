import assert from "node:assert/strict";

import {
  isBrokenHostedImageUrl,
  resolveStoredArticleImageUrl
} from "../.tmp-test/services/article-image.js";
import { pickArticleImageFromHtml } from "../.tmp-test/services/source-extract.js";

assert.equal(
  isBrokenHostedImageUrl("https://imagedelivery.net/acct/hash/public"),
  true,
  "imagedelivery URLs should be treated as broken for card display"
);
assert.equal(isBrokenHostedImageUrl("/assets/optimized/article-thumb/x.webp"), false);

assert.equal(
  resolveStoredArticleImageUrl("https://imagedelivery.net/acct/abc123hash/public"),
  "/assets/optimized/article-thumb/abc123hash.webp",
  "should map delivery URL to R2 optimized path"
);
assert.equal(
  resolveStoredArticleImageUrl("https://image.cnbcfm.com/api/v1/image/foo.jpeg"),
  "https://image.cnbcfm.com/api/v1/image/foo.jpeg"
);

const cnbcHtml =
  '<html><body><img src="https://image.cnbcfm.com/api/v1/image/108329118-test.jpeg?v=1&amp;w=1920" /></body></html>';
assert.equal(
  pickArticleImageFromHtml(cnbcHtml, "https://www.cnbc.com/example.html"),
  "https://image.cnbcfm.com/api/v1/image/108329118-test.jpeg?v=1&w=1920",
  "should extract CNBC article image and decode entities"
);

console.log("article-image tests passed");
