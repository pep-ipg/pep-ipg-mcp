---
title: تایید رمز کارت
tags: inquiry-confirm-pin, /api/payment/inquiry-confirm-pin, card, endpoint
---
# تایید رمز کارت

`POST <base url>/api/payment/inquiry-confirm-pin`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

استعلام و تایید رمز ثابت کارت. داده‌های حساس کارت (cvv2، pin2) را دریافت می‌کند؛ هرگز لاگ یا ذخیره نشوند.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `cardNumber` | string | اجباری | شماره کارت |
| `cvv2` | string | اجباری | CVV2 |
| `expireMonth` | string | اجباری | ماه انقضا |
| `expireYear` | string | اجباری | سال انقضا |
| `invoice` | string | اجباری | شماره فاکتور |
| `merchantNumber` | integer | اجباری | شماره پذیرنده |
| `pin2` | string | اجباری | رمز دوم |
| `terminalNumber` | integer | اجباری | شماره پایانه |

## نمونه درخواست
```json
{
  "cardNumber": "<PAN>",
  "cvv2": "<CVV2>",
  "expireMonth": "12",
  "expireYear": "08",
  "invoice": "001",
  "merchantNumber": 123456789,
  "pin2": "<PIN2>",
  "terminalNumber": 123456789
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
