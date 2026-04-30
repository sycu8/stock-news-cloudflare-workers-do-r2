import { reportDayStartIso } from "../utils/date";

/** CSS dùng chung homepage + Desk portfolio */
export const LIVE_FEED_BAR_STYLES = `
  .liveFeedBar{
    position:fixed;bottom:0;left:0;right:0;z-index:90;
    padding:10px 12px;background:color-mix(in srgb,var(--surface2) 94%,var(--bg));
    border-top:1px solid var(--border);box-shadow:0 -8px 24px rgba(0,0,0,.08);
    font-size:.88rem;display:none;
  }
  .liveFeedBar.open{display:block}
  html[data-theme="dark"] .liveFeedBar{box-shadow:0 -8px 28px rgba(0,0,0,.4)}
  .liveFeedBarInner{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;max-width:980px;margin:0 auto}
  #liveFeedBarText{color:var(--text);flex:1 1 200px}
  .liveFeedBarInner button,.liveFeedBarInner label{font:inherit}
  .liveFeedBarReload{padding:8px 14px;border-radius:10px;border:1px solid color-mix(in srgb,var(--primary) 45%,var(--border));background:color-mix(in srgb,var(--primary2) 18%,var(--surface2));font-weight:700;color:var(--text);cursor:pointer}
  .liveFeedBarDismiss{padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--muted);cursor:pointer;line-height:1}
  .liveFeedBarNotify{display:inline-flex;align-items:center;gap:6px;font-size:.82rem;color:var(--muted);cursor:pointer;margin-left:auto}
`;

export function computeLivePollAnchor(rows: Array<{ publishedAt: string }>): string {
  let m = "";
  for (const a of rows) {
    if (a.publishedAt > m) m = a.publishedAt;
  }
  return m;
}

export function livePollSinceFallback(reportDate: string): string {
  return reportDayStartIso(reportDate);
}

export function renderLiveFeedBarHtml(): string {
  return `<div id="liveFeedBar" class="liveFeedBar" role="status" aria-live="polite" hidden>
    <div class="liveFeedBarInner">
      <span id="liveFeedBarText"></span>
      <button type="button" class="liveFeedBarReload" id="liveFeedBarReload">Tải lại trang</button>
      <label class="liveFeedBarNotify"><input type="checkbox" id="liveFeedBarNotify" /> Báo trình duyệt</label>
      <button type="button" class="liveFeedBarDismiss" id="liveFeedBarDismiss" aria-label="Đóng">×</button>
    </div>
  </div>`;
}

/** Script poll /api/live/poll — mode home hoặc portfolio (cookie vnwatch máy chủ đọc khi portfolio). */
export function renderLivePollScript(config: {
  reportDate: string;
  anchorPublishedAt: string;
  /** home: báo tin mới chung; portfolio: làm rõ có tin khớp mã */
  mode: "home" | "portfolio";
}): string {
  const { reportDate, anchorPublishedAt, mode } = config;
  const fallback = livePollSinceFallback(reportDate);
  const startSince = anchorPublishedAt.trim() ? anchorPublishedAt : fallback;
  return `<script>(function(){
  var reportDate = ${JSON.stringify(reportDate)};
  var since = ${JSON.stringify(startSince)};
  var mode = ${JSON.stringify(mode)};
  var pollMs = 48000;
  var storageKey = "sn_live_notify_browser";
  var bar = document.getElementById("liveFeedBar");
  var txt = document.getElementById("liveFeedBarText");
  var btnReload = document.getElementById("liveFeedBarReload");
  var btnDismiss = document.getElementById("liveFeedBarDismiss");
  var chk = document.getElementById("liveFeedBarNotify");
  if (!bar||!txt||!btnReload||!btnDismiss) return;
  try{ chk.checked = localStorage.getItem(storageKey)==="1"; }catch{}
  chk.addEventListener("change", function(){
    try{
      localStorage.setItem(storageKey, chk.checked?"1":"0");
      if(chk.checked && "Notification" in window && Notification.permission==="default")
        Notification.requestPermission().catch(function(){});
    }catch{}
  });
  btnReload.addEventListener("click", function(){ window.location.reload(); });
  btnDismiss.addEventListener("click", function(){ bar.classList.remove("open"); bar.hidden=true; });
  async function notifyBrowser(titleLine, payload){
    try{
      if(!chk.checked)return;
      if(!("Notification" in window)||Notification.permission!=="granted")return;
      new Notification(titleLine,{body:payload.body||"",silent:false});
    }catch{}
  }
  async function tick(){
    if(document.visibilityState==="hidden")return;
    try{
      var u = "/api/live/poll?date="+encodeURIComponent(reportDate)+"&since="+encodeURIComponent(since)+(mode==="portfolio"?"&mode=portfolio":"");
      var r = await fetch(u,{credentials:"same-origin",cache:"no-store"});
      if(!r.ok)return;
      var d = await r.json();
      if(d.nextSince&&d.nextSince>since) since = d.nextSince;
      var n = d.newCount||0;
      var pn = d.portfolioNewCount||0;
      if(mode==="portfolio"){
        if(n>0 && pn>0){
          txt.textContent="Có "+pn+" tin mới có thể liên quan mã của bạn (tổng "+n+" bài trong lô crawl).";
          bar.classList.add("open"); bar.hidden=false;
          notifyBrowser("Danh mục",{body:txt.textContent});
        } else if(n>0){ txt.textContent="Có "+n+" bài mới trong ngày."; bar.classList.add("open"); bar.hidden=false; }
      }else{
        if(n>0){ txt.textContent="Có "+n+" bài mới — bấm tải lại để xem đầy đủ."; bar.classList.add("open"); bar.hidden=false;
          notifyBrowser("Stock News",{body:txt.textContent});
        }
      }
    }catch{}
  }
  window.setInterval(tick, pollMs);
  window.setTimeout(tick, 4200);
})();<\/script>`;
}
