const apiBase = (process.env.NEXT_PUBLIC_POS_API_URL ?? "").replace(/\/$/, "");
const tokenKey = "cocktaillio-session";

export function hasBackendConfig() { return Boolean(apiBase); }
export function getSessionToken() { return typeof window === "undefined" ? null : localStorage.getItem(tokenKey); }
export function saveSessionToken(token: string) { localStorage.setItem(tokenKey, token); }
export function clearSessionToken() { localStorage.removeItem(tokenKey); }

export async function posApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body instanceof Blob || options.body instanceof ArrayBuffer ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Backend returned HTTP ${response.status}.`);
  return payload;
}

export type BackendBootstrap = {
  user: { id: string; username: string; name: string; role: "admin" | "manager" | "cashier" };
  menu: Array<{ id: string; name: string; description: string; price_cents: number; image_url: string | null; available: number; customizable: number; category: string }>;
  categories: Array<{id:string;name:string;sort_order:number}>;
  addons: Array<{ id: string; name: string; price_cents: number; emoji: string; available: number }>;
  inventory: Array<{ id: string; name: string; category: string; quantity_base: number; alert_quantity_base: number; display_unit: string; cost_micros_per_base: number }>;
  tables: Array<{ id: string; name: string; capacity: number; current_guests: number; status: string }>;
  reservations: Array<Record<string, unknown>>;
  expenses: Array<{ id: string; description: string; category: string; amount_cents: number; expense_date: string; added_by: string; paid_from: "cash_drawer" | "owner" }>;
  users: Array<{ id: string; username: string; display_name: string; role: string; active: number }>;
  shift: { id: string; opening_cash_cents: number; opened_at: string } | null;
  metrics: { sales_cents: number; orders: number; next_order_number: number };
  recentOrders: Array<{ order_number: number; order_type: string; total_cents: number; status: string; created_at: string; cashier: string }>;
};
