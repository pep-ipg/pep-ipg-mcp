---
title: ملاحظات امنیتی — داده کارت، لاگ، credentials
tags: security, امنیت, pci, pan, cvv2, pin2, log, لاگ, credentials, ip, whitelist, hashedCardNumber
---
# ملاحظات امنیتی

- **داده حساس کارت:** سرویس‌های `inquiry-confirm-pin` و `inquiry-mini-statement` شماره کارت، CVV2 و رمز دوم را از پذیرنده دریافت می‌کنند. این داده‌ها هرگز نباید لاگ، ذخیره یا در ابزارهای مانیتورینگ/APM ثبت شوند. فیلترهای redaction را روی بدنه درخواست این مسیرها اعمال کنید.
- **شناسایی کارت بدون نگهداری PAN:** برای تطبیق کارت از `hashedCardNumber` (sha256) در verify-payment یا payment-inquiryv2 استفاده کنید.
- **credentials ترمینال و provider:** username/password و client_secret در secret manager؛ چرخش دوره‌ای؛ هرگز در repository یا لاگ.
- **callback غیرقابل اعتماد است:** فقط به‌عنوان trigger استفاده شود؛ تصمیم با verify/inquiry.
- **IP whitelist و Referer:** IP خروجی سرور (13422) و دامنه Referer (13402) باید در پنل ثبت باشند.
- **کد ملی در احراز هویت بورسی** به‌صورت رمزشده ارسال می‌شود.
