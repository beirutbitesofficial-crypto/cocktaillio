"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "manager" | "cashier" | "waiter";
type User = { id: string; username: string; name: string; role: Role };
type Table = { id: string; name: string; capacity: number; status: string };
type MenuItem = {
  id: string;
  name: string;
  name_en: string;
  name_ar: string;
  price_cents: number;
  category: string;
  addons_enabled: boolean;
  station: "bar" | "kitchen";
};
type Addon = { id: string; name: string; name_en: string; name_ar: string };
type CheckLine = {
  id: string;
  menu_item_id: string;
  name_en: string;
  name_ar: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  addons: Array<{ name_en: string; name_ar: string; quantity: number; price_lbp: number }>;
  note: string | null;
};
type Check = {
  id: string;
  table_id: string;
  table_name: string;
  opened_by_name: string;
  subtotal_cents: number;
  subtotal_lbp: number;
  items: CheckLine[];
};
type Boot = { user: User; tables: Table[]; menu: MenuItem[]; addons: Addon[]; checks: Check[] };
type CartLine = { key: string; menuItemId: string; quantity: number; addonIds: string[]; note: string };
type Receipt = {
  order_number: number;
  table_name: string;
  cashier: string;
  subtotal_cents: number;
  subtotal_lbp: number;
  total_equivalent_cents: number;
  items: CheckLine[];
};

const TOKEN_KEY = "cocktaillio-session";
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

export default function ServicePage() {
  const [boot, setBoot] = useState<Boot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tableId, setTableId] = useState("table-1");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [usdPaid, setUsdPaid] = useState("");
  const [lbpPaid, setLbpPaid] = useState("");
  const [rate, setRate] = useState("89500");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const load = async () => {
    try {
      const data = await api<Boot>("/api/service/bootstrap");
      setBoot(data);
      setError("");
      if (!category && data.menu[0]) setCategory(data.menu[0].category);
    } catch (e) {
      if (localStorage.getItem(TOKEN_KEY)) setError(e instanceof Error ? e.message : "Load failed");
      setBoot(null);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem(TOKEN_KEY, result.token);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const categories = useMemo(() => [...new Set(boot?.menu.map((item) => item.category) ?? [])], [boot]);
  const filteredMenu = useMemo(() => boot?.menu.filter((item) => item.category === category) ?? [], [boot, category]);
  const check = boot?.checks.find((entry) => entry.table_id === tableId) ?? null;
  const table = boot?.tables.find((entry) => entry.id === tableId) ?? null;
  const canPay = boot?.user.role !== "waiter";

  const addItem = (item: MenuItem) => {
    if (item.addons_enabled) {
      setEditing(item);
      setSelectedAddons([]);
      setNote("");
      return;
    }
    setCart((old) => [...old, { key: crypto.randomUUID(), menuItemId: item.id, quantity: 1, addonIds: [], note: "" }]);
  };

  const sendOrder = async () => {
    if (!cart.length) return;
    setBusy(true);
    try {
      await api("/api/service/checks", {
        method: "POST",
        body: JSON.stringify({
          tableId,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            quantity: line.quantity,
            addons: line.addonIds.map((addonId) => ({ addonId, quantity: 1 })),
            note: line.note,
          })),
        }),
      });
      setCart([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  };

  const transfer = async () => {
    if (!check || !transferTo) return;
    setBusy(true);
    try {
      await api(`/api/service/checks/${check.id}/transfer`, {
        method: "POST",
        body: JSON.stringify({ destinationTableId: transferTo }),
      });
      setTableId(transferTo);
      setTransferTo("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    if (!check || !canPay) return;
    setBusy(true);
    try {
      const result = await api<{ receipt: Receipt }>(`/api/service/checks/${check.id}/checkout`, {
        method: "POST",
        body: JSON.stringify({
          usdCents: Math.round(Number(usdPaid || 0) * 100),
          lbpAmount: Math.round(Number(lbpPaid || 0)),
          exchangeRateLbpPerUsd: Math.round(Number(rate || 0)),
        }),
      });
      setReceipt(result.receipt);
      setUsdPaid("");
      setLbpPaid("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  if (!boot) {
    return (
      <main className="login">
        <form onSubmit={login}>
          <h1>Cocktaillo POS</h1>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <b>{error}</b>}
          <button disabled={busy}>Sign in</button>
        </form>
        <Css />
      </main>
    );
  }

  return (
    <main className="app">
      <header>
        <strong>Cocktaillo · {boot.user.role}</strong>
        <nav>
          <a href="/bar">Bar</a>
          <a href="/kitchen">Kitchen</a>
          <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setBoot(null); }}>Logout</button>
        </nav>
      </header>

      {error && <div className="err">{error}</div>}

      <section className="tables">
        {boot.tables.map((entry) => {
          const openCheck = boot.checks.find((candidate) => candidate.table_id === entry.id);
          return (
            <button key={entry.id} className={`${tableId === entry.id ? "sel" : ""} ${openCheck ? "occ" : ""}`} onClick={() => setTableId(entry.id)}>
              <strong>{entry.name}</strong>
              <span>{openCheck ? money(openCheck.subtotal_cents) : `${entry.capacity} seats`}</span>
            </button>
          );
        })}
      </section>

      <section className="layout">
        <div className="menu">
          <div className="cats">
            {categories.map((name) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}
          </div>
          <div className="grid">
            {filteredMenu.map((item) => (
              <button key={item.id} className="item" onClick={() => addItem(item)}>
                <strong>{item.name_en}</strong>
                <small>{item.name_ar}</small>
                <b>{money(item.price_cents)}</b>
              </button>
            ))}
          </div>
        </div>

        <aside>
          <h2>{table?.name}</h2>
          <p>{check ? `Opened by ${check.opened_by_name}` : "New order"}</p>
          <div className="lines">
            {check?.items.map((line) => (
              <div className="line" key={line.id}>
                <strong>{line.name_en} ×{line.quantity}</strong>
                <span>{money(line.line_total_cents)}</span>
                {line.addons.map((addon, index) => <small key={index}>+ {addon.name_en} ×{addon.quantity}</small>)}
              </div>
            ))}
            {cart.map((line) => {
              const item = boot.menu.find((entry) => entry.id === line.menuItemId);
              if (!item) return null;
              return (
                <div className="line pending" key={line.key}>
                  <div>
                    <strong>{item.name_en}</strong>
                    {line.addonIds.map((id) => <small key={id}>+ {boot.addons.find((addon) => addon.id === id)?.name_en}</small>)}
                  </div>
                  <div className="qty">
                    <button onClick={() => setCart((old) => old.map((entry) => entry.key === line.key ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))}>−</button>
                    <b>{line.quantity}</b>
                    <button onClick={() => setCart((old) => old.map((entry) => entry.key === line.key ? { ...entry, quantity: entry.quantity + 1 } : entry))}>+</button>
                    <button onClick={() => setCart((old) => old.filter((entry) => entry.key !== line.key))}>×</button>
                  </div>
                </div>
              );
            })}
          </div>

          {cart.length > 0 && <button className="primary" disabled={busy} onClick={() => void sendOrder()}>Send to production</button>}

          {check && (
            <div className="checkout">
              <div className="total"><span>USD subtotal</span><strong>{money(check.subtotal_cents)}</strong></div>
              {check.subtotal_lbp > 0 && <div className="total"><span>Add-ons</span><strong>{check.subtotal_lbp.toLocaleString()} LBP</strong></div>}
              <div className="transfer">
                <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                  <option value="">Transfer table…</option>
                  {boot.tables.filter((entry) => entry.id !== tableId && !boot.checks.some((candidate) => candidate.table_id === entry.id)).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
                <button disabled={!transferTo} onClick={() => void transfer()}>Transfer</button>
              </div>
              {canPay ? (
                <div className="pay">
                  <h3>Cashier payment</h3>
                  <input placeholder="USD" value={usdPaid} onChange={(e) => setUsdPaid(e.target.value)} />
                  <input placeholder="LBP" value={lbpPaid} onChange={(e) => setLbpPaid(e.target.value)} />
                  <input placeholder="Rate" value={rate} onChange={(e) => setRate(e.target.value)} />
                  <button className="primary" onClick={() => void checkout()}>Pay & issue receipt</button>
                </div>
              ) : <div className="waiter">Payment and receipt are cashier-only.</div>}
            </div>
          )}
        </aside>
      </section>

      {editing && (
        <div className="modal">
          <div className="custom">
            <h2>{editing.name_en}</h2>
            <div className="addons">
              {boot.addons.map((addon) => (
                <button key={addon.id} className={selectedAddons.includes(addon.id) ? "on" : ""} onClick={() => setSelectedAddons((old) => old.includes(addon.id) ? old.filter((id) => id !== addon.id) : [...old, addon.id])}>
                  {addon.name_en}<small>{addon.name_ar}</small>
                </button>
              ))}
            </div>
            <textarea placeholder="Note for bar" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="modalActions">
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" onClick={() => {
                setCart((old) => [...old, { key: crypto.randomUUID(), menuItemId: editing.id, quantity: 1, addonIds: selectedAddons, note }]);
                setEditing(null);
              }}>Add item</button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="modal">
          <div className="receipt">
            <h2>Cocktaillo</h2>
            <p><span>Receipt</span><b>#{receipt.order_number}</b></p>
            <p><span>Table</span><b>{receipt.table_name}</b></p>
            {receipt.items.map((line) => (
              <p key={line.id}><span>{line.quantity} × {line.name_en}</span><b>{money(line.line_total_cents)}</b></p>
            ))}
            <hr />
            <p><span>Items</span><b>{money(receipt.subtotal_cents)}</b></p>
            {receipt.subtotal_lbp > 0 && <p><span>Add-ons</span><b>{receipt.subtotal_lbp.toLocaleString()} LBP</b></p>}
            <p><span>Total equivalent</span><b>{money(receipt.total_equivalent_cents)}</b></p>
            <small>Cashier: {receipt.cashier}</small>
            <div className="modalActions">
              <button onClick={() => window.print()}>Print</button>
              <button onClick={() => setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <Css />
    </main>
  );
}

function Css() {
  return <style jsx global>{`
    *{box-sizing:border-box}body{margin:0;background:#f6f8f6;color:#173326;font-family:Arial,sans-serif}button,input,select,textarea{font:inherit}.app header{background:#123f2b;color:#fff;padding:14px;display:flex;justify-content:space-between}.app nav{display:flex;gap:6px}.app a,.app header button{color:#fff;background:transparent;border:1px solid #ffffff55;border-radius:8px;padding:7px;text-decoration:none}.tables,.cats{display:flex;gap:8px;overflow:auto;padding:12px}.tables button,.cats button,.item{background:#fff;border:1px solid #d7e2da;border-radius:11px;padding:10px}.tables button{min-width:110px}.tables button.sel,.cats button.active,.addons button.on{outline:2px solid #123f2b}.tables span,.item small,.line small,.addons small{display:block;font-size:11px}.layout{display:grid;grid-template-columns:1fr 360px;gap:12px;padding:0 12px}.menu,aside{background:#fff;border-radius:15px;padding:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.item{text-align:left;min-height:90px}.item strong,.item b{display:block}.lines{display:grid;gap:7px}.line{border:1px solid #e1e8e3;border-radius:9px;padding:9px}.pending{display:flex;justify-content:space-between}.qty{display:flex;gap:4px;align-items:center}.primary{background:#123f2b!important;color:#fff;border:0;border-radius:9px;padding:11px}.checkout,.pay{display:grid;gap:7px;margin-top:10px}.total{display:flex;justify-content:space-between}.transfer{display:flex;gap:5px}.transfer select{flex:1}.modal{position:fixed;inset:0;background:#0008;display:grid;place-items:center;padding:15px}.custom,.receipt,.login form{background:#fff;border-radius:15px;padding:18px;width:min(600px,100%)}.addons{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.addons button{padding:9px}.custom textarea,.pay input,.login input{width:100%;padding:10px;margin:4px 0}.modalActions{display:flex;justify-content:flex-end;gap:6px}.receipt p{display:flex;justify-content:space-between}.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login form{display:grid;gap:8px}.err{padding:10px;background:#fee;color:#900}@media(max-width:800px){.layout{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,1fr)}aside{order:-1}.addons{grid-template-columns:repeat(2,1fr)}}
  `}</style>;
}
