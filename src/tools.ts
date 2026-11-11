// Pure tool logic (no MCP/Express imports) so it can be unit-tested in isolation.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Corpus, Doc, ErrorEntry, SearchHit, Section } from "./types.js";

export const DATA_DIR =
  process.env.PEP_MCP_DATA_DIR ?? fileURLToPath(new URL("../data/", import.meta.url));

// ---------- loading ----------

export function loadCorpus(dataDir: string = DATA_DIR): Corpus {
  const errors = JSON.parse(
    fs.readFileSync(path.join(dataDir, "errors.json"), "utf-8"),
  ) as Record<string, ErrorEntry>;

  const docs = new Map<string, Doc>();
  const docsDir = path.join(dataDir, "docs");
  for (const file of fs.readdirSync(docsDir).sort()) {
    if (!file.endsWith(".md")) continue;
    const id = file.slice(0, -3);
    docs.set(id, parseDoc(id, fs.readFileSync(path.join(docsDir, file), "utf-8")));
  }

  const sections: Section[] = [];
  for (const doc of docs.values()) {
    const tags = doc.tags.join(" ");
    for (const s of splitSections(doc.body)) {
      sections.push({
        docId: doc.id,
        docTitle: doc.title,
        heading: s.heading,
        text: s.text,
        head: normalize(`${doc.id} ${doc.title} ${s.heading} ${tags}`),
        body: normalize(s.text),
      });
    }
  }
  return { docs, errors, sections };
}

function parseDoc(id: string, raw: string): Doc {
  raw = raw.replace(/\r\n/g, "\n");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  let title = id;
  let tags: string[] = [];
  let body = raw;
  if (m) {
    body = raw.slice(m[0].length).trim();
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i < 0) continue;
      const key = line.slice(0, i).trim();
      const val = line.slice(i + 1).trim();
      if (key === "title") title = val;
      if (key === "tags") tags = val.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  return { id, title, tags, body };
}

function splitSections(body: string): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = [];
  let cur = { heading: "", text: "" };
  const flush = () => {
    if (cur.text.trim()) out.push({ heading: cur.heading, text: cur.text.trim() });
  };
  for (const line of body.split("\n")) {
    if (/^#{1,2} /.test(line)) {
      flush();
      cur = { heading: line.replace(/^#+\s*/, "").trim(), text: "" };
    } else {
      cur.text += line + "\n";
    }
  }
  flush();
  return out;
}

// ---------- text normalization ----------

const FA_MAP: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ك": "ک", "ة": "ه", "أ": "ا", "إ": "ا", "آ": "ا", "ؤ": "و",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function normalize(s: string): string {
  return s
    .replace(/[يىكةأإآؤ۰-۹٠-٩]/g, (c) => FA_MAP[c] ?? c)
    .replace(/‌/g, " ")
    .replace(/[ً-ْ‎‏]/g, "")
    .toLowerCase();
}

const STOPWORDS = new Set([
  "و", "در", "به", "از", "که", "را", "با", "این", "است", "برای", "یا", "چه", "چطور", "چگونه", "می",
  "the", "a", "an", "of", "to", "is", "how", "what", "do", "in",
]);

export function tokenize(s: string): string[] {
  const seen = new Set<string>();
  for (const raw of normalize(s).split(/[^\p{L}\p{N}_-]+/u)) {
    const t = raw.replace(/^[-_]+|[-_]+$/g, "");
    if ([...t].length >= 2 && !STOPWORDS.has(t)) seen.add(t);
  }
  return [...seen];
}

const count = (hay: string, needle: string) => hay.split(needle).length - 1;

// ---------- tools ----------

export function searchDocs(corpus: Corpus, query: string, limit = 5): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const phrase = normalize(query.trim());
  const hits: SearchHit[] = [];
  for (const s of corpus.sections) {
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const h = count(s.head, t);
      const b = count(s.body, t);
      if (h + b > 0) matched++;
      score += 3 * Math.min(h, 3) + Math.min(b, 5);
    }
    if (matched === 0) continue;
    score *= matched / terms.length;
    if (terms.length > 1 && (s.head + " " + s.body).includes(phrase)) score += 5;
    hits.push({ docId: s.docId, title: s.docTitle, heading: s.heading, snippet: snippet(s.text, terms), score });
  }
  // Keep the best-scoring section per document so results stay diverse.
  hits.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return hits.filter((h) => !seen.has(h.docId) && seen.add(h.docId)).slice(0, limit);
}

function snippet(text: string, terms: string[]): string {
  const lines = text.split("\n");
  let best = 0;
  let bestScore = -1;
  lines.forEach((l, i) => {
    const nl = normalize(l);
    const sc = terms.filter((t) => nl.includes(t)).length;
    if (sc > bestScore) [best, bestScore] = [i, sc];
  });
  const s = lines.slice(Math.max(0, best - 1), best + 3).join("\n").trim();
  return [...s].length > 420 ? [...s].slice(0, 420).join("") + "…" : s;
}

export function formatSearch(corpus: Corpus, query: string, limit = 5): string {
  const hits = searchDocs(corpus, query, limit);
  // If the query mentions a known error code, surface it first.
  const codes = (normalize(query).match(/\b\d{1,5}\b/g) ?? []).filter((c) => corpus.errors[c]);
  let out = "";
  for (const c of codes) out += formatError(c, corpus.errors[c]) + "\n";
  if (hits.length === 0 && !out) {
    return `نتیجه‌ای برای «${query}» یافت نشد. شناسه‌های قابل استفاده در get_doc: ${[...corpus.docs.keys()].join(", ")}`;
  }
  out += `${hits.length} نتیجه برای «${query}»:\n\n`;
  hits.forEach((h, i) => {
    out += `### ${i + 1}. ${h.title}${h.heading && h.heading !== h.title ? " — " + h.heading : ""}\n`;
    out += `(get_doc id="${h.docId}")\n${h.snippet}\n\n`;
  });
  return out;
}

export function getDoc(corpus: Corpus, id: string): string | undefined {
  const key = id.trim().replace(/\.md$/, "");
  const doc = corpus.docs.get(key);
  return doc ? doc.body : undefined;
}

const CATEGORY_FA: Record<string, string> = {
  transaction_status: "وضعیت تراکنش",
  auth: "احراز هویت",
  settlement_lifecycle: "تعیین تکلیف / چرخه تسویه",
  request_validation: "اعتبارسنجی درخواست / پیکربندی",
  cardholder: "سمت دارنده کارت",
  infrastructure: "زیرساخت / سوییچ",
  general: "عمومی",
};

function formatError(code: string, e: ErrorEntry): string {
  let s = `## ${code} — ${e.en}\n- **فارسی:** ${e.fa}\n- **دسته:** ${CATEGORY_FA[e.category] ?? e.category}\n- **قابل تلاش مجدد:** ${e.retryable ? "بله" : "خیر"}\n`;
  if (e.hint) s += `- **اقدام پیشنهادی:** ${e.hint}\n`;
  else if (e.category === "cardholder")
    s += "- **اقدام پیشنهادی:** خطا مربوط به کارت/حساب مشتری است؛ پیام قابل فهم نشان دهید و پرداخت با کارت دیگر را پیشنهاد کنید. خدمت تحویل نشود.\n";
  else if (e.retryable)
    s += "- **اقدام پیشنهادی:** خطای موقت؛ با backoff تکرار کنید و در صورت تداوم وضعیت را با payment-inquiry بگیرید.\n";
  return s;
}

export function getErrorCode(corpus: Corpus, input: string | number): string {
  const q = String(input).trim();
  const digits = normalize(q);
  if (/^-?\d+$/.test(digits)) {
    const e = corpus.errors[digits];
    return e
      ? formatError(digits, e)
      : `کد ${q} در جدول خطاهای مستند Dorsa نیست. resultCode و resultMsg کامل پاسخ را بررسی کنید.`;
  }
  const nq = normalize(q);
  const matches = Object.entries(corpus.errors)
    .filter(([, e]) => normalize(e.en).includes(nq) || normalize(e.fa).includes(nq))
    .slice(0, 8);
  if (matches.length === 0) return `پیامی شبیه «${q}» در جدول خطاها یافت نشد.`;
  return matches.map(([c, e]) => formatError(c, e)).join("\n");
}

/**
 * Replaces the planned `verify_rsa_flow`: Dorsa does not sign requests
 * with RSA. Auth is a JWT from /token/getToken sent as a Bearer header.
 */
export function getAuthFlow(corpus: Corpus, language: "typescript" | "go" | "php" | "python" = "typescript"): string {
  const guide = getDoc(corpus, "authentication") ?? "";
  return `${guide}\n\n## نمونه کد کلاینت (${language})\n\`\`\`${language}\n${AUTH_SAMPLES[language]}\n\`\`\``;
}

const AUTH_SAMPLES: Record<string, string> = {
  typescript: `// Token client with caching, early refresh and a single retry on 401.
const BASE_URL = process.env.PEP_BASE_URL!;
let cached: { token: string; exp: number } | null = null;
let inflight: Promise<string> | null = null;

async function getToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cached && cached.exp - 30 > now) return cached.token;
  inflight ??= (async () => {
    const res = await fetch(\`\${BASE_URL}/token/getToken\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: process.env.PEP_USERNAME, password: process.env.PEP_PASSWORD }),
    });
    const body = await res.json();
    if (body.resultCode !== 0) throw new Error(\`getToken failed: \${body.resultCode} \${body.resultMsg}\`);
    const payload = JSON.parse(Buffer.from(body.token.split(".")[1], "base64url").toString());
    cached = { token: body.token, exp: payload.exp };
    return body.token as string;
  })().finally(() => (inflight = null));
  return inflight;
}

export async function pepCall<T>(path: string, data: unknown, retry = true): Promise<T> {
  const res = await fetch(\`\${BASE_URL}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: \`Bearer \${await getToken()}\` },
    body: JSON.stringify(data),
  });
  if (res.status === 401 && retry) { cached = null; return pepCall<T>(path, data, false); }
  const body = await res.json();
  if ([13001, 13002, 13004, 13008].includes(body.resultCode) && retry) { cached = null; return pepCall<T>(path, data, false); }
  return body as T;
}`,
  go: `// Token client with caching and a single retry on 401 (stdlib only).
type tokenClient struct {
	base, user, pass string
	mu               sync.Mutex
	token            string
	exp              time.Time
}

func (c *tokenClient) Token(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" && time.Until(c.exp) > 30*time.Second {
		return c.token, nil
	}
	body, _ := json.Marshal(map[string]string{"username": c.user, "password": c.pass})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/token/getToken", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	var out struct {
		ResultCode int    \`json:"resultCode"\`
		ResultMsg  string \`json:"resultMsg"\`
		Token      string \`json:"token"\`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", err
	}
	if out.ResultCode != 0 {
		return "", fmt.Errorf("getToken: %d %s", out.ResultCode, out.ResultMsg)
	}
	parts := strings.Split(out.Token, ".")
	raw, _ := base64.RawURLEncoding.DecodeString(parts[1])
	var claims struct{ Exp int64 \`json:"exp"\` }
	_ = json.Unmarshal(raw, &claims)
	c.token, c.exp = out.Token, time.Unix(claims.Exp, 0)
	return c.token, nil
}`,
  php: `<?php
// Token client with caching (APCu) and a single retry on 401.
function pep_token(bool $force = false): string {
    $cached = apcu_fetch('pep_token');
    if (!$force && $cached && $cached['exp'] - 30 > time()) return $cached['token'];
    $ch = curl_init(getenv('PEP_BASE_URL') . '/token/getToken');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['username' => getenv('PEP_USERNAME'), 'password' => getenv('PEP_PASSWORD')]),
    ]);
    $body = json_decode(curl_exec($ch), true);
    if (($body['resultCode'] ?? -1) !== 0) throw new RuntimeException('getToken failed: ' . ($body['resultMsg'] ?? ''));
    $payload = json_decode(base64_decode(strtr(explode('.', $body['token'])[1], '-_', '+/')), true);
    apcu_store('pep_token', ['token' => $body['token'], 'exp' => $payload['exp']]);
    return $body['token'];
}

function pep_call(string $path, array $data, bool $retry = true): array {
    $ch = curl_init(getenv('PEP_BASE_URL') . $path);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . pep_token()],
        CURLOPT_POSTFIELDS => json_encode($data),
    ]);
    $raw = curl_exec($ch);
    if (curl_getinfo($ch, CURLINFO_HTTP_CODE) === 401 && $retry) { pep_token(true); return pep_call($path, $data, false); }
    return json_decode($raw, true);
}`,
  python: `# Token client with caching and a single retry on 401 (requests).
import base64, json, os, threading, time, requests

BASE_URL = os.environ["PEP_BASE_URL"]
_lock = threading.Lock()
_cache = {"token": None, "exp": 0}

def get_token(force=False):
    with _lock:
        if not force and _cache["token"] and _cache["exp"] - 30 > time.time():
            return _cache["token"]
        r = requests.post(f"{BASE_URL}/token/getToken", timeout=15,
                          json={"username": os.environ["PEP_USERNAME"], "password": os.environ["PEP_PASSWORD"]}).json()
        if r.get("resultCode") != 0:
            raise RuntimeError(f"getToken failed: {r.get('resultCode')} {r.get('resultMsg')}")
        payload = r["token"].split(".")[1]
        payload += "=" * (-len(payload) % 4)
        _cache.update(token=r["token"], exp=json.loads(base64.urlsafe_b64decode(payload))["exp"])
        return r["token"]

def pep_call(path, data, retry=True):
    res = requests.post(f"{BASE_URL}{path}", json=data, timeout=30,
                        headers={"Authorization": f"Bearer {get_token()}"})
    if res.status_code == 401 and retry:
        get_token(force=True)
        return pep_call(path, data, retry=False)
    return res.json()`,
};
