import { hostingerAddons, hostingerMenu, ProductionStation } from "@/lib/hostinger-menu-catalog";

export type OrderAddonInput = { addonId: string; quantity?: number };
export type OrderLineInput = { menuItemId: string; quantity: number; addons?: OrderAddonInput[]; note?: string };
export type ProductionTicketLine = { menu_item_id: string; name_ar: string; quantity: number; addons: Array<{ name_ar: string; quantity: number }>; note: string | null };
export type ProductionTicket = { station: ProductionStation; station_ar: string; table_id: string; table_name: string; waiter_name: string; sent_at: string; lines: ProductionTicketLine[] };

export function routeProductionOrder(input: { tableId: string; tableName: string; waiterName: string; lines: OrderLineInput[] }) {
  const grouped: Record<ProductionStation, ProductionTicketLine[]> = { bar: [], kitchen: [] };
  for (const line of input.lines) {
    const menuItem = hostingerMenu.find((entry) => entry.id === line.menuItemId);
    if (!menuItem || line.quantity < 1) continue;
    const addons = menuItem.addons_enabled ? (line.addons ?? []).flatMap((selected) => {
      const found = hostingerAddons.find((entry) => entry.id === selected.addonId);
      return found ? [{ name_ar: found.name_ar, quantity: Math.max(1, Math.floor(selected.quantity ?? 1)) }] : [];
    }) : [];
    grouped[menuItem.station].push({ menu_item_id: menuItem.id, name_ar: menuItem.name_ar, quantity: Math.floor(line.quantity), addons, note: line.note?.trim() || null });
  }
  const sentAt = new Date().toISOString();
  return (Object.entries(grouped) as Array<[ProductionStation, ProductionTicketLine[]]>).filter(([, lines]) => lines.length).map(([station, lines]): ProductionTicket => ({
    station, station_ar: station === "bar" ? "البار" : "المطبخ", table_id: input.tableId, table_name: input.tableName, waiter_name: input.waiterName, sent_at: sentAt, lines,
  }));
}
