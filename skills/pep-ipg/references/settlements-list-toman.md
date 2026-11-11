---
title: لیست Refundها با بازه تاریخ (toman)
tags: settlements-list-toman, /api/third-party/provider/v1/settlements/toman, provider-refund, endpoint
---
# لیست Refundها با بازه تاریخ (toman)

`POST <base url>/api/third-party/provider/v1/settlements/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

لیست صفحه‌بندی‌شده تسویه‌ها (۵۰ مورد در هر صفحه). توجه: کلید پیام در این پاسخ resultMessage است، نه resultMsg.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `terminalNumber` | integer | اجباری | شماره پایانه |
| `create_after` | string | اختیاری | شروع بازه — 2025-05-23 03:30:00.000000000 |
| `create_before` | string | اختیاری | پایان بازه |
| `page` | integer | اختیاری | شماره صفحه |
| `invoiceId` | string | اجباری | فاکتور تراکنش برگشتی (طبق مستند اجباری) |

## نمونه درخواست
```json
{
  "terminalNumber": 123453789,
  "create_after": "2025-05-23 03:30:00.000000000",
  "create_before": "2025-05-25 03:30:00.000000000",
  "page": 2,
  "invoiceId": "123"
}
```

## نمونه پاسخ
```json
{
  "resultCode": 0,
  "resultMessage": "Successful",
  "totalCount": 146,
  "pageNumber": 2,
  "totalPages": 3,
  "results": [
    {
      "uuid": "<uuid>",
      "status": 3
    }
  ]
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
