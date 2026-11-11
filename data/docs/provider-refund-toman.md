---
title: برگشت از خرید از طریق Provider (toman)
tags: provider-refund-toman, /api/payment/refund-transactions-3rd-party/toman, provider-refund, endpoint
---
# برگشت از خرید از طریق Provider (toman)

`POST <base url>/api/payment/refund-transactions-3rd-party/toman`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

واریز وجه بازگشتی از طریق Provider. تراکنش اصلی باید تایید‌شده باشد. اگر amount ارسال نشود، کل مبلغ خرید اصلی برگشت داده می‌شود. invoiceID باید مختص همین تراکنش برگشت و یکتا باشد.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoiceID` | string | اجباری | فاکتور یکتای تراکنش برگشت |
| `invoiceDate` | string | اختیاری | تاریخ فاکتور برگشت |
| `amount` | integer | اختیاری | مبلغ (ریال)؛ خالی = کل مبلغ اصلی |
| `originInvoiceID` | string | اجباری | فاکتور خرید اصلی |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `originUrlId` | string | اختیاری | urlId خرید اصلی |

## نمونه درخواست
```json
{
  "amount": 20000,
  "invoiceDate": "2025/08/30",
  "invoiceID": "123",
  "originInvoiceID": "123456",
  "terminalNumber": 123456,
  "originUrlId": "<urlId>"
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
