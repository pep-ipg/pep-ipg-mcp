---
title: استعلام وضعیت تراکنش
tags: payment-inquiry, /api/payment/payment-inquiry, inquiry, endpoint
---
# استعلام وضعیت تراکنش

`POST <base url>/api/payment/payment-inquiry`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

برای تعیین تکلیف وقتی callback نرسیده یا timeout شده است. برای قبض از billId+paymentId و برای سایر تراکنش‌ها از invoiceId استفاده کنید. وضعیت در data.status است (0, 2, 13016, 13025, 13029, 13033, 13034). با checkVerify=true، اگر وضعیت نامشخص ولی verify موفق ثبت شده باشد status=13034 برمی‌گردد.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoiceId` | string | شرطی | شماره فاکتور (برای غیر قبض) |
| `billId` | string | شرطی | شناسه قبض (برای قبض) |
| `paymentId` | string | شرطی | شناسه پرداخت (برای قبض) |
| `checkVerify` | boolean | اختیاری | اطلاع از ارسال verify |

## نمونه درخواست
```json
{
  "invoiceId": "203011121234",
  "checkVerify": true
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": {
    "status": 13033,
    "trackId": "12",
    "transactionId": "50333",
    "amount": 1000,
    "cardNumber": "603770******0340",
    "invoice": "203011121234",
    "url": "<urlId>",
    "referenceNumber": "141010031420",
    "requestDate": "2024-08-14T12:25:31.000"
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
