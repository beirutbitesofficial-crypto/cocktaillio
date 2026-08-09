"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

type Role = "manager" | "cashier";
type Currency = "USD" | "LBP";
type Language = "en" | "ar";
type View = "dashboard" | "pos" | "kitchen" | "tables" | "shift" | "inventory" | "menu" | "expenses" | "users" | "reports" | "settings";
type TableStatus = "available" | "occupied" | "reserved";
type RestaurantTable = { number: number; seats: number; status: TableStatus; order?: string; total?: number };
type CounterOrderType = "Dine-in" | "Takeaway" | "Delivery";
type OrderType = CounterOrderType;
type MenuCategory = "Food" | "Hookah" | "Cocktail" | "Hot Drink" | "Cold Drink" | "Dessert" | "Other";
type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: MenuCategory;
  available: boolean;
  customizable: boolean;
};
type Topping = { id: string; name: string; price: number; emoji: string; available: boolean };
type PaymentMethod = "Cash" | "Card" | "Online";
type ReceiptLine = { name: string; quantity: number; price: number };
type KitchenOrder = { id: number; number: string; type: OrderType; items: string[]; status: "pending" | "done"; time: string; customer?: string };
type Receipt = {
  number: string; type: OrderType; table?: number; cashier: string; createdAt: string;
  items: ReceiptLine[]; subtotal: number; discount?: number; deliveryFee?: number; total: number;
  paymentMethod: PaymentMethod; cashReceived?: number; change?: number;
  customer?: string; phone?: string; address?: string; driver?: string; notes?: string[];
};
type PrinterSettings = {
  serviceUrl: string; token: string; autoPrint: boolean; autoOpenDrawer: boolean;
  printerName: string; paperWidth: 58 | 80; copies: number; drawerPin: 0 | 1;
  openDrawerAllPayments: boolean;
};
type FailedPrint = { receipt: Receipt; kitchen: KitchenOrder; message: string };
type UserAccount = { id: string; username: string; password: string; name: string; initials: string; role: Role; active: boolean };
type UserEditor = { mode: "add"; userId: null } | { mode: "edit"; userId: string } | null;
type UserConfirmation = { kind: "deactivate" | "delete"; userId: string } | null;
type UserFormState = {
  name: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: Role;
  active: boolean;
};
type MenuEditor = { kind: "item" | "topping"; mode: "add" | "edit"; id: string | null } | null;
type MenuDeleteConfirmation = { kind: "item" | "topping"; id: string; name: string } | null;
type MenuItemFormState = {
  name: string;
  description: string;
  price: string;
  image: string;
  category: MenuCategory;
  available: boolean;
  customizable: boolean;
};
type ToppingFormState = { name: string; price: string; emoji: string; available: boolean };
type ExpenseCategory = "Electricity" | "Salary" | "Internet" | "Rent" | "Supplies" | "Other";
type Expense = {
  id: string;
  item: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  addedBy: string;
};
type ExpenseEditor = { mode: "add" | "edit"; id: string | null } | null;
type ExpenseFormState = { item: string; category: ExpenseCategory; amount: string; date: string };
type InventoryUnit = "g" | "kg" | "ml" | "L" | "item" | "box";
type InventoryItem = {
  id: string;
  item: string;
  category: string;
  stock: number;
  unit: InventoryUnit;
  min: number;
  cost: number;
};
type InventoryEditor = { mode: "add" | "edit"; id: string | null } | null;
type InventoryFormState = {
  item: string;
  category: string;
  stock: string;
  unit: InventoryUnit;
  min: string;
  cost: string;
};
type RecentOrder = {
  number: string;
  type: string;
  cashier: string;
  time: string;
  status: "Preparing" | "Ready" | "Paid";
  total: number;
};
type SalesSnapshot = {
  salesTotal: number;
  orders: number;
  nextOrderNumber: number;
  recentOrders: RecentOrder[];
};

const initialMenuItems: MenuItem[] = [
  { id: "menu-classic-hookah", name: "Classic Hookah", description: "Choose an available flavor", price: 12, image: "", category: "Hookah", available: true, customizable: true },
  { id: "menu-house-cocktail", name: "House Cocktail", description: "Cocktailliio signature mix", price: 9, image: "", category: "Cocktail", available: true, customizable: false },
  { id: "menu-lemonade", name: "Fresh Lemonade", description: "Fresh lemon, mint and crushed ice", price: 4, image: "", category: "Cold Drink", available: true, customizable: false },
  { id: "menu-coffee", name: "Coffee", description: "Freshly brewed coffee", price: 3, image: "", category: "Hot Drink", available: true, customizable: false },
  { id: "menu-burger", name: "House Burger", description: "Beef patty, cheese, vegetables and fries", price: 10, image: "", category: "Food", available: true, customizable: true },
  { id: "menu-dessert", name: "Dessert of the Day", description: "Ask the team for today's selection", price: 6, image: "", category: "Dessert", available: true, customizable: false },
];

const initialToppings: Topping[] = [
  { id: "topping-double-apple", name: "Double Apple", price: 0, emoji: "🍎", available: true },
  { id: "topping-mint", name: "Mint", price: 0, emoji: "🌿", available: true },
  { id: "topping-grape", name: "Grape", price: 0, emoji: "🍇", available: true },
  { id: "topping-lemon-mint", name: "Lemon Mint", price: 0, emoji: "🍋", available: true },
  { id: "cheese-extra", name: "Extra cheese", price: 1, emoji: "🧀", available: true },
  { id: "topping-fries", name: "Extra fries", price: 2, emoji: "🍟", available: true },
];

const menuCategories: MenuCategory[] = ["Food", "Hookah", "Cocktail", "Hot Drink", "Cold Drink", "Dessert", "Other"];
const expenseCategories: ExpenseCategory[] = ["Electricity", "Salary", "Internet", "Rent", "Supplies", "Other"];
const initialExpenses: Expense[] = [
  { id: "expense-electricity", item: "Electricity bill", category: "Electricity", amount: 186, date: "2026-07-29", addedBy: "Alex Daher" },
  { id: "expense-salaries", item: "Employee salaries", category: "Salary", amount: 1250, date: "2026-07-29", addedBy: "Alex Daher" },
  { id: "expense-internet", item: "Internet subscription", category: "Internet", amount: 45, date: "2026-07-28", addedBy: "Alex Daher" },
  { id: "expense-cleaning", item: "Cleaning products", category: "Other", amount: 29.5, date: "2026-07-28", addedBy: "Alex Daher" },
];
const initialRecentOrders: RecentOrder[] = [
  { number: "#1042", type: "Table 1", cashier: "Jamie D.", time: "8:42 PM", status: "Preparing", total: 24 },
  { number: "#1041", type: "Table 6", cashier: "Maya K.", time: "8:35 PM", status: "Ready", total: 18 },
  { number: "#1040", type: "Takeaway", cashier: "Jamie D.", time: "8:28 PM", status: "Ready", total: 32.5 },
  { number: "#1039", type: "Table 4", cashier: "Sam R.", time: "8:16 PM", status: "Paid", total: 31.5 },
];

const initialInventory: InventoryItem[] = [
  { id: "inventory-coffee", item: "Coffee beans", category: "Hot drinks", stock: 8, unit: "kg", min: 3, cost: 14 },
  { id: "inventory-hookah", item: "Hookah tobacco", category: "Hookah", stock: 24, unit: "box", min: 8, cost: 12 },
  { id: "inventory-charcoal", item: "Hookah charcoal", category: "Hookah", stock: 18, unit: "box", min: 6, cost: 8 },
  { id: "inventory-spirits", item: "House spirits", category: "Bar", stock: 20, unit: "L", min: 8, cost: 18 },
  { id: "inventory-mint", item: "Fresh mint", category: "Produce", stock: 30, unit: "item", min: 10, cost: 1.2 },
  { id: "inventory-beef", item: "Burger patties", category: "Kitchen", stock: 36, unit: "item", min: 12, cost: 2.5 },
];

const initialTables: RestaurantTable[] = [
  { number: 1, seats: 2, status: "occupied", order: "#1042", total: 24 },
  { number: 2, seats: 4, status: "available" },
  { number: 3, seats: 4, status: "reserved" },
  { number: 4, seats: 2, status: "occupied", order: "#1039", total: 31.5 },
  { number: 5, seats: 6, status: "available" },
  { number: 6, seats: 4, status: "occupied", order: "#1041", total: 18 },
  { number: 7, seats: 2, status: "available" },
  { number: 8, seats: 8, status: "reserved" },
  { number: 9, seats: 4, status: "available" },
  { number: 10, seats: 2, status: "available" },
  { number: 11, seats: 4, status: "occupied", order: "#1038", total: 46 },
  { number: 12, seats: 6, status: "available" },
];
const initialKitchenOrders: KitchenOrder[] = [
  { id: 1042, number: "#1042", type: "Dine-in", items: ["Penne Rosé", "+ Chicken", "+ Parmesan"], status: "pending", time: "2 min", customer: "Table 1" },
  { id: 1041, number: "#1041", type: "Delivery", items: ["Pesto", "+ Mushrooms"], status: "pending", time: "6 min", customer: "Rami H." },
  { id: 1040, number: "#1040", type: "Takeaway", items: ["Alfredo"], status: "done", time: "12 min", customer: "Maya S." },
];

const nav: { id: View; label: string; icon: string; manager: boolean; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", manager: true },
  { id: "pos", label: "New order", icon: "＋", manager: false },
  { id: "kitchen", label: "Kitchen display", icon: "▤", manager: false },
  { id: "tables", label: "Tables", icon: "▦", manager: false },
  { id: "shift", label: "My shift", icon: "◷", manager: false },
  { id: "inventory", label: "Inventory", icon: "□", manager: true },
  { id: "menu", label: "Menu", icon: "☷", manager: true },
  { id: "expenses", label: "Expenses", icon: "↘", manager: true },
  { id: "users", label: "Admin", icon: "♙", manager: true },
  { id: "reports", label: "Reports", icon: "⌁", manager: true },
  { id: "settings", label: "Settings", icon: "⚙", manager: true },
];

const arabicNav: Record<View, string> = {
  dashboard: "لوحة التحكم", pos: "طلب جديد", kitchen: "شاشة المطبخ", tables: "الطاولات", shift: "الدوام",
  inventory: "المخزون", menu: "قائمة الطعام", expenses: "المصاريف", users: "لوحة الإدارة",
  reports: "التقارير", settings: "الإعدادات",
};

const initialUserAccounts: UserAccount[] = [
  { id: "manager-1", username: "manager", password: "2300", name: "Alex Daher", initials: "AD", role: "manager", active: true },
  { id: "cashier-1", username: "cashier", password: "1234", name: "Jamie D.", initials: "JD", role: "cashier", active: true },
  { id: "cashier-2", username: "maya", password: "1234", name: "Maya Khalil", initials: "MK", role: "cashier", active: true },
  { id: "cashier-3", username: "sam", password: "1234", name: "Sam Rami", initials: "SR", role: "cashier", active: true },
];

const emptyUserForm: UserFormState = {
  name: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "cashier",
  active: true,
};

const emptyMenuItemForm: MenuItemFormState = {
  name: "",
  description: "",
  price: "",
  image: "",
  category: "Food",
  available: true,
  customizable: true,
};

const emptyToppingForm: ToppingFormState = {
  name: "",
  price: "",
  emoji: "✦",
  available: true,
};
const emptyExpenseForm: ExpenseFormState = { item: "", category: "Other", amount: "", date: "" };
const emptyInventoryForm: InventoryFormState = { item: "", category: "", stock: "", unit: "g", min: "", cost: "" };

const userStorageKey = "cocktailliio-users-v1";
const menuStorageKey = "cocktailliio-menu-v1";
const toppingStorageKey = "cocktailliio-addons-v1";
const expenseStorageKey = "cocktailliio-expenses-v1";
const inventoryStorageKey = "cocktailliio-inventory-v1";
const salesStorageKey = "cocktailliio-sales-v1";
const tablesStorageKey = "cocktailliio-tables-v1";
const kitchenStorageKey = "cocktailliio-kitchen-v1";
const printerStorageKey = "cocktailliio-printer-settings-v1";
const defaultPrinterSettings: PrinterSettings = {
  serviceUrl: "http://127.0.0.1:17891", token: "", autoPrint: true, autoOpenDrawer: true,
  printerName: "", paperWidth: 80, copies: 1, drawerPin: 0, openDrawerAllPayments: false,
};

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function menuCategoryIcon(category: MenuCategory) {
  if (category === "Food") return "🍽️";
  if (category === "Hookah") return "💨";
  if (category === "Cocktail") return "🍸";
  if (category === "Hot Drink") return "☕";
  if (category === "Cold Drink") return "🥤";
  if (category === "Dessert") return "🍰";
  return "✦";
}

type PortionRule = { pasta: number; sauce: number; topping: number };

const portionRules: Record<string, PortionRule> = {};

function toppingKind(topping: Topping): "pasta" | "sauce" | "topping" | "cheese" {
  if (topping.id.startsWith("pasta-")) return "pasta";
  if (topping.id.startsWith("sauce-")) return "sauce";
  if (topping.id.startsWith("cheese-")) return "cheese";
  return "topping";
}

function toppingLimit(item: MenuItem, topping: Topping) {
  const rules = portionRules[item.id];
  const kind = toppingKind(topping);
  if (kind === "cheese") return Number.POSITIVE_INFINITY;
  return rules?.[kind] ?? Number.POSITIVE_INFINITY;
}

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0][0] ?? ""}${parts.length > 1 ? parts[parts.length - 1][0] ?? "" : ""}`.toUpperCase();
}

function isUserAccount(value: unknown): value is UserAccount {
  if (!value || typeof value !== "object") return false;
  const account = value as Record<string, unknown>;
  return typeof account.id === "string"
    && typeof account.username === "string"
    && typeof account.password === "string"
    && typeof account.name === "string"
    && typeof account.initials === "string"
    && (account.role === "manager" || account.role === "cashier")
    && typeof account.active === "boolean";
}

function parseStoredUsers(value: string | null) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.length || !parsed.every(isUserAccount)) return null;
    const normalizedUsernames = parsed.map((account) => account.username.trim().toLowerCase());
    const hasUniqueUsernames = new Set(normalizedUsernames).size === normalizedUsernames.length;
    const hasActiveManager = parsed.some((account) => account.role === "manager" && account.active);
    return hasUniqueUsernames && hasActiveManager ? parsed : null;
  } catch {
    return null;
  }
}

function isMenuItem(value: unknown): value is MenuItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && item.id.trim().length > 0
    && typeof item.name === "string"
    && item.name.trim().length >= 2
    && typeof item.description === "string"
    && typeof item.price === "number"
    && Number.isFinite(item.price)
    && item.price >= 0
    && typeof item.image === "string"
    && (item.category === "Food" || item.category === "Hookah" || item.category === "Cocktail" || item.category === "Hot Drink" || item.category === "Cold Drink" || item.category === "Dessert" || item.category === "Other")
    && typeof item.available === "boolean"
    && typeof item.customizable === "boolean";
}

function isTopping(value: unknown): value is Topping {
  if (!value || typeof value !== "object") return false;
  const topping = value as Record<string, unknown>;
  return typeof topping.id === "string"
    && topping.id.trim().length > 0
    && typeof topping.name === "string"
    && topping.name.trim().length >= 2
    && typeof topping.price === "number"
    && Number.isFinite(topping.price)
    && topping.price >= 0
    && typeof topping.emoji === "string"
    && typeof topping.available === "boolean";
}

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const expense = value as Record<string, unknown>;
  return typeof expense.id === "string"
    && expense.id.trim().length > 0
    && typeof expense.item === "string"
    && expense.item.trim().length >= 2
    && (expense.category === "Electricity" || expense.category === "Salary" || expense.category === "Internet" || expense.category === "Rent" || expense.category === "Supplies" || expense.category === "Other")
    && typeof expense.amount === "number"
    && Number.isFinite(expense.amount)
    && expense.amount >= 0
    && typeof expense.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(expense.date)
    && typeof expense.addedBy === "string";
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string"
    && item.id.trim().length > 0
    && typeof item.item === "string"
    && item.item.trim().length >= 2
    && typeof item.category === "string"
    && item.category.trim().length >= 2
    && typeof item.stock === "number"
    && Number.isFinite(item.stock)
    && item.stock >= 0
    && (item.unit === "g" || item.unit === "kg" || item.unit === "ml" || item.unit === "L" || item.unit === "item" || item.unit === "box")
    && typeof item.min === "number"
    && Number.isFinite(item.min)
    && item.min >= 0
    && typeof item.cost === "number"
    && Number.isFinite(item.cost)
    && item.cost >= 0;
}

function isRecentOrder(value: unknown): value is RecentOrder {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return typeof order.number === "string"
    && typeof order.type === "string"
    && typeof order.cashier === "string"
    && typeof order.time === "string"
    && (order.status === "Preparing" || order.status === "Ready" || order.status === "Paid")
    && typeof order.total === "number"
    && Number.isFinite(order.total)
    && order.total >= 0;
}

function isRestaurantTable(value: unknown): value is RestaurantTable {
  if (!value || typeof value !== "object") return false;
  const table = value as Record<string, unknown>;
  return typeof table.number === "number"
    && Number.isInteger(table.number)
    && table.number > 0
    && typeof table.seats === "number"
    && Number.isInteger(table.seats)
    && table.seats > 0
    && (table.status === "available" || table.status === "occupied" || table.status === "reserved")
    && (table.order === undefined || typeof table.order === "string")
    && (table.total === undefined || (typeof table.total === "number" && Number.isFinite(table.total) && table.total >= 0));
}

function isKitchenOrder(value: unknown): value is KitchenOrder {
  if (!value || typeof value !== "object") return false;
  const order = value as Record<string, unknown>;
  return typeof order.id === "number"
    && Number.isInteger(order.id)
    && typeof order.number === "string"
    && (order.type === "Dine-in" || order.type === "Takeaway" || order.type === "Delivery")
    && Array.isArray(order.items)
    && order.items.every((item) => typeof item === "string")
    && (order.status === "pending" || order.status === "done")
    && typeof order.time === "string"
    && (order.customer === undefined || typeof order.customer === "string");
}

function parseOperationalCollection<T>(value: string | null, validator: (entry: unknown) => entry is T): T[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(validator) ? parsed as T[] : null;
  } catch {
    return null;
  }
}

function parseSalesSnapshot(value: string | null): SalesSnapshot | null {
  if (!value) return null;
  try {
    const snapshot = JSON.parse(value) as Partial<SalesSnapshot>;
    return typeof snapshot.salesTotal === "number"
      && Number.isFinite(snapshot.salesTotal)
      && snapshot.salesTotal >= 0
      && typeof snapshot.orders === "number"
      && Number.isInteger(snapshot.orders)
      && snapshot.orders >= 0
      && t…36444 tokens truncated…       {accounts.map((user) => (
                  <article className={`user-card ${user.active ? "" : "is-disabled"}`} key={user.id}>
                    <span className="user-avatar">{user.initials}</span>
                    <div className="user-card-copy">
                      <div className="user-card-title"><h3>{user.name}</h3><b className={user.role === "manager" ? "manager-pill" : "cashier-pill"}>{user.role === "manager" ? tr("Manager", "مدير") : tr("Cashier", "كاشير")}</b>{user.id === currentUserId && <em>{tr("You", "أنت")}</em>}</div>
                      <p>@{user.username} · {user.role === "manager" ? tr("Full access", "صلاحيات كاملة") : tr("Orders · Kitchen · Tables · Shift", "الطلبات · المطبخ · الطاولات · الدوام")}</p>
                      <small className={`user-status ${user.active ? "is-active" : "is-disabled"}`}>● {user.active ? tr("Active", "مفعّل") : tr("Disabled", "معطّل")}</small>
                    </div>
                    <button
                      type="button"
                      className="user-menu-trigger"
                      aria-label={tr(`Options for ${user.name}`, `خيارات ${user.name}`)}
                      aria-expanded={userMenuId === user.id}
                      aria-controls={`user-menu-${user.id}`}
                      onClick={() => setUserMenuId((current) => current === user.id ? null : user.id)}
                    >
                      •••
                    </button>
                    {userMenuId === user.id && (
                      <div className="user-action-menu" id={`user-menu-${user.id}`} role="menu">
                        <button className="user-action" type="button" role="menuitem" onClick={() => openEditUser(user)}>✎ <span>{tr("Edit user", "تعديل المستخدم")}</span></button>
                        {user.active ? (
                          <button className="user-action" type="button" role="menuitem" onClick={() => requestUserConfirmation("deactivate", user)}>◷ <span>{tr("Deactivate", "تعطيل")}</span></button>
                        ) : (
                          <button className="user-action" type="button" role="menuitem" onClick={() => activateUser(user)}>✓ <span>{tr("Activate", "تفعيل")}</span></button>
                        )}
                        <button className="user-action is-danger" type="button" role="menuitem" onClick={() => requestUserConfirmation("delete", user)}>× <span>{tr("Delete user", "حذف المستخدم")}</span></button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {view === "reports" && role === "manager" && (
            <section>
              <div className="welcome-row compact"><div><p className="page-kicker">PERFORMANCE</p><h2>Reports</h2><p>Sales, expenses, inventory and profit in a professional Excel workbook.</p></div><div className="report-actions"><div className="period-switch">{["Daily","Monthly","Yearly"].map(item => <button className={period === item ? "active" : ""} onClick={() => setPeriod(item)} key={item}>{item}</button>)}</div><button className="excel-button" onClick={exportExcel}>⇩ Export {period} Excel</button></div></div>
              <div className="metric-grid"><Metric label="Gross sales" value={period === "Daily" ? money(salesTotal) : period === "Monthly" ? money(34680) : money(392440)} trend={period === "Daily" ? tr("Live POS total", "مجموع مباشر") : "+12.4%"} icon="$"/><Metric label="Net profit" value={period === "Daily" ? money(salesTotal - todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)) : period === "Monthly" ? money(20148) : money(227615)} trend={period === "Daily" ? tr("Sales minus expenses", "المبيعات ناقص المصاريف") : "57.8% margin"} icon="↗"/><Metric label="Orders" value={period === "Daily" ? String(orders) : period === "Monthly" ? "1,146" : "13,204"} trend={period === "Daily" ? tr("Recorded today", "مسجلة اليوم") : "+8.1%"} icon="#"/><Metric label="Expenses" value={period === "Daily" ? money(todayExpenses.reduce((sum, expense) => sum + expense.amount, 0)) : period === "Monthly" ? money(2418) : money(31806)} trend={period === "Daily" ? `${todayExpenses.length} ${tr("entries", "قيود")}` : "-6.2%"} icon="↘"/></div>
              <div className="dashboard-grid reports"><section className="panel"><PanelHead title={`${period} sales`} caption="Revenue performance" action="Export"/><div className="report-chart">{[42,58,46,72,64,86,78,95,74,88,82,98].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></section><section className="panel"><PanelHead title="Best sellers" caption="By order quantity" action="All items"/>{menuItems.filter((item) => item.available).slice(0, 4).map((item,i)=><div className="seller-row" key={item.id}><b>{i+1}</b>{item.image ? <img src={item.image} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }}/> : <span className="seller-placeholder">{menuCategoryIcon(item.category)}</span>}<span><strong>{item.name}</strong><small>{Math.max(18-i*3, 1)} orders</small></span><em>{money(item.price * Math.max(18-i*3, 1))}</em></div>)}</section></div>
            </section>
          )}

          {view === "settings" && role === "manager" && (
            <section className="settings-page">
              <div className="welcome-row compact"><div><p className="page-kicker">{tr("PREFERENCES", "التفضيلات")}</p><h2>{tr("Settings", "الإعدادات")}</h2><p>{tr("Manage your restaurant and register preferences.", "إدارة إعدادات المطعم ونقطة البيع.")}</p></div></div>
              <section className="panel settings-section"><h3>Appearance</h3><p>Choose how Cocktailliio POS looks on this device.</p><div className="theme-options"><button className={!dark ? "active" : ""} onClick={() => setDark(false)}><span className="theme-preview light"><i/><i/><i/></span><strong>Light</strong><small>Bright and clean</small></button><button className={dark ? "active" : ""} onClick={() => setDark(true)}><span className="theme-preview dark"><i/><i/><i/></span><strong>Dark</strong><small>Easy on the eyes</small></button></div></section>
              <section className="panel settings-section"><h3>{tr("Language & currency", "اللغة والعملة")}</h3><p>{tr("Choose the register language and display currency.", "اختر لغة النظام وعملة عرض الأسعار.")}</p><div className="choice-row"><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>English</button><button className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>العربية</button><button className={currency === "USD" ? "active" : ""} onClick={() => setCurrency("USD")}>USD</button><button className={currency === "LBP" ? "active" : ""} onClick={() => setCurrency("LBP")}>LBP</button></div><label className="rate-field">{tr("USD → LBP exchange rate", "سعر صرف الدولار إلى الليرة")}<input type="number" value={exchangeRate} onChange={(event) => setExchangeRate(Number(event.target.value) || 89500)}/></label></section>
              <section className="panel settings-section hardware-section">
                <h3>{tr("POS hardware", "أجهزة نقطة البيع")}</h3>
                <p>{tr("Silent ESC/POS printing through the secure Windows service.", "طباعة ESC/POS صامتة عبر خدمة ويندوز الآمنة.")}</p>
                <div className="printer-status-line"><b className={printerStatus}>{printerStatus === "connected" ? tr("Connected", "متصل") : printerStatus === "error" ? tr("Connection error", "خطأ في الاتصال") : tr("Not checked", "لم يتم الفحص")}</b><button type="button" disabled={printBusy} onClick={() => void refreshPrinters()}>{tr("Connect / refresh printers", "اتصال / تحديث الطابعات")}</button></div>
                {printerError && <div className="hardware-error" role="alert">{printerError}</div>}
                <div className="printer-settings-grid">
                  <label className="wide">{tr("Local service token", "رمز خدمة الطباعة المحلية")}<input type="password" autoComplete="off" value={printerSettings.token} onChange={(event) => setPrinterSettings((current) => ({ ...current, token: event.target.value }))} placeholder={tr("Paste token from install.ps1", "ألصق الرمز من install.ps1")}/></label>
                  <label className="wide">{tr("Windows printer", "طابعة ويندوز")}<select value={printerSettings.printerName} onChange={(event) => setPrinterSettings((current) => ({ ...current, printerName: event.target.value }))}><option value="">{tr("Select POS80 printer", "اختر طابعة POS80")}</option>{windowsPrinters.map((printer) => <option value={printer} key={printer}>{printer}</option>)}{printerSettings.printerName && !windowsPrinters.includes(printerSettings.printerName) && <option value={printerSettings.printerName}>{printerSettings.printerName}</option>}</select></label>
                  <label>{tr("Paper width", "عرض الورق")}<select value={printerSettings.paperWidth} onChange={(event) => setPrinterSettings((current) => ({ ...current, paperWidth: Number(event.target.value) === 58 ? 58 : 80 }))}><option value={80}>80mm</option><option value={58}>58mm</option></select></label>
                  <label>{tr("Receipt copies", "عدد النسخ")}<input type="number" min="1" max="5" value={printerSettings.copies} onChange={(event) => setPrinterSettings((current) => ({ ...current, copies: Math.max(1, Math.min(5, Number(event.target.value) || 1)) }))}/></label>
                  <label>{tr("Drawer pin", "منفذ الدرج")}<select value={printerSettings.drawerPin} onChange={(event) => setPrinterSettings((current) => ({ ...current, drawerPin: Number(event.target.value) === 1 ? 1 : 0 }))}><option value={0}>Pin 0 — ESC p 0 25 250</option><option value={1}>Pin 1 — ESC p 1 25 250</option></select></label>
                </div>
                <div className="printer-toggles">
                  <label><input type="checkbox" checked={printerSettings.autoPrint} onChange={(event) => setPrinterSettings((current) => ({ ...current, autoPrint: event.target.checked }))}/><span><strong>{tr("Automatic receipt printing", "طباعة الإيصال تلقائياً")}</strong><small>{tr("Print immediately after the order is saved.", "اطبع فور حفظ الطلب.")}</small></span></label>
                  <label><input type="checkbox" checked={printerSettings.autoOpenDrawer} onChange={(event) => setPrinterSettings((current) => ({ ...current, autoOpenDrawer: event.target.checked }))}/><span><strong>{tr("Automatic cash drawer", "فتح درج النقود تلقائياً")}</strong><small>{tr("Send the drawer kick after printing.", "أرسل أمر فتح الدرج بعد الطباعة.")}</small></span></label>
                  <label><input type="checkbox" checked={printerSettings.openDrawerAllPayments} onChange={(event) => setPrinterSettings((current) => ({ ...current, openDrawerAllPayments: event.target.checked }))}/><span><strong>{tr("Open drawer for all payment methods", "افتح الدرج لكل طرق الدفع")}</strong><small>{tr("Off by default; cash payments always follow the drawer setting.", "معطل افتراضياً؛ الدفع النقدي يتبع إعداد الدرج.")}</small></span></label>
                </div>
                <div className="hardware-actions"><button type="button" disabled={printBusy} onClick={() => void printReceipt()}>▤ {tr("Test print", "طباعة تجريبية")}</button><button type="button" disabled={printBusy} onClick={() => void openCashDrawer()}>▣ {tr("Test cash drawer", "اختبار درج النقود")}</button></div>
                <div className="hardware-note">ⓘ {tr("Install tools/cocktailliio-print-service/install.ps1 on this Windows PC. The drawer cable must connect to the printer.", "ثبّت tools/cocktailliio-print-service/install.ps1 على هذا الكمبيوتر. يجب وصل كابل الدرج بالطابعة.")}</div>
              </section>
              <section className="panel settings-section"><h3>{tr("Restaurant details", "بيانات المطعم")}</h3><p>{tr("Used on receipts and reports.", "تظهر على الفواتير والتقارير.")}</p><div className="form-grid"><label>{tr("Restaurant name", "اسم المطعم")}<input defaultValue="Cocktailliio"/></label><label>{tr("Phone", "الهاتف")}<input defaultValue="+961 1 234 567"/></label><label>{tr("Tax rate", "نسبة الضريبة")}<input defaultValue="11%"/></label></div><button className="primary-button" onClick={() => showNotice(tr("Settings saved", "تم حفظ الإعدادات"))}>{tr("Save changes", "حفظ التغييرات")}</button></section>
              <section className="panel settings-section danger-zone"><div><span>!</span><p><strong>{tr("Factory reset", "إعادة ضبط المصنع")}</strong><small>{tr("Clear this POS while keeping menu items and toppings.", "امسح بيانات هذا الجهاز مع الحفاظ على أصناف القائمة والإضافات.")}</small></p></div><button type="button" onClick={() => setFactoryResetOpen(true)}>{tr("Factory reset", "إعادة ضبط المصنع")}</button></section>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, trend, icon }: { label: string; value: string; trend: string; icon: string }) {
  return <div className="metric-card"><div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div><i>{icon}</i></div>;
}

function PanelHead({ title, caption, action, onAction }: { title: string; caption: string; action: string; onAction?: () => void }) {
  return <div className="panel-head"><div><h3>{title}</h3><p>{caption}</p></div><button onClick={onAction}>{action}</button></div>;
}

function KitchenReceiptContent({ order, tr }: {
  order: KitchenOrder;
  tr: (en: string, ar: string) => string;
}) {
  return (
    <article className="thermal-receipt kitchen-print-ticket">
      <div className="thermal-brand"><span>C</span><h1>COCKTAILLIIO</h1><p>{tr("KITCHEN / BAR TICKET", "تذكرة المطبخ / البار")}</p></div>
      <hr className="thermal-divider"/>
      <div className="kitchen-print-number">{order.number}</div>
      <div className="thermal-row"><span>{tr("Type", "النوع")}</span><strong>{order.type}</strong></div>
      {order.customer && <div className="thermal-row"><span>{tr("For", "لـ")}</span><strong>{order.customer}</strong></div>}
      <div className="thermal-row"><span>{tr("Received", "وقت الاستلام")}</span><strong>{order.time}</strong></div>
      <hr className="thermal-divider"/>
      <ol className="kitchen-print-items">{order.items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>
      <hr className="thermal-divider"/>
      <p className="kitchen-print-footer">{tr("NO PRICES • PREPARE IN ORDER", "بدون أسعار • حضّر حسب الترتيب")}</p>
    </article>
  );
}

function ReceiptContent({ receipt, money, tr }: {
  receipt: Receipt;
  money: (amount: number) => string;
  tr: (en: string, ar: string) => string;
}) {
  const typeLabel = receipt.type === "Dine-in"
    ? tr("Dine-in", "داخل المطعم")
    : receipt.type === "Takeaway"
      ? tr("Takeaway / online pickup", "سفري / استلام أونلاين")
      : tr("Delivery", "توصيل");

  return (
    <article className="thermal-receipt">
      <div className="thermal-brand"><span>C</span><h1>COCKTAILLIIO</h1><p>RESTO CAFÉ • LOUNGE • HOOKAH • COCKTAILS</p></div>
      <p className="thermal-kind">{receipt.type === "Delivery" ? tr("DRIVER RECEIPT", "إيصال السائق") : tr("CUSTOMER RECEIPT", "إيصال الزبون")}</p>
      <hr className="thermal-divider"/>
      <div className="thermal-row"><span>{tr("Order", "الطلب")}</span><strong>{receipt.number}</strong></div>
      <div className="thermal-row"><span>{tr("Type", "النوع")}</span><strong>{typeLabel}</strong></div>
      {receipt.table !== undefined && <div className="thermal-row"><span>{tr("Table", "الطاولة")}</span><strong>{receipt.table}</strong></div>}
      <div className="thermal-row"><span>{tr("Cashier", "الكاشير")}</span><strong>{receipt.cashier}</strong></div>
      <div className="thermal-row"><span>{tr("Time", "الوقت")}</span><strong>{receipt.createdAt}</strong></div>
      {receipt.customer && <><hr className="thermal-divider"/><div className="thermal-row"><span>{tr("Customer", "الزبون")}</span><strong>{receipt.customer}</strong></div></>}
      {receipt.phone && <div className="thermal-row"><span>{tr("Phone", "الهاتف")}</span><strong>{receipt.phone}</strong></div>}
      {receipt.address && <div className="thermal-address"><span>{tr("Address", "العنوان")}</span><strong>{receipt.address}</strong></div>}
      {receipt.driver && <div className="thermal-row"><span>{tr("Driver", "السائق")}</span><strong>{receipt.driver}</strong></div>}
      <hr className="thermal-divider"/>
      <div className="thermal-items">
        {receipt.items.map((item, index) => <div className="thermal-item" key={`${item.name}-${index}`}><span><b>{item.name}</b><small>{item.quantity} × {money(item.price)}</small></span><strong>{money(item.price * item.quantity)}</strong></div>)}
      </div>
      {receipt.notes && receipt.notes.length > 0 && <div className="thermal-notes"><strong>{tr("Notes", "ملاحظات")}</strong><ul>{receipt.notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul></div>}
      <hr className="thermal-divider"/>
      <div className="thermal-row"><span>{tr("Subtotal", "المجموع الفرعي")}</span><strong>{money(receipt.subtotal)}</strong></div>
      {receipt.discount !== undefined && receipt.discount > 0 && <div className="thermal-row"><span>{tr("Discount", "الحسم")}</span><strong>-{money(receipt.discount)}</strong></div>}
      {receipt.deliveryFee !== undefined && receipt.deliveryFee > 0 && <div className="thermal-row"><span>{tr("Delivery fee", "رسوم التوصيل")}</span><strong>{money(receipt.deliveryFee)}</strong></div>}
      <div className="thermal-row thermal-total"><span>{tr("TOTAL", "المجموع")}</span><strong>{money(receipt.total)}</strong></div>
      <div className="thermal-row"><span>{tr("Payment", "الدفع")}</span><strong>{receipt.paymentMethod}</strong></div>
      {receipt.cashReceived !== undefined && <div className="thermal-row"><span>{tr("Cash received", "المبلغ المستلم")}</span><strong>{money(receipt.cashReceived)}</strong></div>}
      {receipt.change !== undefined && <div className="thermal-row"><span>{tr("Change", "الباقي")}</span><strong>{money(receipt.change)}</strong></div>}
      <p className="thermal-vat">{tr("Prices include applicable VAT", "الأسعار تشمل الضريبة المطبقة")}</p>
      <a
        className="thermal-instagram"
        href="https://www.instagram.com/cocktailliio/"
        target="_blank"
        rel="noreferrer"
        aria-label={tr("Follow @cocktailliio on Instagram", "تابعوا @cocktailliio على إنستغرام")}
      >
        <img src="/instagram-qr.svg?v=2.3" alt="Instagram QR code"/>
        <strong>{tr("Scan to follow us on Instagram", "امسح الرمز وتابعنا على إنستغرام")}</strong>
        <span>@cocktailliio</span>
      </a>
      <p className="thermal-footer"><strong>{tr("Thank you!", "شكراً!")}</strong><span>Cocktailliio • Resto café, lounge, hookah and cocktails</span><small>JMR Mall • Mazboud, Chouf</small></p>
    </article>
  );
}

