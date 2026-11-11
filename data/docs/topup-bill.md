---
title: خرید شارژ / بسته اینترنتی / پرداخت قبض
tags: pre-transaction, /api/payment/pre-transaction, payment, endpoint
---
# خرید شارژ / بسته اینترنتی / پرداخت قبض

`POST <base url>/api/payment/pre-transaction`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

ثبت درخواست شارژ مستقیم (MCI=1, MTN=2, RTL=3)، شارژ پین/گروهی (MCI-PIN=5, MTN-PIN=6, RTL-PIN=7)، بسته اینترنتی (با productCode) و قبض (BILL=4 با billId و paymentId). در پاسخ، data خودِ آدرس صفحه پرداخت (رشته) است، نه آبجکت.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoice` | string | اجباری | شماره یکتای تراکنش |
| `invoiceDate` | string | اختیاری | تاریخ فاکتور |
| `amount` | integer | اجباری | مبلغ به ریال |
| `callbackApi` | string | اجباری | آدرس بازگشت |
| `mobileNumber` | string | شرطی | برای شارژ مستقیم و بسته اجباری؛ برای قبض اختیاری |
| `serviceCode` | string | اجباری | 1,2,3,4,5,6,7 |
| `serviceType` | string | اجباری | MCI, MTN, RTL, BILL, MCI-PIN, MTN-PIN, RTL-PIN |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `count` | integer | شرطی | تعداد شارژ — برای شارژ عادی و گروهی (PIN) اجباری |
| `productCode` | string | شرطی | کد محصول — برای بسته اینترنتی اجباری |
| `billId` | string | شرطی | شناسه قبض — برای BILL اجباری |
| `paymentId` | string | شرطی | شناسه پرداخت — برای BILL اجباری |
| `description` | string | اختیاری | توضیحات |
| `payerMail` | string | اختیاری | ایمیل |
| `payerName` | string | اختیاری | نام |
| `nationalCode` | string | اختیاری | کد ملی |
| `pans` | string | اختیاری | شماره کارت‌ها |

## نمونه درخواست
```json
{
  "invoice": "11122234",
  "invoiceDate": "1405/05/04",
  "amount": 12000,
  "callbackApi": "https://shop.example.ir/payment/callback",
  "serviceCode": "4",
  "serviceType": "BILL",
  "terminalNumber": 1234567,
  "billId": "1234567804121",
  "paymentId": "1270358"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "data": "<payment-page-url>"
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
