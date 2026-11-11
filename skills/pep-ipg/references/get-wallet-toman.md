---
title: موجودی کیف پول (toman)
tags: get-wallet-toman, /api/third-party/provider/v1/get-wallet/toman, provider-refund, endpoint
---
# موجودی کیف پول (toman)

`POST <base url>/api/third-party/provider/v1/get-wallet/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

دریافت موجودی کیف پول Provider برای Refund (balance، minimum_balance، can_use_for_settlement).

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `terminalNumber` | integer | اجباری | شماره پایانه |
| `invoiceId` | string | اجباری | شماره فاکتور |

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
  "balance": 960000,
  "balance_warning_threshold": 0,
  "minimum_balance": 326400,
  "withdraw_ratio": 0,
  "address": "",
  "can_use_for_settlement": false
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
