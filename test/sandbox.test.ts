import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { startSandbox, type Sandbox } from "../src/sandbox/server.js";

let sb: Sandbox;
let merchant: http.Server;
let merchantUrl = "";
const callbacks: URLSearchParams[] = [];
let inv = 1000;
const nextInvoice = () => String(++inv);

before(async () => {
  sb = await startSandbox({ port: 0, config: { refererCheck: "off" } });
  merchant = http.createServer((req, res) => {
    callbacks.push(new URL(req.url ?? "/", "http://m").searchParams);
    res.end("ok");
  });
  await new Promise<void>((r) => merchant.listen(0, "127.0.0.1", () => r()));
  merchantUrl = `http://127.0.0.1:${(merchant.address() as AddressInfo).port}/callback`;
});
after(async () => {
  await sb.close();
  await new Promise<void>((r) => merchant.close(() => r()));
});

async function api(path: string, body: unknown, token?: string) {
  const res = await fetch(sb.baseUrl + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { http: res.status, ...(await res.json()) } as any;
}

async function token() {
  const r = await api("/token/getToken", { username: "sandbox", password: "sandbox" });
  assert.equal(r.resultCode, 0);
  return r.token as string;
}

const purchaseBody = (invoice: string, extra: object = {}) => ({
  invoice, invoiceDate: "1405/08/21", amount: 100000, callbackApi: merchantUrl,
  serviceCode: "8", serviceType: "PURCHASE", terminalNumber: 1234567, ...extra,
});

/** Simulate the cardholder clicking a result on the payment page; follow redirect to merchant. */
async function payViaPage(url: string, outcome: string) {
  const page = await fetch(url);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /شبیه‌ساز درگاه/);
  // Safety: card inputs are disabled and unnamed; only the outcome is ever submitted.
  const named = [...html.matchAll(/<(input|select|textarea)\b[^>]*\bname="([^"]+)"/g)].map((m) => m[2]);
  assert.deepEqual(named.filter((n) => n !== "outcome"), []);
  for (const tag of html.match(/<input\b[^>]*>/g) ?? []) assert.match(tag, /disabled|type="hidden"/);
  const res = await fetch(url, {
    method: "POST", redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `outcome=${outcome}`,
  });
  assert.equal(res.status, 302);
  const loc = res.headers.get("location")!;
  await fetch(loc);
  return new URL(loc).searchParams;
}

test("auth: missing, bad credentials, expired token", async () => {
  assert.equal((await api("/api/payment/purchase", purchaseBody(nextInvoice()))).http, 401);
  assert.equal((await api("/token/getToken", { username: "x", password: "y" })).resultCode, 13352);
  const t = await token();
  sb.store.fastForward(11);
  const r = await api("/api/payment/purchase", purchaseBody(nextInvoice()), t);
  assert.equal(r.resultCode, 13008);
  sb.store.fastForward(-11);
});

test("happy path: purchase → pay → callback → verify → inquiry → idempotent verify", async () => {
  const t = await token();
  const invoice = nextInvoice();
  const p = await api("/api/payment/purchase", purchaseBody(invoice), t);
  assert.equal(p.resultCode, 0);
  assert.ok(p.data.urlId && p.data.url.endsWith(p.data.urlId));

  const cb = await payViaPage(p.data.url, "success");
  assert.equal(cb.get("status"), "success");
  assert.equal(cb.get("invoiceId"), invoice);
  assert.ok(cb.get("referenceNumber"));
  assert.equal(callbacks.at(-1)?.get("invoiceId"), invoice);

  let q = await api("/api/payment/payment-inquiry", { invoiceId: invoice }, t);
  assert.equal(q.data.status, 0);

  const v = await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId }, t);
  assert.equal(v.resultCode, 0);
  assert.equal(v.data.amount, 100000);
  assert.match(v.data.maskedCardNumber, /\*{6}/);

  assert.equal((await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId }, t)).resultCode, 0);
  assert.equal((await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId, checkVerify: true }, t)).resultCode, 13428);
  q = await api("/api/payment/payment-inquiry", { invoiceId: invoice, checkVerify: true }, t);
  assert.equal(q.data.status, 13034);

  // Paid page is single-use
  assert.equal((await fetch(p.data.url)).status, 410);
});

test("validation errors, duplicate invoice, urlId vs url", async () => {
  const t = await token();
  const bad = await api("/api/payment/purchase", purchaseBody(nextInvoice(), { amount: "1000" }), t);
  assert.equal(bad.resultCode, 13000);
  assert.ok(bad.sandboxIssues.some((i: any) => i.field === "amount"));

  const invoice = nextInvoice();
  assert.equal((await api("/api/payment/purchase", purchaseBody(invoice), t)).resultCode, 0);
  assert.equal((await api("/api/payment/purchase", purchaseBody(invoice), t)).resultCode, 13003);

  const p = await api("/api/payment/purchase", purchaseBody(nextInvoice()), t);
  await payViaPage(p.data.url, "success");
  const r = await api("/api/payment/verify-payment", { invoice: String(inv), urlId: p.data.url }, t);
  assert.equal(r.resultCode, 13009); // full URL sent instead of urlId
  assert.ok(r.sandboxIssues.some((i: any) => i.field === "urlId"));
});

test("reverse within window, then reverse again and verify after reverse", async () => {
  const t = await token();
  const invoice = nextInvoice();
  const p = await api("/api/payment/purchase", purchaseBody(invoice), t);
  await payViaPage(p.data.url, "success");
  await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId }, t);
  assert.equal((await api("/api/payment/reverse-transactions", { invoice, urlId: p.data.urlId }, t)).resultCode, 0);
  assert.equal((await api("/api/payment/reverse-transactions", { invoice, urlId: p.data.urlId }, t)).resultCode, 13046);
  assert.equal((await api("/api/payment/payment-inquiry", { invoiceId: invoice }, t)).data.status, 13033);
});

test("time windows: no verify → auto reverse (13075); verified → auto confirm; reverse window → 13076", async () => {
  let t = await token();
  const a = nextInvoice();
  const pa = await api("/api/payment/purchase", purchaseBody(a), t);
  await payViaPage(pa.data.url, "success");

  const b = nextInvoice();
  const pb = await api("/api/payment/purchase", purchaseBody(b), t);
  await payViaPage(pb.data.url, "success");
  await api("/api/payment/verify-payment", { invoice: b, urlId: pb.data.urlId }, t);

  sb.store.fastForward(26);
  t = await token();
  assert.equal((await api("/api/payment/verify-payment", { invoice: a, urlId: pa.data.urlId }, t)).resultCode, 13075);
  assert.equal((await api("/api/payment/payment-inquiry", { invoiceId: a }, t)).data.status, 13033);
  assert.equal((await api("/api/payment/payment-inquiry", { invoiceId: b }, t)).data.status, 13029);
  assert.equal((await api("/api/payment/reverse-transactions", { invoice: b, urlId: pb.data.urlId }, t)).resultCode, 13046);

  // refund after confirm
  const rf = { invoice: b, urlId: pb.data.urlId, amount: 40000, pan: "603770******0340", type: "RefundOnline" };
  assert.equal((await api("/api/payment/refund-transactions", rf, t)).resultCode, 0);
  assert.equal((await api("/api/payment/refund-transactions", { ...rf, amount: 70000 }, t)).resultCode, 13395);
  sb.store.fastForward(-26);
});

test("unknown outcome, failed, cancel and expired page", async () => {
  const t = await token();
  const u = nextInvoice();
  const pu = await api("/api/payment/purchase", purchaseBody(u), t);
  assert.equal((await payViaPage(pu.data.url, "unknown")).get("status"), "unknown");
  assert.equal((await api("/api/payment/payment-inquiry", { invoiceId: u }, t)).data.status, 2);
  assert.equal((await api("/api/payment/verify-payment", { invoice: u, urlId: pu.data.urlId }, t)).resultCode, 2);
  sb.store.resolve(sb.store.findByInvoice(u)!, "success");
  assert.equal((await api("/api/payment/verify-payment", { invoice: u, urlId: pu.data.urlId }, t)).resultCode, 0);

  const f = nextInvoice();
  const pf = await api("/api/payment/purchase", purchaseBody(f), t);
  assert.equal((await payViaPage(pf.data.url, "failed")).get("status"), "failed");
  assert.equal((await api("/api/payment/verify-payment", { invoice: f, urlId: pf.data.urlId }, t)).resultCode, 13025);

  const c = nextInvoice();
  const pc = await api("/api/payment/purchase", purchaseBody(c), t);
  assert.equal((await payViaPage(pc.data.url, "cancel")).get("status"), "cancel");

  const e = nextInvoice();
  const pe = await api("/api/payment/purchase", purchaseBody(e), t);
  sb.store.fastForward(11);
  assert.equal((await fetch(pe.data.url)).status, 410);
  assert.equal((await api("/api/payment/payment-inquiry", { invoiceId: e }, await token())).data.status, 13025);
  sb.store.fastForward(-11);
});

test("fault injection: error, applied_then_error (verify really applied)", async () => {
  const t = await token();
  const invoice = nextInvoice();
  const p = await api("/api/payment/purchase", purchaseBody(invoice), t);
  await payViaPage(p.data.url, "success");

  sb.store.addFault({ endpoint: "verify-payment", mode: "error", code: 13005, delaySec: 0, remaining: 1 });
  assert.equal((await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId }, t)).resultCode, 13005);

  sb.store.addFault({ endpoint: "verify-payment", mode: "applied_then_error", code: 500, delaySec: 0, remaining: 1 });
  const r = await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId }, t);
  assert.equal(r.http, 500);
  // Merchant retries with checkVerify → learns it was already verified
  assert.equal((await api("/api/payment/verify-payment", { invoice, urlId: p.data.urlId, checkVerify: true }, t)).resultCode, 13428);
});

test("split payment, pre-transaction bill, referer strict", async () => {
  const t = await token();
  const s = await api("/api/payment/multiacc/purchase", {
    ...purchaseBody(nextInvoice()), serviceCode: "9", serviceType: "MULTIACCPURCHASE",
    sharedValue: ["50", "40"], sheba: ["IR430570023980001305443101", "790570022580001305443001"],
  }, t);
  assert.equal(s.resultCode, 13403);

  const bill = await api("/api/payment/pre-transaction", {
    invoice: nextInvoice(), amount: 12000, callbackApi: merchantUrl, serviceCode: "4", serviceType: "BILL",
    terminalNumber: 1234567, billId: "1234567804121", paymentId: "1270358",
  }, t);
  assert.equal(bill.resultCode, 0);
  assert.equal(typeof bill.data, "string");
  const q = await api("/api/payment/payment-inquiry", { billId: "1234567804121", paymentId: "1270358" }, t);
  assert.equal(q.data.status, 13016);

  sb.store.config.refererCheck = "strict";
  const p = await api("/api/payment/purchase", purchaseBody(nextInvoice()), t);
  assert.equal((await fetch(p.data.url)).status, 403);
  assert.equal((await fetch(p.data.url, { headers: { Referer: merchantUrl } })).status, 200);
  sb.store.config.refererCheck = "off";
});

test("publicUrl is used for payment page links", async () => {
  const { startSandbox } = await import("../src/sandbox/server.js");
  const s2 = await startSandbox({ port: 0, publicUrl: "https://pep-sandbox.staging.example.ir/" });
  try {
    assert.equal(s2.baseUrl, "https://pep-sandbox.staging.example.ir");
    const tok = await (await fetch(`${s2.listenUrl}/token/getToken`, { method: "POST", body: JSON.stringify({ username: "sandbox", password: "sandbox" }) })).json() as any;
    const p = await (await fetch(`${s2.listenUrl}/api/payment/purchase`, {
      method: "POST", headers: { Authorization: `Bearer ${tok.token}` },
      body: JSON.stringify(purchaseBody("PUB1")),
    })).json() as any;
    assert.ok(p.data.url.startsWith("https://pep-sandbox.staging.example.ir/pay/"), p.data.url);
  } finally {
    await s2.close();
  }
});
