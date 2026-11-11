import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isAuthorized } from "./auth.js";
import { createMcpServer, VERSION } from "./mcp.js";
import { loadCorpus } from "./tools.js";

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
  const server = createMcpServer(corpus);
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

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";
const httpServer = app.listen(PORT, HOST, () => {
  console.log(
    `PEP IPG MCP v${VERSION} on http://${HOST}:${PORT}/mcp (${corpus.docs.size} docs, auth ${AUTH_TOKEN ? "on" : "off"})`,
  );
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => httpServer.close(() => process.exit(0)));
}
