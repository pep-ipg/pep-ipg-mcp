---
title: استعلام وضعیت تراکنش با کارت هش‌شده
tags: payment-inquiry-v2, /api/payment/payment-inquiryv2, inquiry, endpoint
---
# استعلام وضعیت تراکنش با کارت هش‌شده

`POST <base url>/api/payment/payment-inquiryv2`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

مانند payment-inquiry، با فیلد اضافه hashedCardNumber (sha256 شماره کارت) در پاسخ — مناسب برای تطبیق کارت بدون نگهداری شماره کامل.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoiceId` | string | شرطی | شماره فاکتور |
| `billId` | string | شرطی | شناسه قبض |
| `paymentId` | string | شرطی | شناسه پرداخت |
| `checkVerify` | boolean | اختیاری | اطلاع از ارسال verify |

## نمونه درخواست
```json
{
  "invoiceId": "14030620",
  "checkVerify": false
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": {
    "status": 13029,
    "trackId": "10",
    "transactionId": "43",
    "amount": 10000,
    "cardNumber": "603770******0340",
    "invoice": "14030620",
    "url": "<urlId>",
    "referenceNumber": "141010000008",
    "requestDate": "2024-09-10 11:51:56.000000000",
    "hashedCardNumber": "<sha256>"
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
