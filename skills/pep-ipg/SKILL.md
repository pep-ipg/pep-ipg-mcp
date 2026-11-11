---
name: pep-ipg
description: Integrate the Pasargad Electronic Payment (PEP / پرداخت الکترونیک پاسارگاد) internet payment gateway, Dorsa protocol v28. Use for any code, review or debugging that touches the Pasargad IPG (درگاه پرداخت پاسارگاد) - getToken, purchase, split payment (تسهیم), top-up and bill (شارژ / قبض), verify / confirm / reverse, callback, payment-inquiry, refund - or for explaining its resultCode / status codes such as 13402, 13029 or 13034.
---

# Pasargad IPG (Dorsa v28)

Ground every endpoint, field name, value and error code in `references/`. Do not rely on memory: older Pasargad (PEP) integrations used RSA/XML signing and different endpoints, which do not apply to this protocol.

## Core facts

- **Auth:** `POST <base url>/token/getToken` with `{"username","password"}` returns a JWT (default lifetime 10 minutes, read `exp`). Send `Authorization: Bearer <token>` on every other call. **No RSA or request signing.**
- **Transport:** every service is `POST` with a JSON body. `<base url>` is issued per merchant at terminal setup.
- **Amounts:** integer **Rials**, sent as numbers, never strings.
- **Envelope:** responses carry `resultCode` (0 = the call succeeded) and `resultMsg`. In payment-inquiry, the transaction state is `data.status`, which is separate from `resultCode`.

## Payment flow

1. `getToken`, then cache the token and refresh it shortly before `exp`.
2. Register the payment: `purchase` (serviceCode `"8"` / `PURCHASE`), `multiacc/purchase` (`"9"` / `MULTIACCPURCHASE`) or `pre-transaction` (top-up and bill). Store `invoice` together with `urlId`.
3. Redirect the user's **browser** to the returned URL. The `Referer` must match a domain registered for the terminal (error 13402).
4. The callback arrives on `callbackApi` with `invoiceId`, `status`, `referenceNumber` and `trackId` as query params.
5. On the server, call `verify-payment` and check that the returned `amount` matches the order. Deliver only after verify succeeds.
6. If delivery fails, call `reverse-transactions` within the terminal's window (default 25 minutes). After confirm, or once the window has passed, use `refund-transactions`.
7. If no callback arrives or the result is unknown, call `payment-inquiry` with `checkVerify: true`.

## Rules to apply in generated code

- **Never deliver on the callback alone.** Its query params come from the user's browser and can be forged.
- Send `urlId` (that is `data.urlId`, or the last path segment of the URL), not the full payment URL. Sending the URL causes error 13009.
- Use a new unique `invoice` for every payment attempt; a reused invoice causes 13003. Enforce uniqueness in the database.
- Treat repeated verify and confirm results as success, but make delivery idempotent:
  - 13029: already confirmed.
  - 13428: already verified, returned when `checkVerify` is true.
  - 13034: verify received, status pending.
- Inquiry `data.status` values:
  - 0: success, not yet verified. Verify it.
  - 2: unknown. Hold delivery and retry with backoff.
  - 13016: not found. Treat as not paid.
  - 13025: failed. Do not deliver.
  - 13029: confirmed. Deliver.
  - 13033: reversed. Do not deliver.
  - 13034: verified. Deliver.
- The response shape differs by endpoint: `purchase` returns `data` as an object `{urlId, url}`, while `pre-transaction` returns `data` as a URL string.
- Split payments (multiacc):
  - At most 10 IBANs, sent **without the `IR` prefix**.
  - `sharedValue` is an array of strings, one per IBAN.
  - Values above 100 mean amounts, which must sum to `amount`. Values below 100 mean percents, which must sum to 100.
  - Never mix the two modes.
- Never log or store card number, CVV2 or PIN2 (used by `inquiry-confirm-pin` and `inquiry-mini-statement`). Use `hashedCardNumber` when you need to match a card.

## References

| Need | File |
|---|---|
| End-to-end flow and time windows | `references/overview.md` |
| JWT auth and token caching | `references/authentication.md`, `references/get-token.md` |
| Purchase variants comparison | `references/purchase-flows.md` |
| Purchase / payment-code purchase | `references/purchase.md` |
| Split payment / with payment code (v28) | `references/multiacc-purchase.md`, `references/multiacc-payment-code.md` |
| Top-up, data packages, bills | `references/topup-bill.md` |
| verify vs confirm vs reverse | `references/settlement.md`, `references/verify-payment.md`, `references/verify-transactions.md`, `references/confirm-payment.md`, `references/reverse-payment.md` |
| Callback and inquiry | `references/callback-inquiry.md`, `references/payment-inquiry.md`, `references/payment-inquiry-v2.md` |
| Refund (direct and provider) | `references/refund.md`, `references/refund-transactions.md`, `references/provider-*.md`, `references/settlement-*.md` |
| Strong / stock-market authorization | `references/authorization.md` |
| Referer errors | `references/referer.md` |
| Common mistakes and go-live checklist | `references/pitfalls.md` |
| Security | `references/security.md` |
| **Any error or status code** | `references/errors.md` (all 202 codes); find one with `grep -n "\| 13402 \|" references/errors.md` |

Each endpoint file contains the path, the required, optional and conditional fields, a sample request and a sample response. When writing a client, copy field names exactly as they appear in these files.

Values in samples (terminal numbers, invoices, urlIds) are placeholders. Each merchant gets its real base URL, credentials and time windows from Pasargad's technical team. The official Dorsa protocol document is the final authority.
