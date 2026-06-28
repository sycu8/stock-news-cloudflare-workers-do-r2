/** Android App Links — replace SHA256 with release keystore fingerprint before production. */
export function buildAssetLinksJson(): unknown[] {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "vn.orangecloud.stocknews",
        sha256_cert_fingerprints: [
          "REPLACE_WITH_RELEASE_SHA256_FINGERPRINT",
          "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:EF:EA:A3:0D:CF:12:10:BC:EA"
        ]
      }
    }
  ];
}

/** iOS Universal Links — replace TEAMID with Apple Developer Team ID before production. */
export function buildAppleAppSiteAssociation(_origin: string): Record<string, unknown> {
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: "TEAMID.vn.orangecloud.stocknews",
          paths: ["/tin/*", "/stocks/*", "/article", "/notify", "/desk", "/portfolio", "/briefing", "/"]
        }
      ]
    },
    webcredentials: {
      apps: ["TEAMID.vn.orangecloud.stocknews"]
    }
  };
}
