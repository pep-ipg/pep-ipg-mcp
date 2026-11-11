---
title: تایید آنی خرید (confirm)
tags: confirm, /api/payment/confirm-transactions, settlement, endpoint
---
# تایید آنی خرید (confirm)

`POST <base url>/api/payment/confirm-transactions`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

تایید نهایی و آنی تراکنش؛ پس از آن امکان reverse وجود ندارد و مبلغ در سیکل شاپرکی به حساب پذیرنده واریز می‌شود. فراخوانی تکراری خطای 13029 (قبلاً تایید شده) برمی‌گرداند.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور ارسالی در درخواست خرید |
| `urlId` | string | اجباری | urlId دریافتی از پاسخ خرید |

## نمونه درخواست
```json
{
  "invoice": "203011121",
  "urlId": "dfbb284970e05f5a287804966f388deed2fdbcc6000000001234567"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": {
    "invoice": "203011121",
    "referenceNumber": "141010031417",
    "trackId": "9",
    "maskedCardNumber": "603770******0340",
    "hashedCardNumber": "<sha256>",
    "requestDate": "2024-08-14 12:18:31.000000000",
    "amount": 1000
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
