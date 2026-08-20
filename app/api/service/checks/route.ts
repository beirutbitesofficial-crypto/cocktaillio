import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { hostingerAddons, hostingerMenu } from "@/lib/hostinger-menu-catalog";
import { mutatePosState, restaurantTables, StoredCheckLine, StoredTicket } from "@/lib/hostinger-pos-store";

type InputLine = { menuItemId?: string; quantity?: number; addons?: Array<{ addonId?: string; quantity?: number }>; note?: string };
const addonPriceLbp = (id: string) => { const match = id.match(/(\d+)$/); const n = Number(match?.[1] ?? 0); return n >= 1 && n <= 9 ? 100000 : n >= 10 && n <= 16 ? 80000 : 0; };

export async function POST(request: Request) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { tableId?: string; items?: InputLine[] } | null;
  if (!body?.tableId || !Array.isArray(body.items) || !body.items.length) return NextResponse.json({ error: "Choose a table and at least one item." }, { status: 400 });
  const table = restaurantTables.find((entry) => entry.id === body.tableId);
  if (!table) return NextResponse.json({ error: "Table not found." }, { status: 404 });

  try {
    const result = await mutatePosState((state) => {
      const now = new Date().toISOString();
      let check = state.checks.find((entry) => entry.table_id === table.id && entry.status === "open");
      if (!check) {
        check = { id: `check-${crypto.randomUUID()}`, table_id: table.id, table_name: table.name, opened_by: user.id, opened_by_name: user.name, opened_at: now, updated_at: now, status: "open", subtotal_cents: 0, subtotal_lbp: 0, items: [] };
        state.checks.push(check);
      }
      const newByStation: Record<"bar" | "kitchen", StoredCheckLine[]> = { bar: [], kitchen: [] };
      for (const raw of body.items!) {
        const qty = Math.floor(Number(raw.quantity ?? 0));
        const menu = hostingerMenu.find((entry) => entry.id === raw.menuItemId && entry.available === 1);
        if (!menu || qty < 1 || qty > 100) throw new Error("Invalid menu item or quantity.");
        const addons = menu.addons_enabled ? (raw.addons ?? []).flatMap((selected) => {
          const addon = hostingerAddons.find((entry) => entry.id === selected.addonId && entry.available === 1);
          if (!addon) return [];
          return [{ addon_id: addon.id, name_en: addon.name_en, name_ar: addon.name_ar, quantity: Math.max(1, Math.floor(Number(selected.quantity ?? 1))), price_lbp: addonPriceLbp(addon.id) }];
        }) : [];
        const line: StoredCheckLine = { id: `line-${crypto.randomUUID()}`, menu_item_id: menu.id, name_en: menu.name_en, name_ar: menu.name_ar, unit_price_cents: menu.price_cents, quantity: qty, line_total_cents: menu.price_cents * qty, station: menu.station, addons, note: raw.note?.trim() || null };
        check.items.push(line); newByStation[menu.station].push(line);
      }
      check.subtotal_cents = check.items.reduce((sum, line) => sum + line.line_total_cents, 0);
      check.subtotal_lbp = check.items.reduce((sum, line) => sum + line.addons.reduce((a, addon) => a + addon.price_lbp * addon.quantity * line.quantity, 0), 0);
      check.updated_at = now;
      const tickets: StoredTicket[] = [];
      for (const station of ["bar", "kitchen"] as const) {
        if (!newByStation[station].length) continue;
        const ticket: StoredTicket = { id: `ticket-${crypto.randomUUID()}`, check_id: check.id, table_id: table.id, table_name: table.name, station, station_ar: station === "bar" ? "البار" : "المطبخ", waiter_name: user.name, kind: "NEW", status: "new", created_at: now, updated_at: now, lines: newByStation[station].map((line) => ({ name_ar: line.name_ar, quantity: line.quantity, addons: line.addons.map((a) => ({ name_ar: a.name_ar, quantity: a.quantity })), note: line.note })) };
        state.tickets.push(ticket); tickets.push(ticket);
      }
      return { check, tickets };
    });
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save order." }, { status: 400 }); }
}
