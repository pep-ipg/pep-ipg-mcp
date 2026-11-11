---
title: تبدیل کارت به شبا (toman)
tags: card-to-iban-toman, /api/third-party/provider/v1/card-to-iban/toman, provider-refund, endpoint
---
# تبدیل کارت به شبا (toman)

`POST <base url>/api/third-party/provider/v1/card-to-iban/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

تبدیل شماره کارت به شبا.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `cardNumber` | string | اجباری | شماره کارت |
| `terminalNumber` | integer | اجباری | شماره پایانه |

## نمونه درخواست
```json
{
  "cardNumber": "<PAN>",
  "terminalNumber": 123453789
}
```

## نمونه پاسخ
```json
{
  "resultCode": 0,
  "resultMsg": "Successful",
  "iban": "IR..."
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
