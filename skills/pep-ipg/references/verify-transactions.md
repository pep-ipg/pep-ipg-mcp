---
title: تاییدیه با مهلت زمانی (verify)
tags: verify, /api/payment/verify-transactions, settlement, endpoint
---
# تاییدیه با مهلت زمانی (verify)

`POST <base url>/api/payment/verify-transactions`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

پس از بازگشت کاربر باید verify ارسال شود؛ در غیر این صورت وجه به مشتری برمی‌گردد. تا پایان مهلت توافقی، پذیرنده همچنان می‌تواند reverse کند و پس از آن سوییچ تراکنش را خودکار confirm می‌کند. پاسخ فقط پیام موفقیت دارد؛ برای جزئیات از verify-payment استفاده کنید. با checkVerify=true، verify تکراری خطای 13428 می‌گیرد.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره فاکتور |
| `urlId` | string | اجباری | urlId پاسخ خرید |
| `checkVerify` | boolean | اختیاری | true: verify تکراری خطای 13428 برگرداند؛ false/خالی: پاسخ موفق |

## نمونه درخواست
```json
{
  "checkVerify": true,
  "invoice": "2030111212",
  "urlId": "291fc237b92f43fbf8f51616d2d670149312c0fb000000001234567"
}
```

## نمونه پاسخ
```json
{
  "data": "تراکنش موفق است",
  "resultMsg": "Successful",
  "resultCode": 0
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
