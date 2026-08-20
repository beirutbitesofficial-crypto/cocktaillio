import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, runtime: "next-hostinger", menuSource: "hostinger-catalog" }, { headers: { "Cache-Control": "no-store" } });
}
