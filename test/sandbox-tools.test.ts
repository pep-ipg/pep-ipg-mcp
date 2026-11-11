import { test, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { configure, ensureSandbox, injectFault, payTx, resolveTx, statusReport, stopSandbox, describeStart } from "../src/sandbox/tools.js";

after(() => stopSandbox());

test("tool layer: start, pay with callback, status, resolve, inject, clock", async () => {
  const hits: string[] = [];
  const merchant = http.createServer((req, res) => { hits.push(req.url ?? ""); res.end("ok"); });
  await new Promise<void>((r) => merchant.listen(0, "127.0.0.1", () => r()));
  const cb = `http://127.0.0.1:${(merchant.address() as AddressInfo).port}/cb`;

  const sb = await ensureSandbox(0);
  assert.equal(await ensureSandbox(), sb, "singleton");
  assert.match(describeStart(sb), /PEP_BASE_URL=http:\/\/127\.0\.0\.1:\d+/);

  const tok = await (await fetch(`${sb.baseUrl}/token/getToken`, { method: "POST", body: JSON.stringify({ username: "sandbox", password: "sandbox" }) })).json() as any;
  const buy = async (invoice: string) => (await fetch(`${sb.baseUrl}/api/payment/purchase`, {
    method: "POST", headers: { Authorization: `Bearer ${tok.token}` },
    body: JSON.stringify({ invoice, invoiceDate: "d", amount: 5000, callbackApi: cb, serviceCode: "8", serviceType: "PURCHASE", terminalNumber: 1234567 }),
  })).json() as any;

  assert.equal((await buy("A1")).resultCode, 0);
  const out = await payTx(sb, "A1", "success", true);
  assert.match(out, /HTTP 200/);
  assert.ok(hits.some((h) => h.includes("invoiceId=A1") && h.includes("status=success")));

  await buy("A2");
  await payTx(sb, "A2", "unknown", false);
  assert.match(resolveTx(sb, "A2", "failed"), /FAILED/);

  assert.match(injectFault(sb, { endpoint: "verify-payment", mode: "error", code: 13005, delaySec: 0, remaining: 2 }), /#\d+/);
  const st = statusReport(sb);
  assert.match(st.text, /A1/);
  assert.match(st.text, /verify-payment · error/);

  assert.match(configure(sb, { refererCheck: "strict" }, 30), /Referer=strict/);
  assert.match(statusReport(sb).text, /REVERSED/, "unverified payment auto-reversed after window");
  sb.store.reset();
  await new Promise<void>((r) => merchant.close(() => r()));
});
