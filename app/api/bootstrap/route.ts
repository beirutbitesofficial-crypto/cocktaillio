import { NextResponse } from "next/server";
import { bearer, hostingerUsers, verifyToken } from "@/lib/hostinger-auth";
import { hostingerAddons, hostingerCategories, hostingerMenu } from "@/lib/hostinger-menu-catalog";

const tables = Array.from({ length: 12 }, (_, index) => ({
  id: `table-${index + 1}`,
  name: `Table ${index + 1}`,
  capacity: index === 7 ? 8 : index === 4 || index === 11 ? 6 : index === 0 || index === 3 || index === 6 || index === 9 ? 2 : 4,
  current_guests: 0,
  status: "available",
}));

export async function GET(request: Request) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({
    user,
    menu: hostingerMenu,
    categories: hostingerCategories,
    addons: hostingerAddons,
    inventory: [],
    tables,
    reservations: [],
    expenses: [],
    users: user.role === "manager" ? hostingerUsers : [],
    shift: null,
    metrics: { sales_cents: 0, orders: 0, next_order_number: 1 },
    recentOrders: [],
  }, { headers: { "Cache-Control": "no-store" } });
}
