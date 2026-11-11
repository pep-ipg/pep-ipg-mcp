---
title: برگشت تراکنش (reverse / اصلاحیه)
tags: reverse, /api/payment/reverse-transactions, settlement, endpoint
---
# برگشت تراکنش (reverse / اصلاحیه)

`POST <base url>/api/payment/reverse-transactions`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

ابطال تراکنش و بازگشت وجه به دارنده کارت در سیکل شاپرکی؛ فقط برای خرید و خرید تسهیمی و حداکثر تا مهلت اعلامی (پیش‌فرض ۲۵ دقیقه، قابل کاهش تا صفر). پس از confirm امکان‌پذیر نیست؛ در آن حالت از refund استفاده کنید.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور |
| `urlId` | string | اجباری | urlId پاسخ خرید |

## نمونه درخواست
```json
{
  "invoice": "203011121234",
  "urlId": "f2560bf76dfef9c51af9767e975dc02a739fbbd7000000001234567"
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
