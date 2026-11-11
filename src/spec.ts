// Structured endpoint contracts (data/endpoints.json) used by the validator and the sandbox.
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./tools.js";

export interface FieldSpec {
  name: string;
  type: "string" | "integer" | "boolean" | "array";
  req: "M" | "O" | "C";
  desc: string;
}

export interface EndpointSpec {
  id: string;
  title: string;
  path: string;
  auth: "bearer" | "none";
  group: string;
  summary: string;
  fields: FieldSpec[];
  request: Record<string, unknown>;
  response: unknown;
}

export interface ServiceCode {
  serviceCode: string;
  serviceType: string;
  title: string;
  endpoint: string;
}

export interface Spec {
  endpoints: EndpointSpec[];
  serviceCodes: ServiceCode[];
}

let cached: Spec | undefined;

export function loadSpec(dataDir: string = DATA_DIR): Spec {
  if (cached && dataDir === DATA_DIR) return cached;
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, "endpoints.json"), "utf-8"));
  const spec: Spec = { endpoints: raw.endpoints, serviceCodes: raw.serviceCodes };
  if (dataDir === DATA_DIR) cached = spec;
  return spec;
}

/** Find an endpoint by id, or by path suffix (e.g. "/reverse-transactions"). */
export function findEndpoint(spec: Spec, idOrPath: string): EndpointSpec | undefined {
  const q = idOrPath.trim();
  const byId = spec.endpoints.find((e) => e.id === q);
  if (byId) return byId;
  const needle = q.toLowerCase().replace(/\/+$/, "");
  if (!needle) return undefined;
  return spec.endpoints.find((e) => e.path.toLowerCase().endsWith(needle));
}
