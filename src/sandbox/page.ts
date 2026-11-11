// Sandbox payment page. Deliberately NOT a replica of the real gateway page:
// no bank/Shaparak branding and no card fields; it only lets the tester pick an outcome.
import type { SandboxConfig, Transaction } from "./store.js";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const money = (n: number) => faDigits(n.toLocaleString("en-US"));

const TYPE_FA: Record<string, string> = {
  PURCHASE: "خرید", MULTIACCPURCHASE: "خرید با تسهیم", BILL: "پرداخت قبض",
  MCI: "شارژ همراه اول", MTN: "شارژ ایرانسل", RTL: "شارژ رایتل",
  "MCI-PIN": "شارژ پین همراه اول", "MTN-PIN": "شارژ پین ایرانسل", "RTL-PIN": "شارژ پین رایتل",
};

const STYLE = `
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f4f5f7;color:#1f2328}
.banner{background:#7c3aed;color:#fff;text-align:center;padding:10px 16px;font-size:14px}
.wrap{max-width:720px;margin:32px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-bottom:16px}
h1{font-size:18px;margin:0 0 4px}.sub{color:#6b7280;font-size:13px;margin:0}
.amount{font-size:28px;font-weight:700;margin:16px 0 4px}
.grid{display:grid;grid-template-columns:1fr auto;gap:10px 16px;font-size:14px;margin-top:16px}
.grid dt{color:#6b7280}.grid dd{margin:0;direction:ltr;text-align:left;font-family:ui-monospace,monospace}
.timer{display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:10px;padding:10px 14px;font-size:14px}
.timer b{font-family:ui-monospace,monospace;font-size:16px}
.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px}
button{font:inherit;font-size:15px;border:0;border-radius:10px;padding:14px;cursor:pointer}
.ok{background:#16a34a;color:#fff}.fail{background:#dc2626;color:#fff}.cancel{background:#e5e7eb}.unk{background:#f59e0b;color:#fff}
.hint{font-size:12px;color:#6b7280;margin-top:14px;line-height:1.8}
.err{color:#b91c1c;font-weight:600}
`;

function shell(title: string, body: string) {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)}</title><style>${STYLE}</style></head><body>
<div class="banner">محیط شبیه‌سازی Dorsa — هیچ پرداخت واقعی انجام نمی‌شود و اطلاعات کارت دریافت نمی‌شود</div>
<div class="wrap">${body}</div></body></html>`;
}

export function paymentPage(tx: Transaction, cfg: SandboxConfig, remainingMs: number, warning?: string): string {
  let site = "";
  try { site = new URL(tx.callbackApi).origin; } catch { site = tx.callbackApi; }
  const secs = Math.max(0, Math.floor(remainingMs / 1000));
  return shell("شبیه‌ساز درگاه پرداخت", `
<div class="card">
  <h1>شبیه‌ساز درگاه پرداخت (Dorsa v28)</h1>
  <p class="sub">نتیجه پرداخت را انتخاب کنید تا به آدرس callback فروشگاه برگردید.</p>
  <div class="amount">${money(tx.amount)} ریال</div>
  <dl class="grid">
    <dt>شماره فاکتور</dt><dd>${esc(tx.invoice)}</dd>
    <dt>شماره پذیرنده</dt><dd>${cfg.merchantNumber}</dd>
    <dt>شماره ترمینال</dt><dd>${tx.terminalNumber}</dd>
    <dt>نوع عملیات</dt><dd style="direction:rtl;text-align:left;font-family:inherit">${esc(TYPE_FA[tx.serviceType] ?? tx.serviceType)}</dd>
    <dt>وب‌سایت فروشگاه</dt><dd>${esc(site)}</dd>
  </dl>
</div>
${warning ? `<div class="card err">${esc(warning)}</div>` : ""}
<div class="card">
  <div class="timer"><span>زمان باقی‌مانده</span><b id="t">--:--</b></div>
  <form method="post" class="actions">
    <button class="ok" name="outcome" value="success">پرداخت موفق</button>
    <button class="fail" name="outcome" value="failed">پرداخت ناموفق</button>
    <button class="unk" name="outcome" value="unknown">وضعیت نامشخص</button>
    <button class="cancel" name="outcome" value="cancel">انصراف</button>
  </form>
  <p class="hint">«وضعیت نامشخص» مثل قطعی ارتباط با سوییچ رفتار می‌کند: callback با status=unknown برمی‌گردد و استعلام تا تعیین تکلیف، status=2 می‌دهد.
  با پایان زمان، کاربر با status=expire به فروشگاه برمی‌گردد.</p>
</div>
<script>
let s=${secs};const el=document.getElementById("t");
function draw(){el.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
draw();const iv=setInterval(()=>{s--;if(s<=0){clearInterval(iv);s=0;draw();
const f=document.createElement("form");f.method="post";const i=document.createElement("input");i.type="hidden";i.name="outcome";i.value="expire";f.appendChild(i);document.body.appendChild(f);f.submit();return}draw()},1000);
</script>`);
}

export function errorPage(title: string, message: string, backUrl?: string): string {
  return shell(title, `<div class="card"><h1 class="err">${esc(title)}</h1><p>${esc(message)}</p>
${backUrl ? `<p><a href="${esc(backUrl)}">بازگشت به فروشگاه</a></p>` : ""}</div>`);
}

export function homePage(baseUrl: string, cfg: SandboxConfig): string {
  return shell("Dorsa Sandbox", `<div class="card"><h1>شبیه‌ساز درگاه پرداخت پاسارگاد (Dorsa v28)</h1>
<dl class="grid">
<dt>Base URL</dt><dd>${esc(baseUrl)}</dd>
<dt>username / password</dt><dd>${esc(cfg.username)} / ${esc(cfg.password)}</dd>
<dt>terminalNumber</dt><dd>${cfg.terminalNumber}</dd>
</dl><p class="hint">این شبیه‌ساز بر اساس مستند Dorsa نسخه 28 ساخته شده و جایگزین تست نهایی روی ترمینال واقعی نیست.</p></div>`);
}
