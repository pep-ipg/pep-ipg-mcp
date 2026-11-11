// In-memory state of the Dorsa sandbox: transactions, virtual clock, config, fault injection.
import { createHash, randomBytes, randomInt } from "node:crypto";

export type TxState =
  | "CREATED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "UNKNOWN"
  | "VERIFIED" | "CONFIRMED" | "REVERSED";

export type Outcome = "success" | "failed" | "cancel" | "unknown" | "expire";

export interface TxEvent { at: string; type: string; detail?: string }

export interface Transaction {
  invoice: string;
  urlId: string;
  terminalNumber: number;
  serviceCode: string;
  serviceType: string;
  amount: number;
  callbackApi: string;
  billId?: string;
  paymentId?: string;
  paymentCode?: string;
  sheba?: string[];
  sharedValue?: string[];
  localization: "fa" | "en";
  description?: string;
  state: TxState;
  createdAt: number;
  paidAt?: number;
  verifiedAt?: number;
  confirmedAt?: number;
  reversedAt?: number;
  referenceNumber?: string;
  trackId?: string;
  transactionId: string;
  maskedCardNumber?: string;
  hashedCardNumber?: string;
  refunded: number;
  events: TxEvent[];
}

export interface SandboxConfig {
  username: string;
  password: string;
  terminalNumber: number;
  merchantNumber: number;
  merchantName: string;
  tokenTtlMin: number;
  pageTtlMin: number;
  verifyWindowMin: number;
  reverseWindowMin: number;
  refererCheck: "off" | "warn" | "strict";
}

export interface Fault {
  id: number;
  endpoint: string;   // path suffix, e.g. "verify-payment", or "*"
  mode: "error" | "timeout" | "applied_then_error";
  code: number;
  delaySec: number;
  remaining: number;
}

export interface LogEntry { at: string; method: string; path: string; status: number; resultCode?: number; note?: string }

export const DEFAULT_CONFIG: SandboxConfig = {
  username: "sandbox",
  password: "sandbox",
  terminalNumber: 1234567,
  merchantNumber: 7654321,
  merchantName: "فروشگاه آزمایشی",
  tokenTtlMin: 10,
  pageTtlMin: 10,
  verifyWindowMin: 25,
  reverseWindowMin: 25,
  refererCheck: "warn",
};

const TEST_CARD = "6037701234560340";

export class SandboxStore {
  config: SandboxConfig;
  readonly secret = randomBytes(32).toString("hex");
  private offsetMs = 0;
  private txByInvoice = new Map<string, Transaction>();
  private txByUrlId = new Map<string, Transaction>();
  private faults: Fault[] = [];
  private faultSeq = 0;
  private refSeq = 141010000000 + randomInt(1000, 9999) * 1000;
  private trackSeq = 0;
  private txSeq = 50000;
  readonly log: LogEntry[] = [];

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  now(): number { return Date.now() + this.offsetMs; }
  iso(t = this.now()): string { return new Date(t).toISOString(); }
  fastForward(minutes: number): void { this.offsetMs += minutes * 60_000; }
  clockOffsetMinutes(): number { return this.offsetMs / 60_000; }

  reset(): void {
    this.txByInvoice.clear();
    this.txByUrlId.clear();
    this.faults = [];
    this.offsetMs = 0;
    this.log.length = 0;
  }

  // ---------- transactions ----------

  private key(terminal: number, invoice: string) { return `${terminal}:${invoice}`; }

  findByInvoice(invoice: string, terminal = this.config.terminalNumber): Transaction | undefined {
    const tx = this.txByInvoice.get(this.key(terminal, invoice));
    if (tx) this.tick(tx);
    return tx;
  }

  findByUrlId(urlId: string): Transaction | undefined {
    const tx = this.txByUrlId.get(urlId);
    if (tx) this.tick(tx);
    return tx;
  }

  findBill(billId: string, paymentId: string): Transaction | undefined {
    for (const tx of this.txByInvoice.values()) {
      if (tx.billId === billId && tx.paymentId === paymentId) { this.tick(tx); return tx; }
    }
    return undefined;
  }

  list(limit = 20): Transaction[] {
    const all = [...this.txByInvoice.values()];
    all.forEach((t) => this.tick(t));
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  }

  create(input: Omit<Transaction, "urlId" | "state" | "createdAt" | "transactionId" | "refunded" | "events">): Transaction | "duplicate" {
    const k = this.key(input.terminalNumber, input.invoice);
    if (this.txByInvoice.has(k)) return "duplicate";
    const urlId = randomBytes(20).toString("hex") + "00000000" + String(input.terminalNumber).padStart(7, "0");
    const tx: Transaction = {
      ...input, urlId, state: "CREATED", createdAt: this.now(),
      transactionId: String(++this.txSeq), refunded: 0, events: [],
    };
    this.event(tx, "created", `${input.serviceType} amount=${input.amount}`);
    this.txByInvoice.set(k, tx);
    this.txByUrlId.set(urlId, tx);
    return tx;
  }

  event(tx: Transaction, type: string, detail?: string) {
    tx.events.push({ at: this.iso(), type, ...(detail ? { detail } : {}) });
  }

  /** Lazy, clock-driven transitions (page expiry, auto-reverse without verify, auto-confirm after verify). */
  tick(tx: Transaction): void {
    const now = this.now();
    const c = this.config;
    if (tx.state === "CREATED" && now > tx.createdAt + c.pageTtlMin * 60_000) {
      tx.state = "EXPIRED";
      this.event(tx, "expired", "payment page timed out");
    }
    if (tx.state === "PAID" && tx.paidAt && now > tx.paidAt + c.verifyWindowMin * 60_000) {
      tx.state = "REVERSED";
      tx.reversedAt = now;
      this.event(tx, "auto_reversed", "no verify within window; funds returned to cardholder");
    }
    if (tx.state === "VERIFIED" && tx.paidAt && now > tx.paidAt + c.verifyWindowMin * 60_000) {
      tx.state = "CONFIRMED";
      tx.confirmedAt = now;
      this.event(tx, "auto_confirmed", "verify window ended; switch confirmed");
    }
  }

  /** Apply the cardholder's choice on the payment page. Returns the callback URL. */
  pay(tx: Transaction, outcome: Outcome): string {
    this.tick(tx);
    if (tx.state !== "CREATED" && outcome !== "expire") throw new Error(`transaction is ${tx.state}, not awaiting payment`);
    const now = this.now();
    let status: string = outcome;
    switch (outcome) {
      case "success":
      case "unknown":
        tx.state = outcome === "success" ? "PAID" : "UNKNOWN";
        tx.paidAt = now;
        tx.referenceNumber = String(++this.refSeq);
        tx.trackId = String(++this.trackSeq);
        tx.maskedCardNumber = TEST_CARD.slice(0, 6) + "******" + TEST_CARD.slice(-4);
        tx.hashedCardNumber = createHash("sha256").update(TEST_CARD).digest("hex");
        break;
      case "failed":
        tx.state = "FAILED";
        tx.trackId = String(++this.trackSeq);
        break;
      case "cancel":
        tx.state = "CANCELLED";
        break;
      case "expire":
        if (tx.state === "CREATED") tx.state = "EXPIRED";
        status = "expire";
        break;
    }
    this.event(tx, "payment_page", `outcome=${outcome}`);
    const u = new URL(tx.callbackApi);
    u.searchParams.set("invoiceId", tx.invoice);
    u.searchParams.set("status", status);
    u.searchParams.set("referenceNumber", tx.referenceNumber ?? "");
    u.searchParams.set("trackId", tx.trackId ?? "");
    return u.toString();
  }

  /** Resolve an UNKNOWN transaction (as the switch eventually would). */
  resolve(tx: Transaction, to: "success" | "failed"): void {
    if (tx.state !== "UNKNOWN") throw new Error(`transaction is ${tx.state}, not UNKNOWN`);
    tx.state = to === "success" ? "PAID" : "FAILED";
    this.event(tx, "resolved", to);
  }

  // ---------- faults ----------

  addFault(f: Omit<Fault, "id">): Fault {
    const fault = { ...f, id: ++this.faultSeq };
    this.faults.push(fault);
    return fault;
  }

  listFaults(): Fault[] { return [...this.faults]; }
  clearFaults(): void { this.faults = []; }

  takeFault(path: string): Fault | undefined {
    const f = this.faults.find((x) => x.remaining > 0 && (x.endpoint === "*" || path.endsWith(x.endpoint)));
    if (!f) return undefined;
    f.remaining--;
    if (f.remaining <= 0) this.faults = this.faults.filter((x) => x !== f);
    return f;
  }

  record(entry: Omit<LogEntry, "at">) {
    this.log.push({ at: this.iso(), ...entry });
    if (this.log.length > 300) this.log.splice(0, this.log.length - 300);
  }
}

/** data.status reported by payment-inquiry for each state. */
export function inquiryStatus(tx: Transaction, checkVerify: boolean): number {
  switch (tx.state) {
    case "CREATED": return 13016;
    case "PAID": return 0;
    case "UNKNOWN": return 2;
    case "FAILED": case "CANCELLED": case "EXPIRED": return 13025;
    case "VERIFIED": return checkVerify ? 13034 : 0;
    case "CONFIRMED": return 13029;
    case "REVERSED": return 13033;
  }
}
