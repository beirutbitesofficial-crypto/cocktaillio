import { handleServiceApi, type ServiceEnv } from "./service-api";

const encoder = new TextEncoder();
async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function effectiveRole(request: Request, env: ServiceEnv) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  return env.DB.prepare(`SELECT COALESCE(sr.service_role,u.role) role FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_service_roles sr ON sr.user_id=u.id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.active=1`).bind(await digest(token)).first<{ role: string }>();
}
function response(request: Request, env: ServiceEnv, payload: unknown, status = 200) {
  const origin = request.headers.get("origin");
  const allowed = (env.FRONTEND_ORIGIN ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const selected = origin && allowed.includes(origin) ? origin : allowed[0];
  return new Response(JSON.stringify(payload), { status, headers: { ...(selected ? { "access-control-allow-origin": selected, vary: "Origin" } : {}), "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" } });
}

export async function handleGuardedServiceApi(request: Request, env: ServiceEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/service/")) return null;
  const role = await effectiveRole(request, env);
  const checkout = /^\/api\/service\/checks\/[^/]+\/checkout$/.test(url.pathname) && request.method === "POST";
  if (checkout && role?.role === "waiter") return response(request, env, { error: "Only cashier or management can take payment and issue receipts." }, 403);

  const result = await handleServiceApi(request, env, url);
  if (!result || url.pathname !== "/api/service/bootstrap" || request.method !== "GET" || !result.ok || !role) return result;
  const payload = await result.json() as Record<string, unknown> & { user?: Record<string, unknown> };
  if (payload.user) payload.user = { ...payload.user, role: role.role };
  return response(request, env, payload, result.status);
}
