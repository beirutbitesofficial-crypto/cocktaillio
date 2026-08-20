import { createHmac, timingSafeEqual } from "node:crypto";

export type HostingerUser = { id: string; username: string; name: string; role: "manager" | "cashier" };

const users: Array<HostingerUser & { password: string }> = [
  { id: "manager-1", username: "manager", password: "2300", name: "Alex Daher", role: "manager" },
  { id: "cashier-1", username: "cashier", password: "1234", name: "Jamie D.", role: "cashier" },
  { id: "cashier-2", username: "maya", password: "1234", name: "Maya Khalil", role: "cashier" },
  { id: "cashier-3", username: "sam", password: "1234", name: "Sam Rami", role: "cashier" },
];

function secret() {
  return process.env.POS_SESSION_SECRET || "cocktaillio-hostinger-preview-session-v1";
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function authenticateCredentials(username: string, password: string): HostingerUser | null {
  const normalized = username.trim().toLowerCase();
  const user = users.find((entry) => entry.username === normalized && entry.password === password);
  return user ? { id: user.id, username: user.username, name: user.name, role: user.role } : null;
}

export function issueToken(user: HostingerUser) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role, exp: Date.now() + 14 * 86400000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | null): HostingerUser | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { id?: string; username?: string; role?: string; exp?: number };
    if (!parsed.id || !parsed.username || !parsed.exp || parsed.exp < Date.now()) return null;
    const user = users.find((entry) => entry.id === parsed.id && entry.username === parsed.username);
    return user ? { id: user.id, username: user.username, name: user.name, role: user.role } : null;
  } catch { return null; }
}

export function bearer(request: Request) {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

export const hostingerUsers = users.map(({ password: _password, ...user }) => ({ ...user, display_name: user.name, active: 1 }));
