---
title: دریافت توکن (احراز هویت)
tags: get-token, /token/getToken, auth, endpoint
---
# دریافت توکن (احراز هویت)

`POST <base url>/token/getToken`

**احراز هویت:** ندارد (خودِ سرویس احراز هویت)

با نام کاربری و رمز عبور ترمینال یک JWT دریافت می‌شود که در همه سرویس‌های بعدی در هدر Authorization: Bearer <token> ارسال می‌شود. اعتبار پیش‌فرض ۱۰ دقیقه است (از claim exp توکن قابل استخراج است). با دریافت 401 مجدداً احراز هویت کنید.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `username` | string | اجباری | نام کاربری سرویس |
| `password` | string | اجباری | رمز عبور سرویس |

## نمونه درخواست
```json
{
  "username": "<USERNAME>",
  "password": "<PASSWORD>"
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "token": "<JWT>",
  "username": "<USERNAME>",
  "firstName": "firstName",
  "lastName": "lastName",
  "userId": "17",
  "roles": [
    {
      "authority": "mpg"
    },
    {
      "authority": "merchant"
    }
  ]
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
