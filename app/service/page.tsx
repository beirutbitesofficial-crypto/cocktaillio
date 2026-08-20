"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "admin" | "manager" | "cashier" | "waiter";
type User = { id: string; username: string; name: string; role: Role };
type Table = { id: string; name: string; capacity: number; current_guests: number; status: string };
type MenuItem = { id: string; name: string; price_cents: number; category: string };
type CheckItem = { id: string; menu_item_id: string; name_snapshot: string; unit_price_cents: number; quantity: number; line_total_cents: number };
type Check = { id: string; table_id: string; table_name: string; opened_by: string; opened_by_name: string; subtotal_cents: number; items: CheckItem[] };
type Boot = { user: User; tables: Table[]; menu: MenuItem[]; checks: Check[] };
type Receipt = { orderNumber: number; tableId: string; totalCents: number; usdPaidCents: number; lbpPaid: number; exchangeRateLbpPerUsd: number | null; changeUsdCents: number; cashier: string; items: CheckItem[] };

const TOKEN_KEY = "cocktaillio-session";
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export default function ServicePage() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [transferTo, setTransferTo] = useState("");
  const [usd, setUsd] = useState("");
  const [lbp, setLbp] = useState("");
  const [rate, setRate] = useState("89500");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = async () => {
    try {
      const data = await request<Boot>("/api/service/bootstrap");
      setBoot(data);
      setError("");
      if (!selectedTableId && data.tables[0]) setSelectedTableId(data.tables[0].id);
      if (!category && data.menu[0]) setCategory(data.menu[0].category);
    } catch (e) {
      setBoot(null);
      if (localStorage.getItem(TOKEN_KEY)) setError(e instanceof Error ? e.message : "Could not load service POS.");
    }
  };

  useEffect(() => { void load(); }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request<{ token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      localStorage.setItem(TOKEN_KEY, data.token);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Login failed."); }
    finally { setBusy(false); }
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setBoot(null); setUsername(""); setPassword(""); };
  const categories = useMemo(() => [...new Set(boot?.menu.map((item) => item.category) ?? [])], [boot]);
  const filteredMenu = useMemo(() => boot?.menu.filter((item) => item.category === category) ?? [], [boot, category]);
  const selectedCheck = boot?.checks.find((check) => check.table_id === selectedTableId) ?? null;
  const selectedTable = boot?.tables.find((table) => table.id === selectedTableId) ?? null;
  const canCheckout = boot ? boot.user.role !== "waiter" : false;

  const addToCart = (menuId: string) => setCart((old) => ({ ...old, [menuId]: (old[menuId] ?? 0) + 1 }));
  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const sendOrder = async () => {
    if (!selectedTableId || !cartCount) return;
    setBusy(true); setError("");
    try {
      await request("/api/service/checks", { method: "POST", body: JSON.stringify({ tableId: selectedTableId, items: Object.entries(cart).map(([menuItemId, quantity]) => ({ menuItemId, quantity })) }) });
      setCart({}); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send order."); }
    finally { setBusy(false); }
  };

  const setLineQty = async (checkId: string, itemId: string, quantity: number) => {
    setBusy(true); setError("");
    try {
      await request(`/api/service/checks/${encodeURIComponent(checkId)}/items/${encodeURIComponent(itemId)}`, { method: "PUT", body: JSON.stringify({ quantity }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update item."); }
    finally { setBusy(false); }
  };

  const transfer = async () => {
    if (!selectedCheck || !transferTo) return;
    setBusy(true); setError("");
    try {
      await request(`/api/service/checks/${encodeURIComponent(selectedCheck.id)}/transfer`, { method: "POST", body: JSON.stringify({ destinationTableId: transferTo }) });
      setSelectedTableId(transferTo); setTransferTo(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not transfer order."); }
    finally { setBusy(false); }
  };

  const checkout = async () => {
    if (!selectedCheck || !canCheckout) return;
    setBusy(true); setError("");
    try {
      const result = await request<{ receipt: Receipt }>(`/api/service/checks/${encodeURIComponent(selectedCheck.id)}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          usdCents: Math.round(Number(usd || 0) * 100),
          lbpAmount: Math.round(Number(lbp || 0)),
          exchangeRateLbpPerUsd: Math.round(Number(rate || 0)),
        }),
      });
      setReceipt(result.receipt); setUsd(""); setLbp(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout failed."); }
    finally { setBusy(false); }
  };

  if (!boot) return (
    <main className="svc-login-wrap">
      <form className="svc-login" onSubmit={login}>
        <img src="/cocktaillo-logo.png" alt="Cocktailliio" />
        <h1>Table Service POS</h1>
        <p>Waiter ordering · Cashier checkout</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="current-password" />
        {error && <div className="svc-error">{error}</div>}
        <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
      <Style />
    </main>
  );

  return (
    <main className="svc-app">
      <header className="svc-header">
        <div><strong>Cocktailliio</strong><span>Table Service</span></div>
        <div className="svc-user"><b>{boot.user.name}</b><span>{boot.user.role}</span><button onClick={logout}>Logout</button></div>
      </header>
      {error && <div className="svc-error top">{error}</div>}

      <section className="svc-tables">
        {boot.tables.map((table) => {
          const check = boot.checks.find((entry) => entry.table_id === table.id);
          return <button key={table.id} className={`svc-table ${selectedTableId === table.id ? "selected" : ""} ${check ? "occupied" : ""}`} onClick={() => setSelectedTableId(table.id)}>
            <strong>{table.name}</strong><span>{check ? money(check.subtotal_cents) : `${table.capacity} seats`}</span>
          </button>;
        })}
      </section>

      <section className="svc-layout">
        <div className="svc-menu-panel">
          <div className="svc-categories">{categories.map((name) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}</div>
          <div className="svc-menu-grid">
            {filteredMenu.map((item) => <button key={item.id} className="svc-menu-button" onClick={() => addToCart(item.id)}><strong>{item.name}</strong><span>{money(item.price_cents)}</span>{cart[item.id] ? <em>{cart[item.id]}</em> : null}</button>)}
          </div>
        </div>

        <aside className="svc-check">
          <h2>{selectedTable?.name ?? "Table"}</h2>
          {selectedCheck ? <p className="svc-owner">Opened by {selectedCheck.opened_by_name}</p> : <p className="svc-owner">New table order</p>}
          <div className="svc-lines">
            {selectedCheck?.items.map((line) => <div className="svc-line" key={line.id}><div><b>{line.name_snapshot}</b><span>{money(line.line_total_cents)}</span></div><div className="svc-qty"><button onClick={() => void setLineQty(selectedCheck.id, line.id, line.quantity - 1)}>−</button><span>{line.quantity}</span><button onClick={() => void setLineQty(selectedCheck.id, line.id, line.quantity + 1)}>+</button></div></div>)}
            {Object.entries(cart).map(([menuId, qty]) => { const item = boot.menu.find((entry) => entry.id === menuId); return item ? <div className="svc-line pending" key={`cart-${menuId}`}><div><b>{item.name}</b><span>{qty} × {money(item.price_cents)}</span></div><button onClick={() => setCart((old) => { const next = { ...old }; delete next[menuId]; return next; })}>Remove</button></div> : null; })}
          </div>

          {cartCount > 0 && <button className="svc-primary" disabled={busy} onClick={() => void sendOrder()}>Send {cartCount} item{cartCount === 1 ? "" : "s"} to table</button>}

          {selectedCheck && <div className="svc-transfer"><select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}><option value="">Transfer to table…</option>{boot.tables.filter((table) => table.id !== selectedTableId && !boot.checks.some((check) => check.table_id === table.id)).map((table) => <option value={table.id} key={table.id}>{table.name}</option>)}</select><button disabled={!transferTo || busy} onClick={() => void transfer()}>Transfer</button></div>}

          {selectedCheck && <div className="svc-total"><span>Total</span><strong>{money(selectedCheck.subtotal_cents)}</strong></div>}

          {selectedCheck && canCheckout && <div className="svc-payment"><h3>Cashier payment</h3><div className="svc-payment-grid"><label>USD<input inputMode="decimal" value={usd} onChange={(e) => setUsd(e.target.value)} placeholder="0.00" /></label><label>LBP<input inputMode="numeric" value={lbp} onChange={(e) => setLbp(e.target.value)} placeholder="0" /></label></div><label>Exchange rate · LBP for $1<input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} /></label><button className="svc-primary" disabled={busy || (!Number(usd) && !Number(lbp))} onClick={() => void checkout()}>Pay & Issue Receipt</button></div>}
          {selectedCheck && !canCheckout && <div className="svc-waiter-note">Order sent. Only the cashier can take payment or issue the receipt.</div>}
        </aside>
      </section>

      {receipt && <div className="svc-modal"><div className="svc-receipt"><h2>Cocktailliio</h2><p>Receipt #{receipt.orderNumber}</p><div>{receipt.items.map((line) => <p key={line.id}><span>{line.quantity} × {line.name_snapshot}</span><b>{money(line.line_total_cents)}</b></p>)}</div><hr/><p><span>Total</span><b>{money(receipt.totalCents)}</b></p>{receipt.usdPaidCents > 0 && <p><span>USD paid</span><b>{money(receipt.usdPaidCents)}</b></p>}{receipt.lbpPaid > 0 && <p><span>LBP paid</span><b>{receipt.lbpPaid.toLocaleString()} LBP</b></p>}{receipt.changeUsdCents > 0 && <p><span>Change</span><b>{money(receipt.changeUsdCents)}</b></p>}<small>Cashier: {receipt.cashier}</small><div className="svc-receipt-actions"><button onClick={() => window.print()}>Print Receipt</button><button onClick={() => setReceipt(null)}>Close</button></div></div></div>}
      <Style />
    </main>
  );
}

function Style() { return <style jsx global>{`
  *{box-sizing:border-box} body{margin:0;background:#f4f7f5;color:#14251b;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.svc-login-wrap{min-height:100vh;display:grid;place-items:center;padding:24px}.svc-login{width:min(420px,100%);background:white;border:1px solid #dce7df;border-radius:24px;padding:32px;display:grid;gap:14px;box-shadow:0 20px 60px #0b31151a}.svc-login img{width:110px;height:110px;object-fit:contain;margin:auto}.svc-login h1{margin:4px 0 0;text-align:center}.svc-login p{margin:0 0 12px;text-align:center;color:#607067}.svc-login input,.svc-payment input,.svc-transfer select{width:100%;border:1px solid #cedbd2;background:white;border-radius:12px;padding:13px 14px;font:inherit}.svc-login button,.svc-primary{border:0;border-radius:12px;padding:14px 18px;background:#16833c;color:white;font-weight:800;font-size:15px;cursor:pointer}.svc-error{background:#fff0f0;color:#a32323;border:1px solid #ffd0d0;border-radius:12px;padding:10px 12px}.svc-error.top{margin:12px 18px 0}.svc-app{min-height:100vh}.svc-header{height:72px;background:#103b22;color:white;display:flex;justify-content:space-between;align-items:center;padding:0 22px;position:sticky;top:0;z-index:20}.svc-header>div:first-child{display:flex;gap:10px;align-items:baseline}.svc-header strong{font-size:21px}.svc-header span{opacity:.72;font-size:13px}.svc-user{display:flex;align-items:center;gap:10px}.svc-user b{font-size:13px}.svc-user button{border:1px solid #ffffff44;background:transparent;color:white;border-radius:9px;padding:8px 10px}.svc-tables{display:flex;gap:10px;overflow:auto;padding:16px 18px 8px}.svc-table{min-width:126px;border:1px solid #cedbd2;background:white;border-radius:14px;padding:13px;text-align:left;display:grid;gap:5px;cursor:pointer}.svc-table span{font-size:12px;color:#607067}.svc-table.occupied{border-color:#71b788;background:#effaf2}.svc-table.selected{outline:3px solid #16833c22;border-color:#16833c}.svc-layout{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:16px;padding:8px 18px 20px}.svc-menu-panel,.svc-check{background:white;border:1px solid #dce7df;border-radius:18px;padding:16px}.svc-categories{display:flex;gap:8px;overflow:auto;padding-bottom:14px}.svc-categories button{white-space:nowrap;border:1px solid #d7e2da;background:#f7faf8;border-radius:999px;padding:9px 13px;font-weight:700;cursor:pointer}.svc-categories button.active{background:#16833c;color:white;border-color:#16833c}.svc-menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:10px}.svc-menu-button{min-height:92px;position:relative;border:1px solid #d7e2da;background:#fbfdfb;border-radius:14px;padding:14px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}.svc-menu-button:hover{border-color:#16833c;background:#f2faf4}.svc-menu-button strong{font-size:15px}.svc-menu-button span{font-size:13px;color:#16833c;font-weight:800}.svc-menu-button em{position:absolute;right:8px;top:8px;background:#16833c;color:white;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800}.svc-check{align-self:start;position:sticky;top:88px}.svc-check h2{margin:0}.svc-owner{color:#6a786f;font-size:12px;margin:4px 0 16px}.svc-lines{display:grid;gap:8px;max-height:38vh;overflow:auto}.svc-line{border-bottom:1px solid #edf2ee;padding:9px 0;display:flex;justify-content:space-between;gap:10px}.svc-line>div:first-child{display:grid;gap:3px}.svc-line span{font-size:12px;color:#657269}.svc-line.pending{background:#f6faf7;border:1px dashed #bcd5c3;border-radius:10px;padding:10px}.svc-line.pending>button{border:0;background:transparent;color:#9a3333}.svc-qty{display:flex;align-items:center;gap:7px}.svc-qty button{width:28px;height:28px;border:1px solid #cedbd2;background:white;border-radius:8px;font-size:18px}.svc-qty span{min-width:20px;text-align:center;color:#14251b;font-weight:800}.svc-primary{width:100%;margin-top:14px}.svc-primary:disabled{opacity:.45;cursor:not-allowed}.svc-transfer{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:14px}.svc-transfer button{border:1px solid #16833c;color:#16833c;background:white;border-radius:11px;padding:0 12px;font-weight:800}.svc-total{display:flex;justify-content:space-between;align-items:center;border-top:2px solid #e8efea;margin-top:16px;padding-top:16px}.svc-total strong{font-size:23px}.svc-payment{margin-top:18px;padding-top:15px;border-top:1px solid #e7eee9}.svc-payment h3{margin:0 0 10px}.svc-payment label{display:grid;gap:5px;font-size:12px;font-weight:700;margin-top:8px}.svc-payment-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.svc-waiter-note{margin-top:16px;background:#eef7ff;border:1px solid #cfe6f8;color:#315a76;border-radius:12px;padding:12px;font-size:13px}.svc-modal{position:fixed;inset:0;background:#07150db8;z-index:50;display:grid;place-items:center;padding:20px}.svc-receipt{width:min(380px,100%);background:white;border-radius:18px;padding:24px;color:#151515}.svc-receipt h2,.svc-receipt>p:first-of-type{text-align:center}.svc-receipt p{display:flex;justify-content:space-between;gap:12px}.svc-receipt small{display:block;margin-top:16px;color:#666}.svc-receipt-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}.svc-receipt-actions button{padding:11px;border-radius:10px;border:1px solid #ccc;background:white;font-weight:700}.svc-receipt-actions button:first-child{background:#16833c;color:white;border-color:#16833c}@media(max-width:850px){.svc-header{padding:0 14px}.svc-header>div:first-child span,.svc-user span{display:none}.svc-layout{grid-template-columns:1fr;padding:8px 10px 18px}.svc-tables{padding-left:10px;padding-right:10px}.svc-check{position:static}.svc-menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.svc-menu-button{min-height:82px}}@media print{body *{visibility:hidden}.svc-receipt,.svc-receipt *{visibility:visible}.svc-modal{background:white}.svc-receipt{position:absolute;left:0;top:0;width:80mm;border-radius:0}.svc-receipt-actions{display:none}}
`}</style>; }
