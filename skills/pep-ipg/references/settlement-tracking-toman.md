---
title: جزئیات Refund با شماره فاکتور (toman)
tags: settlement-tracking-toman, /api/third-party/provider/v1/settlement/tracking/toman, provider-refund, endpoint
---
# جزئیات Refund با شماره فاکتور (toman)

`POST <base url>/api/third-party/provider/v1/settlement/tracking/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

دریافت وضعیت تسویه یک Refund با invoiceId (همان invoiceID درخواست Refund). result.status: -1 نامشخص، 0 ایجاد شده، 1 ناموفق، 2 در حال انجام، 3 موفق، 4 لغو کاربر، 5 منقضی، 6 عدم تایید کاربر، 8 خطا (حساب اشتباه).

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `terminalNumber` | integer | اجباری | شماره پایانه |
| `invoiceId` | string | اجباری | فاکتور تراکنش Refund |

## نمونه درخواست
```json
{
  "terminalNumber": 123453789,
  "invoiceId": "123"
}
```

## نمونه پاسخ
```json
{
  "resultCode": 0,
  "resultMsg": "Successful",
  "status": 200,
  "result": {
    "uuid": "<uuid>",
    "amount": 10000,
    "status": 3,
    "iban": "IR...",
    "bank_follow_up_code": "...",
    "tracker_id": "..."
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
