// Validates a merchant request body against a Dorsa endpoint contract:
// presence and types of fields plus endpoint-specific business rules.
import type { EndpointSpec, FieldSpec, Spec } from "./spec.js";

export interface Issue {
  severity: "error" | "warning";
  field?: string;
  message: string;
  /** Gateway error code this mistake would most likely produce. */
  likelyCode?: number;
}

export interface Report {
  endpoint: string;
  path: string;
  valid: boolean;
  issues: Issue[];
}

const RE_MOBILE = /^09\d{9}$/;
const RE_SHEBA = /^\d{24}$/;
const RE_DIGITS = /^\d+$/;

type Body = Record<string, unknown>;

export function validatePayload(spec: Spec, ep: EndpointSpec, payload: unknown): Report {
  const issues: Issue[] = [];
  const add = (severity: Issue["severity"], field: string | undefined, message: string, likelyCode?: number) =>
    issues.push({ severity, field, message, ...(likelyCode ? { likelyCode } : {}) });

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { endpoint: ep.id, path: ep.path, valid: false, issues: [{ severity: "error", message: "بدنه باید یک آبجکت JSON باشد.", likelyCode: 13000 }] };
  }
  const obj = payload as Body;
  const known = new Map(ep.fields.map((f) => [f.name.toLowerCase(), f]));
  const present: Body = {};

  for (const [k, v] of Object.entries(obj)) {
    const f = known.get(k.toLowerCase());
    if (!f) {
      add("warning", k, "این فیلد در قرارداد این سرویس تعریف نشده است.");
      continue;
    }
    if (k !== f.name) add("warning", k, `نام فیلد در مستند «${f.name}» است؛ از همان نگارش استفاده کنید.`);
    present[f.name] = v;
  }
  for (const f of ep.fields) {
    const v = present[f.name];
    if (v === undefined || isEmpty(v)) {
      if (f.req === "M") add("error", f.name, "فیلد اجباری ارسال نشده یا خالی است.", 13000);
      continue;
    }
    checkType(f, v, add);
  }

  const str = (k: string): string => {
    const v = present[k];
    if (typeof v === "string") return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  };

  switch (ep.id) {
    case "purchase":
      pairRule(present, str, "8", "PURCHASE", add);
      commonPayment(present, str, add);
      if (str("localization") && !["fa", "en"].includes(str("localization")))
        add("error", "localization", "مقدار مجاز: fa یا en.", 13000);
      break;
    case "multiacc-purchase":
    case "multiacc-payment-code":
      pairRule(present, str, "9", "MULTIACCPURCHASE", add);
      commonPayment(present, str, add);
      splitRule(present, add);
      break;
    case "topup-bill":
      commonPayment(present, str, add);
      preTransactionRule(spec, str, add);
      break;
    case "confirm-payment":
    case "verify-transactions":
    case "verify-payment":
    case "reverse-payment":
      urlIdRule(str("urlId"), add);
      break;
    case "payment-inquiry":
    case "payment-inquiry-v2":
      if (!str("invoiceId") && !(str("billId") && str("paymentId")))
        add("error", "invoiceId", "برای قبض billId و paymentId، و برای سایر تراکنش‌ها invoiceId لازم است.", 13000);
      break;
    case "refund-transactions":
      if (str("type") && !["RefundOnline", "RefundOffline"].includes(str("type")))
        add("error", "type", "مقدار مجاز: RefundOnline یا RefundOffline.", 13000);
      positive(present, "amount", add);
      urlIdRule(str("urlId"), add);
      break;
    case "provider-refund-toman":
    case "provider-refund-pod":
      if (present.amount !== undefined) positive(present, "amount", add);
      if (str("invoiceID") && str("invoiceID") === str("originInvoiceID"))
        add("error", "invoiceID", "invoiceID باید فاکتور جدید و یکتای خودِ Refund باشد، نه فاکتور خرید اصلی.", 13003);
      break;
    case "authorization":
      if (str("authorizationType") === "1") {
        if (!str("mobileNumber")) add("error", "mobileNumber", "برای احراز هویت قوی (authorizationType=1) اجباری است.", 13000);
        mobileRule(str("mobileNumber"), add);
      } else if (str("authorizationType") === "2") {
        if (!str("nationalCode")) add("error", "nationalCode", "برای احراز هویت بورسی (authorizationType=2) کد ملی رمزشده اجباری است.", 13000);
      } else if (str("authorizationType")) {
        add("error", "authorizationType", "مقدار مجاز: 1 (قوی) یا 2 (بورسی).", 13000);
      }
      break;
    case "inquiry-confirm-pin":
    case "inquiry-mini-statement":
    case "card-to-iban-toman":
      for (const k of ["cvv2", "pin2", "cardNumber"]) {
        const v = str(k);
        if (v && RE_DIGITS.test(v))
          add("warning", k, "به نظر داده واقعی کارت است. داده واقعی کارت را در ابزارهای هوش مصنوعی وارد نکنید و هرگز لاگ نکنید.");
      }
      break;
  }

  issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
  return { endpoint: ep.id, path: ep.path, valid: !issues.some((i) => i.severity === "error"), issues };
}

type Add = (severity: Issue["severity"], field: string | undefined, message: string, likelyCode?: number) => void;

function isEmpty(v: unknown): boolean {
  return v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
}

function checkType(f: FieldSpec, v: unknown, add: Add) {
  switch (f.type) {
    case "integer":
      if (typeof v !== "number") {
        add("error", f.name, typeof v === "string" && RE_DIGITS.test(v)
          ? "به‌صورت رشته ارسال شده؛ عدد صحیح بدون کوتیشن بفرستید."
          : "باید عدد صحیح (Integer) باشد.", 13000);
      } else if (!Number.isInteger(v)) {
        add("error", f.name, "باید عدد صحیح باشد (اعشار مجاز نیست).", 13000);
      }
      break;
    case "string":
      if (typeof v !== "string") add("error", f.name, "باید رشته (String) باشد؛ مقدار را داخل کوتیشن بفرستید.", 13000);
      break;
    case "boolean":
      if (typeof v !== "boolean") add("error", f.name, "باید true/false باشد.", 13000);
      break;
    case "array":
      if (!Array.isArray(v)) add("error", f.name, "باید آرایه JSON باشد.", 13000);
      break;
  }
}

function pairRule(p: Body, str: (k: string) => string, code: string, type: string, add: Add) {
  if (str("serviceCode") && str("serviceCode") !== code) add("error", "serviceCode", `برای این سرویس باید "${code}" باشد.`, 13000);
  if (str("serviceType") && str("serviceType") !== type) add("error", "serviceType", `برای این سرویس باید "${type}" باشد.`, 13000);
  const raw = p.serviceType;
  if (typeof raw === "string" && raw !== raw.trim())
    add("error", "serviceType", "فاصله ابتدا/انتها دارد؛ trim کنید (نمونه مستند تسهیم هم این اشتباه را دارد).", 13000);
}

function commonPayment(p: Body, str: (k: string) => string, add: Add) {
  positive(p, "amount", add);
  const cb = str("callbackApi");
  if (cb) {
    let u: URL | undefined;
    try { u = new URL(cb); } catch { /* invalid */ }
    if (!u || !["http:", "https:"].includes(u.protocol)) {
      add("error", "callbackApi", "باید URL کامل http(s) باشد.", 13028);
    } else {
      if (u.protocol === "http:" && !["localhost", "127.0.0.1"].includes(u.hostname))
        add("warning", "callbackApi", "در محیط عملیاتی از https استفاده کنید.");
      if (["localhost", "127.0.0.1"].includes(u.hostname))
        add("warning", "callbackApi", "localhost فقط در شبیه‌ساز/تست؛ روی درگاه واقعی دامنه callback باید در پنل ثبت شده باشد (13028).");
    }
  }
  mobileRule(str("mobileNumber"), add);
  if (str("nationalCode") && !validNationalCode(str("nationalCode")))
    add("error", "nationalCode", "کد ملی نامعتبر است (۱۰ رقم با رقم کنترل صحیح).", 13302);
}

function positive(p: Body, k: string, add: Add) {
  const v = p[k];
  if (typeof v === "number" && v <= 0) add("error", k, "مبلغ باید بزرگ‌تر از صفر و به ریال باشد.", 13055);
}

function mobileRule(m: string, add: Add) {
  if (m && !RE_MOBILE.test(m)) add("error", "mobileNumber", "قالب موبایل باید 09XXXXXXXXX (۱۱ رقم) باشد.", 13346);
}

function urlIdRule(v: string, add: Add) {
  if (v && (v.includes("/") || v.toLowerCase().startsWith("http")))
    add("error", "urlId", "کل آدرس صفحه پرداخت ارسال شده؛ فقط urlId (data.urlId یا بخش انتهایی آدرس) را بفرستید.", 13009);
}

function preTransactionRule(spec: Spec, str: (k: string) => string, add: Add) {
  const code = str("serviceCode");
  const type = str("serviceType");
  if (!code || !type) return;
  const match = spec.serviceCodes.find((s) => s.serviceType === type);
  if (!match || match.endpoint !== "pre-transaction") {
    add("error", "serviceType", "برای pre-transaction مقادیر مجاز: MCI, MTN, RTL, BILL, MCI-PIN, MTN-PIN, RTL-PIN.", 13000);
    return;
  }
  if (match.serviceCode !== code) add("error", "serviceCode", `serviceType=${type} باید با serviceCode="${match.serviceCode}" ارسال شود.`, 13000);
  if (type === "BILL") {
    for (const k of ["billId", "paymentId"]) if (!str(k)) add("error", k, "برای پرداخت قبض اجباری است.", 13012);
  } else if (type.endsWith("-PIN")) {
    if (!str("count")) add("error", "count", "برای شارژ عادی/گروهی (PIN) اجباری است.", 13000);
  } else {
    if (!str("mobileNumber")) add("error", "mobileNumber", "برای شارژ مستقیم و بسته اینترنتی اجباری است.", 13314);
    if (str("productCode")) add("warning", "productCode", "بسته اینترنتی: amount باید دقیقاً با قیمت محصول برابر باشد (13071).");
  }
}

function splitRule(p: Body, add: Add) {
  const sv = Array.isArray(p.sharedValue) ? p.sharedValue : [];
  const sh = Array.isArray(p.sheba) ? p.sheba : [];
  if (!sv.length || !sh.length) return;
  if (sh.length > 10) add("error", "sheba", "حداکثر ۱۰ شبا مجاز است.", 13416);
  if (sv.length !== sh.length)
    add("error", "sharedValue", `تعداد sharedValue (${sv.length}) با تعداد sheba (${sh.length}) برابر نیست.`, 13416);

  const seen = new Set<string>();
  sh.forEach((s, i) => {
    const f = `sheba[${i}]`;
    if (typeof s !== "string") return add("error", f, "شبا باید رشته باشد.", 13000);
    const v = s.trim();
    if (/^ir/i.test(v)) add("error", f, "شبا را بدون پیشوند IR ارسال کنید.", 13403);
    else if (!RE_SHEBA.test(v)) add("error", f, "شبا باید ۲۴ رقم (بدون IR) باشد.", 13403);
    else if (!ibanChecksumOk(v)) add("warning", f, "رقم کنترل شبا (mod-97) معتبر نیست؛ شبا را بررسی کنید.", 13403);
    if (seen.has(v)) add("warning", f, "شبای تکراری.");
    seen.add(v);
  });

  const vals: number[] = [];
  let frac = false;
  for (let i = 0; i < sv.length; i++) {
    const s = sv[i];
    if (typeof s !== "string") return add("error", `sharedValue[${i}]`, 'طبق مستند آرایه رشته‌ای است (مثلاً "50").', 13000);
    const n = Number(s.trim());
    if (!Number.isFinite(n) || n <= 0) return add("error", `sharedValue[${i}]`, "مقدار عددی مثبت لازم است.", 13416);
    if (!Number.isInteger(n)) frac = true;
    if (n === 100) add("warning", `sharedValue[${i}]`, "مقدار دقیقاً 100 در مستند بین مبلغی و درصدی تعریف نشده است؛ از آن پرهیز کنید.");
    vals.push(n);
  }
  const over = vals.filter((n) => n > 100).length;
  const under = vals.filter((n) => n < 100).length;
  const sum = vals.reduce((a, b) => a + b, 0);
  const amount = typeof p.amount === "number" ? p.amount : 0;
  if (over && under) {
    add("error", "sharedValue", "ترکیب مقادیر مبلغی (>100) و درصدی (<100) مجاز نیست.", 13416);
  } else if (over) {
    if (frac) add("error", "sharedValue", "تسهیم مبلغی باید به ریال و بدون اعشار باشد.", 13416);
    if (amount && sum !== amount) add("error", "sharedValue", `تسهیم مبلغی: جمع سهم‌ها (${sum}) باید برابر amount (${amount}) باشد.`, 13416);
  } else if (under) {
    if (Math.abs(sum - 100) > 1e-6) add("error", "sharedValue", `تسهیم درصدی: جمع درصدها ${sum} است؛ باید 100 باشد.`, 13416);
  }
}

export function validNationalCode(s: string): boolean {
  if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(s[i]) * (10 - i);
  const rem = sum % 11;
  const check = Number(s[9]);
  return rem < 2 ? check === rem : check === 11 - rem;
}

export function ibanChecksumOk(digits: string): boolean {
  // Rearranged: BBAN + "IR" (I=18, R=27) + check digits, then mod 97 == 1.
  const n = digits.slice(2) + "1827" + digits.slice(0, 2);
  let rem = 0;
  for (const ch of n) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}
