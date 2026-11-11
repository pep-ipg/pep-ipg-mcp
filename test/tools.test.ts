import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSearch, getAuthFlow, getDoc, getErrorCode, loadCorpus, searchDocs } from "../src/tools.js";

const corpus = loadCorpus();

test("corpus is complete", () => {
  assert.equal(Object.keys(corpus.errors).length, 202);
  for (const id of ["get-token", "purchase", "verify-payment", "reverse-payment", "payment-inquiry", "authentication", "settlement"]) {
    assert.ok(corpus.docs.has(id), `missing doc ${id}`);
  }
});

test("search ranks relevant docs", () => {
  const cases: Record<string, string> = {
    "Referrer-Policy no-referrer": "referer",
    "تسهیم شبا sharedValue": "multiacc-purchase",
    "verify تکراری checkVerify": "settlement",
    "توکن منقضی": "authentication",
    "استعلام وضعیت تراکنش": "payment-inquiry",
  };
  for (const [q, want] of Object.entries(cases)) {
    const hits = searchDocs(corpus, q, 3).map((h) => h.docId);
    assert.ok(hits.includes(want), `${q}: want ${want} in ${hits}`);
  }
  assert.ok(searchDocs(corpus, "كد خطاي توكن").length > 0, "arabic letters normalized");
});

test("search surfaces error codes in the query", () => {
  assert.match(formatSearch(corpus, "خطای 13402 میگیرم"), /Response Invalid Referer/);
});

test("get_error_code", () => {
  assert.match(getErrorCode(corpus, 13029), /Transaction status is confirmed/);
  assert.match(getErrorCode(corpus, "۱۳۴۰۲"), /Referer/);
  assert.match(getErrorCode(corpus, "invalid referer"), /13402/);
  assert.match(getErrorCode(corpus, 99999), /نیست/);
});

test("get_doc and get_auth_flow", () => {
  assert.match(getDoc(corpus, "verify-payment.md") ?? "", /verify-payment/);
  assert.equal(getDoc(corpus, "nope"), undefined);
  assert.match(getAuthFlow(corpus, "go"), /tokenClient/);
  assert.doesNotMatch(getAuthFlow(corpus), /RSA.*private key/i);
});

test("v28 updates", () => {
  assert.match(getDoc(corpus, "purchase") ?? "", /localization/);
  assert.match(getDoc(corpus, "multiacc-payment-code") ?? "", /paymentCode/);
  assert.match(getErrorCode(corpus, 13046), /تعیین تکلیف/);
  assert.ok(searchDocs(corpus, "خرید شناسه دار با تسهیم", 3).some((h) => h.docId === "multiacc-payment-code"));
});

test("optional bearer auth", async () => {
  const { isAuthorized } = await import("../src/auth.js");
  assert.equal(isAuthorized(undefined, undefined), true);
  assert.equal(isAuthorized(undefined, "s3cret"), false);
  assert.equal(isAuthorized("Bearer wrong", "s3cret"), false);
  assert.equal(isAuthorized("Bearer s3cret", "s3cret"), true);
  assert.equal(isAuthorized("bearer  s3cret ", "s3cret"), true);
});
