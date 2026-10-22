import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { ACCOUNTANCY_APP } from "./unlock";

/** Supps n Social Ltd is not VAT-registered. VAT on these sales is always zero. */
export const VAT_PENCE = 0 as const;

export type AccountancyItem = {
  sku: string;
  description: string;
  quantity: number;
  unit_pence: number;
};

export type AccountancyStatus = "paid" | "refunded" | "disputed" | "failed";

export type AccountancyRecord = {
  v: "1.1";
  app: typeof ACCOUNTANCY_APP;
  order_id: string;
  items: AccountancyItem[];
  total_pence: number;
  vat_pence: typeof VAT_PENCE;
  processor_fee_pence: number;
  payment_method: string;
  /** Stripe PaymentIntent id (`pi_...`), or a demo id when no charge exists. */
  stripe_payment_id: string;
  status: AccountancyStatus;
  demo: boolean;
};

export type AccountancyDraft = Omit<AccountancyRecord, "v" | "app" | "vat_pence">;

export function accountancyLedgerPath(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.ACCOUNTANCY_LEDGER_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), ".data", "accountancy.jsonl");
}

export function buildAccountancyRecord(draft: AccountancyDraft): AccountancyRecord {
  return {
    v: "1.1",
    app: ACCOUNTANCY_APP,
    order_id: draft.order_id,
    items: draft.items.map((item) => ({ ...item })),
    total_pence: draft.total_pence,
    vat_pence: VAT_PENCE,
    processor_fee_pence: draft.processor_fee_pence,
    payment_method: draft.payment_method,
    stripe_payment_id: draft.stripe_payment_id,
    status: draft.status,
    demo: draft.demo,
  };
}

/**
 * Append one JSON line. Callers must not rewrite or truncate the ledger.
 */
export async function appendAccountancyRecord(
  record: AccountancyRecord,
  filePath: string = accountancyLedgerPath(),
): Promise<void> {
  const line = `${JSON.stringify(buildAccountancyRecord(record))}\n`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, line, { encoding: "utf8", flag: "a" });
}
