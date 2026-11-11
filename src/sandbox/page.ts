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
body{margin:0;font-family:Vazirmatn,"IRANSans",-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f3f4f6;color:#1f2937}
.page{max-width:1180px;margin:0 auto;padding:24px 16px 0}
.sim-ribbon{background:#7c3aed;color:#fff;text-align:center;font-weight:800;font-size:22px;letter-spacing:.5px;padding:14px 12px;border-radius:14px;margin-bottom:16px;box-shadow:0 4px 14px rgba(124,58,237,.25)}
.sim-ribbon small{display:block;font-weight:500;font-size:13px;opacity:.9;margin-top:4px}
.header{background:#fff;border-radius:16px;border-top:10px solid #f0943a;box-shadow:0 2px 10px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;padding:22px 28px;margin-bottom:22px}
.header h1{margin:0;font-size:20px;font-weight:800}
.badge{font-size:13px;font-weight:800;color:#7c3aed;border:2px solid #7c3aed;border-radius:10px;padding:8px 12px;white-space:nowrap}
.cols{display:grid;grid-template-columns:1.45fr 1fr;gap:22px;align-items:start}
.box{background:#fff;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);padding:14px}
.box-title{background:#f3f4f6;border-radius:10px;padding:14px 18px;font-weight:700;margin-bottom:18px}
.field{position:relative;border:1px solid #d1d5db;border-radius:10px;height:62px;display:flex;align-items:center;padding:0 18px;margin:0 6px 14px;background:#f9fafb;color:#9ca3af}
.field input{border:0;background:transparent;width:100%;height:100%;font:inherit;color:#9ca3af;cursor:not-allowed}
.field .ico{font-size:18px;color:#9ca3af;margin-inline-start:10px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 6px 14px}
.row2 .field{margin:0}
.label{font-weight:700;margin:8px 10px 10px}
.captcha{display:grid;grid-template-columns:1.4fr 1fr;gap:10px;margin:0 6px 14px}
.captcha .img{border-radius:10px;background:repeating-linear-gradient(45deg,#e5e7eb 0 6px,#f3f4f6 6px 12px);display:flex;align-items:center;justify-content:center;color:#9ca3af;font-weight:700;letter-spacing:6px}
.otp{display:grid;grid-template-columns:1.6fr 1fr;gap:10px;margin:0 6px 14px}
.otp button{background:#f0943a;opacity:.45;color:#fff;border:0;border-radius:10px;font:inherit;font-weight:700;cursor:not-allowed}
.locked{margin:0 6px 16px;background:#fef3c7;border:1px solid #fcd34d;color:#92400e;border-radius:10px;padding:10px 14px;font-size:13px;line-height:1.8}
.actions{display:grid;grid-template-columns:2.3fr 1fr;gap:12px;margin:6px 6px 10px}
.btn{border:0;border-radius:10px;height:62px;font:inherit;font-size:18px;font-weight:700;cursor:pointer}
.pay{background:#6cbf7f;color:#fff}.pay:hover{background:#5aae6e}
.cancel{background:#fdecec;color:#e05252}.cancel:hover{background:#fbdcdc}
.scenarios{margin:4px 6px 6px;padding-top:12px;border-top:1px dashed #e5e7eb}
.scenarios p{margin:0 0 10px;font-size:13px;color:#6b7280}
.scenarios .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.btn-sm{border:1px solid #d1d5db;background:#fff;border-radius:10px;height:46px;font:inherit;font-weight:700;cursor:pointer}
.btn-sm.fail{color:#dc2626;border-color:#fecaca}.btn-sm.unk{color:#b45309;border-color:#fde68a}
.timer{display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:10px;padding:14px 18px;border-bottom:3px solid #6cbf7f;margin-bottom:22px}
.timer b{font-size:26px;color:#4caf68;font-weight:800;direction:ltr}
.amount{display:flex;justify-content:flex-start;align-items:center;gap:8px;font-size:30px;font-weight:800;margin:6px 6px 8px}
.words{color:#4b5563;margin:0 6px 16px}
.merchant{font-weight:700;font-size:18px;margin:0 6px 18px}
hr{border:0;border-top:1px solid #e5e7eb;margin:0 6px 16px}
dl{display:grid;grid-template-columns:auto 1fr;gap:14px 12px;margin:0 6px 10px;color:#6b7280}
dt{color:#6b7280}dd{margin:0;text-align:left;color:#374151;direction:ltr}
.tabs{background:#fff;border-radius:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);margin:22px 0;padding:14px}
.tabhead{display:grid;grid-template-columns:1fr 1fr;background:#f3f4f6;border-radius:10px;overflow:hidden}
.tabhead span{text-align:center;padding:14px;font-weight:700;color:#4b5563}
.tabhead .on{background:#f0943a;color:#fff;border-radius:10px}
.tabs ul{margin:14px 10px;padding-inline-start:18px;line-height:2.2}
.tabs code{background:#f3f4f6;border-radius:6px;padding:1px 6px;direction:ltr;display:inline-block}
.footer{background:#4b5563;color:#fff;border-radius:16px 16px 0 0;text-align:center;padding:28px 16px;margin-top:22px}
.footer b{font-size:17px}.footer p{margin:8px 0 0;opacity:.85;font-size:13px}
.err-box{max-width:640px;margin:40px auto;background:#fff;border-radius:16px;border-top:10px solid #dc2626;padding:28px;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.err-box h1{color:#b91c1c;font-size:20px;margin:0 0 10px}
.warn{margin:0 0 16px;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;border-radius:12px;padding:12px 16px;font-weight:600}
@media (max-width:860px){.cols{grid-template-columns:1fr}.cols .side{order:-1}.header{flex-direction:column;gap:12px;text-align:center}}
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
  <h1>شبیه‌ساز درگاه پرداخت اینترنتی | پرداخت الکترونیک پاسارگاد</h1>
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
      <div class="scenarios">
        <p>سناریوهای دیگر تست:</p>
        <div class="grid">
          <button class="btn-sm fail" name="outcome" value="failed">پرداخت ناموفق</button>
          <button class="btn-sm unk" name="outcome" value="unknown">وضعیت نامشخص (قطعی سوییچ)</button>
        </div>
      </div>
    </form>
  </div>
  <div class="box side">
    <div class="timer"><span>زمان باقی‌مانده:</span><b id="t">--:--</b></div>
    <div class="amount">${money(tx.amount)} ریال</div>
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
  <div class="tabhead" style="grid-template-columns:1fr"><span class="on">راهنمای شبیه‌ساز: رفتار هر دکمه</span></div>
  <ul>
    <li><b>پرداخت موفق:</b> بازگشت به callback با <code>status=success</code>؛ تا verify نشود، استعلام <code>status=0</code> می‌دهد.</li>
    <li><b>انصراف:</b> بازگشت با <code>status=cancel</code>.</li>
    <li><b>ناموفق:</b> بازگشت با <code>status=failed</code>؛ verify خطای <code>13025</code> می‌دهد.</li>
    <li><b>وضعیت نامشخص:</b> بازگشت با <code>status=unknown</code>؛ استعلام <code>status=2</code> می‌دهد تا تعیین تکلیف شود.</li>
    <li><b>پایان زمان:</b> بازگشت خودکار با <code>status=expire</code>.</li>
  </ul>
</div>
<script>
let s=${secs};const el=document.getElementById("t");const fa=n=>String(n).replace(/\\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
function draw(){el.textContent=fa(String(Math.floor(s/60)).padStart(2,"0"))+":"+fa(String(s%60).padStart(2,"0"))}
draw();const iv=setInterval(()=>{s--;if(s<=0){clearInterval(iv);s=0;draw();
const f=document.createElement("form");f.method="post";const i=document.createElement("input");i.type="hidden";i.name="outcome";i.value="expire";f.appendChild(i);document.body.appendChild(f);f.submit();return}draw()},1000);
</script>`);
}

export function errorPage(title: string, message: string, backUrl?: string): string {
  return shell(title, `<div class="err-box"><h1>${esc(title)}</h1><p>${esc(message)}</p>
${backUrl ? `<p><a href="${esc(backUrl)}">بازگشت به فروشگاه</a></p>` : ""}</div>`);
}

export function homePage(baseUrl: string, cfg: SandboxConfig): string {
  return shell("Dorsa Sandbox", `<div class="header"><h1>شبیه‌ساز درگاه پرداخت اینترنتی پاسارگاد</h1><span class="badge">SANDBOX · Dorsa v28</span></div>
<div class="box"><dl>
<dt>Base URL</dt><dd>${esc(baseUrl)}</dd>
<dt>username / password</dt><dd>${esc(cfg.username)} / ${esc(cfg.password)}</dd>
<dt>terminalNumber</dt><dd>${cfg.terminalNumber}</dd>
</dl><p style="margin:10px 6px;color:#6b7280;font-size:13px">این شبیه‌ساز بر اساس مستند Dorsa نسخه ۲۸ ساخته شده و جایگزین تست نهایی روی ترمینال واقعی نیست.</p></div>`);
}
