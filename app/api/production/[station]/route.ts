import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { mutatePosState, readPosState } from "@/lib/hostinger-pos-store";

export async function GET(request: Request, context: { params: Promise<{ station: string }> }) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { station } = await context.params;
  if (station !== "bar" && station !== "kitchen") return NextResponse.json({ error: "Unknown station." }, { status: 404 });
  const state = await readPosState();
  return NextResponse.json({ station, tickets: state.tickets.filter((ticket) => ticket.station === station && ticket.status !== "ready").sort((a,b) => a.created_at.localeCompare(b.created_at)) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ station: string }> }) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { station } = await context.params;
  if (station !== "bar" && station !== "kitchen") return NextResponse.json({ error: "Unknown station." }, { status: 404 });
  const body = await request.json().catch(() => null) as { ticketId?: string; status?: "new" | "preparing" | "ready" } | null;
  if (!body?.ticketId || !["new","preparing","ready"].includes(body.status ?? "")) return NextResponse.json({ error: "Invalid ticket update." }, { status: 400 });
  try {
    const ticket = await mutatePosState((state) => {
      const found = state.tickets.find((entry) => entry.id === body.ticketId && entry.station === station);
      if (!found) throw new Error("Ticket not found.");
      found.status = body.status!; found.updated_at = new Date().toISOString(); return found;
    });
    return NextResponse.json({ ticket });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed." }, { status: 404 }); }
}
