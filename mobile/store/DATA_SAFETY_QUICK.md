# Google Play — Data safety (quick answers)

Open: **App content → Data safety → Start**

| Question | Answer |
|----------|--------|
| Does your app collect or share user data? | **Yes** |
| Is all data encrypted in transit? | **Yes** |
| Can users request data deletion? | **Yes** → support@orangecloud.vn |

### Data types to declare

**App activity** (optional)
- Collected: Yes · Shared: No · Optional: Yes
- Purpose: Analytics (anonymous page load metrics)

**Device or other IDs**
- Collected: Yes · Shared: No · Optional: Yes  
- Purpose: App functionality (anonymous watchlist ID)

**User IDs** (only if user connects Telegram)
- Collected: Yes · Shared: With Telegram · Optional: Yes
- Purpose: Notifications

### Do NOT declare
Location, contacts, photos, financial accounts, name, email (unless user emails support).

Privacy policy: `https://stocknews.orangecloud.vn/privacy`

Save → Submit.
