import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Entitlement, EntitlementClaim } from "./entitlements";

export interface EntitlementStore {
  getEntitlement(id: string): Promise<Entitlement | null>;
  getByCheckoutSession(checkoutSessionId: string): Promise<Entitlement | null>;
  getByPaymentIntent(paymentIntentId: string): Promise<Entitlement | null>;
  /**
   * Insert when this checkout session has no entitlement yet.
   * A concurrent insert returns the record already stored for that session.
   */
  insertEntitlement(entitlement: Entitlement): Promise<Entitlement>;
  updateEntitlement(entitlement: Entitlement): Promise<void>;
  getClaim(checkoutSessionId: string): Promise<EntitlementClaim | null>;
  /**
   * Bind a checkout session to one browser. Returns false when it was already claimed.
   */
  tryClaim(checkoutSessionId: string, claim: EntitlementClaim): Promise<boolean>;
  markFailed(checkoutSessionId: string): Promise<void>;
  isFailed(checkoutSessionId: string): Promise<boolean>;
}

type Snapshot = {
  entitlements: Record<string, Entitlement>;
  bySession: Record<string, string>;
  byPaymentIntent: Record<string, string>;
  claims: Record<string, EntitlementClaim>;
  failedSessions: Record<string, string>;
};

function emptySnapshot(): Snapshot {
  return {
    entitlements: {},
    bySession: {},
    byPaymentIntent: {},
    claims: {},
    failedSessions: {},
  };
}

export class MemoryEntitlementStore implements EntitlementStore {
  private snapshot: Snapshot;

  constructor(snapshot: Snapshot = emptySnapshot()) {
    this.snapshot = snapshot;
  }

  static fromSnapshot(snapshot: Snapshot): MemoryEntitlementStore {
    return new MemoryEntitlementStore(snapshot);
  }

  exportSnapshot(): Snapshot {
    return structuredClone(this.snapshot);
  }

  async getEntitlement(id: string): Promise<Entitlement | null> {
    return this.snapshot.entitlements[id] ?? null;
  }

  async getByCheckoutSession(checkoutSessionId: string): Promise<Entitlement | null> {
    const id = this.snapshot.bySession[checkoutSessionId];
    if (!id) return null;
    return this.snapshot.entitlements[id] ?? null;
  }

  async getByPaymentIntent(paymentIntentId: string): Promise<Entitlement | null> {
    const id = this.snapshot.byPaymentIntent[paymentIntentId];
    if (!id) return null;
    return this.snapshot.entitlements[id] ?? null;
  }

  async insertEntitlement(entitlement: Entitlement): Promise<Entitlement> {
    const existingId = this.snapshot.bySession[entitlement.checkoutSessionId];
    if (existingId) {
      const existing = this.snapshot.entitlements[existingId];
      if (existing) return existing;
    }
    this.snapshot.entitlements[entitlement.id] = entitlement;
    this.snapshot.bySession[entitlement.checkoutSessionId] = entitlement.id;
    this.snapshot.byPaymentIntent[entitlement.paymentIntentId] = entitlement.id;
    return entitlement;
  }

  async updateEntitlement(entitlement: Entitlement): Promise<void> {
    const currentId = this.snapshot.bySession[entitlement.checkoutSessionId];
    if (currentId && currentId !== entitlement.id) {
      throw new Error("Refusing to replace an entitlement for a checkout session that already exists.");
    }
    this.snapshot.entitlements[entitlement.id] = entitlement;
    this.snapshot.bySession[entitlement.checkoutSessionId] = entitlement.id;
    this.snapshot.byPaymentIntent[entitlement.paymentIntentId] = entitlement.id;
  }

  async getClaim(checkoutSessionId: string): Promise<EntitlementClaim | null> {
    return this.snapshot.claims[checkoutSessionId] ?? null;
  }

  async tryClaim(checkoutSessionId: string, claim: EntitlementClaim): Promise<boolean> {
    if (this.snapshot.claims[checkoutSessionId]) return false;
    this.snapshot.claims[checkoutSessionId] = claim;
    return true;
  }

  async markFailed(checkoutSessionId: string): Promise<void> {
    this.snapshot.failedSessions[checkoutSessionId] = new Date().toISOString();
  }

  async isFailed(checkoutSessionId: string): Promise<boolean> {
    return Boolean(this.snapshot.failedSessions[checkoutSessionId]);
  }
}

export class FileEntitlementStore implements EntitlementStore {
  private memory = new MemoryEntitlementStore();
  private queue: Promise<unknown> = Promise.resolve();
  private loaded = false;

  constructor(private readonly filePath: string) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(operation, operation);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async ready(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Snapshot;
      this.memory = MemoryEntitlementStore.fromSnapshot({
        entitlements: parsed.entitlements ?? {},
        bySession: parsed.bySession ?? {},
        byPaymentIntent: parsed.byPaymentIntent ?? {},
        claims: parsed.claims ?? {},
        failedSessions: parsed.failedSessions ?? {},
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(this.memory.exportSnapshot()), "utf8");
    await rename(temporary, this.filePath);
  }

  async getEntitlement(id: string): Promise<Entitlement | null> {
    return this.enqueue(async () => {
      await this.ready();
      return this.memory.getEntitlement(id);
    });
  }

  async getByCheckoutSession(checkoutSessionId: string): Promise<Entitlement | null> {
    return this.enqueue(async () => {
      await this.ready();
      return this.memory.getByCheckoutSession(checkoutSessionId);
    });
  }

  async getByPaymentIntent(paymentIntentId: string): Promise<Entitlement | null> {
    return this.enqueue(async () => {
      await this.ready();
      return this.memory.getByPaymentIntent(paymentIntentId);
    });
  }

  async insertEntitlement(entitlement: Entitlement): Promise<Entitlement> {
    return this.enqueue(async () => {
      await this.ready();
      const saved = await this.memory.insertEntitlement(entitlement);
      await this.persist();
      return saved;
    });
  }

  async updateEntitlement(entitlement: Entitlement): Promise<void> {
    return this.enqueue(async () => {
      await this.ready();
      await this.memory.updateEntitlement(entitlement);
      await this.persist();
    });
  }

  async getClaim(checkoutSessionId: string): Promise<EntitlementClaim | null> {
    return this.enqueue(async () => {
      await this.ready();
      return this.memory.getClaim(checkoutSessionId);
    });
  }

  async tryClaim(checkoutSessionId: string, claim: EntitlementClaim): Promise<boolean> {
    return this.enqueue(async () => {
      await this.ready();
      const claimed = await this.memory.tryClaim(checkoutSessionId, claim);
      if (claimed) await this.persist();
      return claimed;
    });
  }

  async markFailed(checkoutSessionId: string): Promise<void> {
    return this.enqueue(async () => {
      await this.ready();
      await this.memory.markFailed(checkoutSessionId);
      await this.persist();
    });
  }

  async isFailed(checkoutSessionId: string): Promise<boolean> {
    return this.enqueue(async () => {
      await this.ready();
      return this.memory.isFailed(checkoutSessionId);
    });
  }
}

type KvFetch = (url: string, init: RequestInit) => Promise<Response>;

export class KvEntitlementStore implements EntitlementStore {
  constructor(
    private readonly options: {
      url: string;
      token: string;
      fetchImpl?: KvFetch;
      prefix?: string;
    },
  ) {}

  private prefix(): string {
    return this.options.prefix ?? "todays-session:v1";
  }

  private async command<T>(args: string[]): Promise<T> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const response = await fetchImpl(this.options.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    const body = (await response.json()) as { result?: T; error?: string };
    if (!response.ok || body.error) {
      throw new Error(body.error ? `Entitlement store request failed: ${body.error}` : `Entitlement store request failed (${response.status}).`);
    }
    return body.result as T;
  }

  private entKey(id: string): string {
    return `${this.prefix()}:ent:${id}`;
  }

  private sessionKey(id: string): string {
    return `${this.prefix()}:session:${id}`;
  }

  private paymentIntentKey(id: string): string {
    return `${this.prefix()}:pi:${id}`;
  }

  private claimKey(id: string): string {
    return `${this.prefix()}:claim:${id}`;
  }

  private failedKey(id: string): string {
    return `${this.prefix()}:failed:${id}`;
  }

  private async readEntitlement(id: string | null): Promise<Entitlement | null> {
    if (!id) return null;
    const raw = await this.command<string | null>(["GET", this.entKey(id)]);
    if (!raw) return null;
    return JSON.parse(raw) as Entitlement;
  }

  async getEntitlement(id: string): Promise<Entitlement | null> {
    return this.readEntitlement(id);
  }

  async getByCheckoutSession(checkoutSessionId: string): Promise<Entitlement | null> {
    const id = await this.command<string | null>(["GET", this.sessionKey(checkoutSessionId)]);
    return this.readEntitlement(id);
  }

  async getByPaymentIntent(paymentIntentId: string): Promise<Entitlement | null> {
    const id = await this.command<string | null>(["GET", this.paymentIntentKey(paymentIntentId)]);
    return this.readEntitlement(id);
  }

  async insertEntitlement(entitlement: Entitlement): Promise<Entitlement> {
    const reserved = await this.command<string | null>([
      "SET",
      this.sessionKey(entitlement.checkoutSessionId),
      entitlement.id,
      "NX",
    ]);
    if (reserved !== "OK") {
      const existing = await this.getByCheckoutSession(entitlement.checkoutSessionId);
      if (existing) return existing;
      throw new Error("Checkout session is already reserved but the entitlement record is missing.");
    }
    await this.command(["SET", this.entKey(entitlement.id), JSON.stringify(entitlement)]);
    await this.command(["SET", this.paymentIntentKey(entitlement.paymentIntentId), entitlement.id]);
    return entitlement;
  }

  async updateEntitlement(entitlement: Entitlement): Promise<void> {
    await this.command(["SET", this.entKey(entitlement.id), JSON.stringify(entitlement)]);
    await this.command(["SET", this.sessionKey(entitlement.checkoutSessionId), entitlement.id]);
    await this.command(["SET", this.paymentIntentKey(entitlement.paymentIntentId), entitlement.id]);
  }

  async getClaim(checkoutSessionId: string): Promise<EntitlementClaim | null> {
    const raw = await this.command<string | null>(["GET", this.claimKey(checkoutSessionId)]);
    if (!raw) return null;
    return JSON.parse(raw) as EntitlementClaim;
  }

  async tryClaim(checkoutSessionId: string, claim: EntitlementClaim): Promise<boolean> {
    const reserved = await this.command<string | null>([
      "SET",
      this.claimKey(checkoutSessionId),
      JSON.stringify(claim),
      "NX",
    ]);
    return reserved === "OK";
  }

  async markFailed(checkoutSessionId: string): Promise<void> {
    await this.command(["SET", this.failedKey(checkoutSessionId), new Date().toISOString()]);
  }

  async isFailed(checkoutSessionId: string): Promise<boolean> {
    const value = await this.command<string | null>(["GET", this.failedKey(checkoutSessionId)]);
    return value !== null;
  }
}

const SHARED_STORE_REQUIRED =
  "A shared server-side store is required in production. Set KV_REST_API_URL and KV_REST_API_TOKEN.";

export function createEntitlementStoreFromEnv(env: NodeJS.ProcessEnv = process.env): EntitlementStore {
  const url = env.KV_REST_API_URL?.trim();
  const token = env.KV_REST_API_TOKEN?.trim();
  if (url && token) {
    return new KvEntitlementStore({ url, token });
  }
  if (env.NODE_ENV === "production") {
    throw new Error(SHARED_STORE_REQUIRED);
  }
  const filePath =
    env.ENTITLEMENT_STORE_PATH?.trim() || path.join(process.cwd(), ".data", "entitlements.json");
  return new FileEntitlementStore(filePath);
}

let singleton: EntitlementStore | null = null;

export function getEntitlementStore(): EntitlementStore {
  if (!singleton) singleton = createEntitlementStoreFromEnv();
  return singleton;
}

export function resetEntitlementStoreForTests(store: EntitlementStore | null = null): void {
  singleton = store;
}
