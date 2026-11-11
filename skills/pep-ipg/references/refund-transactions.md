---
title: برگشت از خرید (Refund)
tags: refund, /api/payment/refund-transactions, refund, endpoint
---
# برگشت از خرید (Refund)

`POST <base url>/api/payment/refund-transactions`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

بازگشت تمام یا بخشی از وجه یک خرید تایید‌شده به کارت مشتری. مبلغ باید کمتر یا مساوی مبلغ اصلی باشد. type: RefundOnline یا RefundOffline. ترمینال‌های استفاده‌کننده رفتار پیش‌فرض اصلاحیه دارند.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور تراکنش اصلی |
| `amount` | integer | اجباری | مبلغ بازگشتی به ریال (≤ مبلغ اصلی) |
| `pan` | string | اجباری | شماره کارت |
| `type` | string | اجباری | RefundOnline | RefundOffline |
| `urlId` | string | اجباری | urlId تراکنش اصلی |

## نمونه درخواست
```json
{
  "amount": 1000,
  "invoice": "1731501497396312038",
  "pan": "<PAN>",
  "type": "RefundOnline",
  "urlId": "a8b008d2b76733958b4c975279a358e2e8d545e0000000001234567"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
