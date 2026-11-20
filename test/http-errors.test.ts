import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { jsonRpcErrorHandler } from "../src/http-errors.js";

let server: Server;
let base = "";

before(async () => {
  // Same stack as src/server.ts: JSON body parser, routes, then the error handler.
  const app = express();
  app.use(express.json({ limit: "1kb" }));
  app.post("/mcp", (_req, res) => { res.json({ ok: true }); });
  app.post("/boom", () => { throw new Error("secret internals"); });
  app.use(jsonRpcErrorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", () => r()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => new Promise<void>((r) => server.close(() => r())));

const post = async (path: string, body: string) => {
  const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const text = await res.text();
  return { status: res.status, type: res.headers.get("content-type") ?? "", text, json: JSON.parse(text) };
};

test("invalid JSON → JSON-RPC parse error, no HTML or stack trace", async () => {
  const r = await post("/mcp", "{bad");
  assert.equal(r.status, 400);
  assert.match(r.type, /application\/json/);
  assert.deepEqual(r.json, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null });
  assert.doesNotMatch(r.text, /SyntaxError|<html|at /);
});

test("oversized body → 413 JSON-RPC error", async () => {
  const r = await post("/mcp", JSON.stringify({ x: "a".repeat(2048) }));
  assert.equal(r.status, 413);
  assert.equal(r.json.error.code, -32600);
});

test("unexpected error → 500 without internals", async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const r = await post("/boom", "{}");
    assert.equal(r.status, 500);
    assert.equal(r.json.error.code, -32603);
    assert.doesNotMatch(r.text, /secret internals/);
  } finally {
    console.error = orig;
  }
});

test("valid JSON still reaches the route", async () => {
  const r = await post("/mcp", "{}");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
});
