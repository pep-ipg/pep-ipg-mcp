// SDK-free logic behind the sandbox_* MCP tools (one simulator per process).
import { startSandbox, type Sandbox } from "./server.js";
import type { Fault, Outcome, SandboxConfig, Transaction } from "./store.js";

let instance: Sandbox | undefined;
let starting: Promise<Sandbox> | undefined;

export async function ensureSandbox(port?: number): Promise<Sandbox> {
  if (instance) return instance;
  starting ??= startSandbox({ port: port ?? Number(process.env.PEP_SANDBOX_PORT ?? 8787) }).then((s) => (instance = s));
  try {
    return await starting;
  } finally {
    starting = undefined;
  }
}

export async function stopSandbox(): Promise<void> {
  await instance?.close();
  instance = undefined;
}

const STATE_FA: Record<string, string> = {
  CREATED: "در انتظار پرداخت", PAID: "پرداخت‌شده، verify نشده", FAILED: "ناموفق", CANCELLED: "لغو کاربر",
  EXPIRED: "منقضی", UNKNOWN: "نامشخص", VERIFIED: "verify شده", CONFIRMED: "تایید نهایی", REVERSED: "برگشت‌خورده",
};

export function describeStart(sb: Sandbox): string {
  const c = sb.store.config;
  return [
    `شبیه‌ساز درگاه (Dorsa v28) روی ${sb.baseUrl} در حال اجراست.`,
    "",
    "تنظیمات کد پذیرنده برای تست:",
    "```",
    `PEP_BASE_URL=${sb.baseUrl}`,
    `PEP_USERNAME=${c.username}`,
    `PEP_PASSWORD=${c.password}`,
    `PEP_TERMINAL_NUMBER=${c.terminalNumber}`,
    "```",
    `- مهلت توکن ${c.tokenTtlMin} دقیقه، صفحه پرداخت ${c.pageTtlMin} دقیقه، verify و reverse ${c.verifyWindowMin}/${c.reverseWindowMin} دقیقه.`,
    `- بررسی Referer: ${c.refererCheck}`,
    "- صفحه پرداخت شبیه‌ساز کارت نمی‌گیرد؛ نتیجه (موفق/ناموفق/نامشخص/انصراف) را انتخاب کنید، یا از sandbox_pay استفاده کنید.",
    "- این شبیه‌ساز بر اساس مستند است؛ قبل از Go-Live روی ترمینال واقعی تست نهایی بگیرید.",
  ].join("\n");
}

export function describeTx(tx: Transaction): string {
  return `| ${tx.invoice} | ${tx.serviceType} | ${tx.amount} | ${tx.state} (${STATE_FA[tx.state]}) | ${tx.referenceNumber ?? "-"} | ${tx.events.map((e) => e.type).join(" → ")} |`;
}

export function statusReport(sb: Sandbox, limit = 10): { text: string; data: unknown } {
  const txs = sb.store.list(limit);
  const log = sb.store.log.slice(-15);
  const faults = sb.store.listFaults();
  const lines = [
    `**شبیه‌ساز:** ${sb.baseUrl} · جابه‌جایی ساعت: ${sb.store.clockOffsetMinutes()} دقیقه · Referer: ${sb.store.config.refererCheck}`,
    "",
    `### تراکنش‌ها (${txs.length})`,
    txs.length ? "| invoice | نوع | مبلغ | وضعیت | referenceNumber | رویدادها |\n|---|---|---|---|---|---|\n" + txs.map(describeTx).join("\n") : "تراکنشی ثبت نشده.",
    "",
    "### آخرین درخواست‌ها",
    log.length ? log.map((l) => `- ${l.at.slice(11, 19)} ${l.method} ${l.path} → HTTP ${l.status}${l.resultCode !== undefined ? ` · resultCode ${l.resultCode}` : ""}${l.note ? ` · ${l.note}` : ""}`).join("\n") : "درخواستی ثبت نشده.",
  ];
  const warnings = txs.flatMap((t) => t.events.filter((e) => e.type === "referer_mismatch").map((e) => `- ${t.invoice}: ${e.detail}`));
  if (warnings.length) lines.push("", "### هشدار Referer", ...warnings);
  if (faults.length) lines.push("", "### خطاهای تزریقی فعال", ...faults.map((f) => `- #${f.id} ${f.endpoint} · ${f.mode} · code ${f.code} · ${f.remaining} بار`));
  return { text: lines.join("\n"), data: { baseUrl: sb.baseUrl, transactions: txs, log, faults, config: sb.store.config } };
}

export async function payTx(sb: Sandbox, invoice: string, outcome: Outcome, fireCallback: boolean): Promise<string> {
  const tx = sb.store.findByInvoice(invoice);
  if (!tx) throw new Error(`invoice ${invoice} در شبیه‌ساز نیست`);
  const cb = sb.store.pay(tx, outcome);
  sb.store.record({ method: "TOOL", path: `/pay/${tx.urlId}`, status: 302, note: `outcome=${outcome} via sandbox_pay` });
  let result = `نتیجه پرداخت «${outcome}» ثبت شد. وضعیت: ${tx.state}.\ncallback: ${cb}`;
  if (fireCallback) {
    try {
      const res = await fetch(cb, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
      result += `\ncallback فراخوانی شد → HTTP ${res.status}`;
    } catch (e) {
      result += `\nفراخوانی callback ناموفق بود: ${(e as Error).message} (برنامه پذیرنده در دسترس نیست؟)`;
    }
  }
  return result;
}

export function resolveTx(sb: Sandbox, invoice: string, to: "success" | "failed"): string {
  const tx = sb.store.findByInvoice(invoice);
  if (!tx) throw new Error(`invoice ${invoice} در شبیه‌ساز نیست`);
  sb.store.resolve(tx, to);
  return `تراکنش ${invoice} از UNKNOWN به ${tx.state} تعیین تکلیف شد.`;
}

export function injectFault(sb: Sandbox, f: Omit<Fault, "id">): string {
  const fault = sb.store.addFault(f);
  const what = {
    error: `پاسخ با resultCode ${f.code}`,
    timeout: `تاخیر ${f.delaySec} ثانیه و سپس HTTP 504 (عملیات انجام نمی‌شود)`,
    applied_then_error: `عملیات واقعاً انجام می‌شود ولی پاسخ HTTP 500 با کد ${f.code} برمی‌گردد (تست idempotency)`,
  }[f.mode];
  return `خطای تزریقی #${fault.id} فعال شد: ${f.remaining} درخواست بعدی به «${f.endpoint}» → ${what}.`;
}

export function configure(sb: Sandbox, patch: Partial<SandboxConfig>, fastForwardMinutes?: number): string {
  Object.assign(sb.store.config, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
  if (fastForwardMinutes) sb.store.fastForward(fastForwardMinutes);
  const c = sb.store.config;
  return `تنظیمات: Referer=${c.refererCheck} · verify=${c.verifyWindowMin}m · reverse=${c.reverseWindowMin}m · page=${c.pageTtlMin}m · token=${c.tokenTtlMin}m · جابه‌جایی ساعت=${sb.store.clockOffsetMinutes()}m`;
}
