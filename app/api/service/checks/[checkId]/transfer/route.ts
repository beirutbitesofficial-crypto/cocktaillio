import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { mutatePosState, restaurantTables } from "@/lib/hostinger-pos-store";

export async function POST(request: Request, context: { params: Promise<{ checkId: string }> }) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { checkId } = await context.params;
  const body = await request.json().catch(() => null) as { destinationTableId?: string } | null;
  const destination = restaurantTables.find((table) => table.id === body?.destinationTableId);
  if (!destination) return NextResponse.json({ error: "Destination table not found." }, { status: 404 });
  try {
    const result = await mutatePosState((state) => {
      const check = state.checks.find((entry) => entry.id === checkId && entry.status === "open");
      if (!check) throw new Error("Open table order not found.");
      if (state.checks.some((entry) => entry.id !== check.id && entry.table_id === destination.id && entry.status === "open")) throw new Error("Destination table already has an open order.");
      check.table_id = destination.id; check.table_name = destination.name; check.updated_at = new Date().toISOString();
      return { id: check.id, tableId: destination.id, tableName: destination.name };
    });
    return NextResponse.json(result);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Transfer failed." }, { status: 409 }); }
}
