/** Android App Links — release keystore SHA-256 (Cloudspace / Orange Cloud). */
export function buildAssetLinksJson(): unknown[] {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "vn.orangecloud.stocknews",
        sha256_cert_fingerprints: [
          "95:CC:09:05:0E:98:5C:36:83:ED:BD:E3:2F:6E:18:49:4B:D3:8E:47:7A:4D:3B:82:A2:29:C3:91:56:30:27:D2"
        ]
      }
    }
  ];
}

/** iOS Universal Links — set APPLE_TEAM_ID Worker var after Cloudspace Apple enrollment. */
export function buildAppleAppSiteAssociation(teamId?: string): Record<string, unknown> {
  const tid = teamId?.trim() || "TEAMID";
  const appId = `${tid}.vn.orangecloud.stocknews`;
  return {
    applinks: {
      apps: [],
      details: [
        {
          appID: appId,
          paths: ["/tin/*", "/stocks/*", "/article", "/notify", "/desk", "/portfolio", "/briefing", "/"]
        }
      ]
    },
    webcredentials: {
      apps: [appId]
    }
  };
}
