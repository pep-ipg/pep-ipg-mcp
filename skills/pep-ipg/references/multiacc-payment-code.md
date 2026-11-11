---
title: خرید شناسه‌دار با تسهیم (جدید در نسخه 28)
tags: multiacc, purchase, paymentCode, شناسه دار, تسهیم, شبا, sheba, sharedValue, MULTIACCPURCHASE, /api/payment/multiacc/purchase, endpoint
---
# خرید شناسه‌دار با تسهیم

`POST <base url>/api/payment/multiacc/purchase`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

ترکیب «خرید شناسه‌دار» و «خرید با تسهیم» که در نسخه 28.0 (1405/08/12) اضافه شده است. مسیر، serviceCode و serviceType همان خرید با تسهیم است (`9` / `MULTIACCPURCHASE`). تنها تفاوت، فیلد **`paymentCode`** است که در این حالت **اجباری** است.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور یکتا |
| `invoiceDate` | string | اجباری | تاریخ فاکتور (فرمت دلخواه) |
| `amount` | integer | اجباری | مبلغ کل به ریال |
| `callbackApi` | string | اجباری | آدرس بازگشت؛ دامنه باید در ثبت‌نام ترمینال تعریف شده باشد |
| `mobileNumber` | string | شرطی | اگر تطبیق کارت و موبایل در قرارداد فعال باشد اجباری |
| `serviceCode` | string | اجباری | `"9"` |
| `serviceType` | string | اجباری | `"MULTIACCPURCHASE"` |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `paymentCode` | string | اجباری | شناسه پرداخت مرچنت |
| `sharedValue` | array | اجباری | سهم هر شبا (مبلغی، درصدی یا درصدی اعشاری) |
| `sheba` | array | اجباری | شباها بدون IR (۲۴ رقم)، حداکثر ۱۰ |
| `description` | string | اختیاری | توضیحات |
| `payerMail` | string | اختیاری | ایمیل پرداخت‌کننده |
| `payerName` | string | اختیاری | نام پرداخت‌کننده |
| `pans` | string | اختیاری | شماره کارت‌های مجاز |

## قوانین sharedValue
- مقادیر بالای 100 → تسهیم **مبلغی** (جمع برابر amount)
- مقادیر زیر 100 → تسهیم **درصدی** (جمع 100)
- زیر 100 و اعشاری → **درصدی اعشاری**
- تعداد `sharedValue` و `sheba` برابر باشد

## نمونه درخواست (درصدی)
```json
{
  "invoice": "1112223456",
  "invoiceDate": "1405/08/12",
  "amount": 10000,
  "callbackApi": "https://shop.example.ir/payment/callback",
  "serviceCode": "9",
  "serviceType": "MULTIACCPURCHASE",
  "terminalNumber": 1234567,
  "paymentCode": "7878",
  "sharedValue": ["50", "40", "10"],
  "sheba": ["430570023980001305443101", "790570022580001305443001", "490570023910001305443001"]
}
```

## نمونه درخواست (مبلغی)
```json
{
  "invoice": "1403122341",
  "invoiceDate": "1405/08/12",
  "amount": 10000,
  "callbackApi": "https://shop.example.ir/payment/callback",
  "serviceCode": "9",
  "serviceType": "MULTIACCPURCHASE",
  "terminalNumber": 1234567,
  "paymentCode": "7878",
  "sharedValue": ["1000", "5000", "4000"],
  "sheba": ["430570023980001305443101", "790570022580001305443001", "490570023910001305443001"]
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

ادامه فرآیند (redirect، callback، verify، reverse) مانند خرید عادی است.

> نمونه اول مستند رسمی `" MULTIACCPURCHASE"` را با فاصله ابتدایی آورده است؛ مقدار را بدون فاصله ارسال کنید.
