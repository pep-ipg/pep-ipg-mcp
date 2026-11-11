---
title: چکیده حساب (۱۰ گردش آخر)
tags: inquiry-mini-statement, /api/payment/inquiry-mini-statement, card, endpoint
---
# چکیده حساب (۱۰ گردش آخر)

`POST <base url>/api/payment/inquiry-mini-statement`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

دریافت ۱۰ گردش آخر حساب. فیلد description پاسخ با انکودینگ ایران‌سیستم است. ورودی شامل داده حساس کارت است.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `cardNumber` | string | اجباری | شماره کارت |
| `cvv2` | string | اجباری | CVV2 |
| `expireMonth` | string | اجباری | ماه انقضا |
| `expireYear` | string | اجباری | سال انقضا |
| `invoice` | string | اختیاری | شماره فاکتور |
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
  "merchantNumber": 123456789,
  "pin2": "<PIN2>",
  "terminalNumber": 123456789
}
```

## نمونه پاسخ
```json
{
  "data": [
    {
      "amountBalance": "10001",
      "amountTransaction": "20001",
      "authorizationResponseID": "11",
      "description": "...",
      "localDate": "1403/01/01",
      "localTime": "1403-01-01 15:04:05"
    }
  ],
  "resultCode": 0,
  "resultMsg": "Successful"
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
