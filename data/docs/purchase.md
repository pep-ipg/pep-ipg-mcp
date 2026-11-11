---
title: خرید (و خرید شناسه‌دار)
tags: purchase, /api/payment/purchase, payment, endpoint
---
# خرید (و خرید شناسه‌دار)

`POST <base url>/api/payment/purchase`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

ثبت درخواست خرید و دریافت آدرس یکبارمصرف صفحه پرداخت. پذیرنده کاربر را به data.url هدایت می‌کند و data.urlId را برای verify/confirm/reverse/inquiry ذخیره می‌کند. برای خرید شناسه‌دار، paymentCode نیز ارسال می‌شود. serviceCode=8 و serviceType=PURCHASE.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور یکتا |
| `invoiceDate` | string | اجباری | تاریخ فاکتور (فرمت دلخواه، مثلاً 1405/05/04) |
| `amount` | integer | اجباری | مبلغ به ریال |
| `callbackApi` | string | اجباری | آدرس بازگشت کاربر پس از پرداخت؛ دامنه آن باید در ثبت‌نام ترمینال تعریف شده باشد |
| `mobileNumber` | string | شرطی | موبایل پرداخت‌کننده؛ اگر احراز هویت قوی/تطبیق کارت و موبایل در قرارداد فعال باشد اجباری است |
| `serviceCode` | string | اجباری | کد سرویس: "8" |
| `serviceType` | string | اجباری | نوع سرویس: "PURCHASE" |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `description` | string | اختیاری | توضیحات |
| `payerMail` | string | اختیاری | ایمیل پرداخت‌کننده |
| `payerName` | string | اختیاری | نام پرداخت‌کننده |
| `nationalCode` | string | شرطی | کد ملی؛ اگر تطبیق کد ملی و کارت فعال باشد اجباری است |
| `pans` | string | اختیاری | شماره کارت‌های مجاز برای پرداخت |
| `localization` | string | اختیاری | زبان صفحه پرداخت: `fa` (پیش‌فرض) یا `en` — از نسخه 27 |
| `paymentCode` | string | اختیاری | شناسه پرداخت مرچنت — فقط در خرید شناسه‌دار (در آن حالت اجباری) |

## نمونه درخواست
```json
{
  "invoice": "20301112",
  "invoiceDate": "1405/05/04",
  "amount": 1000,
  "callbackApi": "https://shop.example.ir/payment/callback",
  "mobileNumber": "09120000000",
  "serviceCode": "8",
  "serviceType": "PURCHASE",
  "terminalNumber": 1234567,
  "description": "order #20301112",
  "payerMail": "",
  "payerName": "",
  "pans": "",
  "nationalCode": "",
  "localization": "fa"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": {
    "urlId": "8dcc5cd0ef7348548f8dc2ab29ebe11a7ad3eaad000000001234567",
    "url": "<payment-page-base>/8dcc5cd0ef7348548f8dc2ab29ebe11a7ad3eaad000000001234567"
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
