import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { hostingerAddons } from "@/lib/hostinger-menu-catalog";
import { posCategories, posMenu } from "@/lib/menu-view";
import { readPosState, restaurantTables } from "@/lib/hostinger-pos-store";

export async function GET(request: Request) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const state = await readPosState();
  const openChecks = state.checks.filter((check) => check.status === "open");
  const tables = restaurantTables.map((table) => ({ ...table, current_guests: 0, status: openChecks.some((check) => check.table_id === table.id) ? "occupied" : "available" }));
  return NextResponse.json({ user, tables, menu: posMenu, categories: posCategories, addons: hostingerAddons, checks: openChecks }, { headers: { "Cache-Control": "no-store" } });
}
