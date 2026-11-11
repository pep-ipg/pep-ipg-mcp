#!/usr/bin/env node
// Regenerates skills/pep-ipg/references/ from data/ (the single source of truth).
// Run after editing data/: `npm run build:skill`. CI fails if references are stale.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDocs = path.join(root, "data", "docs");
const out = path.join(root, "skills", "pep-ipg", "references");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const f of fs.readdirSync(srcDocs).filter((f) => f.endsWith(".md")).sort()) {
  fs.copyFileSync(path.join(srcDocs, f), path.join(out, f));
}

const CATEGORY = {
  transaction_status: "وضعیت تراکنش",
  auth: "احراز هویت",
  settlement_lifecycle: "تعیین تکلیف",
  request_validation: "اعتبارسنجی درخواست",
  cardholder: "دارنده کارت",
  infrastructure: "زیرساخت",
  general: "عمومی",
};
const errors = JSON.parse(fs.readFileSync(path.join(root, "data", "errors.json"), "utf-8"));
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
let md = "# کدهای خطا و وضعیت درگاه پاسارگاد (Dorsa v28)\n\n";
md += "جستجو: `grep -n \"| 13402 |\" errors.md`\n\n";
md += "| کد | English | فارسی | دسته | تکرار؟ | اقدام پیشنهادی |\n|---|---|---|---|---|---|\n";
for (const code of Object.keys(errors).sort((a, b) => Number(a) - Number(b))) {
  const e = errors[code];
  md += `| ${code} | ${esc(e.en)} | ${esc(e.fa)} | ${CATEGORY[e.category] ?? e.category} | ${e.retryable ? "بله" : "خیر"} | ${esc(e.hint)} |\n`;
}
fs.writeFileSync(path.join(out, "errors.md"), md);
console.log(`skill references: ${fs.readdirSync(out).length} files`);
