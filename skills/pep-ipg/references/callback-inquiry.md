---
title: callback و استعلام وضعیت تراکنش (payment-inquiry)
tags: callback, inquiry, استعلام, payment-inquiry, payment-inquiryv2, status, 13034, 13016, 13033, unknown, نامشخص, reconciliation, hashedCardNumber
---
# callback و استعلام وضعیت

## پارامترهای callback
پس از پرداخت، کاربر به `callbackApi` برمی‌گردد:

```
CALLBACK_URL?invoiceId=10001&status=success&referenceNumber=142536124562&trackId=123456
```

| پارامتر | معنی |
|---|---|
| invoiceId | شماره فاکتور ارسالی پذیرنده |
| status | success / failed / unknown / cancel / expire |
| referenceNumber | شماره ارجاع شاپرکی |
| trackId | کد پیگیری |

**هشدار امنیتی:** پارامترهای callback از مرورگر کاربر می‌آیند و قابل دستکاری‌اند. هرگز فقط بر اساس `status=success` خدمت تحویل ندهید؛ تصمیم نهایی با پاسخ verify (یا inquiry) سمت سرور است.

## استعلام وضعیت
`POST /api/payment/payment-inquiry` (یا `payment-inquiryv2` که `hashedCardNumber` هم برمی‌گرداند).
- قبض: `billId` + `paymentId`. سایر: `invoiceId`.
- `checkVerify: true`: اگر وضعیت نامشخص ولی verify موفق ثبت شده باشد، status=13034 برمی‌گردد.

## data.status
| status | معنی | اقدام پیشنهادی |
|---|---|---|
| 0 | موفق، هنوز verify نشده | verify در مهلت |
| 2 | نامشخص | خدمت نده؛ inquiry مجدد با backoff |
| 13016 | تراکنش یافت نشد | پرداخت‌نشده در نظر بگیر |
| 13025 | ناموفق | خدمت نده |
| 13029 | موفق و تایید شده | خدمت بده (idempotent) |
| 13033 | reverse شده | خدمت نده |
| 13034 | verify موفق دریافت شده | خدمت بده |

> `resultCode` وضعیت **فراخوانی سرویس** است و `data.status` وضعیت **تراکنش**. resultCode=0 با status=13025 یعنی استعلام موفق بوده و تراکنش ناموفق است.

## سناریوهای استفاده
1. callback نرسیده یا timeout شده و پذیرنده باید تعیین تکلیف کند.
2. پذیرنده می‌خواهد از وضعیت تراکنش مطلع شود (اختیاری).

## الگوی Reconciliation پیشنهادی
یک job دوره‌ای همه سفارش‌های «در انتظار» قدیمی‌تر از چند دقیقه را با inquiry (checkVerify=true) تعیین تکلیف کند — تا تراکنش‌هایی که کاربرشان مرورگر را بسته از دست نروند. ابزار `next_action` منطق تصمیم را برمی‌گرداند.
