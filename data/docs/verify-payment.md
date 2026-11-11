---
title: تاییدیه با اطلاعات تکمیلی
tags: verify-payment, /api/payment/verify-payment, settlement, endpoint
---
# تاییدیه با اطلاعات تکمیلی

`POST <base url>/api/payment/verify-payment`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

عملیات همانند verify-transactions است؛ تفاوت فقط در پاسخ است که شامل referenceNumber، trackId، شماره کارت ماسک‌شده و هش‌شده (sha256)، تاریخ و مبلغ است. برای تطبیق مبلغ پیش از تحویل خدمت توصیه می‌شود.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور |
| `urlId` | string | اجباری | urlId پاسخ خرید |
| `checkVerify` | boolean | اختیاری | مانند verify |

## نمونه درخواست
```json
{
  "checkVerify": true,
  "invoice": "20301112123",
  "urlId": "55358de10d025f49050e9913e7ca425d20185eb2000000001234567"
}
```

## نمونه پاسخ
```json
{
  "data": {
    "invoice": "20301112123",
    "referenceNumber": "141010031419",
    "trackId": "11",
    "maskedCardNumber": "603770******0340",
    "hashedCardNumber": "<sha256>",
    "requestDate": "2024-08-14 12:23:34.000000000",
    "amount": 1000
  },
  "resultMsg": "Successful",
  "resultCode": 0
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
