import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { routeProductionOrder, OrderLineInput } from "@/lib/production-routing";

export async function POST(request: Request) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { tableId?: string; tableName?: string; lines?: OrderLineInput[] } | null;
  if (!body?.tableId || !body.tableName || !Array.isArray(body.lines) || !body.lines.length) return NextResponse.json({ error: "Table and order lines are required." }, { status: 400 });
  const tickets = routeProductionOrder({ tableId: body.tableId, tableName: body.tableName, waiterName: user.name, lines: body.lines });
  if (!tickets.length) return NextResponse.json({ error: "No valid production items." }, { status: 400 });
  return NextResponse.json({ tickets }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
