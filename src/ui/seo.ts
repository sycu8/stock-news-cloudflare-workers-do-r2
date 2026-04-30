const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid"
]);

export function buildCanonicalUrl(requestUrl: string, allowedParams: string[]): string {
  const url = new URL(requestUrl);
  const keep = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return;
    if (!allowedParams.includes(lower)) return;
    if (!value.trim()) return;
    keep.append(lower, value.trim());
  });
  keep.sort();
  const qs = keep.toString();
  return `${url.origin}${url.pathname}${qs ? `?${qs}` : ""}`;
}

export function buildMarketingAttributionCookieScript(): string {
  return `(function(){
  try {
    var p = new URLSearchParams(location.search);
    var keys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content","gclid","gbraid","wbraid","fbclid","msclkid"];
    var out = {};
    var has = false;
    for (var i=0;i<keys.length;i++) {
      var v = p.get(keys[i]);
      if (!v) continue;
      out[keys[i]] = v.slice(0,120);
      has = true;
    }
    if (!has) return;
    out.ts = Date.now();
    document.cookie = "sn_attribution=" + encodeURIComponent(JSON.stringify(out)) + "; Path=/; Max-Age=2592000; SameSite=Lax";
  } catch (_) {}
})();`;
}

export function buildHomeJsonLd(canonicalUrl: string, description: string): string {
  return JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Tin thị trường chứng khoán Việt Nam",
      url: canonicalUrl,
      inLanguage: "vi",
      description,
      potentialAction: {
        "@type": "SearchAction",
        target: `${new URL(canonicalUrl).origin}/search?q={query}`,
        "query-input": "required name=query"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Stock News by Orange Cloud",
      url: new URL(canonicalUrl).origin
    }
  ]);
}
