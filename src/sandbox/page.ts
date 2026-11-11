// Sandbox payment page. Layout follows the PEP payment page so integrations can be
// rehearsed realistically, but: card inputs are disabled and carry no `name`
// (nothing can be submitted), no real logos are used, and the page is labelled
// as a simulator in large type. Only the chosen test outcome is posted.
import type { SandboxConfig, Transaction } from "./store.js";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const money = (n: number) => faDigits(n.toLocaleString("en-US"));

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "هزار میلیارد"];

function threeDigits(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100), r = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (r >= 10 && r < 20) parts.push(TEENS[r - 10]);
  else {
    if (Math.floor(r / 10)) parts.push(TENS[Math.floor(r / 10)]);
    if (r % 10) parts.push(ONES[r % 10]);
  }
  return parts.join(" و ");
}

/** 100000 → «صد هزار» */
export function toPersianWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "صفر";
  const groups: string[] = [];
  let i = 0;
  while (n > 0 && i < SCALES.length) {
    const g = n % 1000;
    if (g) groups.unshift([threeDigits(g), SCALES[i]].filter(Boolean).join(" "));
    n = Math.floor(n / 1000);
    i++;
  }
  return groups.join(" و ");
}

const TYPE_FA: Record<string, string> = {
  PURCHASE: "خرید", MULTIACCPURCHASE: "خرید تسهیمی", BILL: "پرداخت قبض",
  MCI: "شارژ همراه اول", MTN: "شارژ ایرانسل", RTL: "شارژ رایتل",
  "MCI-PIN": "شارژ پین همراه اول", "MTN-PIN": "شارژ پین ایرانسل", "RTL-PIN": "شارژ پین رایتل",
};

const STYLE = `
*{box-sizing:border-box}
html{font-size:17px}
body{margin:0;font-family:"B Nazanin","BNazanin","Nazanin",Vazirmatn,"IRANSans",Tahoma,sans-serif;background:#eef0f4;color:#1f2937;line-height:1.7;-webkit-font-smoothing:antialiased}
.page{max-width:1120px;margin:0 auto;padding:22px 16px 0}
.sim-ribbon{background:linear-gradient(90deg,#6d28d9,#7c3aed);color:#fff;text-align:center;font-weight:700;font-size:1.6rem;padding:10px 12px 12px;border-radius:14px;margin-bottom:16px;box-shadow:0 6px 18px rgba(109,40,217,.22)}
.sim-ribbon small{display:block;font-weight:400;font-size:.95rem;opacity:.92}
.header{background:#fff;border-radius:16px;border-top:8px solid #f39237;box-shadow:0 1px 3px rgba(16,24,40,.06),0 6px 16px rgba(16,24,40,.05);display:flex;align-items:center;justify-content:space-between;padding:18px 26px;margin-bottom:20px}
.brand{display:flex;align-items:center;gap:14px}
.mark{width:46px;height:46px;border-radius:12px;background:#fff4ea;border:2px solid #f39237;color:#f39237;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.25rem}
.header h1{margin:0;font-size:1.35rem;font-weight:700}
.header h1 span{display:block;font-size:.9rem;font-weight:400;color:#6b7280}
.badge{font-size:.85rem;font-weight:700;color:#6d28d9;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:999px;padding:6px 14px;white-space:nowrap;font-family:Tahoma,sans-serif}
.cols{display:grid;grid-template-columns:1.5fr 1fr;gap:20px;align-items:start}
.box{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(16,24,40,.06),0 6px 16px rgba(16,24,40,.05);padding:16px}
.box-title{background:#f6f7f9;border-radius:10px;padding:10px 18px;font-weight:700;font-size:1.1rem;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.box-title:before{content:"";width:6px;height:20px;border-radius:3px;background:#f39237}
.field{position:relative;border:1px solid #e3e6eb;border-radius:12px;height:58px;display:flex;align-items:center;padding:0 16px;margin:0 4px 12px;background:#fafbfc}
.field input{border:0;background:transparent;width:100%;height:100%;font:inherit;font-size:1.05rem;color:#9aa1ac;cursor:not-allowed}
.field input::placeholder{color:#a3a9b3}
.field .ico{font-size:1rem;color:#b5bac2;margin-inline-start:10px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 4px 12px}
.row2 .field,.captcha .field,.otp .field{margin:0}
.label{font-weight:700;margin:4px 8px 8px;color:#374151}
.captcha{display:grid;grid-template-columns:1.4fr 1fr;gap:10px;margin:0 4px 12px}
.captcha .img{border-radius:12px;background:repeating-linear-gradient(135deg,#eceef2 0 7px,#f6f7f9 7px 14px);display:flex;align-items:center;justify-content:center;color:#a3a9b3;font-weight:700;letter-spacing:6px;font-family:Tahoma,sans-serif}
.otp{display:grid;grid-template-columns:1.6fr 1fr;gap:10px;margin:0 4px 14px}
.otp button{background:#f39237;opacity:.4;color:#fff;border:0;border-radius:12px;font:inherit;font-weight:700;cursor:not-allowed}
.locked{margin:0 4px 16px;background:#fff8eb;border:1px solid #fde3b0;color:#8a5a12;border-radius:12px;padding:10px 14px;font-size:.95rem}
.actions{display:grid;grid-template-columns:2.4fr 1fr;gap:12px;margin:4px 4px 8px}
.btn{border:0;border-radius:12px;height:58px;font:inherit;font-size:1.2rem;font-weight:700;cursor:pointer;transition:background .15s,transform .05s}
.btn:active{transform:translateY(1px)}
.pay{background:#5cb874;color:#fff;box-shadow:0 4px 12px rgba(92,184,116,.3)}.pay:hover{background:#4ea766}
.cancel{background:#fdeeee;color:#e14d4d}.cancel:hover{background:#fbdede}
.alt{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 4px 4px;padding-top:12px;border-top:1px dashed #e3e6eb;color:#6b7280;font-size:.95rem}
.btn-sm{border:1px solid #f6caca;background:#fff;color:#d03b3b;border-radius:10px;height:42px;padding:0 18px;font:inherit;font-weight:700;cursor:pointer}
.btn-sm:hover{background:#fff5f5}
.timer{display:flex;justify-content:space-between;align-items:center;background:#f6f7f9;border-radius:12px;padding:10px 18px;margin-bottom:18px;position:relative;overflow:hidden}
.timer:after{content:"";position:absolute;bottom:0;right:0;height:3px;width:var(--p,100%);background:#5cb874;transition:width 1s linear}
.timer b{font-size:1.7rem;color:#46a361;font-weight:700;direction:ltr;font-family:Tahoma,sans-serif;letter-spacing:1px}
.amount{font-size:2rem;font-weight:700;margin:2px 6px 0;color:#111827}
.amount small{font-size:1rem;color:#6b7280;font-weight:400}
.words{color:#6b7280;margin:0 6px 14px}
.merchant{font-weight:700;font-size:1.2rem;margin:0 6px 14px;display:flex;align-items:center;gap:8px}
.merchant:before{content:"🛍";font-size:1rem}
hr{border:0;border-top:1px solid #eceef2;margin:0 6px 14px}
dl{display:grid;grid-template-columns:auto 1fr;gap:10px 12px;margin:0 6px 6px}
dt{color:#6b7280}dd{margin:0;text-align:left;color:#1f2937;direction:ltr;font-weight:700}
.tabs{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(16,24,40,.06),0 6px 16px rgba(16,24,40,.05);margin:20px 0;padding:16px}
.tabhead{background:#f39237;color:#fff;border-radius:10px;text-align:center;padding:10px;font-weight:700}
.tabs ul{margin:12px 8px 4px;padding-inline-start:18px;line-height:2.1}
.tabs code{background:#f3f4f6;border-radius:6px;padding:0 6px;direction:ltr;display:inline-block;font-size:.85rem}
.footer{background:#4b5563;color:#fff;border-radius:16px 16px 0 0;text-align:center;padding:22px 16px;margin-top:20px}
.footer b{font-size:1.1rem}.footer p{margin:4px 0 0;opacity:.85;font-size:.9rem}
.err-box{max-width:640px;margin:40px auto;background:#fff;border-radius:16px;border-top:8px solid #dc2626;padding:24px 28px;box-shadow:0 6px 16px rgba(16,24,40,.06)}
.err-box h1{color:#b91c1c;font-size:1.35rem;margin:0 0 8px}
.warn{margin:0 0 16px;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:10px 16px;font-weight:700}
@media (max-width:860px){.cols{grid-template-columns:1fr}.cols .side{order:-1}.header{flex-direction:column;gap:12px;text-align:center}.brand{flex-direction:column}}
`;

const RIBBON = `<div class="sim-ribbon">شبیه‌ساز درگاه — محیط تست
<small>این صفحه درگاه واقعی نیست. هیچ پرداختی انجام نمی‌شود و اطلاعات کارت دریافت نمی‌شود.</small></div>`;

function shell(title: string, body: string) {
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><style>${STYLE}</style></head><body>
<div class="page">${RIBBON}${body}</div>
<div class="page" style="padding-top:0"><div class="footer"><b>شبیه‌ساز درگاه پرداخت اینترنتی پاسارگاد</b>
<p>ابزار توسعه و تست مبتنی بر مستند Dorsa نسخه ۲۸ — فقط روی سیستم توسعه‌دهنده اجرا می‌شود</p></div></div>
</body></html>`;
}

const disabledField = (label: string, icon = "") =>
  `<div class="field"><input type="text" placeholder="${esc(label)}" disabled autocomplete="off" aria-disabled="true">${icon ? `<span class="ico">${icon}</span>` : ""}</div>`;

export function paymentPage(tx: Transaction, cfg: SandboxConfig, remainingMs: number, warning?: string): string {
  let site = "";
  try { site = new URL(tx.callbackApi).origin; } catch { site = tx.callbackApi; }
  const secs = Math.max(0, Math.floor(remainingMs / 1000));
  return shell("شبیه‌ساز درگاه پرداخت", `
<div class="header">
  <div class="brand"><div class="mark">IPG</div><h1>شبیه‌ساز درگاه پرداخت اینترنتی<span>بر اساس پروتکل Dorsa پرداخت الکترونیک پاسارگاد</span></h1></div>
  <span class="badge">SANDBOX · Dorsa v28</span>
</div>
${warning ? `<div class="warn">${esc(warning)}</div>` : ""}
<div class="cols">
  <div class="box">
    <div class="box-title">اطلاعات کارت خود را وارد کنید</div>
    ${disabledField("شماره کارت — در شبیه‌ساز غیرفعال", "▭")}
    ${disabledField("شماره شناسایی دوم CVV2 — غیرفعال", "⋮⋮")}
    <div class="label">تاریخ انقضا</div>
    <div class="row2">${disabledField("ماه")}${disabledField("سال")}</div>
    <div class="captcha">${disabledField("عبارت امنیتی")}<div class="img">SANDBOX</div></div>
    <div class="otp">${disabledField("رمز دوم — غیرفعال", "⋮⋮")}<button type="button" disabled>درخواست رمز پویا</button></div>
    <div class="locked">در شبیه‌ساز، فیلدهای کارت عمداً غیرفعال‌اند و هیچ اطلاعاتی ارسال نمی‌شود. نتیجه پرداخت را با دکمه‌های زیر انتخاب کنید تا با همان پارامترهای درگاه واقعی به callback فروشگاه برگردید.</div>
    <form method="post">
      <div class="actions">
        <button class="btn pay" name="outcome" value="success">پرداخت ${money(tx.amount)} ریال (موفق)</button>
        <button class="btn cancel" name="outcome" value="cancel">انصراف</button>
      </div>
      <div class="alt"><span>سناریوی دیگر تست:</span>
        <button class="btn-sm" name="outcome" value="failed">پرداخت ناموفق</button>
      </div>
    </form>
  </div>
  <div class="box side">
    <div class="timer"><span>زمان باقی‌مانده:</span><b id="t">--:--</b></div>
    <div class="amount">${money(tx.amount)} <small>ریال</small></div>
    <div class="words">${esc(toPersianWords(tx.amount))} ریال</div>
    <div class="merchant">${esc(cfg.merchantName)}</div>
    <hr>
    <dl>
      <dt>شماره پذیرنده</dt><dd>${faDigits(cfg.merchantNumber)}</dd>
      <dt>شماره ترمینال</dt><dd>${faDigits(tx.terminalNumber)}</dd>
      <dt>شماره فاکتور</dt><dd>${esc(tx.invoice)}</dd>
      <dt>نوع عملیات</dt><dd style="direction:rtl;text-align:left">${esc(TYPE_FA[tx.serviceType] ?? tx.serviceType)}</dd>
      <dt>وب سایت فروشگاه</dt><dd>${esc(site)}</dd>
    </dl>
  </div>
</div>
<div class="tabs">
  <div class="tabhead">راهنمای شبیه‌ساز: رفتار هر دکمه</div>
  <ul>
    <li><b>پرداخت موفق:</b> بازگشت به callback با <code>status=success</code>؛ تا verify نشود، استعلام <code>status=0</code> می‌دهد.</li>
    <li><b>انصراف:</b> بازگشت با <code>status=cancel</code>.</li>
    <li><b>ناموفق:</b> بازگشت با <code>status=failed</code>؛ verify خطای <code>13025</code> می‌دهد.</li>
    <li><b>وضعیت نامشخص:</b> از ابزار <code>sandbox_pay</code> با <code>outcome=unknown</code>؛ استعلام <code>status=2</code> می‌دهد تا تعیین تکلیف شود.</li>
    <li><b>پایان زمان:</b> بازگشت خودکار با <code>status=expire</code>.</li>
  </ul>
</div>
<script>
let s=${secs};const T=${secs}||1;const bar=document.querySelector(".timer");const el=document.getElementById("t");const fa=n=>String(n).replace(/\\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
function draw(){bar.style.setProperty("--p",(s/T*100)+"%");el.textContent=fa(String(Math.floor(s/60)).padStart(2,"0"))+":"+fa(String(s%60).padStart(2,"0"))}
draw();const iv=setInterval(()=>{s--;if(s<=0){clearInterval(iv);s=0;draw();
const f=document.createElement("form");f.method="post";const i=document.createElement("input");i.type="hidden";i.name="outcome";i.value="expire";f.appendChild(i);document.body.appendChild(f);f.submit();return}draw()},1000);
</script>`);
}

export function errorPage(title: string, message: string, backUrl?: string): string {
  return shell(title, `<div class="err-box"><h1>${esc(title)}</h1><p>${esc(message)}</p>
${backUrl ? `<p><a href="${esc(backUrl)}">بازگشت به فروشگاه</a></p>` : ""}</div>`);
}

export function homePage(baseUrl: string, cfg: SandboxConfig): string {
  return shell("Dorsa Sandbox", `<div class="header"><div class="brand"><div class="mark">IPG</div><h1>شبیه‌ساز درگاه پرداخت اینترنتی<span>بر اساس پروتکل Dorsa پرداخت الکترونیک پاسارگاد</span></h1></div><span class="badge">SANDBOX · Dorsa v28</span></div>
<div class="box"><dl>
<dt>Base URL</dt><dd>${esc(baseUrl)}</dd>
<dt>username / password</dt><dd>${esc(cfg.username)} / ${esc(cfg.password)}</dd>
<dt>terminalNumber</dt><dd>${cfg.terminalNumber}</dd>
</dl><p style="margin:10px 6px;color:#6b7280;font-size:13px">این شبیه‌ساز بر اساس مستند Dorsa نسخه ۲۸ ساخته شده و جایگزین تست نهایی روی ترمینال واقعی نیست.</p></div>`);
}
