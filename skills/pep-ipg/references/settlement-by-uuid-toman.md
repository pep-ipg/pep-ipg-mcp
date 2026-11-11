---
title: جزئیات Refund با UUID (toman)
tags: settlement-by-uuid-toman, /api/third-party/provider/v1/settlement/toman, provider-refund, endpoint
---
# جزئیات Refund با UUID (toman)

`POST <base url>/api/third-party/provider/v1/settlement/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

دریافت جزئیات تسویه با settlementUUID. کدهای status مانند settlement-tracking.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `terminalNumber` | integer | اجباری | شماره پایانه |
| `settlementUUID` | string | اجباری | UUID تسویه |

## نمونه درخواست
```json
{
  "terminalNumber": 123453789,
  "settlementUUID": "<uuid>"
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
