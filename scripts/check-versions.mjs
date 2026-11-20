// Fails if the version differs between package.json, package-lock.json, manifest.json,
// the Claude Code plugin files, the pinned npm version the plugin installs, and src/mcp.ts.
// Usage: node scripts/check-versions.mjs [expected-version]
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf-8");
const json = (f) => JSON.parse(read(f));

const plugin = json(".claude-plugin/plugin.json");
const pinned = plugin.mcpServers?.pep?.args?.find((a) => a.startsWith("pep-ipg-mcp@"))?.split("@")[1];

const versions = {
  "package.json": json("package.json").version,
  "package-lock.json": json("package-lock.json").version,
  "manifest.json": json("manifest.json").version,
  ".claude-plugin/plugin.json": plugin.version,
  ".claude-plugin/plugin.json (npx pin)": pinned,
  ".claude-plugin/marketplace.json": json(".claude-plugin/marketplace.json").plugins?.[0]?.version,
  "src/mcp.ts (VERSION)": /export const VERSION = "([^"]+)"/.exec(read("src/mcp.ts"))?.[1],
};

const expected = process.argv[2] ?? versions["package.json"];
const bad = Object.entries(versions).filter(([, v]) => v !== expected);
if (bad.length) {
  for (const [file, v] of bad) console.error(`::error::${file} has ${v ?? "no version"}, expected ${expected}`);
  process.exit(1);
}
console.log(`All versions are ${expected}`);
