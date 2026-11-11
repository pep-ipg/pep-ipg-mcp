<div dir="rtl">

# PEP IPG MCP

**سرور MCP درگاه پرداخت اینترنتی پرداخت الکترونیک پاسارگاد (PEP)** — دستیار هوش مصنوعی خود را مستقیماً به مستندات درگاه وصل کنید.

[![CI](https://github.com/pep-ipg/pep-ipg-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/pep-ipg/pep-ipg-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP%20%7C%20stdio-black)](https://modelcontextprotocol.io)
![Protocol](https://img.shields.io/badge/Dorsa%20Protocol-v28.0-0a7)

یک سرور [MCP](https://modelcontextprotocol.io) که Claude Code، Cursor، Claude Desktop، VS Code و هر ابزار سازگار با MCP را به مستندات **پروتکل Dorsa نسخه 28.0** درگاه پرداخت الکترونیک پاسارگاد متصل می‌کند. دستیار به‌جای حدس زدن، قرارداد دقیق هر سرویس، فیلدهای اجباری، نمونه درخواست و پاسخ و معنی هر کد خطا را از منبع می‌خواند.

---

## چرا؟

مدل‌های زبانی مستندات درگاه‌های ایرانی را یا ندیده‌اند یا نسخه قدیمی آن را دیده‌اند. نتیجه:

- پیشنهاد **امضای RSA/XML** درگاه قدیمی، درحالی‌که Dorsa با **JWT Bearer** کار می‌کند
- ارسال `amount` به‌صورت رشته یا تومان، فرستادن کل `url` به‌جای `urlId`
- تحویل خدمت بر اساس `status=success` در callback بدون verify سمت سرور
- تفسیر اشتباه کدهایی مثل `13029`، `13402` یا `13428`

این سرور همین شکاف را پر می‌کند.

## ابزارها

| ابزار | کاربرد |
|---|---|
| `search_docs` | جستجوی فارسی و انگلیسی در همه مستندات؛ اگر کد خطایی در سؤال باشد، توضیح آن را هم برمی‌گرداند |
| `get_doc` | متن کامل یک سرویس یا راهنما: مسیر، احراز هویت، فیلدهای اجباری/اختیاری/شرطی، نمونه درخواست و پاسخ |
| `get_error_code` | توضیح هر یک از **۲۰۲ کد خطا و وضعیت**: پیام فارسی و انگلیسی، دسته، قابلیت تکرار و راه رفع |
| `get_auth_flow` | راهنمای احراز هویت JWT به‌همراه کلاینت توکن آماده (کش، تمدید زودهنگام، retry روی 401) در TypeScript، Go، PHP و Python |

همه ابزارها **فقط‌خواندنی** هستند: به درگاه متصل نمی‌شوند، credential نمی‌خواهند و ورودی را ذخیره نمی‌کنند.

## پوشش مستندات

| حوزه | سرویس‌ها |
|---|---|
| احراز هویت | `get-token`، `authorization` (قوی / بورسی) |
| ثبت پرداخت | `purchase` (عادی و شناسه‌دار)، `multiacc-purchase` (تسهیم تا ۱۰ شبا)، `multiacc-payment-code` (شناسه‌دار با تسهیم)، `topup-bill` (شارژ، بسته اینترنتی، قبض) |
| تعیین تکلیف | `verify-transactions`، `verify-payment`، `confirm-payment`، `reverse-payment` |
| استعلام | `payment-inquiry`، `payment-inquiry-v2` |
| بازگشت وجه | `refund-transactions`، Refund از طریق Provider (toman / پاد) و سرویس‌های پیگیری تسویه |
| خدمات کارت | `inquiry-confirm-pin`، `inquiry-mini-statement` |
| راهنماها | `overview`، `authentication`، `purchase-flows`، `settlement`، `callback-inquiry`، `referer`، `refund`، `pitfalls`، `security` |

---

## نصب و اتصال

> پیش‌نیاز: [Node.js](https://nodejs.org) نسخه 18 یا بالاتر. برای Claude Desktop (روش یک‌کلیکی) لازم نیست.

### Claude Code

```bash
claude mcp add pep -- npx -y pep-ipg-mcp
claude mcp list   # بررسی اتصال
```

### Claude Desktop

**روش یک‌کلیکی:** فایل [`pep-ipg-mcp.mcpb`](https://github.com/pep-ipg/pep-ipg-mcp/releases/latest/download/pep-ipg-mcp.mcpb) را دانلود کنید و روی آن دابل‌کلیک کنید. سپس در پنجره بازشده **Install** را بزنید.

**روش دستی:** در `Settings → Developer → Edit Config`:

```json
{
  "mcpServers": {
    "pep": {
      "command": "npx",
      "args": ["-y", "pep-ipg-mcp"]
    }
  }
}
```

### Cursor

`Settings → MCP → Add Server` یا فایل `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pep": {
      "command": "npx",
      "args": ["-y", "pep-ipg-mcp"]
    }
  }
}
```

### VS Code (Copilot)

فایل `.vscode/mcp.json`:

```json
{
  "servers": {
    "pep": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "pep-ipg-mcp"]
    }
  }
}
```

### Windsurf / سایر ابزارها

هر ابزاری که MCP از نوع stdio را پشتیبانی کند، با دستور `npx -y pep-ipg-mcp` کار می‌کند.

### نسخه HTTP (سرور تیمی یا دیپلوی)

روش‌های بالا (`npx` و `.mcpb`) سرور را **روی سیستم هر کاربر** اجرا می‌کنند. نسخه HTTP برعکس است: سرور **یک‌بار روی یک ماشین** اجرا می‌شود و همه با یک آدرس به آن وصل می‌شوند، مثل سرویس MCP زرین‌پال.

| | محلی (`npx` / `.mcpb`) | HTTP (سرور مشترک) |
|---|---|---|
| نصب برای کاربر | هر کاربر جداگانه | فقط یک آدرس |
| به‌روزرسانی مستندات | هر کاربر باید آپدیت کند | یک‌بار روی سرور، همه فوراً می‌گیرند |
| نیاز به Node.js روی سیستم کاربر | بله (به‌جز `.mcpb`) | خیر |
| مناسب برای | توسعه‌دهنده تکی | تیم داخلی، پذیرندگان، سرویس عمومی |
| استفاده در claude.ai (وب و موبایل) | ❌ | ✅ با آدرس عمومی HTTPS |

#### ۱. اجرای سریع (تست)

```bash
git clone https://github.com/pep-ipg/pep-ipg-mcp.git && cd pep-ipg-mcp
npm install && npm run build
npm start                                   # http://localhost:3000/mcp
curl http://localhost:3000/health           # {"status":"ok", ...}
```

#### ۲. دیپلوی روی سرور

**با Docker Compose (پیشنهادی):**
```bash
git clone https://github.com/pep-ipg/pep-ipg-mcp.git && cd pep-ipg-mcp
export PEP_MCP_AUTH_TOKEN=$(openssl rand -hex 32)    # اختیاری؛ برای سرور تیمی توصیه می‌شود
docker compose up -d --build
```
سرور روی `127.0.0.1:3000` بالا می‌آید و از بیرون فقط از طریق reverse proxy در دسترس است.

**بدون Docker:** فایل آماده systemd در [`deploy/pep-ipg-mcp.service`](deploy/pep-ipg-mcp.service).

**PaaS (Render، Railway، Fly.io، لیارا):** همین مخزن را با Dockerfile موجود دیپلوی کنید. Health check: `/health`.

#### ۳. HTTPS

کلاینت‌ها، به‌ویژه claude.ai، فقط به آدرس **HTTPS** وصل می‌شوند. نمونه آماده Nginx + Let's Encrypt در [`deploy/nginx.conf`](deploy/nginx.conf). در نهایت آدرس سرویس می‌شود:

```
https://mcp.example.ir/mcp
```

#### ۴. محدود کردن دسترسی (توکن)

اگر `PEP_MCP_AUTH_TOKEN` تنظیم شود، هر درخواست به `/mcp` باید هدر زیر را داشته باشد؛ در غیر این صورت پاسخ `401` می‌گیرد:

```
Authorization: Bearer <PEP_MCP_AUTH_TOKEN>
```

- **سرور تیمی یا داخلی:** توکن را تنظیم کنید و فقط به اعضای تیم بدهید.
- **سرویس عمومی (مثل زرین‌پال):** توکن را خالی بگذارید.
- `/health` همیشه بدون توکن در دسترس است.

#### ۵. اتصال کلاینت‌ها به سرور

**Claude Code**
```bash
claude mcp add --transport http pep https://mcp.example.ir/mcp
# با توکن:
claude mcp add --transport http pep https://mcp.example.ir/mcp --header "Authorization: Bearer YOUR_TOKEN"
```

**Cursor** (`~/.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "pep": {
      "url": "https://mcp.example.ir/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

**VS Code** (`.vscode/mcp.json`)
```json
{
  "servers": {
    "pep": {
      "type": "http",
      "url": "https://mcp.example.ir/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```
(بدون توکن، خط `headers` را حذف کنید.)

**claude.ai و Claude Desktop (Connector)**
`Settings → Connectors → Add custom connector` و آدرس `https://mcp.example.ir/mcp`. Connector از همه دستگاه‌ها (وب، موبایل، دسکتاپ) کار می‌کند. این روش هدر توکن ثابت را پشتیبانی نمی‌کند، پس برای آن سرور را بدون توکن اجرا کنید.

#### متغیرهای محیطی

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `PORT` | `3000` | پورت HTTP |
| `HOST` | `0.0.0.0` | پشت reverse proxy یا برای استفاده محلی: `127.0.0.1` |
| `PEP_MCP_AUTH_TOKEN` | خالی (بدون احراز هویت) | توکن Bearer برای محدود کردن دسترسی به `/mcp` |
| `PEP_MCP_DATA_DIR` | `./data` | مسیر دلخواه مستندات (مثلاً نسخه داخلی) |

#### بررسی سلامت سرور

```bash
curl https://mcp.example.ir/health
curl -X POST https://mcp.example.ir/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
پاسخ دوم باید فهرست ۴ ابزار را برگرداند.

**به‌روزرسانی سرور:** `git pull && docker compose up -d --build`

---

## نمونه استفاده

بعد از اتصال، به زبان طبیعی بپرسید:

- «با درگاه پاسارگاد یک سرویس پرداخت در Laravel بنویس: getToken، purchase، callback و verify-payment.»
- «خطای 13402 می‌گیرم، مشکل چیست؟»
- «callback نیامد و کاربر مرورگر را بست؛ تراکنش را چطور تعیین تکلیف کنم؟»
- «خرید با تسهیم بین سه شبا با نسبت 50/30/20 را در Node.js پیاده کن.»

نمونه‌های بیشتر: [`examples/prompts.md`](examples/prompts.md)

---

## عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| سرور در فهرست ابزارها نیست | `claude mcp list` را بزنید؛ `npx -y pep-ipg-mcp` را یک‌بار در ترمینال اجرا کنید تا خطای احتمالی دیده شود |
| نسخه HTTP جواب نمی‌دهد | `GET /health` باید `{"status":"ok"}` برگرداند؛ اگر این جواب داد ولی `/mcp` نه، تنظیمات reverse proxy را بررسی کنید |
| خطای `401 Unauthorized` | `PEP_MCP_AUTH_TOKEN` روی سرور تنظیم شده؛ هدر `Authorization: Bearer ...` را در کلاینت اضافه کنید |
| `spawn npx ENOENT` در Claude Desktop | از روش یک‌کلیکی (`.mcpb`) استفاده کنید، یا مسیر کامل خروجی `which npx` را به‌جای `npx` بگذارید |
| `npx` در ایران کند است یا خطا می‌دهد | registry را عوض کنید یا از روش `.mcpb` استفاده کنید که اینترنت لازم ندارد |
| دستیار از ابزار استفاده نمی‌کند | صریح بگویید: «با ابزار pep بررسی کن» |

## ساختار پروژه

```
data/
  docs/            مستندات Markdown (هر سرویس و راهنما یک فایل)
  errors.json      جدول کامل کدهای خطا
src/
  server.ts        Express + Streamable HTTP (stateless) + /health
  auth.ts          احراز هویت اختیاری با توکن Bearer
  stdio.ts         اجرای محلی
  mcp.ts           تعریف ابزارها (SDK رسمی MCP)
  tools.ts         منطق ابزارها، مستقل از SDK و قابل تست
  types.ts
test/              تست‌ها (node:test)
manifest.json      پیکربندی افزونه Claude Desktop (.mcpb)
docker-compose.yml اجرای سرور HTTP با Docker
deploy/            نمونه Nginx (HTTPS) و systemd
```

## توسعه

```bash
git clone https://github.com/pep-ipg/pep-ipg-mcp.git && cd pep-ipg-mcp
npm install
npm run dev        # hot reload
npm test
npm run inspect    # MCP Inspector
```

برای اصلاح یا افزودن مستند، [`CONTRIBUTING.md`](CONTRIBUTING.md) را ببینید.

## امنیت

هرگز شماره کارت، CVV2، رمز دوم یا credential ترمینال را در issue، PR یا گفت‌وگو با دستیار هوش مصنوعی وارد نکنید. گزارش آسیب‌پذیری: [`SECURITY.md`](SECURITY.md)

## سلب مسئولیت

این سرور برای راهنمایی توسعه‌دهندگان در پیاده‌سازی است. مرجع نهایی، مستند رسمی پرداخت الکترونیک پاسارگاد و تیم فنی شرکت است. مقادیر نمونه ساختگی‌اند. مهلت‌ها (verify، reverse) و سایر تنظیمات را برای ترمینال خود از تیم فنی بگیرید.

## مجوز

[MIT](LICENSE)

</div>
