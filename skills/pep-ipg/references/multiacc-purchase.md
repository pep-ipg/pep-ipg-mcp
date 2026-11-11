---
title: خرید با تسهیم (چندشبایی)
tags: multiacc-purchase, /api/payment/multiacc/purchase, payment, endpoint
---
# خرید با تسهیم (چندشبایی)

`POST <base url>/api/payment/multiacc/purchase`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

خرید با تقسیم مبلغ بین حداکثر ۱۰ شبا. serviceCode=9 و serviceType=MULTIACCPURCHASE. sharedValue سه حالت دارد: مبلغی (مقادیر بالای 100)، درصدی (زیر 100)، درصدی اعشاری (زیر 100 و اعشاری). شباها بدون IR ارسال شوند. برای «خرید شناسه‌دار با تسهیم» (نسخه 28) همین سرویس با فیلد paymentCode فراخوانی می‌شود؛ راهنمای `multiacc-payment-code`.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور یکتا |
| `invoiceDate` | string | اجباری | تاریخ فاکتور |
| `amount` | integer | اجباری | مبلغ کل به ریال |
| `callbackApi` | string | اجباری | آدرس بازگشت |
| `mobileNumber` | string | شرطی | موبایل پرداخت‌کننده (در صورت فعال بودن احراز هویت قوی اجباری) |
| `serviceCode` | string | اجباری | "9" |
| `serviceType` | string | اجباری | "MULTIACCPURCHASE" |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `description` | string | اختیاری | توضیحات |
| `payerMail` | string | اختیاری | ایمیل |
| `payerName` | string | اختیاری | نام |
| `pans` | string | اختیاری | شماره کارت‌ها |
| `paymentCode` | string | شرطی | شناسه پرداخت مرچنت — فقط در «خرید شناسه‌دار با تسهیم» و در آن حالت اجباری (از نسخه 28) |
| `sharedValue` | array | اجباری | آرایه رشته‌ای سهم هر شبا (مبلغ، درصد یا درصد اعشاری) |
| `sheba` | array | اجباری | آرایه شباها بدون IR (۲۴ رقم)، حداکثر ۱۰ |

## نمونه درخواست
```json
{
  "invoice": "1112223456",
  "invoiceDate": "1405/05/04",
  "amount": 10000,
  "callbackApi": "https://shop.example.ir/payment/callback",
  "serviceCode": "9",
  "serviceType": "MULTIACCPURCHASE",
  "terminalNumber": 1234567,
  "sharedValue": [
    "50",
    "40",
    "10"
  ],
  "sheba": [
    "430570023980001305443101",
    "790570022580001305443001",
    "490570023910001305443001"
  ]
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": {
    "urlId": "<urlId>",
    "url": "<payment-page-url>"
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
