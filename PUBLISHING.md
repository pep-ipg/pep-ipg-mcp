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

### ۳. npm (برای نصب با `npx`)
1. در [npmjs.com](https://www.npmjs.com) حساب بسازید و 2FA را فعال کنید.
2. بررسی آزاد بودن نام: `npm view pep-ipg-mcp` باید خطای 404 بدهد. اگر نام گرفته شده بود، `name` در `package.json` و همه `npx -y pep-ipg-mcp` در README را عوض کنید.
3. **Access Tokens → Generate New Token → Granular**، با دسترسی **Read and write** روی همین پکیج (برای انتشار اول: All packages).
4. در GitHub: **Settings → Secrets and variables → Actions → New repository secret**، با نام `NPM_TOKEN`.

> اگر فعلاً نمی‌خواهید روی npm منتشر کنید، این مرحله را رد کنید. Release و فایل `.mcpb` همچنان ساخته می‌شوند.

## هر بار: انتشار نسخه جدید

1. نسخه را در **هر دو** فایل `package.json` و `manifest.json` و ثابت `VERSION` در `src/mcp.ts` به‌روز کنید.
2. یک بخش جدید در `CHANGELOG.md` بنویسید.
3. tag بزنید:
```bash
git add . && git commit -m "Release v1.1.0"
git tag v1.1.0
git push && git push --tags
```

workflow `Release` به‌صورت خودکار:
- نسخه tag را با `package.json` و `manifest.json` تطبیق می‌دهد
- build و تست می‌کند
- روی npm منتشر می‌کند (اگر `NPM_TOKEN` تعریف شده باشد)
- `pep-ipg-mcp.mcpb` را می‌سازد و به GitHub Release ضمیمه می‌کند

لینک دانلود ثابت (در README استفاده شده):
`https://github.com/YOUR_GITHUB_USERNAME/pep-ipg-mcp/releases/latest/download/pep-ipg-mcp.mcpb`

## به‌روزرسانی برای نسخه جدید پروتکل
فقط `data/docs/*.md` و `data/errors.json` را ویرایش کنید، `npm test` بزنید، CHANGELOG را به‌روز کنید و نسخه جدید را tag کنید.

## بعد از انتشار (اختیاری)
- ثبت در [MCP Registry](https://github.com/modelcontextprotocol/registry) و فهرست‌هایی مانند mcp.so و Smithery برای دیده شدن
- در GitHub، بخش About: توضیح کوتاه + topics: `mcp`, `model-context-protocol`, `payment-gateway`, `iran`, `pasargad`
