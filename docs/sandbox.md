# راهنمای استفاده از شبیه‌ساز در محیط‌های توسعه و تست

شبیه‌ساز همان API پروتکل Dorsa v28 را ارائه می‌دهد. کد پذیرنده **هیچ تغییری** لازم ندارد و فقط `PEP_BASE_URL` و اطلاعات ورود از متغیر محیطی خوانده می‌شود:

| محیط | `PEP_BASE_URL` | اطلاعات ورود |
|---|---|---|
| توسعه محلی | `http://127.0.0.1:8787` | `sandbox` / `sandbox` · ترمینال `1234567` |
| تست تیمی (staging) | آدرس شبیه‌ساز روی سرور تست | تنظیم‌شده با متغیر محیطی |
| CI | `http://127.0.0.1:8787` | `sandbox` / `sandbox` |
| **عملیاتی (production)** | **base URL واقعی که پاسارگاد اعلام کرده** | **username/password ترمینال واقعی** |

> شبیه‌ساز را **هرگز** در production استفاده نکنید. وضعیت آن در حافظه است و با هر بار اجرای مجدد پاک می‌شود.

---

## ۱. توسعه محلی

```bash
npx -p pep-ipg-mcp pep-ipg-sandbox
```

بدون npm (از روی مخزن):

```bash
git clone https://github.com/pep-ipg/pep-ipg-mcp.git && cd pep-ipg-mcp
npm install && npm run build && npm run sandbox
```

در فایل `.env` پروژه:

```env
PEP_BASE_URL=http://127.0.0.1:8787
PEP_USERNAME=sandbox
PEP_PASSWORD=sandbox
PEP_TERMINAL_NUMBER=1234567
```

اگر از Claude Code یا Cursor با MCP استفاده می‌کنید، لازم نیست جداگانه اجرا کنید. کافی است بگویید «با شبیه‌ساز تست کن».

---

## ۲. Docker Compose (کنار برنامه پذیرنده)

```yaml
services:
  pep-sandbox:
    image: ghcr.io/pep-ipg/pep-ipg-mcp:latest
    command: ["node", "dist/sandbox-cli.js", "--host", "0.0.0.0", "--port", "8787",
              "--public-url", "http://localhost:8787"]
    ports:
      - "8787:8787"

  app:
    build: .
    environment:
      PEP_BASE_URL: http://pep-sandbox:8787     # فراخوانی سرور به سرور، داخل شبکه Docker
      PEP_USERNAME: sandbox
      PEP_PASSWORD: sandbox
      PEP_TERMINAL_NUMBER: "1234567"
    depends_on: [pep-sandbox]
```

دو آدرس جدا وجود دارد:
- **`PEP_BASE_URL`**: برنامه پذیرنده از داخل شبکه Docker به شبیه‌ساز وصل می‌شود (`pep-sandbox:8787`).
- **`--public-url`**: آدرسی که در لینک صفحه پرداخت برمی‌گردد و **مرورگر کاربر** باید به آن برسد (`localhost:8787`).

---

## ۳. سرور تست مشترک تیم (staging)

```bash
docker run -d --name pep-sandbox --restart unless-stopped -p 8787:8787 \
  -e PEP_SANDBOX_USERNAME=team-test -e PEP_SANDBOX_PASSWORD='یک-رمز-قوی' \
  ghcr.io/pep-ipg/pep-ipg-mcp:latest \
  node dist/sandbox-cli.js --host 0.0.0.0 --port 8787 \
  --public-url https://pep-sandbox.staging.example.ir --referer strict
```

- **`--public-url`**: آدرس عمومی که مرورگر تسترها به آن دسترسی دارد. اگر پشت Nginx با HTTPS است، همان آدرس HTTPS.
- **`--referer strict`**: مثل درگاه واقعی، اگر Referer با دامنه callback نخواند، خطای 13402 می‌دهد. برای پیدا کردن این خطا قبل از Go-Live مفید است.
- اطلاعات ورود را با `PEP_SANDBOX_USERNAME` و `PEP_SANDBOX_PASSWORD` عوض کنید.
- سرور را فقط داخل شبکه تست در دسترس بگذارید، نه روی اینترنت عمومی.

---

## ۴. CI (GitHub Actions)

```yaml
jobs:
  payment-tests:
    runs-on: ubuntu-latest
    env:
      PEP_BASE_URL: http://127.0.0.1:8787
      PEP_USERNAME: sandbox
      PEP_PASSWORD: sandbox
      PEP_TERMINAL_NUMBER: "1234567"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Start PEP sandbox
        run: |
          npx -y -p pep-ipg-mcp pep-ipg-sandbox --referer off &
          for i in $(seq 1 30); do curl -sf http://127.0.0.1:8787/health && break; sleep 1; done
      - run: npm test   # تست‌های پرداخت پروژه شما
```

برای تست خودکار مرحله «پرداخت توسط کاربر» بدون مرورگر، فرم صفحه پرداخت را مستقیم POST کنید:

```bash
curl -s -o /dev/null -w '%{redirect_url}\n' -X POST "$PAYMENT_URL" -d 'outcome=success'
# خروجی: آدرس callback با invoiceId، status، referenceNumber و trackId
```

مقادیر مجاز `outcome`: `success`، `failed`، `unknown`، `cancel`، `expire`.

---

## ۵. سناریوهایی که حتماً تست کنید

| سناریو | روش ساخت در شبیه‌ساز | رفتار درست کد پذیرنده |
|---|---|---|
| پرداخت موفق | دکمه «پرداخت موفق» | verify، تطبیق مبلغ، سپس تحویل |
| انصراف یا ناموفق | دکمه «انصراف» یا «ناموفق» | تحویل نده و verify نزن |
| وضعیت نامشخص | دکمه «وضعیت نامشخص»، بعد `sandbox_resolve` | تحویل نده؛ با استعلام تعیین تکلیف کن |
| verify انجام شد ولی پاسخ نرسید | `sandbox_inject` با `applied_then_error` روی `verify-payment` | تکرار verify، و فقط یک‌بار تحویل |
| verify نزدن | `sandbox_configure` با جلو بردن ساعت ۳۰ دقیقه | استعلام 13033 و پول برگشت خورده |
| شکست تحویل بعد از verify | verify، سپس reverse | reverse در مهلت، و Refund بعد از آن |
| توکن منقضی | جلو بردن ساعت ۱۱ دقیقه | گرفتن توکن جدید و تکرار درخواست |
| Referer نامعتبر | `--referer strict` | تنظیم `Referrer-Policy` صفحه فروشگاه |

ابزارهای `sandbox_*` از داخل دستیار هوش مصنوعی (MCP) در دسترس‌اند. بدون دستیار، سناریوهای صفحه پرداخت را با دکمه‌ها یا `curl` بسازید.

---

## ۶. رفتن به محیط عملیاتی

1. فقط متغیرهای محیطی عوض می‌شوند: base URL واقعی و username/password ترمینال واقعی که پاسارگاد می‌دهد.
2. دامنه callback و IP سرور را در پنل پذیرندگی ثبت کنید.
3. مهلت verify و reverse ترمینال واقعی را از تیم فنی بگیرید. ممکن است با پیش‌فرض ۲۵ دقیقه شبیه‌ساز فرق کند.
4. یک تراکنش واقعی با مبلغ کم انجام دهید و reverse کنید.

> شبیه‌ساز بر اساس مستند Dorsa ساخته شده است، نه کد واقعی سوییچ. تست نهایی روی ترمینال واقعی الزامی است.
