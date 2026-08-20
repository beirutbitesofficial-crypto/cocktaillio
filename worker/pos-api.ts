type Statement = ReturnType<D1Database["prepare"]>;

export interface PosEnv {
  DB: D1Database;
  FRONTEND_ORIGIN?: string;
}

type AuthUser = { id: string; username: string; display_name: string; role: "admin" | "manager" | "cashier" };

const encoder = new TextEncoder();
const SESSION_DAYS = 14;

function cors(env: PosEnv, request: Request) {
  const origin = request.headers.get("origin");
  const allowed = (env.FRONTEND_ORIGIN ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const selected = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    ...(selected ? { "access-control-allow-origin": selected, vary: "Origin" } : {}),
    "access-control-allow-headers": "authorization, content-type, idempotency-key",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-max-age": "86400",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  };
}

function json(env: PosEnv, request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(env, request) });
}

function problem(env: PosEnv, request: Request, status: number, error: string) {
  return json(env, request, { error }, status);
}

async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, encoded: string) {
  const [scheme, roundsText, salt, expected] = encoded.split(":");
  const rounds = Number(roundsText);
  if (scheme !== "pbkdf2" || !salt || !expected || rounds < 100_000) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: rounds }, key, 256));
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

async function body<T>(request: Request): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("JSON body required.");
  return request.json() as Promise<T>;
}

async function authenticate(request: Request, env: PosEnv): Promise<AuthUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  return env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.active=1`).bind(await digest(token)).first<AuthUser>();
}

function can(user: AuthUser, roles: AuthUser["role"][]) { return roles.includes(user.role); }
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function cents(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100_000_000) throw new Error("Invalid monetary amount.");
  return parsed;
}

async function login(request: Request, env: PosEnv) {
  let data: { username?: string; password?: string };
  try { data = await body(request); } catch { return problem(env, request, 400, "Invalid login request."); }
  const username = data.username?.trim().toLowerCase() ?? "";
  if (!username || !data.password || data.password.length > 200) return problem(env, request, 400, "Username and password are required.");
  const user = await env.DB.prepare(`SELECT id,username,password_hash,display_name,role,active FROM users WHERE username=?`).bind(username).first<AuthUser & { password_hash: string; active: number }>();
  if (!user || !user.active || !(await verifyPassword(data.password, user.password_hash))) return problem(env, request, 401, "Incorrect username or password.");
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at<=CURRENT_TIMESTAMP`),
    env.DB.prepare(`INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)`).bind(id("session"), user.id, await digest(token), expiresAt),
  ]);
  return json(env, request, { token, expiresAt, user: { id: user.id, username: user.username, name: user.display_name, role: user.role } });
}

async function bootstrap(request: Request, env: PosEnv, user: AuthUser) {
  const [menu, addons, inventory, tables, reservations, expenses, users, shift, metrics, recentOrders] = await Promise.all([
    env.DB.prepare(`SELECT m.id,m.name,m.description,m.price_cents,m.image_url,m.available,m.customizable,c.name category FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE c.active=1 ORDER BY c.sort_order,m.name`).all(),
    env.DB.prepare(`SELECT id,name,price_cents,emoji,available FROM menu_addons ORDER BY name`).all(),
    env.DB.prepare(`SELECT id,name,category,quantity_base,alert_quantity_base,unit_dimension,display_unit,cost_micros_per_base,active FROM inventory_items WHERE active=1 ORDER BY name`).all(),
    env.DB.prepare(`SELECT id,name,capacity,current_guests,status FROM restaurant_tables WHERE active=1 ORDER BY name`).all(),
    env.DB.prepare(`SELECT r.*,t.name table_name FROM reservations r JOIN restaurant_tables t ON t.id=r.table_id WHERE r.status IN ('upcoming','seated') ORDER BY r.starts_at LIMIT 200`).all(),
    env.DB.prepare(`SELECT e.*,u.display_name added_by FROM expenses e JOIN users u ON u.id=e.created_by ORDER BY e.expense_date DESC,e.created_at DESC LIMIT 500`).all(),
    can(user, ["admin", "manager"]) ? env.DB.prepare(`SELECT id,username,display_name,role,active FROM users ORDER BY display_name`).all() : Promise.resolve({ results: [] }),
    env.DB.prepare(`SELECT * FROM shifts WHERE user_id=? AND status='open' ORDER BY opened_at DESC LIMIT 1`).bind(user.id).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='finalized' THEN total_cents ELSE 0 END),0) sales_cents,COUNT(CASE WHEN status='finalized' THEN 1 END) orders,COALESCE(MAX(order_number),0)+1 next_order_number FROM orders`).first(),
    env.DB.prepare(`SELECT o.id,o.order_number,o.order_type,o.total_cents,o.status,o.created_at,u.display_name cashier FROM orders o JOIN users u ON u.id=o.cashier_id ORDER BY o.created_at DESC LIMIT 20`).all(),
  ]);
  return json(env, request, { user: { id: user.id, username: user.username, name: user.display_name, role: user.role }, menu: menu.results, addons: addons.results, inventory: inventory.results, tables: tables.results, reservations: reservations.results, expenses: expenses.results, users: users.results, shift, metrics, recentOrders: recentOrders.results });
}

async function openShift(request: Request, env: PosEnv, user: AuthUser) {
  const data = await body<{ openingCashCents?: number }>(request);
  const opening = cents(data.openingCashCents);
  const existing = await env.DB.prepare(`SELECT id FROM shifts WHERE user_id=? AND status='open'`).bind(user.id).first();
  if (existing) return problem(env, request, 409, "This user already has an open shift.");
  const shiftId = id("shift");
  await env.DB.prepare(`INSERT INTO shifts(id,user_id,opened_at,opening_cash_cents,status) VALUES(?,?,CURRENT_TIMESTAMP,?,'open')`).bind(shiftId, user.id, opening).run();
  return json(env, request, { id: shiftId, openingCashCents: opening }, 201);
}

async function closeShift(request: Request, env: PosEnv, user: AuthUser) {
  const data = await body<{ closingCashCents?: number }>(request);
  const closing = cents(data.closingCashCents);
  const shift = await env.DB.prepare(`SELECT id FROM shifts WHERE user_id=? AND status='open'`).bind(user.id).first<{ id: string }>();
  if (!shift) return problem(env, request, 409, "No active shift.");
  await env.DB.prepare(`UPDATE shifts SET status='closed',closed_at=CURRENT_TIMESTAMP,closing_cash_cents=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`).bind(closing, shift.id).run();
  return json(env, request, { id: shift.id, closingCashCents: closing });
}

type FinalizeInput = { orderType?: string; tableId?: string | null; paymentMethod?: string; cashReceivedCents?: number; customerName?: string; customerPhone?: string; deliveryAddress?: string; driverName?: string; items?: { menuItemId?: string; quantity?: number; addonIds?: string[] }[] };

async function finalizeOrder(request: Request, env: PosEnv, user: AuthUser) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 16 || key.length > 100) return problem(env, request, 400, "A valid idempotency key is required.");
  const duplicate = await env.DB.prepare(`SELECT o.id,o.order_number,o.total_cents FROM audit_log a JOIN orders o ON o.id=a.entity_id WHERE a.action='order.finalized' AND json_extract(a.metadata_json,'$.idempotencyKey')=?`).bind(key).first();
  if (duplicate) return json(env, request, { order: duplicate, duplicate: true });
  const data = await body<FinalizeInput>(request);
  if (!['dine_in','takeaway','delivery'].includes(data.orderType ?? '') || !['cash','card','online'].includes(data.paymentMethod ?? '') || !data.items?.length || data.items.length > 100) return problem(env, request, 400, "Invalid order.");
  const shift = await env.DB.prepare(`SELECT id FROM shifts WHERE user_id=? AND status='open'`).bind(user.id).first<{ id: string }>();
  if (!shift) return problem(env, request, 409, "Open a shift before taking orders.");
  const quantities = new Map<string, number>();
  for (const line of data.items) {
    const quantity = Number(line.quantity);
    if (!line.menuItemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return problem(env, request, 400, "Invalid order quantity.");
    quantities.set(line.menuItemId, (quantities.get(line.menuItemId) ?? 0) + quantity);
  }
  const menuRows = await Promise.all([...quantities.keys()].map((menuId) => env.DB.prepare(`SELECT id,name,price_cents,available FROM menu_items WHERE id=?`).bind(menuId).first<{ id: string; name: string; price_cents: number; available: number }>()));
  if (menuRows.some((row) => !row?.available)) return problem(env, request, 409, "One or more menu items are unavailable.");
  const menuMap = new Map(menuRows.map((row) => [row!.id, row!]));
  const orderId = id("order");
  const orderNumberRow = await env.DB.prepare(`SELECT COALESCE(MAX(order_number),0)+1 number FROM orders`).first<{ number: number }>();
  const orderNumber = orderNumberRow?.number ?? 1;
  const statements: Statement[] = [];
  let total = 0;
  const consumption = new Map<string, { amount: number; menuItemId: string; orderItemId: string }>();
  const lineRows: { id: string; menuItemId: string; name: string; quantity: number; unitPrice: number; lineTotal: number }[] = [];
  for (const input of data.items) {
    const item = menuMap.get(input.menuItemId!)!;
    const addonIds = [...new Set(input.addonIds ?? [])].slice(0, 30);
    const addons = await Promise.all(addonIds.map((addonId) => env.DB.prepare(`SELECT id,name,price_cents FROM menu_addons WHERE id=? AND available=1`).bind(addonId).first<{ id: string; name: string; price_cents: number }>()));
    if (addons.some((addon) => !addon)) return problem(env, request, 409, "One or more add-ons are unavailable.");
    const unitPrice = item.price_cents + addons.reduce((sum, addon) => sum + addon!.price_cents, 0);
    const lineTotal = unitPrice * input.quantity!;
    total += lineTotal;
    const orderItemId = id("line");
    lineRows.push({ id: orderItemId, menuItemId: item.id, name: item.name, quantity: input.quantity!, unitPrice, lineTotal });
    for (const addon of addons) statements.push(env.DB.prepare(`INSERT INTO order_item_addons(id,order_item_id,addon_id,name_snapshot,price_cents_snapshot) VALUES(?,?,?,?,?)`).bind(id("addon"), orderItemId, addon!.id, addon!.name, addon!.price_cents));
    const recipes = await env.DB.prepare(`SELECT inventory_item_id,quantity_base FROM recipes WHERE menu_item_id=?`).bind(item.id).all<{ inventory_item_id: string; quantity_base: number }>();
    for (const recipe of recipes.results ?? []) {
      const used = recipe.quantity_base * input.quantity!;
      const current = consumption.get(recipe.inventory_item_id);
      consumption.set(recipe.inventory_item_id, { amount: (current?.amount ?? 0) + used, menuItemId: item.id, orderItemId });
    }
  }
  if (data.paymentMethod === 'cash' && cents(data.cashReceivedCents ?? 0) < total) return problem(env, request, 409, "Cash received is below the order total.");
  for (const [inventoryId, used] of consumption) {
    const inventory = await env.DB.prepare(`SELECT quantity_base,display_unit FROM inventory_items WHERE id=? AND active=1`).bind(inventoryId).first<{ quantity_base: number; display_unit: string }>();
    if (!inventory || inventory.quantity_base < used.amount) return problem(env, request, 409, "Insufficient inventory for this order.");
    statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity_base=quantity_base-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND quantity_base>=?`).bind(used.amount, inventoryId, used.amount));
    statements.push(env.DB.prepare(`INSERT INTO inventory_transactions(id,idempotency_key,inventory_item_id,quantity_before_base,quantity_changed_base,quantity_after_base,transaction_type,reason,order_id,order_item_id,menu_item_id,user_id) VALUES(?,?,?,?,?,?,'sale_consumption','Finalized order',?,?,?,?,?)`).bind(id("txn"), `${key}:${inventoryId}`, inventoryId, inventory.quantity_base, -used.amount, inventory.quantity_base-used.amount, orderId, used.orderItemId, used.menuItemId, user.id));
  }
  statements.unshift(env.DB.prepare(`INSERT INTO orders(id,order_number,status,order_type,table_id,shift_id,cashier_id,customer_name,customer_phone,delivery_address,driver_name,subtotal_cents,tax_cents,total_cents,finalized_at) VALUES(?,?,'finalized',?,?,?,?,?,?,?,?,?,0,?,CURRENT_TIMESTAMP)`).bind(orderId, orderNumber, data.orderType, data.tableId ?? null, shift.id, user.id, data.customerName?.trim() || null, data.customerPhone?.trim() || null, data.deliveryAddress?.trim() || null, data.driverName?.trim() || null, total, total));
  for (const line of lineRows) statements.push(env.DB.prepare(`INSERT INTO order_items(id,order_id,menu_item_id,item_name_snapshot,quantity,unit_price_cents,line_total_cents) VALUES(?,?,?,?,?,?,?)`).bind(line.id, orderId, line.menuItemId, line.name, line.quantity, line.unitPrice, line.lineTotal));
  statements.push(env.DB.prepare(`INSERT INTO payments(id,order_id,method,amount_cents,status) VALUES(?,?,?,?,'captured')`).bind(id("payment"), orderId, data.paymentMethod, total));
  statements.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,'order.finalized','order',?,?)`).bind(id("audit"), user.id, orderId, JSON.stringify({ idempotencyKey: key })));
  if (data.orderType === 'dine_in' && data.tableId) statements.push(env.DB.prepare(`UPDATE restaurant_tables SET status='occupied',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(data.tableId));
  await env.DB.batch(statements);
  return json(env, request, { order: { id: orderId, orderNumber, totalCents: total }, duplicate: false }, 201);
}

async function addExpense(request: Request, env: PosEnv, user: AuthUser) {
  if (!can(user, ["admin", "manager"])) return problem(env, request, 403, "Manager permission required.");
  const data = await body<{ description?: string; category?: string; amountCents?: number; paidFrom?: string; expenseDate?: string }>(request);
  const description = data.description?.trim();
  const amount = cents(data.amountCents);
  if (!description || description.length > 200 || !data.category || !['cash_drawer','owner'].includes(data.paidFrom ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(data.expenseDate ?? '') || amount < 1) return problem(env, request, 400, "Invalid expense.");
  let shiftId: string | null = null;
  if (data.paidFrom === 'cash_drawer') {
    const shift = await env.DB.prepare(`SELECT id FROM shifts WHERE user_id=? AND status='open'`).bind(user.id).first<{ id: string }>();
    if (!shift) return problem(env, request, 409, "Open a shift before recording a cash-drawer expense.");
    shiftId = shift.id;
  }
  const expenseId = id("expense");
  await env.DB.prepare(`INSERT INTO expenses(id,description,category,amount_cents,paid_from,shift_id,expense_date,created_by) VALUES(?,?,?,?,?,?,?,?)`).bind(expenseId, description, data.category, amount, data.paidFrom, shiftId, data.expenseDate, user.id).run();
  return json(env, request, { id: expenseId }, 201);
}

async function updateTable(request: Request, env: PosEnv, user: AuthUser, tableId: string) {
  const data = await body<{ capacity?: number; currentGuests?: number; status?: string }>(request);
  const capacity = Number(data.capacity), guests = Number(data.currentGuests);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100 || !Number.isInteger(guests) || guests < 0 || guests > capacity || !['available','occupied','reserved'].includes(data.status ?? '')) return problem(env, request, 400, "Guest count and capacity are invalid.");
  const result = await env.DB.prepare(`UPDATE restaurant_tables SET capacity=?,current_guests=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND active=1`).bind(capacity, guests, data.status, tableId).run();
  if (!result.meta.changes) return problem(env, request, 404, "Table not found.");
  return json(env, request, { id: tableId, capacity, currentGuests: guests, status: data.status });
}

async function createReservation(request: Request, env: PosEnv, user: AuthUser) {
  const data = await body<{ customerName?: string; guestCount?: number; tableId?: string; startsAt?: string; phone?: string; notes?: string }>(request);
  const guests = Number(data.guestCount), customer = data.customerName?.trim();
  const start = data.startsAt ? new Date(data.startsAt) : null;
  if (!customer || customer.length > 100 || !Number.isInteger(guests) || guests < 1 || !data.tableId || !start || Number.isNaN(start.valueOf())) return problem(env, request, 400, "Invalid reservation.");
  const table = await env.DB.prepare(`SELECT capacity FROM restaurant_tables WHERE id=? AND active=1`).bind(data.tableId).first<{ capacity: number }>();
  if (!table) return problem(env, request, 404, "Table not found.");
  if (guests > table.capacity) return problem(env, request, 409, "Table capacity is insufficient.");
  const startsAt = start.toISOString(), endsAt = new Date(start.valueOf() + 2 * 60 * 60 * 1000).toISOString();
  const conflict = await env.DB.prepare(`SELECT id FROM reservations WHERE table_id=? AND status IN ('upcoming','seated') AND starts_at<? AND ends_at>? LIMIT 1`).bind(data.tableId, endsAt, startsAt).first();
  if (conflict) return problem(env, request, 409, "This table has a conflicting reservation.");
  const reservationId = id("reservation");
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO reservations(id,customer_name,guest_count,table_id,starts_at,ends_at,phone,notes,status,created_by) VALUES(?,?,?,?,?,?,?,?, 'upcoming',?)`).bind(reservationId, customer, guests, data.tableId, startsAt, endsAt, data.phone?.trim() || null, data.notes?.trim() || null, user.id),
    env.DB.prepare(`UPDATE restaurant_tables SET status=CASE WHEN status='available' THEN 'reserved' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(data.tableId),
  ]);
  return json(env, request, { id: reservationId, startsAt, endsAt }, 201);
}

async function seatReservation(request: Request, env: PosEnv, user: AuthUser, reservationId: string) {
  const reservation = await env.DB.prepare(`SELECT id,table_id,guest_count,status FROM reservations WHERE id=?`).bind(reservationId).first<{ id: string; table_id: string; guest_count: number; status: string }>();
  if (!reservation) return problem(env, request, 404, "Reservation not found.");
  if (reservation.status !== 'upcoming') return problem(env, request, 409, "Only upcoming reservations can be seated.");
  const table = await env.DB.prepare(`SELECT capacity FROM restaurant_tables WHERE id=?`).bind(reservation.table_id).first<{ capacity: number }>();
  if (!table || reservation.guest_count > table.capacity) return problem(env, request, 409, "Table capacity is insufficient.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE reservations SET status='seated',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='upcoming'`).bind(reservationId),
    env.DB.prepare(`UPDATE restaurant_tables SET status='occupied',current_guests=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(reservation.guest_count, reservation.table_id),
    env.DB.prepare(`INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id) VALUES(?,?,'reservation.seated','reservation',?)`).bind(id("audit"), user.id, reservationId),
  ]);
  return json(env, request, { id: reservationId, status: 'seated' });
}

async function factoryReset(request: Request, env: PosEnv, user: AuthUser) {
  if (user.role !== 'admin') return problem(env, request, 403, "Admin permission required.");
  const data = await body<{ confirmation?: string }>(request);
  if (data.confirmation !== 'RESET') return problem(env, request, 400, "Type RESET to confirm.");
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM order_item_addons`), env.DB.prepare(`DELETE FROM payments`), env.DB.prepare(`DELETE FROM inventory_transactions`), env.DB.prepare(`DELETE FROM order_items`), env.DB.prepare(`DELETE FROM orders`), env.DB.prepare(`DELETE FROM expenses`), env.DB.prepare(`DELETE FROM reservations`), env.DB.prepare(`DELETE FROM shifts`), env.DB.prepare(`DELETE FROM audit_log`),
    env.DB.prepare(`UPDATE inventory_items SET quantity_base=0,updated_at=CURRENT_TIMESTAMP`), env.DB.prepare(`UPDATE restaurant_tables SET current_guests=0,status='available',updated_at=CURRENT_TIMESTAMP`),
  ]);
  return json(env, request, { reset: true });
}

export async function handlePosApi(request: Request, env: PosEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/')) return null;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, request) });
  if (url.pathname === '/api/health') return json(env, request, { ok: true, database: 'd1' });
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    try { return await login(request, env); }
    catch (error) { console.error('Login failed', error); return problem(env, request, 500, 'Login service is temporarily unavailable.'); }
  }
  const user = await authenticate(request, env);
  if (!user) return problem(env, request, 401, 'Authentication required.');
  try {
    if (url.pathname === '/api/bootstrap' && request.method === 'GET') return bootstrap(request, env, user);
    if (url.pathname === '/api/shifts/open' && request.method === 'POST') return openShift(request, env, user);
    if (url.pathname === '/api/shifts/close' && request.method === 'POST') return closeShift(request, env, user);
    if (url.pathname === '/api/orders/finalize' && request.method === 'POST') return finalizeOrder(request, env, user);
    if (url.pathname === '/api/expenses' && request.method === 'POST') return addExpense(request, env, user);
    const tableMatch = url.pathname.match(/^\/api\/tables\/([^/]+)$/);
    if (tableMatch && request.method === 'PUT') return updateTable(request, env, user, decodeURIComponent(tableMatch[1]));
    if (url.pathname === '/api/reservations' && request.method === 'POST') return createReservation(request, env, user);
    const seatMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)\/seat$/);
    if (seatMatch && request.method === 'POST') return seatReservation(request, env, user, decodeURIComponent(seatMatch[1]));
    if (url.pathname === '/api/admin/factory-reset' && request.method === 'POST') return factoryReset(request, env, user);
    return problem(env, request, 404, 'API endpoint not found.');
  } catch (error) {
    console.error('POS API error', { path: url.pathname, userId: user.id, error: error instanceof Error ? error.message : String(error) });
    return problem(env, request, 400, error instanceof Error ? error.message : 'Request failed.');
  }
}
