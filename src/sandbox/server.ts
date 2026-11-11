// Local simulator of the Pasargad IPG (Dorsa v28) HTTP API, built on node:http only.
// Behaviour follows the protocol document; it is not the real switch.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { DATA_DIR } from "../tools.js";
import { findEndpoint, loadSpec, type Spec } from "../spec.js";
import { validatePayload } from "../validate.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { errorPage, homePage, paymentPage } from "./page.js";
import { inquiryStatus, SandboxStore, type Outcome, type SandboxConfig, type Transaction } from "./store.js";

export interface SandboxOptions {
  port?: number;      // default 8787; 0 = random free port
  host?: string;      // default 127.0.0.1
  config?: Partial<SandboxConfig>;
}

export interface Sandbox {
  baseUrl: string;
  store: SandboxStore;
  close(): Promise<void>;
}

type Json = Record<string, any>;
type Reply = { status: number; body: Json };

const OUTCOMES: Outcome[] = ["success", "failed", "cancel", "unknown", "expire"];

export async function startSandbox(opts: SandboxOptions = {}): Promise<Sandbox> {
  const store = new SandboxStore(opts.config);
  const spec = loadSpec();
  const errors: Record<string, { en: string }> = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "errors.json"), "utf-8"));
  const host = opts.host ?? "127.0.0.1";
  let baseUrl = "";

  const ok = (data?: unknown): Reply => ({ status: 200, body: { resultMsg: "Successful", resultCode: 0, ...(data !== undefined ? { data } : {}) } });
  const fail = (code: number, extra: Json = {}, status = 200): Reply => ({
    status,
    body: { resultMsg: errors[String(code)]?.en ?? "failure", resultCode: code, ...extra },
  });

  // ---------- auth ----------
  function authorize(req: http.IncomingMessage): Reply | undefined {
    const h = req.headers.authorization ?? "";
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!h) return fail(401, { resultMsg: "Unauthorized" }, 401);
    if (!m) return fail(13001, {}, 401);
    const v = verifyJwt(m[1].trim(), store.secret);
    if (!v.ok) return fail(v.reason === "malformed" ? 13001 : 13002, {}, 401);
    if (typeof v.payload.exp === "number" && v.payload.exp * 1000 < store.now()) return fail(13008, {}, 401);
    return undefined;
  }

  // ---------- API handlers ----------
  const handlers: Record<string, (b: Json) => Reply> = {
    "/token/getToken": (b) => {
      if (b.username !== store.config.username || b.password !== store.config.password) return fail(13352);
      const now = Math.floor(store.now() / 1000);
      const token = signJwt({ sub: b.username, terminal: store.config.terminalNumber, iat: now, exp: now + store.config.tokenTtlMin * 60 }, store.secret);
      return {
        status: 200,
        body: {
          resultMsg: "Successful", resultCode: 0, token, username: b.username,
          firstName: "Sandbox", lastName: "Merchant", userId: "1",
          roles: [{ authority: "mpg" }, { authority: "merchant" }],
        },
      };
    },

    "/api/payment/purchase": (b) => register(b, "purchase", false),
    "/api/payment/multiacc/purchase": (b) => register(b, b.paymentCode ? "multiacc-payment-code" : "multiacc-purchase", false),
    "/api/payment/pre-transaction": (b) => register(b, "topup-bill", true),

    "/api/payment/verify-transactions": (b) => verify(b, false),
    "/api/payment/verify-payment": (b) => verify(b, true),

    "/api/payment/confirm-transactions": (b) => {
      const r = lookup(b);
      if ("status" in r) return r;
      const tx = r.tx;
      switch (tx.state) {
        case "PAID":
        case "VERIFIED":
          tx.state = "CONFIRMED";
          tx.confirmedAt = store.now();
          store.event(tx, "confirmed");
          return ok(details(tx));
        case "CONFIRMED": return fail(13029);
        case "REVERSED": return wasAutoReversed(tx) ? fail(13075) : fail(13033);
        default: return stateError(tx);
      }
    },

    "/api/payment/reverse-transactions": (b) => {
      const r = lookup(b);
      if ("status" in r) return r;
      const tx = r.tx;
      if (!["PURCHASE", "MULTIACCPURCHASE"].includes(tx.serviceType)) return fail(13046, { note: "reverse is only for purchase and split purchase" });
      switch (tx.state) {
        case "PAID":
        case "VERIFIED":
          if (store.now() > (tx.paidAt ?? 0) + store.config.reverseWindowMin * 60_000) return fail(13076);
          tx.state = "REVERSED";
          tx.reversedAt = store.now();
          store.event(tx, "reversed");
          return ok();
        case "CONFIRMED":
        case "REVERSED":
          return fail(13046);
        default:
          return stateError(tx);
      }
    },

    "/api/payment/payment-inquiry": (b) => inquiry(b, false),
    "/api/payment/payment-inquiryv2": (b) => inquiry(b, true),

    "/api/payment/refund-transactions": (b) => {
      const issues = check("refund-transactions", b);
      if (issues) return issues;
      const r = lookup(b);
      if ("status" in r) return r;
      const tx = r.tx;
      if (tx.state !== "CONFIRMED") return fail(13426, { note: `transaction state is ${tx.state}` });
      if (b.amount > tx.amount - tx.refunded) return fail(13395, { note: `refundable amount is ${tx.amount - tx.refunded}` });
      tx.refunded += b.amount;
      store.event(tx, "refunded", `amount=${b.amount} type=${b.type}`);
      return ok();
    },
  };

  function check(endpointId: string, b: Json): Reply | undefined {
    const ep = findEndpoint(spec as Spec, endpointId)!;
    const rep = validatePayload(spec, ep, b);
    if (rep.valid) return undefined;
    const first = rep.issues.find((i) => i.severity === "error")!;
    return fail(first.likelyCode ?? 13000, { sandboxIssues: rep.issues.filter((i) => i.severity === "error") });
  }

  function register(b: Json, endpointId: string, dataAsString: boolean): Reply {
    const issues = check(endpointId, b);
    if (issues) return issues;
    if (b.terminalNumber !== store.config.terminalNumber)
      return fail(13399, { note: `sandbox terminalNumber is ${store.config.terminalNumber}` });
    const created = store.create({
      invoice: String(b.invoice),
      terminalNumber: b.terminalNumber,
      serviceCode: String(b.serviceCode),
      serviceType: String(b.serviceType).trim(),
      amount: b.amount,
      callbackApi: b.callbackApi,
      billId: b.billId, paymentId: b.paymentId, paymentCode: b.paymentCode,
      sheba: b.sheba, sharedValue: b.sharedValue,
      localization: b.localization === "en" ? "en" : "fa",
      description: b.description,
    });
    if (created === "duplicate") return fail(13003);
    const url = `${baseUrl}/pay/${created.urlId}`;
    return ok(dataAsString ? url : { urlId: created.urlId, url });
  }

  function lookup(b: Json): { tx: Transaction } | Reply {
    const invoice = String(b.invoice ?? "");
    if (!invoice) return fail(13000, { note: "invoice is required" });
    const tx = store.findByInvoice(invoice);
    if (!tx) return fail(13016);
    if (b.urlId !== undefined && b.urlId !== tx.urlId) return fail(13009, { note: "urlId does not belong to this invoice (send data.urlId, not the full url)" });
    return { tx };
  }

  const wasAutoReversed = (tx: Transaction) => tx.events.some((e) => e.type === "auto_reversed");

  function stateError(tx: Transaction): Reply {
    switch (tx.state) {
      case "CREATED": return fail(13016, { note: "payment not completed yet" });
      case "UNKNOWN": return fail(2, { resultMsg: "Transaction status is unknown" });
      default: return fail(13025);
    }
  }

  function details(tx: Transaction) {
    return {
      invoice: tx.invoice,
      referenceNumber: tx.referenceNumber,
      trackId: tx.trackId,
      maskedCardNumber: tx.maskedCardNumber,
      hashedCardNumber: tx.hashedCardNumber,
      requestDate: store.iso(tx.paidAt ?? tx.createdAt),
      amount: tx.amount,
    };
  }

  function verify(b: Json, withDetails: boolean): Reply {
    const issues = check(withDetails ? "verify-payment" : "verify-transactions", b);
    if (issues) return issues;
    const r = lookup(b);
    if ("status" in r) return r;
    const tx = r.tx;
    switch (tx.state) {
      case "PAID":
        tx.state = "VERIFIED";
        tx.verifiedAt = store.now();
        store.event(tx, "verified");
        return ok(withDetails ? details(tx) : "تراکنش موفق است");
      case "VERIFIED":
        if (b.checkVerify === true) return fail(13428);
        return ok(withDetails ? details(tx) : "تراکنش موفق است");
      case "CONFIRMED": return fail(13029);
      case "REVERSED": return wasAutoReversed(tx) ? fail(13075) : fail(13033);
      default: return stateError(tx);
    }
  }

  function inquiry(b: Json, v2: boolean): Reply {
    const issues = check(v2 ? "payment-inquiry-v2" : "payment-inquiry", b);
    if (issues) return issues;
    const tx = b.invoiceId ? store.findByInvoice(String(b.invoiceId)) : store.findBill(String(b.billId), String(b.paymentId));
    if (!tx) return ok({ status: 13016 });
    const data: Json = {
      status: inquiryStatus(tx, b.checkVerify === true),
      trackId: tx.trackId ?? null,
      transactionId: tx.transactionId,
      amount: tx.amount,
      cardNumber: tx.maskedCardNumber ?? null,
      invoice: tx.invoice,
      url: tx.urlId,
      referenceNumber: tx.referenceNumber ?? null,
      requestDate: store.iso(tx.paidAt ?? tx.createdAt),
    };
    if (v2) data.hashedCardNumber = tx.hashedCardNumber ?? null;
    return ok(data);
  }

  // ---------- HTTP plumbing ----------
  const send = (res: http.ServerResponse, status: number, body: string, type: string, extra: http.OutgoingHttpHeaders = {}) => {
    res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...extra });
    res.end(body);
  };
  const sendJson = (res: http.ServerResponse, r: Reply) => send(res, r.status, JSON.stringify(r.body), "application/json; charset=utf-8");

  const readBody = (req: http.IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      let size = 0;
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => {
        size += c.length;
        if (size > 1 << 20) { reject(new Error("body too large")); req.destroy(); return; }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function handleApi(req: http.IncomingMessage, res: http.ServerResponse, pathname: string) {
    const handler = handlers[pathname];
    if (!handler || req.method !== "POST") {
      const r = fail(404, { resultMsg: "Not simulated", note: `${req.method} ${pathname} is not part of the sandbox` }, 404);
      store.record({ method: req.method ?? "", path: pathname, status: 404, note: "not simulated" });
      return sendJson(res, r);
    }
    let body: Json;
    try {
      const raw = await readBody(req);
      body = raw ? JSON.parse(raw) : {};
      if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("not an object");
    } catch {
      const r = fail(13000, { note: "body must be a JSON object" });
      store.record({ method: "POST", path: pathname, status: 200, resultCode: 13000, note: "invalid JSON" });
      return sendJson(res, r);
    }
    if (pathname !== "/token/getToken") {
      const denied = authorize(req);
      if (denied) {
        store.record({ method: "POST", path: pathname, status: denied.status, resultCode: denied.body.resultCode });
        return sendJson(res, denied);
      }
    }

    const fault = store.takeFault(pathname);
    if (fault?.mode === "error") {
      const r = fail(fault.code, { note: `injected fault #${fault.id}` }, fault.code === 500 ? 500 : 200);
      store.record({ method: "POST", path: pathname, status: r.status, resultCode: fault.code, note: "injected error" });
      return sendJson(res, r);
    }
    if (fault?.mode === "timeout") {
      await sleep(fault.delaySec * 1000);
      store.record({ method: "POST", path: pathname, status: 504, resultCode: 13005, note: `injected timeout ${fault.delaySec}s (not applied)` });
      return sendJson(res, fail(13005, { note: `injected timeout #${fault.id}` }, 504));
    }

    const r = handler(body);
    if (fault?.mode === "applied_then_error") {
      store.record({ method: "POST", path: pathname, status: 500, resultCode: fault.code, note: `applied (real result ${r.body.resultCode}) then failed` });
      return sendJson(res, fail(fault.code, { note: `injected fault #${fault.id}: the operation WAS applied` }, 500));
    }
    store.record({ method: "POST", path: pathname, status: r.status, resultCode: r.body.resultCode });
    return sendJson(res, r);
  }

  async function handlePay(req: http.IncomingMessage, res: http.ServerResponse, urlId: string) {
    const tx = store.findByUrlId(urlId);
    if (!tx) return send(res, 404, errorPage("صفحه پرداخت یافت نشد", "این آدرس پرداخت معتبر نیست یا قبلاً استفاده شده است."), "text/html; charset=utf-8");

    if (req.method === "GET") {
      if (tx.state !== "CREATED") {
        return send(res, 410, errorPage("این آدرس پرداخت یکبارمصرف بوده است", `وضعیت فعلی تراکنش: ${tx.state}`, tx.callbackApi), "text/html; charset=utf-8");
      }
      let warning: string | undefined;
      const mode = store.config.refererCheck;
      if (mode !== "off") {
        const ref = req.headers.referer;
        let refOrigin = "";
        let cbOrigin = "";
        try { refOrigin = ref ? new URL(ref).origin : ""; } catch { /* ignore */ }
        try { cbOrigin = new URL(tx.callbackApi).origin; } catch { /* ignore */ }
        if (refOrigin !== cbOrigin) {
          const msg = ref
            ? `Referer (${refOrigin}) با دامنه callback (${cbOrigin}) یکی نیست؛ روی درگاه واقعی خطای 13402 می‌گیرید.`
            : "درخواست Referer ندارد (احتمالاً Referrer-Policy: no-referrer یا redirect سمت سرور)؛ روی درگاه واقعی خطای 13402 می‌گیرید.";
          store.event(tx, "referer_mismatch", msg);
          if (mode === "strict") {
            store.record({ method: "GET", path: `/pay/${urlId}`, status: 403, resultCode: 13402 });
            return send(res, 403, errorPage("خطای 13402 — ارجاع‌دهنده نامعتبر", msg), "text/html; charset=utf-8");
          }
          warning = `هشدار شبیه‌ساز: ${msg}`;
        }
      }
      store.record({ method: "GET", path: `/pay/${urlId}`, status: 200 });
      const remaining = tx.createdAt + store.config.pageTtlMin * 60_000 - store.now();
      return send(res, 200, paymentPage(tx, store.config, remaining, warning), "text/html; charset=utf-8");
    }

    if (req.method === "POST") {
      const raw = await readBody(req);
      const outcome = new URLSearchParams(raw).get("outcome") as Outcome | null;
      if (!outcome || !OUTCOMES.includes(outcome)) return send(res, 400, errorPage("درخواست نامعتبر", "نتیجه پرداخت مشخص نیست."), "text/html; charset=utf-8");
      let target: string;
      try {
        target = store.pay(tx, outcome);
      } catch (e) {
        return send(res, 409, errorPage("امکان پرداخت نیست", (e as Error).message, tx.callbackApi), "text/html; charset=utf-8");
      }
      store.record({ method: "POST", path: `/pay/${urlId}`, status: 302, note: `outcome=${outcome}` });
      return send(res, 302, "", "text/plain", { Location: target });
    }
    return send(res, 405, "", "text/plain", { Allow: "GET, POST" });
  }

  const server = http.createServer(async (req, res) => {
    try {
      const { pathname } = new URL(req.url ?? "/", "http://sandbox");
      if (pathname === "/health") return send(res, 200, JSON.stringify({ status: "ok", service: "pep-ipg-sandbox" }), "application/json");
      if (pathname === "/" && req.method === "GET") return send(res, 200, homePage(baseUrl, store.config), "text/html; charset=utf-8");
      const pay = /^\/pay\/([A-Za-z0-9]+)$/.exec(pathname);
      if (pay) return await handlePay(req, res, pay[1]);
      return await handleApi(req, res, pathname);
    } catch (e) {
      if (!res.headersSent) sendJson(res, fail(500, { note: (e as Error).message }, 500));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 8787, host, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  baseUrl = `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${addr.port}`;

  return {
    baseUrl,
    store,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}
