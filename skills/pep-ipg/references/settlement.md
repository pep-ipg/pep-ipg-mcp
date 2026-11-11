---
title: verify، confirm و reverse — تعیین تکلیف تراکنش
tags: verify, confirm, reverse, تاییدیه, اصلاحیه, برگشت, تعیین تکلیف, checkVerify, 13029, 13428, 13075, 13076, idempotency, settlement
---
# تعیین تکلیف تراکنش: verify، confirm، reverse

| عملیات | مسیر | اثر |
|---|---|---|
| **verify** (تایید با مهلت) | `/api/payment/verify-transactions` یا `/api/payment/verify-payment` | تا پایان مهلت توافقی، پذیرنده هنوز می‌تواند confirm یا reverse کند. پس از مهلت، سوییچ تراکنش را خودکار confirm می‌کند. |
| **confirm** (تایید آنی) | `/api/payment/confirm-transactions` | تراکنش قطعی می‌شود؛ امکان تغییر وضعیت نیست؛ مبلغ در سیکل شاپرکی به پذیرنده واریز می‌شود. |
| **reverse** (اصلاحیه) | `/api/payment/reverse-transactions` | تراکنش قطعی می‌شود و مبلغ در سیکل شاپرکی به دارنده کارت برمی‌گردد. |

ورودی هر سه: `invoice` + `urlId` (urlId همان `data.urlId` پاسخ خرید است، نه کل URL).

## verify-transactions در برابر verify-payment
عملیات یکی است؛ فقط پاسخ فرق دارد. `verify-payment` شامل `referenceNumber`، `trackId`، `maskedCardNumber`، `hashedCardNumber` (sha256)، `requestDate` و `amount` است. **توصیه:** از verify-payment استفاده کنید و `amount` پاسخ را با مبلغ سفارش تطبیق دهید.

## Idempotency و تکرار
- confirm/verify تکراری → **13029** (قبلاً تایید شده). موفق تلقی کنید.
- با `checkVerify: true`، verify تکراری → **13428** (Already verified). بدون آن، پاسخ موفق تکراری می‌گیرید. هر دو را موفق تلقی کنید ولی خدمت را دوبار تحویل ندهید (کلید idempotency سمت شما: invoice).
- timeout در verify: verify را با همان invoice/urlId تکرار کنید (امن است) یا `payment-inquiry` با `checkVerify: true` بزنید؛ status=13034 یعنی verify ثبت شده است.

## مهلت‌ها و خطاها
- اتمام مهلت confirm/verify → 13075. اتمام مهلت reverse → 13076 (برای بازگشت وجه از Refund استفاده کنید).
- reverse فقط برای خرید و خرید تسهیمی است.
- پس از confirm، reverse ممکن نیست؛ فقط Refund.

## ناسازگاری‌های مستند (v25 تا v28) (برای اطلاع)
- بخش «مراحل کلی» می‌گوید برای reverse نیازی به verify نیست؛ بخش «سرویس برگشت تراکنش» می‌گوید تراکنش باید verify شده باشد.
- مهلت verify در یک بخش «حداکثر ۱۰ دقیقه» و در بخش دیگر «پیش‌فرض ۲۵ دقیقه» ذکر شده است.
- بخش «مراحل کلی» verify را پس از ارائه خدمت آورده و بخش verify پیش از آن؛ ترتیب امن: verify ← تحویل خدمت.
- در جدول خروجی verify-transactions، `Data` «آدرس تولید شده جهت پرداخت» توصیف شده، درحالی‌که نمونه پاسخ یک پیام متنی است.
