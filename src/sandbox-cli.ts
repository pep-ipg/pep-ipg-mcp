#!/usr/bin/env node
// Standalone simulator for local dev, shared test servers and CI.
//   npx -p pep-ipg-mcp pep-ipg-sandbox [--port 8787] [--host 127.0.0.1] [--public-url URL] [--referer off|warn|strict]
import { startSandbox } from "./sandbox/server.js";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const sb = await startSandbox({
  port: Number(arg("port") ?? process.env.PEP_SANDBOX_PORT ?? 8787),
  host: arg("host") ?? process.env.PEP_SANDBOX_HOST ?? "127.0.0.1",
  publicUrl: arg("public-url") ?? process.env.PEP_SANDBOX_PUBLIC_URL,
  config: {
    refererCheck: (arg("referer") ?? process.env.PEP_SANDBOX_REFERER ?? "warn") as "off" | "warn" | "strict",
    ...(process.env.PEP_SANDBOX_USERNAME ? { username: process.env.PEP_SANDBOX_USERNAME } : {}),
    ...(process.env.PEP_SANDBOX_PASSWORD ? { password: process.env.PEP_SANDBOX_PASSWORD } : {}),
  },
});
const c = sb.store.config;
console.log(`PEP IPG sandbox (Dorsa v28) on ${sb.baseUrl}
  PEP_BASE_URL=${sb.baseUrl}
  PEP_USERNAME=${c.username}
  PEP_PASSWORD=${c.password}
  PEP_TERMINAL_NUMBER=${c.terminalNumber}
Simulator only: no real payments, no card data. State is in memory. Ctrl+C to stop.`);
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => sb.close().then(() => process.exit(0)));
