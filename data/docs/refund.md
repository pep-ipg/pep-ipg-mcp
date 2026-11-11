---
title: برگشت از خرید (Refund) — مستقیم و از طریق Provider
tags: refund, برگشت از خرید, provider, toman, پاد, pod, settlement, تسویه, wallet, کیف پول, card-to-iban, 13395, 13426
---
# برگشت از خرید (Refund)

## چه زمانی reverse و چه زمانی Refund؟
- **reverse:** ابطال کامل، فقط در مهلت (پیش‌فرض ۲۵ دقیقه) و پیش از confirm.
- **Refund:** پس از تایید (confirm) یا پایان مهلت reverse، و برای بازگشت **بخشی** از مبلغ.

## Refund مستقیم
`POST /api/payment/refund-transactions` با `invoice`، `amount` (≤ مبلغ اصلی)، `pan`، `type` (RefundOnline | RefundOffline) و `urlId` تراکنش اصلی. ترمینال‌هایی که از این سرویس استفاده می‌کنند رفتار پیش‌فرض اصلاحیه دارند.

## Refund از طریق Provider (toman / پاد)
1. `getToken` با `provider_credentials` (راهنمای authentication).
2. `POST /api/payment/refund-transactions-3rd-party/toman` (یا بدون `/toman` برای پاد): `invoiceID` جدید و یکتا برای خودِ Refund، `originInvoiceID` خرید اصلی، `terminalNumber`، و اختیاری `amount` (خالی = کل مبلغ) و `originUrlId`.
3. پیگیری:
   - با فاکتور Refund: `/api/third-party/provider/v1/settlement/tracking/toman` (پاد: `/settlement/tracking`)
   - با UUID: `/api/third-party/provider/v1/settlement/toman`
   - لیست با بازه تاریخ: `/api/third-party/provider/v1/settlements/toman` (۵۰ مورد در هر صفحه؛ کلید پیام `resultMessage` است)
4. ابزارهای جانبی: `card-to-iban/toman` و `get-wallet/toman` (موجودی کیف پول؛ پیش از Refund حجیم، `can_use_for_settlement` و `minimum_balance` را چک کنید).

## وضعیت تسویه Refund (result.status)
-1 نامشخص · 0 ایجاد شده · 1 ناموفق · 2 در حال انجام · 3 موفق · 4 لغو توسط کاربر · 5 منقضی · 6 عدم تایید کاربر · 8 خطا (شماره حساب اشتباه)

وضعیت 2 را نهایی ندانید؛ تا 3 یا یک وضعیت پایانی polling کنید.

## خطاهای رایج
13426 (تراکنش اصلی تایید‌شده نیست)، 13395 (Refund رد شد)، 13077/13325 (تراکنش اصلی نامعتبر/یافت نشد)، 13425 (خطای Provider).
