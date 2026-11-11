---
title: برگشت از خرید با سرویس پاد
tags: provider-refund-pod, /api/payment/refund-transactions-3rd-party, provider-refund, endpoint
---
# برگشت از خرید با سرویس پاد

`POST <base url>/api/payment/refund-transactions-3rd-party`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

مشابه provider-refund-toman با Provider پاد.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoiceID` | string | اجباری | فاکتور یکتای تراکنش برگشت |
| `invoiceDate` | string | اختیاری | تاریخ فاکتور برگشت |
| `amount` | integer | اختیاری | مبلغ (ریال) |
| `originInvoiceID` | string | اجباری | فاکتور خرید اصلی |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `originUrlId` | string | اختیاری | urlId خرید اصلی |

## نمونه درخواست
```json
{
  "amount": 20000,
  "invoiceID": "123",
  "originInvoiceID": "123456",
  "terminalNumber": 123456
}
```

## نمونه پاسخ
```json
{
  "resultCode": 0,
  "resultMsg": "Successful"
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
