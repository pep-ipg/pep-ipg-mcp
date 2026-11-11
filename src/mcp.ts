import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatSearch, getAuthFlow, getDoc, getErrorCode } from "./tools.js";
import type { Corpus } from "./types.js";
import { findEndpoint, loadSpec } from "./spec.js";
import { validatePayload } from "./validate.js";
import { decide } from "./decision.js";
import {
  configure, describeStart, ensureSandbox, injectFault, payTx, resolveTx, statusReport,
} from "./sandbox/tools.js";

export const VERSION = "1.2.1";

const INSTRUCTIONS = `This server documents the Pasargad Electronic Payment (PEP) internet payment gateway, Dorsa protocol v28.0 (1405/08/12).
Auth is JWT Bearer via POST /token/getToken — NOT the legacy RSA/XML signing. Amounts are integer Rials. All services are POST + JSON.
Flow: getToken → purchase / pre-transaction → redirect user → callback → verify-payment → deliver (or reverse within the window).
Never trust the callback status alone; decide with verify / payment-inquiry on the server. Never ask users for real card data.
Use search_docs first, get_doc for full contracts (fields, samples), get_error_code for resultCode / status codes, get_auth_flow for token handling code.
Before proposing a request body, check it with validate_request. To decide what a merchant should do with a transaction, use next_action.
When sandbox_* tools are available: sandbox_start runs a local Dorsa simulator; point the merchant code at its base URL, run the flow, and use sandbox_pay / sandbox_status / sandbox_inject / sandbox_configure to test success, failure, unknown, timeouts, duplicate verify and expired windows before the merchant tests on a real terminal.`;

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });
const structured = (t: string, data: unknown) => ({
  content: [{ type: "text" as const, text: t }],
  structuredContent: data as Record<string, unknown>,
});

export interface McpOptions {
  /** Register sandbox_* tools (local simulator). Enabled for stdio, off for shared HTTP servers. */
  sandbox?: boolean;
}

export function createMcpServer(corpus: Corpus, options: McpOptions = {}): McpServer {
  const server = new McpServer(
    { name: "pep-ipg-mcp", version: VERSION },
    { instructions: INSTRUCTIONS },
  );
  const docIds = [...corpus.docs.keys()].join(", ");

  server.registerTool(
    "search_docs",
    {
      title: "جستجو در مستندات درگاه پاسارگاد",
      description:
        "Search (Persian or English) the Pasargad IPG Dorsa v28 docs: token, purchase, split payment (تسهیم), top-up/bill, verify/confirm/reverse, callback, inquiry, refund, referer, error codes, pitfalls. Returns matching sections with the doc id for get_doc.",
      inputSchema: {
        query: z.string().min(1).describe("e.g. 'خطای 13402', 'verify timeout', 'تسهیم شبا'"),
        limit: z.number().int().min(1).max(10).optional().describe("Max results (default 5)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => text(formatSearch(corpus, query, limit ?? 5)),
  );

  server.registerTool(
    "get_doc",
    {
      title: "متن کامل یک مستند",
      description: `Full Markdown of one doc: endpoint contract (path, auth, fields, sample request/response) or a guide. Valid ids: ${docIds}`,
      inputSchema: { id: z.string().min(1).describe("Doc id, e.g. purchase, verify-payment, settlement") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const body = getDoc(corpus, id);
      return body ? text(body) : text(`مستند «${id}» یافت نشد. شناسه‌های معتبر: ${docIds}`, true);
    },
  );

  server.registerTool(
    "get_error_code",
    {
      title: "تحلیل کد خطای درگاه پاسارگاد",
      description:
        "Explain a Pasargad IPG resultCode or transaction status code (e.g. 13402, 13029, 2) from the official 202-code table: Persian/English message, category, retryability and a concrete fix. Also accepts message text such as 'Invalid Referer'.",
      inputSchema: {
        code: z.union([z.string(), z.number()]).describe("Numeric code or part of the error message"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code }) => text(getErrorCode(corpus, code)),
  );

  server.registerTool(
    "get_auth_flow",
    {
      title: "راهنمای احراز هویت و توکن",
      description:
        "How to authenticate against the Pasargad IPG (Dorsa v28): getToken, JWT expiry, Bearer header, 401 handling — plus a ready token client (caching, early refresh, single retry) in the requested language. Note: Dorsa does not use RSA request signing.",
      inputSchema: {
        language: z.enum(["typescript", "go", "php", "python"]).optional().describe("Sample code language (default typescript)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ language }) => text(getAuthFlow(corpus, language ?? "typescript")),
  );

  const spec = loadSpec();

  server.registerTool(
    "validate_request",
    {
      title: "اعتبارسنجی بدنه درخواست",
      description:
        "Check a request body against a Dorsa endpoint contract before sending it: required fields, types (amount and terminalNumber are integers), serviceCode/serviceType pairs, split-payment math, IBAN format and checksum, mobile and national-code formats, urlId vs full url. Each issue lists the gateway error code it would likely cause. Never pass real card data.",
      inputSchema: {
        endpoint: z.string().describe("Endpoint id or path, e.g. purchase, multiacc-purchase, verify-payment, /reverse-transactions"),
        payload: z.record(z.string(), z.unknown()).describe("The JSON request body"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ endpoint, payload }) => {
      const ep = findEndpoint(spec, endpoint);
      if (!ep) return text(`سرویس «${endpoint}» یافت نشد. نمونه: ${spec.endpoints.map((e) => e.id).join(", ")}`, true);
      const r = validatePayload(spec, ep, payload);
      let out = r.valid ? `✅ بدنه برای \`${ep.id}\` (${ep.path}) معتبر است.` : `❌ بدنه برای \`${ep.id}\` (${ep.path}) خطا دارد.`;
      if (r.issues.length) {
        out += "\n\n| سطح | فیلد | توضیح | خطای محتمل درگاه |\n|---|---|---|---|\n";
        out += r.issues.map((i) => `| ${i.severity} | \`${i.field ?? ""}\` | ${i.message} | ${i.likelyCode ?? ""} |`).join("\n");
      }
      return structured(out, r);
    },
  );

  server.registerTool(
    "next_action",
    {
      title: "تصمیم‌گیری تعیین تکلیف تراکنش",
      description:
        "Decide the merchant's next step for a transaction (VERIFY, DELIVER, INQUIRY, REVERSE, REFUND...) from what is known. Precedence: verify_result_code > inquiry_status > callback_status. Set delivery_failed when the goods/service could not be delivered after payment.",
      inputSchema: {
        callback_status: z.enum(["success", "failed", "unknown", "cancel", "expire", ""]).optional().describe("status query param on the callback; empty if none arrived"),
        inquiry_status: z.number().int().optional().describe("data.status from payment-inquiry"),
        verify_result_code: z.number().int().optional().describe("resultCode of verify-transactions / verify-payment"),
        delivery_failed: z.boolean().optional(),
        minutes_since_payment: z.number().optional(),
        reverse_window_minutes: z.number().optional().describe("Terminal reverse window; default 25"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (input) => {
      const d = decide(input);
      const deliver = { yes: "بله", no: "خیر", hold: "فعلاً نگه دارید" }[d.deliver];
      const out = [`**اقدام بعدی:** \`${d.action}\``, `**تحویل خدمت:** ${deliver}`, d.endpoint ? `**سرویس:** \`POST ${d.endpoint}\`` : "", `**مبنای تصمیم:** ${d.basis}`, "", ...d.reasons.map((r) => `- ${r}`)]
        .filter((l) => l !== "").join("\n");
      return structured(out, d);
    },
  );

  if (options.sandbox) registerSandboxTools(server);

  return server;
}

function registerSandboxTools(server: McpServer) {
  const guard = async <T>(fn: () => Promise<T> | T) => {
    try {
      return await fn();
    } catch (e) {
      return text((e as Error).message, true) as never;
    }
  };
  const local = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

  server.registerTool(
    "sandbox_start",
    {
      title: "اجرای شبیه‌ساز درگاه",
      description:
        "Start (or return) the local Dorsa v28 gateway simulator on this machine and get its base URL and test credentials. Point the merchant code at it to run getToken, purchase, payment page, callback, verify, confirm, reverse, inquiry and refund end to end. No real money, no card data.",
      inputSchema: { port: z.number().int().min(0).max(65535).optional().describe("Default 8787 (or PEP_SANDBOX_PORT)") },
      annotations: local,
    },
    async ({ port }) => guard(async () => text(describeStart(await ensureSandbox(port)))),
  );

  server.registerTool(
    "sandbox_status",
    {
      title: "وضعیت شبیه‌ساز",
      description: "List simulated transactions with their state and event history, the latest HTTP requests the merchant code made (with resultCode), Referer warnings and active injected faults. Use it to debug the merchant integration.",
      inputSchema: { limit: z.number().int().min(1).max(50).optional() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit }) => guard(async () => {
      const r = statusReport(await ensureSandbox(), limit ?? 10);
      return structured(r.text, r.data);
    }),
  );

  server.registerTool(
    "sandbox_pay",
    {
      title: "شبیه‌سازی پرداخت کاربر",
      description: "Act as the cardholder on the payment page for a simulated invoice: success, failed, unknown (switch timeout), cancel or expire. Returns the callback URL; with fire_callback=true it also calls the merchant's callbackApi.",
      inputSchema: {
        invoice: z.string(),
        outcome: z.enum(["success", "failed", "unknown", "cancel", "expire"]),
        fire_callback: z.boolean().optional().describe("Call the merchant callback URL (default true)"),
      },
      annotations: local,
    },
    async ({ invoice, outcome, fire_callback }) => guard(async () => text(await payTx(await ensureSandbox(), invoice, outcome, fire_callback ?? true))),
  );

  server.registerTool(
    "sandbox_resolve",
    {
      title: "تعیین تکلیف تراکنش نامشخص",
      description: "Resolve a simulated UNKNOWN transaction to success or failed, as the switch eventually would, to test the merchant's inquiry/reconciliation job.",
      inputSchema: { invoice: z.string(), to: z.enum(["success", "failed"]) },
      annotations: local,
    },
    async ({ invoice, to }) => guard(async () => text(resolveTx(await ensureSandbox(), invoice, to))),
  );

  server.registerTool(
    "sandbox_inject",
    {
      title: "تزریق خطا",
      description:
        "Make the next N calls to an endpoint fail: mode=error returns the given resultCode; mode=timeout waits then returns HTTP 504 without applying; mode=applied_then_error applies the operation but returns HTTP 500 (tests idempotent retries, e.g. verify that succeeded but whose response was lost).",
      inputSchema: {
        endpoint: z.string().describe("Path suffix, e.g. verify-payment, purchase, getToken, or * for all"),
        mode: z.enum(["error", "timeout", "applied_then_error"]),
        code: z.number().int().optional().describe("resultCode to return (default 13005)"),
        delay_sec: z.number().min(0).max(60).optional().describe("For timeout (default 15)"),
        times: z.number().int().min(1).max(100).optional().describe("How many calls (default 1)"),
      },
      annotations: local,
    },
    async ({ endpoint, mode, code, delay_sec, times }) => guard(async () =>
      text(injectFault(await ensureSandbox(), { endpoint, mode, code: code ?? (mode === "applied_then_error" ? 500 : 13005), delaySec: delay_sec ?? 15, remaining: times ?? 1 }))),
  );

  server.registerTool(
    "sandbox_configure",
    {
      title: "تنظیمات و ساعت شبیه‌ساز",
      description: "Change simulator settings (Referer check off/warn/strict, verify/reverse/page/token windows in minutes) and/or move the virtual clock forward to test expiry: unverified payments auto-reverse, verified ones auto-confirm, tokens and pages expire.",
      inputSchema: {
        referer_check: z.enum(["off", "warn", "strict"]).optional(),
        verify_window_min: z.number().min(0).optional(),
        reverse_window_min: z.number().min(0).optional(),
        page_ttl_min: z.number().min(1).optional(),
        token_ttl_min: z.number().min(1).optional(),
        fast_forward_minutes: z.number().min(0).max(10080).optional(),
      },
      annotations: local,
    },
    async (a) => guard(async () => text(configure(await ensureSandbox(), {
      refererCheck: a.referer_check, verifyWindowMin: a.verify_window_min, reverseWindowMin: a.reverse_window_min,
      pageTtlMin: a.page_ttl_min, tokenTtlMin: a.token_ttl_min,
    }, a.fast_forward_minutes))),
  );

  server.registerTool(
    "sandbox_reset",
    {
      title: "پاک کردن شبیه‌ساز",
      description: "Delete all simulated transactions, logs and injected faults and reset the virtual clock.",
      inputSchema: {},
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async () => guard(async () => {
      (await ensureSandbox()).store.reset();
      return text("شبیه‌ساز پاک شد.");
    }),
  );
}
