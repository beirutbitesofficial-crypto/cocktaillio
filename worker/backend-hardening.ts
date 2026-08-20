import { handlePosApi, type PosEnv } from "./pos-api";

type Role = "admin" | "manager" | "cashier" | "waiter";
type CoreRole = "admin" | "manager" | "cashier";
type User = { id: string; username: string; display_name: string; role: Role; core_role: CoreRole };
const encoder = new TextEncoder();

function cors(env: PosEnv, request: Request) {
  const origin = request.headers.get("origin");
  const allowed = (env.FRONTEND_ORIGIN ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const selected = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    ...(selected ? { "access-control-allow-origin": selected, vary: "Origin" } : {}),
    "access-control-allow-headers": "authorization, content-type, idempotency-key",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  };
}
function json(env: PosEnv, request: Request, payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: cors(env, request) }); }
function problem(env: PosEnv, request: Request, status: number, error: string) { return json(env, request, { error }, status); }
async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function passwordHash(password: string) {
  const rounds = 150_000, salt = crypto.randomUUID();
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const value = hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: rounds }, key, 256));
  return `pbkdf2:${rounds}:${salt}:${value}`;
}
async function auth(request: Request, env: PosEnv): Promise<User | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  return env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.role core_role,COALESCE(sr.service_role,u.role) role FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_service_roles sr ON sr.user_id=u.id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.active=1`).bind(await digest(token)).first<User>();
}
function canManageUsers(user: User) { return user.role === "admin" || user.role === "manager"; }
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
async function body<T>(request: Request): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("JSON body required.");
  return request.json() as Promise<T>;
}

async function guardedLogin(request: Request, env: PosEnv, url: URL) {
  let username = "unknown";
  try { username = ((await request.clone().json()) as { username?: string }).username?.trim().toLowerCase() || "unknown"; } catch {}
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const identifier = `${ip}:${username}`.slice(0, 240);
  const throttle = await env.DB.prepare(`SELECT failures,blocked_until FROM login_throttle WHERE identifier=?`).bind(identifier).first<{ failures: number; blocked_until: string | null }>();
  if (throttle?.blocked_until && new Date(throttle.blocked_until).getTime() > Date.now()) return problem(env, request, 429, "Too many login attempts. Try again later.");
  const response = await handlePosApi(request, env, url);
  if (!response) return null;
  if (response.status === 401) {
    const failures = (throttle?.failures ?? 0) + 1;
    const blockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    await env.DB.prepare(`INSERT INTO login_throttle(identifier,failures,blocked_until,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(identifier) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until,updated_at=CURRENT_TIMESTAMP`).bind(identifier, failures, blockedUntil).run();
  } else if (response.ok) await env.DB.prepare(`DELETE FROM login_throttle WHERE identifier=?`).bind(identifier).run();
  return response;
}

async function saveUser(request: Request, env: PosEnv, current: User, userId?: string) {
  if (!canManageUsers(current)) return problem(env, request, 403, "Manager permission required.");
  const data = await body<{ name?: string; username?: string; password?: string; role?: string; active?: boolean }>(request);
  const name = data.name?.trim(), username = data.username?.trim().toLowerCase(), role = data.role as Role | undefined;
  if (!name || !username || !role || !["manager","cashier","waiter"].includes(role)) return problem(env, request, 400, "Invalid user.");
  if (data.password && data.password.length < 8) return problem(env, request, 400, "Password must be at least 8 characters.");
  const uid = userId ?? id("user");
  const coreRole: CoreRole = role === "waiter" ? "cashier" : role as CoreRole;
  if (userId) {
    if (userId === current.id && !data.active) return problem(env, request, 409, "You cannot deactivate your own account.");
    const existing = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(userId).first<{ role: CoreRole }>();
    if (!existing) return problem(env, request, 404, "User not found.");
    if (existing.role === "admin" && current.role !== "admin") return problem(env, request, 403, "Only an admin can modify an admin account.");
    const hash = data.password ? await passwordHash(data.password) : null;
    if (hash) await env.DB.prepare(`UPDATE users SET display_name=?,username=?,role=?,active=?,password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(name,username,coreRole,data.active?1:0,hash,uid).run();
    else await env.DB.prepare(`UPDATE users SET display_name=?,username=?,role=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(name,username,coreRole,data.active?1:0,uid).run();
  } else {
    if (!data.password || data.password.length < 8) return problem(env, request, 400, "Password must be at least 8 characters.");
    await env.DB.prepare(`INSERT INTO users(id,username,password_hash,display_name,role,active) VALUES(?,?,?,?,?,?)`).bind(uid,username,await passwordHash(data.password),name,coreRole,data.active?1:0).run();
  }
  if (role === "waiter") await env.DB.prepare(`INSERT INTO user_service_roles(user_id,service_role,updated_at) VALUES(?,'waiter',CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET service_role='waiter',updated_at=CURRENT_TIMESTAMP`).bind(uid).run();
  else await env.DB.prepare(`DELETE FROM user_service_roles WHERE user_id=?`).bind(uid).run();
  return json(env, request, { id: uid, role }, userId ? 200 : 201);
}

async function deleteUser(request: Request, env: PosEnv, current: User, userId: string) {
  if (!canManageUsers(current)) return problem(env, request, 403, "Manager permission required.");
  if (userId === current.id) return problem(env, request, 409, "You cannot delete your own account.");
  const existing = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(userId).first<{ role: CoreRole }>();
  if (!existing) return problem(env, request, 404, "User not found.");
  if (existing.role === "admin") return problem(env, request, 403, "Admin accounts cannot be deleted here.");
  await env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(userId).run();
  return json(env, request, { id: userId, deleted: true });
}

async function saveTextMenu(request: Request, env: PosEnv, current: User, menuId?: string) {
  if (!(current.role === "admin" || current.role === "manager")) return problem(env, request, 403, "Manager permission required.");
  const data = await body<{ name?: string; description?: string; priceCents?: number; category?: string; available?: boolean; customizable?: boolean }>(request);
  const name = data.name?.trim(), price = Number(data.priceCents);
  if (!name || name.length > 80 || !data.category || !Number.isInteger(price) || price < 0) return problem(env, request, 400, "Invalid menu item.");
  const category = await env.DB.prepare(`SELECT id FROM menu_categories WHERE name=? AND active=1`).bind(data.category).first<{ id: string }>();
  if (!category) return problem(env, request, 400, "Invalid category.");
  const itemId = menuId ?? id("menu");
  if (menuId) await env.DB.prepare(`UPDATE menu_items SET name=?,description=?,price_cents=?,image_key=NULL,image_url=NULL,category_id=?,available=?,customizable=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(name,data.description?.trim()??"",price,category.id,data.available?1:0,data.customizable?1:0,itemId).run();
  else await env.DB.prepare(`INSERT INTO menu_items(id,category_id,name,description,price_cents,image_key,image_url,available,customizable) VALUES(?,?,?,?,?,NULL,NULL,?,?)`).bind(itemId,category.id,name,data.description?.trim()??"",price,data.available?1:0,data.customizable?1:0).run();
  return json(env, request, { id: itemId }, menuId ? 200 : 201);
}

async function factoryReset(request: Request, env: PosEnv, current: User) {
  if (current.role !== "admin") return problem(env, request, 403, "Admin permission required.");
  const data = await body<{ confirmation?: string }>(request);
  if (data.confirmation !== "RESET") return problem(env, request, 400, "Type RESET to confirm.");
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM service_payments`), env.DB.prepare(`DELETE FROM service_check_items`), env.DB.prepare(`DELETE FROM service_checks`),
    env.DB.prepare(`DELETE FROM order_item_addons`), env.DB.prepare(`DELETE FROM payments`), env.DB.prepare(`DELETE FROM inventory_transactions`), env.DB.prepare(`DELETE FROM order_items`), env.DB.prepare(`DELETE FROM orders`),
    env.DB.prepare(`DELETE FROM expenses`), env.DB.prepare(`DELETE FROM reservations`), env.DB.prepare(`DELETE FROM shifts`), env.DB.prepare(`DELETE FROM audit_log`), env.DB.prepare(`DELETE FROM login_throttle`),
    env.DB.prepare(`UPDATE inventory_items SET quantity_base=0,updated_at=CURRENT_TIMESTAMP`), env.DB.prepare(`UPDATE restaurant_tables SET current_guests=0,status='available',updated_at=CURRENT_TIMESTAMP`),
  ]);
  return json(env, request, { reset: true });
}

async function bootstrapWithEffectiveRoles(request: Request, env: PosEnv, url: URL) {
  const response = await handlePosApi(request, env, url);
  if (!response || !response.ok) return response;
  const payload = await response.json() as Record<string, unknown> & { users?: Array<Record<string, unknown>> };
  if (Array.isArray(payload.users) && payload.users.length) {
    const mapped = await env.DB.prepare(`SELECT user_id,service_role FROM user_service_roles`).all<{ user_id: string; service_role: string }>();
    const roleMap = new Map((mapped.results ?? []).map((row) => [row.user_id, row.service_role]));
    payload.users = payload.users.map((entry) => ({ ...entry, role: roleMap.get(String(entry.id)) ?? entry.role }));
  }
  return json(env, request, payload, response.status);
}

export async function handleHardenedPosApi(request: Request, env: PosEnv, url: URL): Promise<Response | null> {
  if (url.pathname === "/api/auth/login" && request.method === "POST") return guardedLogin(request, env, url);
  if (url.pathname === "/api/uploads/menu-image" && request.method === "POST") return problem(env, request, 410, "Menu item images are disabled for this POS.");
  if (url.pathname.startsWith("/api/uploads/menu/") && request.method === "GET") return problem(env, request, 404, "Menu item images are disabled for this POS.");

  const current = request.headers.get("authorization") ? await auth(request, env) : null;
  if (current?.role === "waiter") return problem(env, request, 403, "Waiters must use the table service POS. Cashier and management actions are not permitted.");

  if (url.pathname === "/api/bootstrap" && request.method === "GET") return bootstrapWithEffectiveRoles(request, env, url);

  const userPath = url.pathname.match(/^\/api\/users(?:\/([^/]+))?$/);
  const menuPath = url.pathname.match(/^\/api\/menu-items(?:\/([^/]+))?$/);
  const needsAuth = userPath || menuPath || (url.pathname === "/api/admin/factory-reset" && request.method === "POST");
  if (needsAuth) {
    if (!current) return problem(env, request, 401, "Authentication required.");
    try {
      if (userPath && request.method === "POST" && !userPath[1]) return saveUser(request, env, current);
      if (userPath?.[1] && request.method === "PUT") return saveUser(request, env, current, decodeURIComponent(userPath[1]));
      if (userPath?.[1] && request.method === "DELETE") return deleteUser(request, env, current, decodeURIComponent(userPath[1]));
      if (menuPath && request.method === "POST" && !menuPath[1]) return saveTextMenu(request, env, current);
      if (menuPath?.[1] && request.method === "PUT") return saveTextMenu(request, env, current, decodeURIComponent(menuPath[1]));
      if (url.pathname === "/api/admin/factory-reset" && request.method === "POST") return factoryReset(request, env, current);
    } catch (error) {
      console.error("Backend hardening error", { path: url.pathname, userId: current.id, error: error instanceof Error ? error.message : String(error) });
      return problem(env, request, 400, error instanceof Error ? error.message : "Request failed.");
    }
  }
  return handlePosApi(request, env, url);
}
