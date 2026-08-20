import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { mutatePosState } from "@/lib/hostinger-pos-store";

export async function POST(request: Request, context: { params: Promise<{ checkId: string }> }) {
  const user = verifyToken(bearer(request));
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (user.role === "waiter") return NextResponse.json({ error: "Only cashier or management can take payment and issue receipts." }, { status: 403 });
  const { checkId } = await context.params;
  const body = await request.json().catch(() => null) as { usdCents?: number; lbpAmount?: number; exchangeRateLbpPerUsd?: number } | null;
  const usdCents = Math.max(0, Math.round(Number(body?.usdCents ?? 0)));
  const lbpAmount = Math.max(0, Math.round(Number(body?.lbpAmount ?? 0)));
  const rate = Math.round(Number(body?.exchangeRateLbpPerUsd ?? 0));
  if ((lbpAmount > 0 || true) && rate <= 0) return NextResponse.json({ error: "Enter a valid exchange rate." }, { status: 400 });
  if (!usdCents && !lbpAmount) return NextResponse.json({ error: "Enter payment amount." }, { status: 400 });
  try {
    const receipt = await mutatePosState((state) => {
      const check = state.checks.find((entry) => entry.id === checkId && entry.status === "open");
      if (!check || !check.items.length) throw new Error("Open table order not found.");
      const addonEquivalentCents = Math.round((check.subtotal_lbp / rate) * 100);
      const totalEquivalentCents = check.subtotal_cents + addonEquivalentCents;
      const paidEquivalentCents = usdCents + Math.round((lbpAmount / rate) * 100);
      if (paidEquivalentCents < totalEquivalentCents) throw new Error("Payment is below the order total.");
      const result = {
        id: `receipt-${crypto.randomUUID()}`,
        order_number: state.next_order_number++,
        check_id: check.id,
        table_id: check.table_id,
        table_name: check.table_name,
        cashier: user.name,
        subtotal_cents: check.subtotal_cents,
        subtotal_lbp: check.subtotal_lbp,
        total_equivalent_cents: totalEquivalentCents,
        usd_paid_cents: usdCents,
        lbp_paid: lbpAmount,
        exchange_rate_lbp_per_usd: rate,
        change_usd_cents: Math.max(0, paidEquivalentCents - totalEquivalentCents),
        created_at: new Date().toISOString(),
        items: check.items,
      };
      state.receipts.push(result);
      check.status = "paid"; check.updated_at = result.created_at;
      return result;
    });
    return NextResponse.json({ receipt });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed." }, { status: 409 }); }
}
