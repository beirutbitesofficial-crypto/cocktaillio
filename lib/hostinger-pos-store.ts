import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProductionStation } from "@/lib/hostinger-menu-catalog";

export type StoredAddon = { addon_id: string; name_en: string; name_ar: string; quantity: number };
export type StoredCheckLine = { id: string; menu_item_id: string; name_en: string; name_ar: string; unit_price_cents: number; quantity: number; line_total_cents: number; station: ProductionStation; addons: StoredAddon[]; note: string | null };
export type StoredCheck = { id: string; table_id: string; table_name: string; opened_by: string; opened_by_name: string; opened_at: string; updated_at: string; status: "open" | "paid"; subtotal_cents: number; items: StoredCheckLine[] };
export type StoredTicket = { id: string; check_id: string; table_id: string; table_name: string; station: ProductionStation; station_ar: string; waiter_name: string; kind: "NEW" | "VOID"; status: "new" | "preparing" | "ready"; created_at: string; updated_at: string; lines: Array<{ name_ar: string; quantity: number; addons: Array<{ name_ar: string; quantity: number }>; note: string | null }> };
export type StoredReceipt = { id: string; order_number: number; check_id: string; table_id: string; table_name: string; cashier: string; total_cents: number; usd_paid_cents: number; lbp_paid: number; exchange_rate_lbp_per_usd: number | null; change_usd_cents: number; created_at: string; items: StoredCheckLine[] };
export type PosState = { version: 1; next_order_number: number; checks: StoredCheck[]; tickets: StoredTicket[]; receipts: StoredReceipt[] };

const dataPath = process.env.POS_DATA_FILE || path.join(process.cwd(), ".pos-data", "state.json");
let queue = Promise.resolve();
const emptyState = (): PosState => ({ version: 1, next_order_number: 1, checks: [], tickets: [], receipts: [] });

async function readStateUnlocked(): Promise<PosState> {
  try {
    const raw = await readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as PosState;
    if (parsed?.version === 1 && Array.isArray(parsed.checks) && Array.isArray(parsed.tickets) && Array.isArray(parsed.receipts)) return parsed;
  } catch {}
  return emptyState();
}

async function writeStateUnlocked(state: PosState) {
  await mkdir(path.dirname(dataPath), { recursive: true });
  const temp = `${dataPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2), "utf8");
  await rename(temp, dataPath);
}

export async function readPosState() { return readStateUnlocked(); }

export async function mutatePosState<T>(mutation: (state: PosState) => T | Promise<T>): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  queue = queue.then(async () => {
    try {
      const state = await readStateUnlocked();
      const value = await mutation(state);
      await writeStateUnlocked(state);
      resolveResult(value);
    } catch (error) { rejectResult(error); }
  }, async () => {
    try {
      const state = await readStateUnlocked();
      const value = await mutation(state);
      await writeStateUnlocked(state);
      resolveResult(value);
    } catch (error) { rejectResult(error); }
  });
  return result;
}

export const restaurantTables = Array.from({ length: 12 }, (_, index) => ({
  id: `table-${index + 1}`,
  name: `Table ${index + 1}`,
  capacity: index === 7 ? 8 : index === 4 || index === 11 ? 6 : index === 0 || index === 3 || index === 6 || index === 9 ? 2 : 4,
}));
