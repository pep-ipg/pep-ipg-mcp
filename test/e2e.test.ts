// End-to-end: run the real server entry points (stdio and HTTP) as child processes
// and drive them with the official MCP client, the same way Claude / Cursor do.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NODE_ARGS = ["--import", "tsx"];

const DOC_TOOLS = ["search_docs", "get_doc", "get_error_code", "get_auth_flow", "validate_request", "next_action"];
const SANDBOX_TOOLS = [
  "sandbox_start", "sandbox_status", "sandbox_pay", "sandbox_resolve", "sandbox_inject", "sandbox_configure", "sandbox_reset",
];

const env = (extra: Record<string, string>) => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (typeof v === "string") out[k] = v;
  delete out.PEP_MCP_AUTH_TOKEN;
  delete out.HOST;
  return { ...out, ...extra };
};

type ToolResult = { content?: Array<{ type: string; text?: string }>; isError?: boolean };
const textOf = (r: unknown) =>
  ((r as ToolResult).content ?? []).map((c) => (c.type === "text" ? c.text ?? "" : "")).join("\n");

/** Invalid arguments may come back as an isError result or a JSON-RPC error, depending on SDK version. */
async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  try {
    const r = (await client.callTool({ name, arguments: args })) as ToolResult;
    return { text: textOf(r), isError: r.isError === true };
  } catch (e) {
    return { text: (e as Error).message, isError: true };
  }
}

const children: ChildProcess[] = [];
after(() => {
  for (const c of children) if (c.exitCode === null) c.kill("SIGKILL");
});

/** Start src/server.ts on a free port and resolve with its URL and the startup log. */
function startHttp(extra: Record<string, string>): Promise<{ url: string; log: string; child: ChildProcess }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...NODE_ARGS, "src/server.ts"], {
      cwd: ROOT,
      env: env({ PORT: "0", ...extra }),
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(child);
    let log = "";
    const timer = setTimeout(() => reject(new Error(`HTTP server did not start:\n${log}`)), 20_000);
    const onData = (b: Buffer) => {
      log += b.toString();
      const m = /on http:\/\/([^:\s]+):(\d+)\/mcp/.exec(log);
      if (m) {
        clearTimeout(timer);
        // Give the optional warning line a moment to arrive.
        setTimeout(() => resolve({ url: `http://127.0.0.1:${m[2]}/mcp`, log, child }), 200);
      }
    };
    child.stdout!.on("data", onData);
    child.stderr!.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`HTTP server exited with ${code}:\n${log}`));
    });
  });
}

test("stdio: every tool works over a real MCP connection", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [...NODE_ARGS, "src/stdio.ts"],
    cwd: ROOT,
    env: env({ PEP_SANDBOX_PORT: "0" }),
    stderr: "pipe",
  });
  const client = new Client({ name: "pep-ipg-e2e", version: "0.0.0" });
  await client.connect(transport);
  try {
    assert.equal(client.getServerVersion()?.name, "pep-ipg-mcp");
    assert.match(client.getInstructions() ?? "", /Dorsa/);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert.deepEqual(names, [...DOC_TOOLS, ...SANDBOX_TOOLS].sort());
    for (const t of tools) {
      assert.equal(t.inputSchema.type, "object", `${t.name} has an object input schema`);
      assert.ok(t.description && t.description.length > 20, `${t.name} has a description`);
    }
    const vr = tools.find((t) => t.name === "validate_request")!;
    assert.deepEqual([...(vr.inputSchema.required ?? [])].sort(), ["endpoint", "payload"]);

    // Docs
    let r = await call(client, "search_docs", { query: "خطای 13402" });
    assert.ok(!r.isError);
    assert.match(r.text, /referer/i);
    r = await call(client, "get_error_code", { code: 13402 });
    assert.match(r.text, /Referer/);
    r = await call(client, "get_error_code", { code: "۱۳۰۲۹" });
    assert.match(r.text, /confirmed/i);
    r = await call(client, "get_doc", { id: "verify-payment" });
    assert.ok(!r.isError);
    assert.match(r.text, /verify/i);
    r = await call(client, "get_auth_flow", { language: "go" });
    assert.match(r.text, /getToken/);
    assert.match(r.text, /package |func /, "Go sample code");

    // Input validation is enforced by the server, not just documented.
    r = await call(client, "get_auth_flow", { language: "cobol" });
    assert.ok(r.isError, "invalid enum value is rejected");
    r = await call(client, "search_docs", { query: "" });
    assert.ok(r.isError, "empty query is rejected");

    // validate_request / next_action
    r = await call(client, "validate_request", { endpoint: "purchase", payload: { amount: "1000" } });
    assert.ok(!r.isError);
    assert.match(r.text, /❌/);
    r = await call(client, "validate_request", { endpoint: "no-such-endpoint", payload: {} });
    assert.ok(r.isError);
    r = await call(client, "next_action", { callback_status: "success" });
    assert.match(r.text, /INQUIRY|VERIFY/);

    // Sandbox lifecycle through the tools
    r = await call(client, "sandbox_start", {});
    assert.ok(!r.isError, r.text);
    const base = /PEP_BASE_URL=(http:\/\/127\.0\.0\.1:\d+)/.exec(r.text)?.[1];
    assert.ok(base, `base URL in: ${r.text}`);
    const tok = (await (await fetch(`${base}/token/getToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "sandbox", password: "sandbox" }),
    })).json()) as { resultCode: number; token: string };
    assert.equal(tok.resultCode, 0);
    const buy = (await (await fetch(`${base}/api/payment/purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok.token}` },
      body: JSON.stringify({
        invoice: "E2E1", invoiceDate: "1405/08/29", amount: 10000, callbackApi: "http://127.0.0.1:9/cb",
        serviceCode: "8", serviceType: "PURCHASE", terminalNumber: 1234567,
      }),
    })).json()) as { resultCode: number };
    assert.equal(buy.resultCode, 0);
    r = await call(client, "sandbox_pay", { invoice: "E2E1", outcome: "success", fire_callback: false });
    assert.ok(!r.isError, r.text);
    r = await call(client, "sandbox_status", {});
    assert.match(r.text, /E2E1/);
    r = await call(client, "sandbox_inject", { endpoint: "verify-payment", mode: "error", code: 13005 });
    assert.ok(!r.isError, r.text);
    r = await call(client, "sandbox_configure", { referer_check: "strict" });
    assert.match(r.text, /strict/i);
    r = await call(client, "sandbox_pay", { invoice: "NOPE", outcome: "success" });
    assert.ok(r.isError, "unknown invoice is an error result, not a crash");
    r = await call(client, "sandbox_reset", {});
    assert.ok(!r.isError, r.text);
  } finally {
    await client.close();
  }
});

test("http: auth token, stateless MCP, no sandbox tools", async () => {
  const { url, log, child } = await startHttp({ PEP_MCP_AUTH_TOKEN: "e2e-secret" });
  try {
    assert.match(log, /auth on/);
    assert.doesNotMatch(log, /WARNING/);

    const init = {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "0" } },
    };
    const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
    const noAuth = await fetch(url, { method: "POST", headers, body: JSON.stringify(init) });
    assert.equal(noAuth.status, 401);
    const wrong = await fetch(url, { method: "POST", headers: { ...headers, Authorization: "Bearer nope" }, body: JSON.stringify(init) });
    assert.equal(wrong.status, 401);

    const health = await fetch(url.replace(/\/mcp$/, "/health"));
    assert.equal(health.status, 200);
    assert.equal(((await health.json()) as { status: string }).status, "ok");

    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: "Bearer e2e-secret" } },
    });
    const client = new Client({ name: "pep-ipg-e2e", version: "0.0.0" });
    await client.connect(transport);
    try {
      const { tools } = await client.listTools();
      assert.deepEqual(tools.map((t) => t.name).sort(), [...DOC_TOOLS].sort(), "sandbox tools are off on shared HTTP");
      const r = await call(client, "get_error_code", { code: 13402 });
      assert.match(r.text, /Referer/);
    } finally {
      await client.close();
    }
  } finally {
    child.kill();
  }
});

test("http: without a token it binds to loopback only", async () => {
  const { log, child } = await startHttp({});
  try {
    assert.match(log, /on http:\/\/127\.0\.0\.1:\d+\/mcp/);
    assert.match(log, /auth off/);
    assert.doesNotMatch(log, /WARNING/);
  } finally {
    child.kill();
  }
});

test("http: explicit public HOST without a token prints a warning", async () => {
  const { log, child } = await startHttp({ HOST: "0.0.0.0" });
  try {
    assert.match(log, /on http:\/\/0\.0\.0\.0:\d+\/mcp/);
    assert.match(log, /WARNING: listening on 0\.0\.0\.0 without authentication/);
  } finally {
    child.kill();
  }
});
