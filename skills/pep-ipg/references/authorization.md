---
title: احراز هویت (قوی / بورسی)
tags: authorization, /api/payment/authorization, auth, endpoint
---
# احراز هویت (قوی / بورسی)

`POST <base url>/api/payment/authorization`

**احراز هویت:** Authorization: Bearer <token> (از get-token)

احراز هویت پس از خرید تایید‌شده. authorizationType=1 قوی (StrongAuth، mobileNumber اجباری) و 2 بورسی (CardInquiry، nationalCode رمزشده اجباری).

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `invoiceID` | string | اجباری | فاکتور خرید تایید‌شده |
| `terminalNumber` | integer | اجباری | شماره ترمینال |
| `authorizationType` | integer | اجباری | 1 = قوی، 2 = بورسی |
| `nationalCode` | string | شرطی | کد ملی رمزشده — برای نوع 2 اجباری |
| `mobileNumber` | string | شرطی | موبایل — برای نوع 1 اجباری |

## نمونه درخواست
```json
{
  "invoiceID": "654819",
  "terminalNumber": 12345678,
  "authorizationType": 1,
  "mobileNumber": "09120000000"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
