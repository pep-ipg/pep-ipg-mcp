# Changelog

## 1.2.6 — 1405/08/29
- وابستگی‌ها: zod 4 (رفع هشدار امنیتی Dependabot)؛ حداقل `@modelcontextprotocol/sdk` به 1.32 رسید
- سرور HTTP: بدون `PEP_MCP_AUTH_TOKEN` پیش‌فرض فقط روی `127.0.0.1` گوش می‌دهد؛ اگر `HOST` عمومی و بدون توکن باشد هشدار می‌دهد. ایمیج Docker مثل قبل روی `0.0.0.0` است
- سرور HTTP روی Node 18 کار نمی‌کرد (`crypto is not defined` در SDK)؛ با تست end-to-end پیدا و رفع شد
- پیام خوانا برای پورت اشغال (`EADDRINUSE`) در سرور HTTP و شبیه‌ساز، به‌جای خطای خام
- پلاگین Claude Code نسخه مشخص سرور را نصب می‌کند (`pep-ipg-mcp@1.2.6`) نه `@latest`
- تست end-to-end با کلاینت رسمی MCP روی stdio و HTTP (همه ابزارها، احراز هویت، اعتبارسنجی ورودی)
- تست‌های شبیه‌ساز در صورت شکست، سرورها را می‌بندند تا CI گیر نکند؛ `timeout-minutes` در CI و Release
- CI روی Node 24 هم تست می‌گیرد؛ اکشن‌ها به نسخه‌های Node 24 به‌روز شدند
- Release: فقط Trusted Publishing (بدون `NPM_TOKEN`)؛ شکست انتشار npm دیگر پنهان نمی‌شود و بعد از انتشار، وجود نسخه روی npm بررسی می‌شود؛ `scripts/check-versions.mjs` یکسان بودن نسخه در همه فایل‌ها را چک می‌کند

## 1.2.5 — 1405/08/29
- شبیه‌ساز: خطای تزریقی `applied_then_error` فقط روی درخواستی اجرا می‌شود که عملیات آن واقعاً انجام شود. اگر درخواست نامعتبر باشد یا وضعیت تراکنش اجازه ندهد، پاسخ واقعی برمی‌گردد و خطای تزریقی برای درخواست بعدی فعال می‌ماند (قبلاً در هر حال پیام «the operation WAS applied» می‌داد)
- شبیه‌ساز: لینک پرداختِ استفاده‌شده دیگر `outcome=expire` را نمی‌پذیرد و 409 برمی‌گرداند؛ قبلاً بعد از پرداخت موفق هم callback با `status=expire` فرستاده می‌شد. `sandbox_pay` با `expire` روی تراکنش پرداخت‌شده هم خطا می‌دهد. پایان زمان صفحه برای تراکنش پرداخت‌نشده مثل قبل کار می‌کند
- سرور HTTP: برای JSON نامعتبر، بدنه بزرگ‌تر از 1MB و خطاهای پیش‌بینی‌نشده، خطای JSON-RPC برمی‌گردد (`-32700`، `-32600`، `-32603`)، نه صفحه HTML با stack trace

## 1.2.4 — 1405/08/21
- پلاگین Claude Code حالا سرور MCP را هم نصب می‌کند (ابزارهای مستندات، اعتبارسنجی و شبیه‌ساز)
- صفحه پرداخت شبیه‌ساز: فونت B Nazanin، طراحی تمیزتر و نزدیک‌تر به درگاه پاسارگاد، نوار پیشرفت زمان؛ دکمه «وضعیت نامشخص» حذف شد (از `sandbox_pay` در دسترس است)
- README کوتاه‌تر
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
