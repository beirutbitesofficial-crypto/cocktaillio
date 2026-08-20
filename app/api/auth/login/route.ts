import { NextResponse } from "next/server";
import { authenticateCredentials, issueToken } from "@/lib/hostinger-auth";

export async function POST(request: Request) {
  const data = await request.json().catch(() => ({})) as { username?: string; password?: string };
  const user = authenticateCredentials(data.username ?? "", data.password ?? "");
  if (!user) return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  const token = issueToken(user);
  return NextResponse.json({ token, expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(), user });
}
