// Turns Express / body-parser failures into JSON-RPC errors, so MCP clients never get
// Express's default HTML error page (which includes a stack trace outside production).
import type { NextFunction, Request, Response } from "express";

type HttpError = Error & { status?: number; statusCode?: number; type?: string };

export function jsonRpcErrorHandler(err: HttpError, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const raw = err.status ?? err.statusCode;
  const status = typeof raw === "number" && raw >= 400 && raw < 600 ? raw : 500;
  let error: { code: number; message: string };
  if (err.type === "entity.parse.failed") error = { code: -32700, message: "Parse error" };
  else if (status === 413) error = { code: -32600, message: "Request body too large" };
  else if (status < 500) error = { code: -32600, message: "Invalid Request" };
  else {
    console.error("HTTP request failed:", err);
    error = { code: -32603, message: "Internal server error" };
  }
  res.status(status).json({ jsonrpc: "2.0", error, id: null });
}
