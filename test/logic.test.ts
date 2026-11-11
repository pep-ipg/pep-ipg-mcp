import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSpec, findEndpoint } from "../src/spec.js";
import { validatePayload, validNationalCode } from "../src/validate.js";
import { decide } from "../src/decision.js";

const spec = loadSpec();
const v = (id: string, body: unknown) => validatePayload(spec, findEndpoint(spec, id)!, body);
const has = (r: ReturnType<typeof v>, field: string, code?: number) =>
  r.issues.some((i) => i.field === field && (code === undefined || i.likelyCode === code));

test("every endpoint sample request is valid", () => {
  for (const ep of spec.endpoints) {
    const r = validatePayload(spec, ep, ep.request);
    assert.ok(r.valid, `${ep.id}: ${JSON.stringify(r.issues)}`);
  }
});

test("purchase rules", () => {
  const r = v("purchase", { invoice: "1", invoiceDate: "x", amount: "1000", callbackApi: "shop.ir/cb", serviceCode: "8", serviceType: "PURCHASE ", mobileNumber: "912", nationalCode: "0012345678" });
  assert.equal(r.valid, false);
  for (const [f, c] of [["amount", 13000], ["callbackApi", 13028], ["serviceType", 13000], ["terminalNumber", 13000], ["mobileNumber", 13346], ["nationalCode", 13302]] as const)
    assert.ok(has(r, f, c), `${f}`);
  assert.ok(validNationalCode("0013542419"));
  assert.ok(!validNationalCode("1111111111"));
});

test("split payment rules", () => {
  const base = { invoice: "1", invoiceDate: "d", callbackApi: "https://a.ir/c", serviceCode: "9", serviceType: "MULTIACCPURCHASE", terminalNumber: 1, amount: 10000 };
  assert.ok(has(v("multiacc-purchase", { ...base, sharedValue: ["6000", "3000"], sheba: ["430570023980001305443101", "790570022580001305443001"] }), "sharedValue", 13416));
  assert.ok(v("multiacc-purchase", { ...base, sharedValue: ["10.5", "89.5"], sheba: ["430570023980001305443101", "790570022580001305443001"] }).valid);
  assert.ok(has(v("multiacc-purchase", { ...base, sharedValue: ["5000", "50"], sheba: ["430570023980001305443101", "790570022580001305443001"] }), "sharedValue", 13416));
  assert.ok(has(v("multiacc-payment-code", { ...base, sharedValue: ["100"].slice(0, 0).concat(["50", "50"]), sheba: ["430570023980001305443101", "790570022580001305443001"] }), "paymentCode", 13000));
});

test("decision engine", () => {
  const cases: [Parameters<typeof decide>[0], string, string][] = [
    [{ callback_status: "success" }, "VERIFY", "hold"],
    [{ callback_status: "cancel" }, "DO_NOT_DELIVER", "no"],
    [{}, "INQUIRY", "hold"],
    [{ inquiry_status: 2, minutes_since_payment: 5 }, "RETRY_INQUIRY", "hold"],
    [{ inquiry_status: 2, minutes_since_payment: 120 }, "ESCALATE", "hold"],
    [{ inquiry_status: 13034 }, "DELIVER", "yes"],
    [{ inquiry_status: 13029, delivery_failed: true }, "REFUND", "no"],
    [{ verify_result_code: 0, callback_status: "failed" }, "DELIVER", "yes"],
    [{ verify_result_code: 0, delivery_failed: true, minutes_since_payment: 3 }, "REVERSE", "no"],
    [{ verify_result_code: 0, delivery_failed: true, minutes_since_payment: 40 }, "REFUND", "no"],
    [{ verify_result_code: 13005 }, "RETRY_VERIFY", "hold"],
    [{ verify_result_code: 13008 }, "REAUTH_AND_RETRY", "hold"],
    [{ verify_result_code: 13075 }, "INQUIRY", "hold"],
  ];
  for (const [input, action, deliver] of cases) {
    const d = decide(input);
    assert.equal(d.action, action, JSON.stringify(input));
    assert.equal(d.deliver, deliver, JSON.stringify(input));
  }
});
