import type { StoredArticle } from "../types";
import { linkArticleToCluster, upsertNewsCluster } from "../db";
import { buildClusterKeyForArticle, collapseDuplicateNews } from "./news-cluster";

/** Persist in-memory clusters to D1 after refresh. */
export async function persistArticleClusters(
  db: D1Database,
  articles: StoredArticle[]
): Promise<{ clusters: number; links: number }> {
  const grouped = collapseDuplicateNews(articles);
  let links = 0;
  for (const cluster of grouped) {
    const clusterKey = buildClusterKeyForArticle(cluster.title, cluster.publishedAt);
    const clusterId = await upsertNewsCluster(db, {
      clusterKey,
      canonicalTitle: cluster.title,
      firstSeenAt: cluster.publishedAt,
      lastSeenAt: cluster.publishedAt,
      sourceCount: cluster.sourceCount,
      confidenceLabel: cluster.confirmationLevel
    });
    if (!clusterId) continue;
    const members = articles.filter((a) => buildClusterKeyForArticle(a.title, a.publishedAt) === clusterKey);
    for (const m of members) {
      if (!m.id) continue;
      await linkArticleToCluster(db, m.id, clusterId);
      links += 1;
    }
  }
  return { clusters: grouped.length, links };
}
