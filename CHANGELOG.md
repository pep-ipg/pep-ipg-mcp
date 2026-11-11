# Changelog

## 1.2.1 — 1405/08/21
- پلاگین Claude Code حالا سرور MCP را هم نصب می‌کند (ابزارهای مستندات، اعتبارسنجی و شبیه‌ساز)
- انتشار npm با Trusted Publishing (بدون توکن)؛ شکست npm دیگر جلوی ساخت Release را نمی‌گیرد

## 1.2.0 — 1405/08/21
- **شبیه‌ساز درگاه Dorsa v28**: getToken (JWT)، خرید، تسهیم، شارژ و قبض، صفحه پرداخت، callback، verify، confirm، reverse، استعلام و Refund، با ساعت مجازی و تزریق خطا
- ابزارهای MCP: `sandbox_start`، `sandbox_pay`، `sandbox_status`، `sandbox_inject`، `sandbox_configure`، `sandbox_resolve`، `sandbox_reset`
- ابزارهای `validate_request` و `next_action`
- `data/endpoints.json`: قرارداد ساخت‌یافته سرویس‌ها
- اجرای مستقل شبیه‌ساز: `pep-ipg-sandbox` (با `--public-url` برای Docker و سرور تست تیمی)
- راهنمای محیط‌های توسعه، staging و CI: `docs/sandbox.md`
- صفحه پرداخت شبیه‌ساز به سبک درگاه پاسارگاد (فیلدهای کارت غیرفعال)
- راهنمای نصب برای Codex و ChatGPT

## 1.1.0 — 1405/08/20
به‌روزرسانی به پروتکل Dorsa نسخه 28.0 (1405/08/12):
- جدید: مستند «خرید شناسه‌دار با تسهیم» (`multiacc-payment-code`) و فیلد `paymentCode` در `multiacc-purchase` (v28)
- فیلد `localization` (`fa` / `en`) در سرویس خرید (v27)
- احراز هویت اختیاری HTTP با `PEP_MCP_AUTH_TOKEN`؛ فایل‌های دیپلوی (`docker-compose.yml`، Nginx، systemd)
- متن فارسی کد خطای 13046: «تراکنش قبلاً تعیین تکلیف شده است» (v26)

## 1.0.0 — 1405/08/20
- انتشار اولیه بر پایه پروتکل Dorsa نسخه 25.0 (1405/05/04)
- ابزارها: `search_docs`، `get_doc`، `get_error_code`، `get_auth_flow`
- ۳۲ مستند (۲۳ سرویس + ۹ راهنما) و ۲۰۲ کد خطا
- Transport: Streamable HTTP و stdio؛ افزونه Claude Desktop (`.mcpb`)
