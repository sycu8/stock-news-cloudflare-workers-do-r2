# Google Play — Data safety form

Answer based on current app behavior (Capacitor WebView → stocknews.orangecloud.vn).

## Does your app collect or share user data?
**Yes** — limited technical and optional preference data.

## Data types

| Data type | Collected | Shared | Purpose | Optional |
|-----------|-----------|--------|---------|----------|
| App interactions (page views, RUM timing) | Yes | No | Analytics / performance | Yes (anonymous aggregates) |
| Device or other IDs (anonymous watchlist ID in cookie/KV) | Yes | No | App functionality (watchlist) | Yes |
| User IDs (Telegram chat ID if user opts in) | Yes | With Telegram | Notifications | Yes |
| Crash logs | No* | — | — | — |

*Unless you enable Firebase Crashlytics later — currently not integrated.

## Data handling

- **Encrypted in transit:** Yes (HTTPS)
- **Users can request deletion:** Yes — email support@orangecloud.vn or clear app data / cookies
- **Committed to Play Families policy:** N/A (not child-directed)

## Data not collected

- Location
- Contacts
- Photos / files
- Financial info (no bank accounts; watchlist symbols only)
- Personal name / email (unless user emails support)

## Security practices

- Data encrypted in transit
- Users can delete watchlist data (clear site data or contact support)

## Privacy policy
https://stocknews.orangecloud.vn/privacy
