---
title: احراز هویت با JWT (getToken) و مدیریت توکن
tags: auth, token, jwt, bearer, getToken, 401, 13001, 13002, 13004, 13008, احراز هویت, توکن, rsa
---
# احراز هویت (getToken)

پروتکل Dorsa از **JWT Bearer** استفاده می‌کند — نه امضای RSA/XML درگاه قدیمی PEP. هیچ کلید خصوصی یا امضای دیجیتالی روی بدنه درخواست لازم نیست.

```http
POST <base url>/token/getToken
Content-Type: application/json

{"username":"<USERNAME>","password":"<PASSWORD>"}
```

پاسخ موفق: `resultCode: 0` و فیلد `token`. سپس در همه سرویس‌ها:

```http
Authorization: Bearer <token>
```

## مدیریت توکن در Production
- توکن را در حافظه (یا Redis مشترک بین نودها) کش کنید و `exp` را از payload JWT بخوانید؛ چند ثانیه قبل از انقضا تمدید کنید.
- با دریافت HTTP 401 یا کدهای 13001/13002/13004/13008: یک‌بار getToken مجدد و تکرار درخواست. بیش از یک‌بار retry نکنید تا حلقه ایجاد نشود.
- برای جلوگیری از thundering herd در چند instance، تمدید توکن را با یک lock/singleflight انجام دهید.
- credentials را در secret manager نگه دارید؛ هرگز در کد یا لاگ.

## توکن سرویس‌های Refund مبتنی بر Provider
همان مسیر `/token/getToken` با آرایه `provider_credentials` (client_id، client_secret، name، username، password). `name` نام provider است (مثلاً `toman`). جزئیات: `get_endpoint provider-get-token`.

## کدهای مرتبط
401, 13001 (Malformed token), 13002 (Invalid token), 13004 (Token is empty), 13008 (Token is expired), 13366 (token not active), 13367 (unexpected signing method), 13368 (oauth login), 13352 (username not valid).
