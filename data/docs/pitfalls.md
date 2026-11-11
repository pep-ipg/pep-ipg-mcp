---
title: اشتباهات رایج پیاده‌سازی و چک‌لیست Go-Live
tags: pitfalls, اشتباهات رایج, checklist, go-live, troubleshooting, عیب یابی, best practice, 13000, 13003, 13028, 13402, 13422
---
# اشتباهات رایج و چک‌لیست Go-Live

## ده اشتباه پرتکرار
1. **تحویل خدمت بر اساس callback.** status در QueryString قابل جعل است؛ فقط verify/inquiry سمت سرور معتبر است.
2. **فراموش کردن verify.** بدون verify، وجه به مشتری برمی‌گردد و سفارش «پرداخت‌شده» در سیستم شما بی‌پول می‌ماند.
3. **ارسال کل url به‌جای urlId** در verify/confirm/reverse → 13009.
4. **استفاده مجدد از invoice** در تلاش دوم پرداخت → 13003.
5. **amount به‌صورت رشته یا تومان.** عدد صحیح و به ریال.
6. **Referrer-Policy: no-referrer** روی صفحه هدایت → 13402.
7. **دامنه callback ثبت‌نشده** (مثلاً staging یا www) → 13028.
8. **IP خروجی سرور در whitelist نیست** (پشت NAT/Load balancer) → 13422.
9. **نادیده گرفتن تفاوت resultCode و data.status** در inquiry.
10. **parse یکسان پاسخ purchase و pre-transaction** — در اولی data آبجکت و در دومی رشته است.

## چک‌لیست Go-Live
- [ ] توکن کش می‌شود و قبل از exp تمدید می‌شود؛ 401 یک retry دارد.
- [ ] invoice یکتا با محدودیت unique در دیتابیس.
- [ ] urlId کنار invoice ذخیره می‌شود.
- [ ] verify سمت سرور، با تطبیق amount (verify-payment).
- [ ] تحویل خدمت idempotent است (13029/13428 دوباره تحویل نمی‌دهند).
- [ ] job تعیین تکلیف دوره‌ای برای سفارش‌های pending با payment-inquiry.
- [ ] مسیر reverse برای شکست تحویل خدمت، داخل مهلت.
- [ ] دامنه callback، Referer و IP سرور در پنل ثبت شده‌اند.
- [ ] شماره کارت، CVV2 و PIN2 در هیچ لاگی نیستند.
- [ ] timeout و retry با backoff برای خطاهای زیرساختی (500، 13005، 13084، 13085، 13096).
