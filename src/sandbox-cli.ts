#!/usr/bin/env node
// Standalone simulator: `npx -p pep-ipg-mcp pep-ipg-sandbox --port 8787`
import { startSandbox } from "./sandbox/server.js";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const sb = await startSandbox({
  port: Number(arg("port") ?? process.env.PEP_SANDBOX_PORT ?? 8787),
  host: arg("host") ?? "127.0.0.1",
  config: { refererCheck: (arg("referer") as "off" | "warn" | "strict" | undefined) ?? "warn" },
});
const c = sb.store.config;
console.log(`PEP IPG sandbox (Dorsa v28) on ${sb.baseUrl}
  PEP_BASE_URL=${sb.baseUrl}
  PEP_USERNAME=${c.username}
  PEP_PASSWORD=${c.password}
  PEP_TERMINAL_NUMBER=${c.terminalNumber}
Simulator only: no real payments, no card data. Ctrl+C to stop.`);
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => sb.close().then(() => process.exit(0)));
