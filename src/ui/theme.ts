/**
 * Design system — dùng chung mọi trang (màu, font, spacing UX).
 * Chọn light/dark qua cookie `sn_theme`; route `GET /api/set-appearance`.
 */
export type Appearance = "light" | "dark";

export const APPEARANCE_COOKIE = "sn_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseAppearanceFromCookie(cookieHeader: string | undefined): Appearance {
  if (!cookieHeader) return "light";
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${APPEARANCE_COOKIE}=(light|dark)(?:\\s|;|$)`, "i"));
  const v = m?.[1]?.toLowerCase();
  return v === "dark" ? "dark" : "light";
}

export function appearanceSetCookieHeader(appearance: Appearance): string {
  return `${APPEARANCE_COOKIE}=${appearance}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/** Google Fonts — luôn dùng cặp này trên toàn site. */
export function themeFontLinks(): string {
  return `<script>
(() => {
  const cookie = document.cookie.match(/(?:^|;\\s*)sn_theme=(light|dark)(?:\\s|;|$)/i);
  const theme = cookie?.[1]?.toLowerCase() === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  window.__snToggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.cookie = "sn_theme=" + next + "; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax";
    document.documentElement.setAttribute("data-theme", next);
    window.location.reload();
  };
})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" media="print" onload="this.media='all'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" /></noscript>`;
}

/** Biến semantic: gắn trên `html[data-theme="light|dark"]`. */
export function themeSemanticVariablesBlock(): string {
  return `
  html[data-theme="light"] {
    color-scheme: light;
    --bg: #f2f4f7;
    --surface: #ffffff;
    --surface2: #ffffff;
    --text: #121926;
    --muted: #475467;
    --border: #eaecf0;
    --shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
    --primary: #175cd3;
    --primary2: #155eef;
    --warning: #f59e0b;
    --pos: #12b76a;
    --neg: #f04438;
    --neu: #98a2b3;
    --accent: #ff6a00;
    --cyan: #0891b2;
    --code-bg: #f8fafc;
    --kpi-bg: #f9fafb;
    --desk-hero-grad: radial-gradient(900px 420px at 10% -10%, rgba(255,106,0,.1), transparent 55%), radial-gradient(700px 400px at 100% 0%, rgba(8,145,178,.08), transparent 50%), linear-gradient(180deg, #f2f4f7, #eef1f6);
  }
  html[data-theme="dark"] {
    color-scheme: dark;
    --bg: #090b10;
    --surface: #121826;
    --surface2: #161d2e;
    --text: #e8ecf4;
    --muted: #94a3b8;
    --border: #243047;
    --shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
    --primary: #7eb8ff;
    --primary2: #60a5fa;
    --warning: #fbbf24;
    --pos: #34d399;
    --neg: #fb7185;
    --neu: #64748b;
    --accent: #ff8c42;
    --cyan: #22d3ee;
    --code-bg: #0f1624;
    --kpi-bg: #141c2c;
    --desk-hero-grad: radial-gradient(1200px 600px at 10% -10%, rgba(255,106,0,.14), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(34,211,238,.1), transparent 50%), linear-gradient(180deg, #050608, #0c1018);
  }
  body.appBody {
    font-family: Montserrat, Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
    margin: 0;
    background: var(--bg);
    color: var(--text);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    line-height: var(--line-normal, 1.5);
  }
  :root {
    --font-size-xs: 12px;
    --font-size-sm: 14px;
    --font-size-md: 16px;
    --font-size-lg: 18px;
    --font-size-xl: 20px;
    --font-size-2xl: 24px;
    --line-tight: 1.25;
    --line-normal: 1.5;
    --line-relaxed: 1.65;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-pill: 999px;
    --control-h: 44px;
    --z-nav: 50;
    --z-sticky: 70;
    --z-floating: 96;
    --z-modal: 120;
  }
  .appearanceSwitch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 0.78rem;
    color: var(--muted);
    margin-left: auto;
  }
  .appearanceSwitchLabel { font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .appearanceSwitchBtn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text);
    font-weight: 700;
    font-size: 0.8rem;
    text-decoration: none;
    white-space: nowrap;
  }
  .appearanceSwitchBtn:hover {
    border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
    color: var(--primary2);
  }
  /* Floating — homepage (không chồng thanh menu); phía trên nút “lên đầu trang” */
  .themeCorner {
    position: fixed;
    right: max(12px, env(safe-area-inset-right));
    bottom: calc(104px + env(safe-area-inset-bottom, 0px));
    z-index: var(--z-floating);
    pointer-events: auto;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12));
  }
  html[data-theme="dark"] .themeCorner {
    filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.45));
  }
  .themeCorner .appearanceSwitch {
    margin-left: 0;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .themeCorner .appearanceSwitchLabel {
    font-size: 0.68rem;
    opacity: 0.9;
  }
  `;
}

/** `returnPath` phải bắt đầu bằng `/` (đã kiểm tra ở route). */
export function themeAppearanceSwitcher(appearance: Appearance, returnPath: string): string {
  const next = returnPath.startsWith("/") ? returnPath : "/";
  const target: Appearance = appearance === "dark" ? "light" : "dark";
  const labelVi = target === "dark" ? "Tối" : "Sáng";
  const icon = target === "dark" ? "☾" : "☀";
  return `<div class="appearanceSwitch" role="group" aria-label="Chế độ giao diện">
    <span class="appearanceSwitchLabel">Giao diện</span>
    <button class="appearanceSwitchBtn" type="button" data-next="${encodeURIComponent(next)}" onclick="window.__snToggleTheme && window.__snToggleTheme()">${icon} ${labelVi}</button>
  </div>`;
}
