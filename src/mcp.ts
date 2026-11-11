import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatSearch, getAuthFlow, getDoc, getErrorCode } from "./tools.js";
import type { Corpus } from "./types.js";

export const VERSION = "1.1.0";

const INSTRUCTIONS = `This server documents the Pasargad Electronic Payment (PEP) internet payment gateway, Dorsa protocol v28.0 (1405/08/12).
Auth is JWT Bearer via POST /token/getToken — NOT the legacy RSA/XML signing. Amounts are integer Rials. All services are POST + JSON.
Flow: getToken → purchase / pre-transaction → redirect user → callback → verify-payment → deliver (or reverse within the window).
Never trust the callback status alone; decide with verify / payment-inquiry on the server. Never ask users for real card data.
Use search_docs first, get_doc for full contracts (fields, samples), get_error_code for resultCode / status codes, get_auth_flow for token handling code.`;

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });

export function createMcpServer(corpus: Corpus): McpServer {
  const server = new McpServer(
    { name: "pep-ipg-mcp", version: VERSION },
    { instructions: INSTRUCTIONS },
  );
  const docIds = [...corpus.docs.keys()].join(", ");

  server.registerTool(
    "search_docs",
    {
      title: "جستجو در مستندات درگاه پاسارگاد",
      description:
        "Search (Persian or English) the Pasargad IPG Dorsa v28 docs: token, purchase, split payment (تسهیم), top-up/bill, verify/confirm/reverse, callback, inquiry, refund, referer, error codes, pitfalls. Returns matching sections with the doc id for get_doc.",
      inputSchema: {
        query: z.string().min(1).describe("e.g. 'خطای 13402', 'verify timeout', 'تسهیم شبا'"),
        limit: z.number().int().min(1).max(10).optional().describe("Max results (default 5)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, limit }) => text(formatSearch(corpus, query, limit ?? 5)),
  );

  server.registerTool(
    "get_doc",
    {
      title: "متن کامل یک مستند",
      description: `Full Markdown of one doc: endpoint contract (path, auth, fields, sample request/response) or a guide. Valid ids: ${docIds}`,
      inputSchema: { id: z.string().min(1).describe("Doc id, e.g. purchase, verify-payment, settlement") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ id }) => {
      const body = getDoc(corpus, id);
      return body ? text(body) : text(`مستند «${id}» یافت نشد. شناسه‌های معتبر: ${docIds}`, true);
    },
  );

  server.registerTool(
    "get_error_code",
    {
      title: "تحلیل کد خطای درگاه پاسارگاد",
      description:
        "Explain a Pasargad IPG resultCode or transaction status code (e.g. 13402, 13029, 2) from the official 202-code table: Persian/English message, category, retryability and a concrete fix. Also accepts message text such as 'Invalid Referer'.",
      inputSchema: {
        code: z.union([z.string(), z.number()]).describe("Numeric code or part of the error message"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ code }) => text(getErrorCode(corpus, code)),
  );

  server.registerTool(
    "get_auth_flow",
    {
      title: "راهنمای احراز هویت و توکن",
      description:
        "How to authenticate against the Pasargad IPG (Dorsa v28): getToken, JWT expiry, Bearer header, 401 handling — plus a ready token client (caching, early refresh, single retry) in the requested language. Note: Dorsa v25 does not use RSA request signing.",
      inputSchema: {
        language: z.enum(["typescript", "go", "php", "python"]).optional().describe("Sample code language (default typescript)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ language }) => text(getAuthFlow(corpus, language ?? "typescript")),
  );

  return server;
}
