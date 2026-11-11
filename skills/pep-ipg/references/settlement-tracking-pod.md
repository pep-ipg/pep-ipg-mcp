---
title: جزئیات Refund پاد با شماره فاکتور
tags: settlement-tracking-pod, /api/third-party/provider/v1/settlement/tracking, provider-refund, endpoint
---
# جزئیات Refund پاد با شماره فاکتور

`POST <base url>/api/third-party/provider/v1/settlement/tracking`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

مانند settlement-tracking-toman برای Provider پاد.

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
    "status": 3
  }
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
