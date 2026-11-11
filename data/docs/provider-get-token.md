---
title: دریافت توکن سرویس Refund (Provider)
tags: provider-get-token, /token/getToken, provider-refund, endpoint
---
# دریافت توکن سرویس Refund (Provider)

`POST <base url>/token/getToken`

**احراز هویت:** ندارد (خودِ سرویس احراز هویت)

مانند get-token ولی با آرایه provider_credentials (client_id، client_secret، name، username، password). name نام provider است (مثلاً toman). این توکن برای سرویس‌های Refund مبتنی بر Provider استفاده می‌شود.

## فیلدهای ورودی
| نام | نوع | الزام | توضیح |
|---|---|---|---|
| `username` | string | اجباری | نام کاربری |
| `password` | string | اجباری | رمز عبور |
| `provider_credentials` | array | اجباری | [{client_id, client_secret, name, username, password}] |

## نمونه درخواست
```json
{
  "username": "<USERNAME>",
  "password": "<PASSWORD>",
  "provider_credentials": [
    {
      "client_id": "<CLIENT_ID>",
      "client_secret": "<CLIENT_SECRET>",
      "name": "toman",
      "username": "<PROVIDER_USERNAME>",
      "password": "<PROVIDER_PASSWORD>"
    }
  ]
}
```

## نمونه پاسخ
```json
{
  "resultMsg": "Successful",
  "resultCode": 0,
  "token": "<JWT>"
}
```

> همه مسیرها نسبت به <base url> هستند که هنگام راه‌اندازی ترمینال به پذیرنده اعلام می‌شود. همه سرویس‌ها با متد POST و بدنه JSON فراخوانی می‌شوند.
