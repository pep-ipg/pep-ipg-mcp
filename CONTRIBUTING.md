# مشارکت

## افزودن یا اصلاح مستند
1. فایل مربوط را در `data/docs/` ویرایش یا اضافه کنید (Markdown با front matter: `title` و `tags`).
2. کد خطا: `data/errors.json` (کلید = کد عددی؛ فیلدها: `fa`، `en`، `category`، `retryable`، `hint`).
3. `npm run build:skill` را اجرا کنید تا Skill هم به‌روز شود (CI این را چک می‌کند).
4. `npm test` را اجرا کنید.
5. در توضیح PR، بخش مستند رسمی را که تغییر بر آن استوار است ذکر کنید.

## قواعد
- نمونه‌ها فقط با داده ساختگی: شماره ترمینال `1234567`، کارت ماسک‌شده، credential به‌صورت `<PLACEHOLDER>`.
- منطق ابزارها در `src/tools.ts` بدون وابستگی به SDK نگه داشته شود تا قابل تست بماند.
- هر ابزار جدید: ثبت در `src/mcp.ts` + تست در `test/`.

## اجرای محلی
```bash
npm install
npm run dev        # HTTP روی :3000 با hot reload
npm run inspect    # MCP Inspector
```
