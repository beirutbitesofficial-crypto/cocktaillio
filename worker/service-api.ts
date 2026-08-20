export interface ServiceEnv {
  DB: D1Database;
  FRONTEND_ORIGIN?: string;
}

type ServiceRole = "admin" | "manager" | "cashier" | "waiter";
type ServiceUser = { id: string; username: string; display_name: string; role: ServiceRole };
type Statement = ReturnType<D1Database["prepare"]>;
const encoder = new TextEncoder();

function cors(env: ServiceEnv, request: Request) {
  const origin = request.headers.get("origin");
  const allowed = (env.FRONTEND_ORIGIN ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  const selected = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    ...(selected ? { "access-control-allow-origin": selected, vary: "Origin" } : {}),
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  };
}
function json(env: ServiceEnv, request: Request, payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: cors(env, request) }); }
function problem(env: ServiceEnv, request: Request, status: number, error: string) { return json(env, request, { error }, status); }
async function digest(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function auth(request: Request, env: ServiceEnv): Promise<ServiceUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  return env.DB.prepare(`SELECT u.id,u.username,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>CURRENT_TIMESTAMP AND u.active=1`).bind(await digest(token)).first<ServiceUser>();
}
function id(prefix: string) { return `${prefix}-${crypto.randomUUID()}`; }
function allowed(user: ServiceUser, roles: ServiceRole[]) { return roles.includes(user.role); }
async function body<T>(request: Request): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("JSON body required.");
  return request.json() as Promise<T>;
}

async function bootstrap(request: Request, env: ServiceEnv, user: ServiceUser) {
  const [tables, menu, checks] = await Promise.all([
    env.DB.prepare(`SELECT id,name,capacity,current_guests,status FROM restaurant_tables WHERE active=1 ORDER BY name`).all(),
    env.DB.prepare(`SELECT m.id,m.name,m.price_cents,c.name category FROM menu_items m JOIN menu_categories c ON c.id=m.category_id WHERE m.available=1 AND c.active=1 ORDER BY c.sort_order,m.name`).all(),
    env.DB.prepare(`SELECT sc.id,sc.table_id,sc.opened_by,sc.subtotal_cents,sc.opened_at,u.display_name opened_by_name,t.name table_name FROM service_checks sc JOIN users u ON u.id=sc.opened_by JOIN restaurant_tables t ON t.id=sc.table_id WHERE sc.status='open' ORDER BY sc.opened_at`).all(),
  ]);
  const detailed = [];
  for (const check of checks.results as Array<Record<string, unknown>>) {
    const items = await env.DB.prepare(`SELECT id,menu_item_id,name_snapshot,unit_price_cents,quantity,line_total_cents FROM service_check_items WHERE check_id=? ORDER BY created_at`).bind(check.id).all();
    detailed.push({ ...check, items: items.results });
  }
  return json(env, request, { user: { id: user.id, username: user.username, name: user.display_name, role: user.role }, tables: tables.results, menu: menu.results, checks: detailed });
}

async function saveCheck(request: Request, env: ServiceEnv, user: ServiceUser) {
  if (!allowed(user, ["waiter", "cashier", "manager", "admin"])) return problem(env, request, 403, "Table ordering permission required.");
  const data = await body<{ tableId?: string; items?: Array<{ menuItemId?: string; quantity?: number }> }>(request);
  if (!data.tableId || !Array.isArray(data.items) || !data.items.length || data.items.length > 100) return problem(env, request, 400, "Choose a table and at least one item.");
  const table = await env.DB.prepare(`SELECT id FROM restaurant_tables WHERE id=? AND active=1`).bind(data.tableId).first();
  if (!table) return problem(env, request, 404, "Table not found.");

  const normalized = new Map<string, number>();
  for (const line of data.items) {
    const qty = Number(line.quantity);
    if (!line.menuItemId || !Number.isInteger(qty) || qty < 1 || qty > 100) return problem(env, request, 400, "Invalid item quantity.");
    normalized.set(line.menuItemId, (normalized.get(line.menuItemId) ?? 0) + qty);
  }
  const menuRows = await Promise.all([...normalized.keys()].map((menuId) => env.DB.prepare(`SELECT id,name,price_cents,available FROM menu_items WHERE id=?`).bind(menuId).first<{ id: string; name: string; price_cents: number; available: number }>()))
  if (menuRows.some((row) => !row || !row.available)) return problem(env, request, 409, "One or more menu items are unavailable.");

  const existingCheck = await env.DB.prepare(`SELECT id FROM service_checks WHERE table_id=? AND status='open'`).bind(data.tableId).first<{ id: string }>();
  const checkId = existingCheck?.id ?? id("check");
  const statements: Statement[] = [];
  if (!existingCheck) statements.push(env.DB.prepare(`INSERT INTO service_checks(id,table_id,opened_by,status,subtotal_cents) VALUES(?,?,?,'open',0)`).bind(checkId, data.tableId, user.id));

  for (const row of menuRows) {
    const qty = normalized.get(row!.id)!;
    const existing = await env.DB.prepare(`SELECT id,quantity FROM service_check_items WHERE check_id=? AND menu_item_id=?`).bind(checkId, row!.id).first<{ id: string; quantity: number }>();
    if (existing) {
      const nextQty = existing.quantity + qty;
      statements.push(env.DB.prepare(`UPDATE service_check_items SET quantity=?,line_total_cents=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(nextQty, nextQty * row!.price_cents, existing.id));
    } else {
      statements.push(env.DB.prepare(`INSERT INTO service_check_items(id,check_id,menu_item_id,name_snapshot,unit_price_cents,quantity,line_total_cents) VALUES(?,?,?,?,?,?,?)`).bind(id("svc-line"), checkId, row!.id, row!.name, row!.price_cents, qty, row!.price_cents * qty));
    }
  }
  statements.push(env.DB.prepare(`UPDATE service_checks SET subtotal_cents=(SELECT COALESCE(SUM(line_total_cents),0) FROM service_check_items WHERE check_id=?),updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(checkId, checkId));
  statements.push(env.DB.prepare(`UPDATE restaurant_tables SET status='occupied',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(data.tableId));
  await env.DB.batch(statements);
  return json(env, request, { id: checkId }, existingCheck ? 200 : 201);
}

async function replaceItem(request: Request, env: ServiceEnv, user: ServiceUser, checkId: string, itemId: string) {
  if (!allowed(user, ["waiter", "cashier", "manager", "admin"])) return problem(env, request, 403, "Table ordering permission required.");
  const data = await body<{ quantity?: number }>(request);
  const qty = Number(data.quantity);
  if (!Number.isInteger(qty) || qty < 0 || qty > 100) return problem(env, request, 400, "Invalid quantity.");
  const check = await env.DB.prepare(`SELECT table_id FROM service_checks WHERE id=? AND status='open'`).bind(checkId).first<{ table_id: string }>();
  if (!check) return problem(env, request, 404, "Open table order not found.");
  if (qty === 0) await env.DB.prepare(`DELETE FROM service_check_items WHERE id=? AND check_id=?`).bind(itemId, checkId).run();
  else {
    const line = await env.DB.prepare(`SELECT unit_price_cents FROM service_check_items WHERE id=? AND check_id=?`).bind(itemId, checkId).first<{ unit_price_cents: number }>();
    if (!line) return problem(env, request, 404, "Item not found.");
    await env.DB.prepare(`UPDATE service_check_items SET quantity=?,line_total_cents=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(qty, qty * line.unit_price_cents, itemId).run();
  }
  const total = await env.DB.prepare(`SELECT COALESCE(SUM(line_total_cents),0) total FROM service_check_items WHERE check_id=?`).bind(checkId).first<{ total: number }>();
  await env.DB.prepare(`UPDATE service_checks SET subtotal_cents=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(total?.total ?? 0, checkId).run();
  return json(env, request, { ok: true, subtotalCents: total?.total ?? 0 });
}

async function transferCheck(request: Request, env: ServiceEnv, user: ServiceUser, checkId: string) {
  if (!allowed(user, ["waiter", "cashier", "manager", "admin"])) return problem(env, request, 403, "Table transfer permission required.");
  const data = await body<{ destinationTableId?: string }>(request);
  if (!data.destinationTableId) return problem(env, request, 400, "Destination table is required.");
  const check = await env.DB.prepare(`SELECT table_id FROM service_checks WHERE id=? AND status='open'`).bind(checkId).first<{ table_id: string }>();
  if (!check) return problem(env, request, 404, "Open table order not found.");
  if (check.table_id === data.destinationTableId) return problem(env, request, 409, "Order is already on this table.");
  const destination = await env.DB.prepare(`SELECT id FROM restaurant_tables WHERE id=? AND active=1`).bind(data.destinationTableId).first();
  if (!destination) return problem(env, request, 404, "Destination table not found.");
  const busy = await env.DB.prepare(`SELECT id FROM service_checks WHERE table_id=? AND status='open'`).bind(data.destinationTableId).first();
  if (busy) return problem(env, request, 409, "Destination table already has an open order.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE service_checks SET table_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`).bind(data.destinationTableId, checkId),
    env.DB.prepare(`UPDATE restaurant_tables SET status='available',current_guests=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(check.table_id),
    env.DB.prepare(`UPDATE restaurant_tables SET status='occupied',updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(data.destinationTableId),
    env.DB.prepare(`INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,'service_check.transferred','service_check',?,?)`).bind(id("audit"), user.id, checkId, JSON.stringify({ fromTableId: check.table_id, toTableId: data.destinationTableId })),
  ]);
  return json(env, request, { id: checkId, tableId: data.destinationTableId });
}

async function checkout(request: Request, env: ServiceEnv, user: ServiceUser, checkId: string) {
  if (!allowed(user, ["cashier", "manager", "admin"])) return problem(env, request, 403, "Only cashier or management can take payment and issue receipts.");
  const data = await body<{ usdCents?: number; lbpAmount?: number; exchangeRateLbpPerUsd?: number }>(request);
  const usdCents = Number(data.usdCents ?? 0), lbpAmount = Number(data.lbpAmount ?? 0), rate = Number(data.exchangeRateLbpPerUsd ?? 0);
  if (![usdCents, lbpAmount, rate].every(Number.isInteger) || usdCents < 0 || lbpAmount < 0 || (lbpAmount > 0 && rate <= 0)) return problem(env, request, 400, "Invalid payment amounts or exchange rate.");
  if (usdCents === 0 && lbpAmount === 0) return problem(env, request, 400, "Enter a payment amount.");

  const check = await env.DB.prepare(`SELECT id,table_id,subtotal_cents FROM service_checks WHERE id=? AND status='open'`).bind(checkId).first<{ id: string; table_id: string; subtotal_cents: number }>();
  if (!check) return problem(env, request, 404, "Open table order not found.");
  const items = await env.DB.prepare(`SELECT id,menu_item_id,name_snapshot,unit_price_cents,quantity,line_total_cents FROM service_check_items WHERE check_id=?`).bind(checkId).all<{ id: string; menu_item_id: string; name_snapshot: string; unit_price_cents: number; quantity: number; line_total_cents: number }>();
  if (!items.results?.length) return problem(env, request, 409, "Order is empty.");

  const lbpUsdCents = lbpAmount > 0 ? Math.round((lbpAmount / rate) * 100) : 0;
  const paidUsdCents = usdCents + lbpUsdCents;
  if (paidUsdCents < check.subtotal_cents) return problem(env, request, 409, "Payment is below the order total.");
  const shift = await env.DB.prepare(`SELECT id FROM shifts WHERE user_id=? AND status='open' ORDER BY opened_at DESC LIMIT 1`).bind(user.id).first<{ id: string }>();
  if (!shift) return problem(env, request, 409, "Cashier must open a shift before checkout.");

  type Consumption = { inventoryId: string; before: number; used: number; menuItemId: string };
  const consumption = new Map<string, Consumption>();
  for (const line of items.results) {
    const recipes = await env.DB.prepare(`SELECT inventory_item_id,quantity_base FROM recipes WHERE menu_item_id=?`).bind(line.menu_item_id).all<{ inventory_item_id: string; quantity_base: number }>();
    for (const recipe of recipes.results ?? []) {
      const used = recipe.quantity_base * line.quantity;
      const current = consumption.get(recipe.inventory_item_id);
      if (current) current.used += used;
      else {
        const inventory = await env.DB.prepare(`SELECT quantity_base FROM inventory_items WHERE id=? AND active=1`).bind(recipe.inventory_item_id).first<{ quantity_base: number }>();
        if (!inventory) return problem(env, request, 409, `Inventory item required by ${line.name_snapshot} is unavailable.`);
        consumption.set(recipe.inventory_item_id, { inventoryId: recipe.inventory_item_id, before: inventory.quantity_base, used, menuItemId: line.menu_item_id });
      }
    }
  }
  for (const entry of consumption.values()) if (entry.before < entry.used) return problem(env, request, 409, "Insufficient inventory for this order.");

  const orderId = id("order");
  const orderNumberRow = await env.DB.prepare(`SELECT COALESCE(MAX(order_number),0)+1 number FROM orders`).first<{ number: number }>();
  const orderNumber = orderNumberRow?.number ?? 1;
  const statements: Statement[] = [];
  statements.push(env.DB.prepare(`INSERT INTO orders(id,order_number,status,order_type,table_id,shift_id,cashier_id,subtotal_cents,tax_cents,total_cents,finalized_at) VALUES(?,?,'finalized','dine_in',?,?,?, ?,0,?,CURRENT_TIMESTAMP)`).bind(orderId, orderNumber, check.table_id, shift.id, user.id, check.subtotal_cents, check.subtotal_cents));
  for (const line of items.results) statements.push(env.DB.prepare(`INSERT INTO order_items(id,order_id,menu_item_id,item_name_snapshot,quantity,unit_price_cents,line_total_cents) VALUES(?,?,?,?,?,?,?)`).bind(line.id, orderId, line.menu_item_id, line.name_snapshot, line.quantity, line.unit_price_cents, line.line_total_cents));
  for (const entry of consumption.values()) {
    statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity_base=quantity_base-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND quantity_base>=?`).bind(entry.used, entry.inventoryId, entry.used));
    statements.push(env.DB.prepare(`INSERT INTO inventory_transactions(id,idempotency_key,inventory_item_id,quantity_before_base,quantity_changed_base,quantity_after_base,transaction_type,reason,order_id,order_item_id,menu_item_id,user_id) VALUES(?,?,?,?,?,?,'sale_consumption','Table service checkout',?,NULL,?,?)`).bind(id("txn"), `${checkId}:${entry.inventoryId}`, entry.inventoryId, entry.before, -entry.used, entry.before-entry.used, orderId, entry.menuItemId, user.id));
  }
  statements.push(env.DB.prepare(`INSERT INTO payments(id,order_id,method,amount_cents,status) VALUES(?,?,'cash',?,'captured')`).bind(id("payment"), orderId, check.subtotal_cents));
  if (usdCents > 0) statements.push(env.DB.prepare(`INSERT INTO service_payments(id,check_id,currency,amount_minor,usd_equivalent_cents,exchange_rate_lbp_per_usd,received_by) VALUES(?,?,'USD',?,?,NULL,?)`).bind(id("svc-pay"), checkId, usdCents, usdCents, user.id));
  if (lbpAmount > 0) statements.push(env.DB.prepare(`INSERT INTO service_payments(id,check_id,currency,amount_minor,usd_equivalent_cents,exchange_rate_lbp_per_usd,received_by) VALUES(?,?,'LBP',?,?,?,?)`).bind(id("svc-pay"), checkId, lbpAmount, lbpUsdCents, rate, user.id));
  statements.push(env.DB.prepare(`UPDATE service_checks SET status='paid',closed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='open'`).bind(checkId));
  statements.push(env.DB.prepare(`UPDATE restaurant_tables SET status='available',current_guests=0,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(check.table_id));
  statements.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_user_id,action,entity_type,entity_id,metadata_json) VALUES(?,?,'service_check.paid','order',?,?)`).bind(id("audit"), user.id, orderId, JSON.stringify({ checkId, usdCents, lbpAmount, exchangeRateLbpPerUsd: rate || null, changeUsdCents: paidUsdCents - check.subtotal_cents })));
  await env.DB.batch(statements);

  return json(env, request, { receipt: { orderId, orderNumber, tableId: check.table_id, totalCents: check.subtotal_cents, usdPaidCents: usdCents, lbpPaid: lbpAmount, exchangeRateLbpPerUsd: rate || null, changeUsdCents: paidUsdCents - check.subtotal_cents, cashier: user.display_name, items: items.results } }, 201);
}

export async function handleServiceApi(request: Request, env: ServiceEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith("/api/service/")) return null;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, request) });
  const user = await auth(request, env);
  if (!user) return problem(env, request, 401, "Authentication required.");
  try {
    if (url.pathname === "/api/service/bootstrap" && request.method === "GET") return bootstrap(request, env, user);
    if (url.pathname === "/api/service/checks" && request.method === "POST") return saveCheck(request, env, user);
    const itemMatch = url.pathname.match(/^\/api\/service\/checks\/([^/]+)\/items\/([^/]+)$/);
    if (itemMatch && request.method === "PUT") return replaceItem(request, env, user, decodeURIComponent(itemMatch[1]), decodeURIComponent(itemMatch[2]));
    const transferMatch = url.pathname.match(/^\/api\/service\/checks\/([^/]+)\/transfer$/);
    if (transferMatch && request.method === "POST") return transferCheck(request, env, user, decodeURIComponent(transferMatch[1]));
    const checkoutMatch = url.pathname.match(/^\/api\/service\/checks\/([^/]+)\/checkout$/);
    if (checkoutMatch && request.method === "POST") return checkout(request, env, user, decodeURIComponent(checkoutMatch[1]));
    return problem(env, request, 404, "Service endpoint not found.");
  } catch (error) {
    console.error("Service API error", { path: url.pathname, userId: user.id, error: error instanceof Error ? error.message : String(error) });
    return problem(env, request, 400, error instanceof Error ? error.message : "Request failed.");
  }
}
