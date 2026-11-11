// Merchant-side state machine for resolving a Dorsa transaction: given what is
// known (callback, inquiry status, verify result, delivery outcome), what next?

export type Action =
  | "VERIFY" | "RETRY_VERIFY" | "REAUTH_AND_RETRY" | "DELIVER" | "DO_NOT_DELIVER"
  | "INQUIRY" | "RETRY_INQUIRY" | "REVERSE" | "REFUND" | "ESCALATE";

export interface DecisionInput {
  callback_status?: string;
  inquiry_status?: number;
  verify_result_code?: number;
  delivery_failed?: boolean;
  minutes_since_payment?: number;
  reverse_window_minutes?: number;
}

export interface Decision {
  action: Action;
  deliver: "yes" | "no" | "hold";
  endpoint?: string;
  basis: "verify_result_code" | "inquiry_status" | "callback_status" | "delivery_failed";
  reasons: string[];
}

const RETRYABLE = new Set([500, 13005, 13084, 13085, 13087, 13090, 13091, 13096, 13097, 13319, 13339, 13372, 13392, 13329]);
const AUTH = new Set([401, 13001, 13002, 13004, 13008, 13366]);
const EP = {
  verify: "/api/payment/verify-payment",
  inquiry: "/api/payment/payment-inquiry",
  reverse: "/api/payment/reverse-transactions",
  refund: "/api/payment/refund-transactions",
  token: "/token/getToken",
};

export function decide(input: DecisionInput): Decision {
  const window = input.reverse_window_minutes && input.reverse_window_minutes > 0 ? input.reverse_window_minutes : 25;
  const inp = { ...input, reverse_window_minutes: window };
  if (typeof inp.verify_result_code === "number") return fromVerify(inp, inp.verify_result_code);
  if (typeof inp.inquiry_status === "number") return fromInquiry(inp, inp.inquiry_status);
  return fromCallback((inp.callback_status ?? "").trim().toLowerCase());
}

function fromVerify(i: DecisionInput, code: number): Decision {
  const b = "verify_result_code" as const;
  if (code === 0 || code === 13029 || code === 13428) {
    if (i.delivery_failed) return undo(i, "verify موفق بوده ولی تحویل خدمت شکست خورده است.");
    const reasons = ["verify موفق است؛ خدمت را تحویل دهید."];
    if (code !== 0) reasons.push("پاسخ تکراری (13029/13428) را موفق و idempotent تلقی کنید؛ خدمت را دوبار تحویل ندهید.");
    reasons.push("اگر از verify-payment استفاده کرده‌اید، amount پاسخ را با مبلغ سفارش تطبیق دهید.");
    return { action: "DELIVER", deliver: "yes", basis: b, reasons };
  }
  if ([13025, 13030, 13033].includes(code))
    return { action: "DO_NOT_DELIVER", deliver: "no", basis: b, reasons: ["تراکنش ناموفق یا برگشت‌خورده است؛ وجهی نزد پذیرنده نمی‌ماند."] };
  if (code === 13075)
    return { action: "INQUIRY", deliver: "hold", endpoint: EP.inquiry, basis: b, reasons: ["مهلت تاییدیه تمام شده؛ وضعیت قطعی را با استعلام (checkVerify=true) بگیرید."] };
  if (AUTH.has(code))
    return { action: "REAUTH_AND_RETRY", deliver: "hold", endpoint: EP.token, basis: b, reasons: ["توکن نامعتبر/منقضی است؛ getToken و یک‌بار تکرار verify."] };
  if (RETRYABLE.has(code))
    return {
      action: "RETRY_VERIFY", deliver: "hold", endpoint: EP.verify, basis: b,
      reasons: ["خطای موقت؛ verify را با همان invoice/urlId و با backoff تکرار کنید (تکرار امن است).", "اگر تا نزدیک پایان مهلت موفق نشد، با payment-inquiry وضعیت را بگیرید."],
    };
  if ([13009, 13016, 13077].includes(code))
    return { action: "ESCALATE", deliver: "hold", basis: b, reasons: ["invoice/urlId با تراکنش منطبق نیست؛ داده ذخیره‌شده را بررسی کنید (urlId باید data.urlId باشد، نه کل url)."] };
  return { action: "INQUIRY", deliver: "hold", endpoint: EP.inquiry, basis: b, reasons: ["نتیجه verify قطعی نیست؛ با استعلام (checkVerify=true) تعیین تکلیف کنید."] };
}

function fromInquiry(i: DecisionInput, st: number): Decision {
  const b = "inquiry_status" as const;
  switch (st) {
    case 0:
      if (i.delivery_failed) return undo(i, "تراکنش موفق است ولی امکان ارائه خدمت نیست.");
      return { action: "VERIFY", deliver: "hold", endpoint: EP.verify, basis: b, reasons: ["تراکنش موفق ولی هنوز verify نشده؛ در مهلت verify بزنید، سپس خدمت را تحویل دهید.", "بدون verify وجه به مشتری برمی‌گردد."] };
    case 13029:
    case 13034:
      if (i.delivery_failed) {
        if (st === 13029)
          return { action: "REFUND", deliver: "no", endpoint: EP.refund, basis: b, reasons: ["تراکنش confirm شده و reverse ممکن نیست؛ از Refund استفاده کنید."] };
        return undo(i, "verify ثبت شده ولی تحویل خدمت شکست خورده است.");
      }
      return { action: "DELIVER", deliver: "yes", basis: b, reasons: ["تراکنش تایید شده (یا verify موفق ثبت شده)؛ خدمت را تحویل دهید (idempotent)."] };
    case 2: {
      const reasons = ["وضعیت نامشخص است؛ خدمت را نگه دارید و استعلام را با backoff تکرار کنید."];
      if ((i.minutes_since_payment ?? 0) > (i.reverse_window_minutes ?? 25) + 30)
        return { action: "ESCALATE", deliver: "hold", basis: b, reasons: [...reasons, "مدت طولانی نامشخص مانده؛ با referenceNumber/trackId از پشتیبانی درگاه پیگیری کنید."] };
      return { action: "RETRY_INQUIRY", deliver: "hold", endpoint: EP.inquiry, basis: b, reasons };
    }
    case 13016:
      return { action: "DO_NOT_DELIVER", deliver: "no", basis: b, reasons: ["تراکنش یافت نشد؛ کاربر به پرداخت نرسیده یا شناسه‌ها اشتباه است."] };
    case 13025:
    case 13033:
      return { action: "DO_NOT_DELIVER", deliver: "no", basis: b, reasons: ["تراکنش ناموفق یا reverse شده است؛ خدمت تحویل نشود."] };
  }
  return { action: "ESCALATE", deliver: "hold", basis: b, reasons: ["status ناشناخته؛ با get_error_code بررسی کنید."] };
}

function fromCallback(cb: string): Decision {
  const b = "callback_status" as const;
  if (cb === "success")
    return { action: "VERIFY", deliver: "hold", endpoint: EP.verify, basis: b, reasons: ["callback موفق است ولی قابل جعل است؛ تصمیم نهایی با verify سمت سرور.", "پس از verify موفق خدمت را تحویل دهید."] };
  if (["failed", "cancel", "expire"].includes(cb))
    return { action: "DO_NOT_DELIVER", deliver: "no", basis: b, reasons: ["پرداخت انجام نشده؛ verify نزنید. برای تلاش مجدد invoice جدید بسازید.", "اگر مشتری ادعای کسر وجه دارد، با payment-inquiry بررسی کنید."] };
  return { action: "INQUIRY", deliver: "hold", endpoint: EP.inquiry, basis: b, reasons: ["callback نرسیده یا نامشخص است؛ payment-inquiry با checkVerify=true بزنید."] };
}

function undo(i: DecisionInput, why: string): Decision {
  const win = i.reverse_window_minutes ?? 25;
  if (typeof i.minutes_since_payment === "number" && i.minutes_since_payment >= win)
    return { action: "REFUND", deliver: "no", endpoint: EP.refund, basis: "delivery_failed", reasons: [why, "مهلت reverse گذشته است (13076)؛ از Refund استفاده کنید."] };
  const reasons = [why, `در مهلت reverse (پیش‌فرض ${win} دقیقه، طبق تنظیم ترمینال) تراکنش را برگردانید.`];
  if (typeof i.minutes_since_payment !== "number") reasons.push("زمان سپری‌شده نامعلوم است؛ اگر reverse خطای 13076 داد، Refund بزنید.");
  return { action: "REVERSE", deliver: "no", endpoint: EP.reverse, basis: "delivery_failed", reasons };
}
