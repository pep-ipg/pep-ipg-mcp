import { webcrypto } from "node:crypto";
import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isAuthorized } from "./auth.js";
import { jsonRpcErrorHandler } from "./http-errors.js";
import { createMcpServer, VERSION } from "./mcp.js";
import { loadCorpus } from "./tools.js";

// Node 18 has no global `crypto`; the MCP SDK's HTTP transport needs it (found by test/e2e.test.ts).
// Remove when Node 18 support is dropped.
if (!(globalThis as { crypto?: unknown }).crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

const corpus = loadCorpus();
const startedAt = new Date().toISOString();

const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "pep-ipg-mcp",
    version: VERSION,
    startedAt,
    docs: corpus.docs.size,
    errorCodes: Object.keys(corpus.errors).length,
  });
});

// Optional shared token for team deployments: set PEP_MCP_AUTH_TOKEN.
const AUTH_TOKEN = process.env.PEP_MCP_AUTH_TOKEN?.trim() || undefined;
app.use("/mcp", (req: Request, res: Response, next: () => void) => {
  if (isAuthorized(req.headers.authorization, AUTH_TOKEN)) return next();
  res.status(401).set("WWW-Authenticate", "Bearer").json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
    id: null,
  });
});

// Streamable HTTP, stateless: a fresh server + transport per request.
app.post("/mcp", async (req: Request, res: Response) => {
  const server = createMcpServer(corpus, { sandbox: process.env.PEP_SANDBOX_ENABLE === "1" });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

// Stateless server: no SSE stream and no sessions to delete.
const methodNotAllowed = (_req: Request, res: Response) => {
  res.status(405).set("Allow", "POST").json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed (stateless server, use POST)" },
    id: null,
  });
};
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);

// Invalid JSON, oversized body and other errors → JSON-RPC error instead of an HTML page.
app.use(jsonRpcErrorHandler);

const PORT = Number(process.env.PORT ?? 3000);
// Without a token, stay on loopback unless HOST is set explicitly (Docker sets HOST=0.0.0.0).
const HOST = process.env.HOST?.trim() || (AUTH_TOKEN ? "0.0.0.0" : "127.0.0.1");
const LOOPBACK = ["127.0.0.1", "localhost", "::1"];
const httpServer = app.listen(PORT, HOST, () => {
  const addr = httpServer.address();
  const port = addr && typeof addr === "object" ? addr.port : PORT;
  console.log(
    `PEP IPG MCP v${VERSION} on http://${HOST}:${port}/mcp (${corpus.docs.size} docs, auth ${AUTH_TOKEN ? "on" : "off"})`,
  );
  if (!AUTH_TOKEN && !LOOPBACK.includes(HOST)) {
    console.warn(
      `WARNING: listening on ${HOST} without authentication. Anyone who can reach this port can use the server. ` +
        `Set PEP_MCP_AUTH_TOKEN, or put it behind a proxy that authenticates.`,
    );
  }
});
httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} on ${HOST} is already in use. Stop the other process or set PORT to a free port.`);
  } else {
    console.error("HTTP server failed:", err);
  }
  process.exit(1);
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => httpServer.close(() => process.exit(0)));
}
