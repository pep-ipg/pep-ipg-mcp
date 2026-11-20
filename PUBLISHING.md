# راهنمای انتشار (برای نگهدارنده مخزن)

## یک‌بار: راه‌اندازی

### ۱. مخزن در اکانت شرکت (`pep-ipg`)
همه لینک‌های README، `package.json` و `manifest.json` به `github.com/pep-ipg/pep-ipg-mcp` اشاره می‌کنند.

**اگر مخزن قبلاً در اکانت شخصی ساخته شده:**
`Settings → General → Danger Zone → Transfer ownership` → مقصد `pep-ipg`. GitHub لینک‌های قدیمی را خودکار به آدرس جدید redirect می‌کند. سپس روی سیستم خود:
```bash
git remote set-url origin https://github.com/pep-ipg/pep-ipg-mcp.git
git pull
```

**اگر مخزن جدید است:** در اکانت `pep-ipg` مخزن خالی `pep-ipg-mcp` بسازید (بدون README و LICENSE)، سپس:
```bash
npm install                       # ساخت package-lock.json (CI به آن نیاز دارد)
git init
git add .
git commit -m "PEP IPG MCP v1.1.0 (Dorsa v28)"
git branch -M main
git remote add origin https://github.com/pep-ipg/pep-ipg-mcp.git
git push -u origin main
```

### ۲. تنظیمات مخزن
- **Settings → Actions → General → Workflow permissions:** «Read and write permissions» (برای ساخت Release)
- **About** (چرخ‌دنده کنار About در صفحه اصلی): توضیح کوتاه + topics: `mcp`, `model-context-protocol`, `payment-gateway`, `iran`, `pasargad`
- در تب **Actions** باید CI سبز شود.

### ۳. npm (برای نصب با `npx`) — Trusted Publishing، بدون توکن
1. در [npmjs.com](https://www.npmjs.com) با حسابی که 2FA دارد وارد شوید.
2. صفحه پکیج `pep-ipg-mcp` → **Settings → Trusted Publisher → GitHub Actions** و این مقادیر:
   - Organization or user: `pep-ipg`
   - Repository: `pep-ipg-mcp`
   - Workflow filename: `release.yml`
   - Environment: خالی
3. در همان صفحه، **Publishing access** را روی «Require two-factor authentication and disallow tokens» بگذارید تا انتشار فقط از GitHub Actions ممکن باشد.
4. در GitHub هیچ secret مربوط به npm لازم نیست. اگر `NPM_TOKEN` از قبل هست، از **Settings → Secrets and variables → Actions** حذفش کنید و توکن را در npmjs.com هم revoke کنید.

> اگر انتشار npm شکست بخورد، job قرمز می‌شود، ولی Release گیت‌هاب با فایل `.mcpb` و zip اسکیل قبل از آن ساخته شده است.

## هر بار: انتشار نسخه جدید

1. نسخه را در همه این‌ها یکی کنید: `package.json`، `package-lock.json`، `manifest.json`، `.claude-plugin/plugin.json` (هم `version` و هم `pep-ipg-mcp@X.Y.Z` در `mcpServers`)، `.claude-plugin/marketplace.json` و ثابت `VERSION` در `src/mcp.ts`. برای چک: `node scripts/check-versions.mjs`
2. یک بخش جدید در `CHANGELOG.md` بنویسید.
3. tag بزنید:
```bash
git add . && git commit -m "Release v1.1.0"
git tag v1.1.0
git push && git push --tags
```

workflow `Release` به‌صورت خودکار:
- نسخه tag را با همه فایل‌های بالا تطبیق می‌دهد
- build و تست می‌کند
- `pep-ipg-mcp.mcpb` و `pep-ipg-skill.zip` را می‌سازد و به GitHub Release ضمیمه می‌کند
- با Trusted Publishing روی npm منتشر می‌کند و بعد بررسی می‌کند نسخه واقعاً روی npm آمده باشد
- ایمیج Docker را روی `ghcr.io/pep-ipg/pep-ipg-mcp` می‌گذارد

لینک دانلود ثابت (در README استفاده شده):
`https://github.com/pep-ipg/pep-ipg-mcp/releases/latest/download/pep-ipg-mcp.mcpb`

## به‌روزرسانی برای نسخه جدید پروتکل
فقط `data/docs/*.md` و `data/errors.json` را ویرایش کنید، `npm test` بزنید، CHANGELOG را به‌روز کنید و نسخه جدید را tag کنید.

## بعد از انتشار (اختیاری)
- ثبت در [MCP Registry](https://github.com/modelcontextprotocol/registry) و فهرست‌هایی مانند mcp.so و Smithery برای دیده شدن
- در GitHub، بخش About: توضیح کوتاه + topics: `mcp`, `model-context-protocol`, `payment-gateway`, `iran`, `pasargad`
