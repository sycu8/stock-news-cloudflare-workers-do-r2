import assert from "node:assert/strict";

import { pickRssItemImage } from "../.tmp-test/services/rss-image.js";

assert.equal(
  pickRssItemImage({ "media:thumbnail": { "@_url": "https://cdn.example/thumb.jpg" } }),
  "https://cdn.example/thumb.jpg",
  "media:thumbnail url should be picked"
);

assert.equal(
  pickRssItemImage({
    description: '<p>Lead</p><img src="https://cdn.example/inline.png" alt="" />'
  }),
  "https://cdn.example/inline.png",
  "img in description should be picked"
);

assert.equal(
  pickRssItemImage({
    enclosure: { "@_url": "https://cdn.example/enclosure.webp", "@_type": "image/webp" }
  }),
  "https://cdn.example/enclosure.webp",
  "image enclosure should be picked"
);

assert.equal(
  pickRssItemImage({
    enclosure: { "@_url": "https://cdn.example/audio.mp3", "@_type": "audio/mpeg" }
  }),
  null,
  "non-image enclosure should be ignored"
);

assert.equal(pickRssItemImage({ title: "No image" }), null, "missing image fields should return null");

console.log("rss-image tests passed");
