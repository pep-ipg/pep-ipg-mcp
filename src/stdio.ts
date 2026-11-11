#!/usr/bin/env node
// Local mode: `npx pep-ipg-mcp` from Cursor / Claude Code / Claude Desktop.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp.js";
import { loadCorpus } from "./tools.js";

const server = createMcpServer(loadCorpus(), { sandbox: process.env.PEP_SANDBOX_DISABLE !== "1" });
await server.connect(new StdioServerTransport());
// stdout is the protocol channel: log only to stderr.
console.error("PEP IPG MCP running on stdio");
