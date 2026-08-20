"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { clearSessionToken, hasBackendConfig, posApi, saveSessionToken, type BackendBootstrap } from "@/lib/pos-api-client";

type Role = "manager" | "cashier";
type Currency = "USD" | "LBP";
type Language = "en" | "ar";
type View = "dashboard" | "pos" | "tables" | "shift" | "inventory" | "menu" | "expenses" | "users" | "reports" | "settings";
type TableStatus = "available" | "occupied" | "reserved";
type RestaurantTable = { id: string; number: number; seats: number; currentGuests?: number; status: TableStatus; order?: string; total?: number };
type ReservationStatus = "upcoming" | "seated" | "completed" | "cancelled" | "no-show";
type Reservation = { id: string; customerName: string; guests: number; tableNumber: number; date: string; time: string; phone: string; notes: string; status: ReservationStatus };
type TableEditor = { mode: "add" | "edit"; id: string | null; number: number; capacity: string; guests: string; status: TableStatus } | null;
type ReservationForm = { customerName: string; guests: string; tableNumber: string; date: string; time: string; phone: string; notes: string };
type CounterOrderType = "Dine-in" | "Takeaway" | "Delivery";
type OrderType = CounterOrderType;
type MenuCategory = "Burger sandwich" | "Sandwich" | "Appetizers" | "Salad" | "Platter";
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
  paidFrom: "cash_drawer" | "owner";
};
type ExpenseEditor = { mode: "add" | "edit"; id: string | null } | null;
type ExpenseFormState = { item: string; category: ExpenseCategory; amount: string; date: string; paidFrom: "cash_drawer" | "owner" };
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
  { id: "burger-lebanese", name: "Burger lebanese", description: "", price: 5, image: "", category: "Burger sandwich", available: true, customizable: true },
  { id: "burger-classic-cheese", name: "Burger classic cheese", description: "", price: 6, image: "", category: "Burger sandwich", available: true, customizable: true },
  { id: "chicken-burger", name: "Chicken burger", description: "", price: 5, image: "", category: "Burger sandwich", available: true, customizable: true },
  { id: "zinger-cheese", name: "Zinger cheese", description: "", price: 6, image: "", category: "Burger sandwich", available: true, customizable: true },
  { id: "sandwich-crispy", name: "Crispy", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-chicken-sub", name: "Chicken sub", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-twister", name: "Twister", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-francisco", name: "Francisco", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-tawouk", name: "Tawouk", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-fries", name: "Fries", description: "", price: 3, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-escalope", name: "Escalope", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-chicken", name: "Chicken", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-roasto", name: "Roasto", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-roasto-cheese", name: "Roasto & cheese", description: "", price: 6, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-sujuk", name: "Sujuk", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-sujuk-cheese", name: "Sujuk & cheese", description: "", price: 6, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-makanik", name: "Makanik", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-nkhaat", name: "Nkhaat", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-sanasel", name: "Sanasel", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-lsenet-ghanam", name: "Lsenet ghanam", description: "", price: 6, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-lsenet-baar", name: "Lsenet baar", description: "", price: 6, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-zinger-club-special", name: "Zinger club special", description: "", price: 7, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-kafta", name: "Kafta", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-kafta-cheese", name: "Kafta & cheese", description: "", price: 6, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-crab", name: "Crab", description: "", price: 5, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "sandwich-cocktaillo", name: "Cocktaillo", description: "", price: 7, image: "", category: "Sandwich", available: true, customizable: true },
  { id: "appetizer-fries-box", name: "Fries box", description: "", price: 4, image: "", category: "Appetizers", available: true, customizable: false },
  { id: "appetizer-nuggets-box", name: "Nuggets box", description: "", price: 6, image: "", category: "Appetizers", available: true, customizable: false },
  { id: "appetizer-bob-court-box", name: "Bob court box", description: "", price: 6, image: "", category: "Appetizers", available: true, customizable: false },
  { id: "appetizer-mazorella-sticks", name: "Mazorella sticks", description: "", price: 6, image: "", category: "Appetizers", available: true, customizable: false },
  { id: "salad-chicken-cesar", name: "Chicken cesar", description: "", price: 7, image: "", category: "Salad", available: true, customizable: false },
  { id: "salad-season", name: "Season", description: "", price: 5, image: "", category: "Salad", available: true, customizable: false },
  { id: "salad-crab", name: "Crab", description: "", price: 6, image: "", category: "Salad", available: true, customizable: false },
  { id: "salad-tuna", name: "Tuna", description: "", price: 6, image: "", category: "Salad", available: true, customizable: false },
  { id: "platter-chicken", name: "Chicken", description: "Ingredients ( garlic, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-roasto", name: "Roasto", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-sawda-djej", name: "Sawda djej", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-kafta", name: "Kafta", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-kafta-cheese", name: "Kafta & cheese", description: "Ingredients ( sauce, fries , and salad)", price: 10, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-cocktaillo", name: "Cocktaillo", description: "Ingredients ( sauce, fries , and salad, baby rocca)", price: 12, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-fahita", name: "Fahita", description: "Ingredients ( sauce, fries , and salad baby rocca)", price: 10, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-burger-lebanese", name: "Burger lebanese", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-classic-cheese-burger", name: "Classic cheese burger", description: "Ingredients ( sauce, fries , cheese, and salad)", price: 10, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-chicken-burger", name: "Chicken burger", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-zinger", name: "Zinger", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-crispy-6pcs", name: "Crispy 6pcs", description: "Ingredients ( sauce, fries , and salad)", price: 11, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-cheesy-steak", name: "Cheesy steak", description: "Ingredients ( sauce, fries , and rocca salad)", price: 12, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-tawouk", name: "Tawouk", description: "Ingredients ( sauce, fries , and salad)", price: 9, image: "", category: "Platter", available: true, customizable: true },
  { id: "platter-escalope-3pcs", name: "Escalope 3pcs", description: "Ingredients ( sauce, fries , and salad)", price: 10, image: "", category: "Platter", available: true, customizable: true },
];

const initialToppings: Topping[] = [
  { id: "topping-double-apple", name: "Double Apple", price: 0, emoji: "🍎", available: true },
  { id: "topping-mint", name: "Mint", price: 0, emoji: "🌿", available: true },
  { id: "topping-grape", name: "Grape", price: 0, emoji: "🍇", available: true },
  { id: "topping-lemon-mint", name: "Lemon Mint", price: 0, emoji: "🍋", available: true },
  { id: "cheese-extra", name: "Extra cheese", price: 1, emoji: "🧀", available: true },
  { id: "topping-fries", name: "Extra fries", price: 2, emoji: "🍟", available: true },
];

const menuCategories: MenuCategory[] = ["Burger sandwich", "Sandwich", "Appetizers", "Salad", "Platter"];
const expenseCategories: ExpenseCategory[] = ["Electricity", "Salary", "Internet", "Rent", "Supplies", "Other"];
const initialExpenses: Expense[] = [
  { id: "expense-electricity", item: "Electricity bill", category: "Electricity", amount: 186, date: "2026-07-29", addedBy: "Alex Daher", paidFrom: "owner" },
  { id: "expense-salaries", item: "Employee salaries", category: "Salary", amount: 1250, date: "2026-07-29", addedBy: "Alex Daher", paidFrom: "owner" },
  { id: "expense-internet", item: "Internet subscription", category: "Internet", amount: 45, date: "2026-07-28", addedBy: "Alex Daher", paidFrom: "cash_drawer" },
  { id: "expense-cleaning", item: "Cleaning products", category: "Other", amount: 29.5, date: "2026-07-28", addedBy: "Alex Daher", paidFrom: "cash_drawer" },
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
  { id:"table-1", number: 1, seats: 2, status: "occupied", order: "#1042", total: 24 },
  { id:"table-2", number: 2, seats: 4, status: "available" },
  { id:"table-3", number: 3, seats: 4, status: "reserved" },
  { id:"table-4", number: 4, seats: 2, status: "occupied", order: "#1039", total: 31.5 },
  { id:"table-5", number: 5, seats: 6, status: "available" },
  { id:"table-6", number: 6, seats: 4, status: "occupied", order: "#1041", total: 18 },
  { id:"table-7", number: 7, seats: 2, status: "available" },
  { id:"table-8", number: 8, seats: 8, status: "reserved" },
  { id:"table-9", number: 9, seats: 4, status: "available" },
  { id:"table-10", number: 10, seats: 2, status: "available" },
  { id:"table-11", number: 11, seats: 4, status: "occupied", order: "#1038", total: 46 },
  { id:"table-12", number: 12, seats: 6, status: "available" },
];
const initialKitchenOrders: KitchenOrder[] = [
  { id: 1042, number: "#1042", type: "Dine-in", items: ["Penne Rosé", "+ Chicken", "+ Parmesan"], status: "pending", time: "2 min", customer: "Table 1" },
  { id: 1041, number: "#1041", type: "Delivery", items: ["Pesto", "+ Mushrooms"], status: "pending", time: "6 min", customer: "Rami H." },
  { id: 1040, number: "#1040", type: "Takeaway", items: ["Alfredo"], status: "done", time: "12 min", customer: "Maya S." },
];

const nav: { id: View; label: string; icon: string; manager: boolean; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", manager: true },
  { id: "pos", label: "New order", icon: "＋", manager: false },
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
  dashboard: "لوحة التحكم", pos: "طلب جديد", tables: "الطاولات", shift: "الدوام",
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
  category: "Burger sandwich",
  available: true,
  customizable: true,
};

const emptyToppingForm: ToppingFormState = {
  name: "",
  price: "",
  emoji: "✦",
  available: true,
};
const emptyExpenseForm: ExpenseFormState = { item: "", category: "Other", amount: "", date: "", paidFrom: "owner" };
const emptyInventoryForm: InventoryFormState = { item: "", category: "", stock: "", unit: "g", min: "", cost: "" };

const userStorageKey = "cocktailliio-users-v1";
const menuStorageKey = "cocktailliio-menu-v3";
const toppingStorageKey = "cocktailliio-addons-v1";
const expenseStorageKey = "cocktailliio-expenses-v1";
const inventoryStorageKey = "cocktailliio-inventory-v1";
const salesStorageKey = "cocktailliio-sales-v1";
const tablesStorageKey = "cocktailliio-tables-v1";
const kitchenStorageKey = "cocktailliio-kitchen-v1";
const reservationStorageKey = "cocktailliio-reservations-v1";
const printerStorageKey = "cocktailliio-printer-settings-v1";
const defaultPrinterSettings: PrinterSettings = {
  serviceUrl: "http://127.0.0.1:17891", token: "", autoPrint: true, autoOpenDrawer: true,
  printerName: "", paperWidth: 80, copies: 1, drawerPin: 0, openDrawerAllPayments: false,
};
const emptyReservationForm: ReservationForm = { customerName: "", guests: "", tableNumber: "", date: "", time: "", phone: "", notes: "" };

function getTodayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function menuCategoryIcon(category: MenuCategory) {
  if (category === "Burger sandwich") return "🍔";
  if (category === "Sandwich") return "🥪";
  if (category === "Appetizers") return "🍟";
  if (category === "Salad") return "🥗";
  return "🍽️";
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
    && typeof expense.addedBy === "string"
    && (expense.paidFrom === undefined || expense.paidFrom === "cash_drawer" || expense.paidFrom === "owner");
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
    && (table.currentGuests === undefined || (typeof table.currentGuests === "number" && Number.isInteger(table.currentGuests) && table.currentGuests >= 0 && table.currentGuests <= table.seats))
    && (table.status === "available" || table.status === "occupied" || table.status === "reserved")
    && (table.order === undefined || typeof table.order === "string")
    && (table.total === undefined || (typeof table.total === "number" && Number.isFinite(table.total) && table.total >= 0));
}

function isReservation(value: unknown): value is Reservation {
  if (!value || typeof value !== "object") return false;
  const reservation = value as Record<string, unknown>;
  return typeof reservation.id === "string"
    && typeof reservation.customerName === "string"
    && typeof reservation.guests === "number" && Number.isInteger(reservation.guests) && reservation.guests > 0
    && typeof reservation.tableNumber === "number" && Number.isInteger(reservation.tableNumber)
    && typeof reservation.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(reservation.date)
    && typeof reservation.time === "string" && /^\d{2}:\d{2}$/.test(reservation.time)
    && typeof reservation.phone === "string" && typeof reservation.notes === "string"
    && (reservation.status === "upcoming" || reservation.status === "seated" || reservation.status === "completed" || reservation.status === "cancelled" || reservation.status === "no-show");
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
      && typeof snapshot.nextOrderNumber === "number"
      && Number.isInteger(snapshot.nextOrderNumber)
      && snapshot.nextOrderNumber >= 1
      && Array.isArray(snapshot.recentOrders)
      && snapshot.recentOrders.every(isRecentOrder)
      ? snapshot as SalesSnapshot
      : null;
  } catch {
    return null;
  }
}

function parsePrinterSettings(value: string | null): PrinterSettings {
  if (!value) return defaultPrinterSettings;
  try {
    const saved = JSON.parse(value) as Partial<PrinterSettings>;
    return {
      serviceUrl: typeof saved.serviceUrl === "string" && saved.serviceUrl.startsWith("http://127.0.0.1:") ? saved.serviceUrl.replace(/\/$/, "") : defaultPrinterSettings.serviceUrl,
      token: typeof saved.token === "string" ? saved.token : "",
      autoPrint: typeof saved.autoPrint === "boolean" ? saved.autoPrint : true,
      autoOpenDrawer: typeof saved.autoOpenDrawer === "boolean" ? saved.autoOpenDrawer : true,
      printerName: typeof saved.printerName === "string" ? saved.printerName : "",
      paperWidth: saved.paperWidth === 58 ? 58 : 80,
      copies: typeof saved.copies === "number" ? Math.max(1, Math.min(5, Math.round(saved.copies))) : 1,
      drawerPin: saved.drawerPin === 1 ? 1 : 0,
      openDrawerAllPayments: saved.openDrawerAllPayments === true,
    };
  } catch { return defaultPrinterSettings; }
}

function parseStoredCollection<T>(value: string | null, validator: (entry: unknown) => entry is T): T[] | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every(validator)) return null;
    const collection = parsed as T[];
    const ids = collection.map((entry) => (entry as { id: string }).id);
    return new Set(ids).size === ids.length ? collection : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [accounts, setAccounts] = useState<UserAccount[]>(initialUserAccounts);
  const [accountsReady, setAccountsReady] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [backendBusy, setBackendBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userEditor, setUserEditor] = useState<UserEditor>(null);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm);
  const [userFormError, setUserFormError] = useState("");
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userMenuId, setUserMenuId] = useState<string | null>(null);
  const [userConfirmation, setUserConfirmation] = useState<UserConfirmation>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [toppings, setToppings] = useState<Topping[]>(initialToppings);
  const [menuDataReady, setMenuDataReady] = useState(false);
  const [menuTab, setMenuTab] = useState<"items" | "toppings">("items");
  const [posMenuFilter, setPosMenuFilter] = useState<"All" | MenuCategory>("All");
  const [menuEditor, setMenuEditor] = useState<MenuEditor>(null);
  const [menuItemForm, setMenuItemForm] = useState<MenuItemFormState>(emptyMenuItemForm);
  const [toppingForm, setToppingForm] = useState<ToppingFormState>(emptyToppingForm);
  const [menuFormError, setMenuFormError] = useState("");
  const [menuImageUploading, setMenuImageUploading] = useState(false);
  const [menuDeleteConfirmation, setMenuDeleteConfirmation] = useState<MenuDeleteConfirmation>(null);
  const [view, setView] = useState<View>("dashboard");
  const [dark, setDark] = useState(false);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [language, setLanguage] = useState<Language>("en");
  const [exchangeRate, setExchangeRate] = useState(89500);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState<number | null>(null);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [shiftStartedAt, setShiftStartedAt] = useState("");
  const [shiftOpenedBy, setShiftOpenedBy] = useState("");
  const [tables, setTables] = useState(initialTables);
  const [tablesReady, setTablesReady] = useState(false);
  const [tableEditor, setTableEditor] = useState<TableEditor>(null);
  const [tableFormError, setTableFormError] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsReady, setReservationsReady] = useState(false);
  const [reservationEditorOpen, setReservationEditorOpen] = useState(false);
  const [reservationForm, setReservationForm] = useState<ReservationForm>(emptyReservationForm);
  const [reservationFormError, setReservationFormError] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryEditor, setInventoryEditor] = useState<InventoryEditor>(null);
  const [inventoryForm, setInventoryForm] = useState<InventoryFormState>(emptyInventoryForm);
  const [inventoryFormError, setInventoryFormError] = useState("");
  const [inventoryDeleteConfirmation, setInventoryDeleteConfirmation] = useState<InventoryItem | null>(null);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [restockError, setRestockError] = useState("");
  const [period, setPeriod] = useState("Daily");
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [toppingStep, setToppingStep] = useState(0);
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [orderToppings, setOrderToppings] = useState<Topping[]>([]);
  const [counterOrderType, setCounterOrderType] = useState<CounterOrderType | null>(null);
  const [counterTable, setCounterTable] = useState<number | null>(null);
  const [orderContact, setOrderContact] = useState({ name: "", phone: "", address: "", driver: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [nextOrderNumber, setNextOrderNumber] = useState(1043);
  const [orders, setOrders] = useState(42);
  const [salesTotal, setSalesTotal] = useState(1284.5);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>(initialRecentOrders);
  const [salesReady, setSalesReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [factoryResetConfirmation, setFactoryResetConfirmation] = useState("");
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>(initialKitchenOrders);
  const [kitchenReady, setKitchenReady] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [printerSettings, setPrinterSettings] = useState<PrinterSettings>(defaultPrinterSettings);
  const [printerSettingsReady, setPrinterSettingsReady] = useState(false);
  const [windowsPrinters, setWindowsPrinters] = useState<string[]>([]);
  const [printerStatus, setPrinterStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [printerError, setPrinterError] = useState("");
  const [printBusy, setPrintBusy] = useState(false);
  const [lastFailedPrint, setLastFailedPrint] = useState<FailedPrint | null>(null);
  const completionLock = useRef(false);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [expensesReady, setExpensesReady] = useState(false);
  const [expenseEditor, setExpenseEditor] = useState<ExpenseEditor>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(emptyExpenseForm);
  const [expenseFormError, setExpenseFormError] = useState("");
  const [expenseDeleteConfirmation, setExpenseDeleteConfirmation] = useState<Expense | null>(null);
  const currentUser = accounts.find((account) => account.id === currentUserId) ?? null;
  const role: Role = currentUser?.role ?? "cashier";

  useEffect(() => {
    const savedTheme = localStorage.getItem("cocktailliio-theme");
    if (savedTheme === "dark") setDark(true);
    const savedCurrency = localStorage.getItem("cocktailliio-currency") as Currency | null;
    const savedLanguage = localStorage.getItem("cocktailliio-language") as Language | null;
    if (savedCurrency) setCurrency(savedCurrency);
    if (savedLanguage) setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    setPrinterSettings(parsePrinterSettings(localStorage.getItem(printerStorageKey)));
    setPrinterSettingsReady(true);
  }, []);

  useEffect(() => {
    if (!printerSettingsReady) return;
    localStorage.setItem(printerStorageKey, JSON.stringify(printerSettings));
  }, [printerSettings, printerSettingsReady]);

  useEffect(() => {
    const savedAccounts = parseStoredUsers(localStorage.getItem(userStorageKey));
    if (savedAccounts) setAccounts(savedAccounts);
    setAccountsReady(true);

    function syncAccounts(event: StorageEvent) {
      if (event.key !== userStorageKey) return;
      const nextAccounts = parseStoredUsers(event.newValue);
      if (nextAccounts) setAccounts(nextAccounts);
    }

    window.addEventListener("storage", syncAccounts);
    return () => window.removeEventListener("storage", syncAccounts);
  }, []);

  useEffect(() => {
    if (!accountsReady) return;
    localStorage.setItem(userStorageKey, JSON.stringify(accounts));
  }, [accounts, accountsReady]);

  useEffect(() => {
    const savedMenuItems = parseStoredCollection(localStorage.getItem(menuStorageKey), isMenuItem);
    const savedToppings = parseStoredCollection(localStorage.getItem(toppingStorageKey), isTopping);
    if (savedMenuItems) setMenuItems(savedMenuItems);
    if (savedToppings) setToppings(savedToppings);
    setMenuDataReady(true);

    function syncMenu(event: StorageEvent) {
      if (event.key === menuStorageKey) {
        const nextItems = parseStoredCollection(event.newValue, isMenuItem);
        if (nextItems) setMenuItems(nextItems);
      }
      if (event.key === toppingStorageKey) {
        const nextToppings = parseStoredCollection(event.newValue, isTopping);
        if (nextToppings) setToppings(nextToppings);
      }
    }

    window.addEventListener("storage", syncMenu);
    return () => window.removeEventListener("storage", syncMenu);
  }, []);

  useEffect(() => {
    if (!menuDataReady) return;
    localStorage.setItem(menuStorageKey, JSON.stringify(menuItems));
    localStorage.setItem(toppingStorageKey, JSON.stringify(toppings));
  }, [menuDataReady, menuItems, toppings]);

  useEffect(() => {
    const savedExpenses = parseStoredCollection(localStorage.getItem(expenseStorageKey), isExpense);
    if (savedExpenses) setExpenses(savedExpenses);
    setExpensesReady(true);

    function syncExpenses(event: StorageEvent) {
      if (event.key !== expenseStorageKey) return;
      const nextExpenses = parseStoredCollection(event.newValue, isExpense);
      if (nextExpenses) setExpenses(nextExpenses);
    }

    window.addEventListener("storage", syncExpenses);
    return () => window.removeEventListener("storage", syncExpenses);
  }, []);

  useEffect(() => {
    if (!expensesReady) return;
    localStorage.setItem(expenseStorageKey, JSON.stringify(expenses));
  }, [expenses, expensesReady]);

  useEffect(() => {
    const savedInventory = parseStoredCollection(localStorage.getItem(inventoryStorageKey), isInventoryItem);
    if (savedInventory) setInventory(savedInventory);
    setInventoryReady(true);

    function syncInventory(event: StorageEvent) {
      if (event.key !== inventoryStorageKey) return;
      const nextInventory = parseStoredCollection(event.newValue, isInventoryItem);
      if (nextInventory) setInventory(nextInventory);
    }

    window.addEventListener("storage", syncInventory);
    return () => window.removeEventListener("storage", syncInventory);
  }, []);

  useEffect(() => {
    if (!inventoryReady) return;
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
  }, [inventory, inventoryReady]);

  useEffect(() => {
    const savedTables = parseOperationalCollection(localStorage.getItem(tablesStorageKey), isRestaurantTable);
    const legacyReset = localStorage.getItem(expenseStorageKey) === "[]" && localStorage.getItem(inventoryStorageKey) === "[]";
    const cleanTables = initialTables.map(({ id, number, seats }) => ({ id, number, seats, status: "available" as const }));
    setTables(savedTables?.map((table) => ({ ...table, id: table.id ?? `table-${table.number}` })) ?? (legacyReset ? cleanTables : initialTables));
    setTablesReady(true);
  }, []);

  useEffect(() => {
    if (!tablesReady) return;
    localStorage.setItem(tablesStorageKey, JSON.stringify(tables));
  }, [tables, tablesReady]);

  useEffect(() => {
    setReservations(parseStoredCollection(localStorage.getItem(reservationStorageKey), isReservation) ?? []);
    setReservationsReady(true);
  }, []);

  useEffect(() => {
    if (!reservationsReady) return;
    localStorage.setItem(reservationStorageKey, JSON.stringify(reservations));
  }, [reservations, reservationsReady]);

  useEffect(() => {
    const savedKitchenOrders = parseOperationalCollection(localStorage.getItem(kitchenStorageKey), isKitchenOrder);
    const legacyReset = localStorage.getItem(expenseStorageKey) === "[]" && localStorage.getItem(inventoryStorageKey) === "[]";
    setKitchenOrders(savedKitchenOrders ?? (legacyReset ? [] : initialKitchenOrders));
    setKitchenReady(true);
  }, []);

  useEffect(() => {
    if (!kitchenReady) return;
    localStorage.setItem(kitchenStorageKey, JSON.stringify(kitchenOrders));
  }, [kitchenOrders, kitchenReady]);

  useEffect(() => {
    const savedSales = parseSalesSnapshot(localStorage.getItem(salesStorageKey));
    const legacyReset = localStorage.getItem(expenseStorageKey) === "[]"
      && localStorage.getItem(inventoryStorageKey) === "[]"
      && savedSales?.salesTotal === 1284.5
      && savedSales.orders === 42;
    if (legacyReset) {
      setSalesTotal(0);
      setOrders(0);
      setNextOrderNumber(1);
      setRecentOrders([]);
    } else if (savedSales) {
      setSalesTotal(savedSales.salesTotal);
      setOrders(savedSales.orders);
      setNextOrderNumber(savedSales.nextOrderNumber);
      setRecentOrders(savedSales.recentOrders);
    }
    setSalesReady(true);
  }, []);

  useEffect(() => {
    if (!salesReady) return;
    const snapshot: SalesSnapshot = { salesTotal, orders, nextOrderNumber, recentOrders };
    localStorage.setItem(salesStorageKey, JSON.stringify(snapshot));
  }, [nextOrderNumber, orders, recentOrders, salesReady, salesTotal]);

  useEffect(() => {
    if (!accountsReady || !currentUserId) return;
    const activeAccount = accounts.find((account) => account.id === currentUserId);
    if (activeAccount?.active) return;
    setCurrentUserId(null);
    setShiftOpen(false);
    setOpeningCash(null);
    setOpeningCashInput("");
    setShiftStartedAt("");
    setShiftOpenedBy("");
    setView("dashboard");
    setNotice(language === "ar" ? "لم يعد حسابك مفعّلاً." : "Your account is no longer active.");
    window.setTimeout(() => setNotice(""), 2600);
  }, [accounts, accountsReady, currentUserId, language]);

  useEffect(() => {
    function closeUserLayer(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (factoryResetOpen) setFactoryResetOpen(false);
      else if (restockTarget) {
        setRestockTarget(null);
        setRestockAmount("");
        setRestockError("");
      }
      else if (inventoryDeleteConfirmation) setInventoryDeleteConfirmation(null);
      else if (inventoryEditor) {
        setInventoryEditor(null);
        setInventoryFormError("");
      }
      else if (expenseDeleteConfirmation) setExpenseDeleteConfirmation(null);
      else if (expenseEditor) {
        setExpenseEditor(null);
        setExpenseFormError("");
      }
      else if (menuDeleteConfirmation) setMenuDeleteConfirmation(null);
      else if (userConfirmation) setUserConfirmation(null);
      else if (userEditor) {
        setUserEditor(null);
        setUserFormError("");
        setShowUserPassword(false);
      } else if (menuEditor) {
        setMenuEditor(null);
        setMenuFormError("");
      } else {
        setUserMenuId(null);
      }
    }

    window.addEventListener("keydown", closeUserLayer);
    return () => window.removeEventListener("keydown", closeUserLayer);
  }, [expenseDeleteConfirmation, expenseEditor, factoryResetOpen, inventoryDeleteConfirmation, inventoryEditor, menuDeleteConfirmation, menuEditor, restockTarget, userConfirmation, userEditor]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("cocktailliio-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("cocktailliio-language", language);
    localStorage.setItem("cocktailliio-currency", currency);
  }, [language, currency]);

  function money(amount: number) {
    return currency === "LBP"
      ? `${Math.round(amount * exchangeRate).toLocaleString("en-US")} LBP`
      : `$${amount.toFixed(2)}`;
  }

  function tr(en: string, ar: string) {
    return language === "ar" ? ar : en;
  }

  async function bridgeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!printerSettings.token.trim()) throw new Error(tr("Enter the local print-service token in Settings.", "أدخل رمز خدمة الطباعة المحلية في الإعدادات."));
    const response = await fetch(`${printerSettings.serviceUrl}${path}`, {
      ...options, cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Cocktailliio-Token": printerSettings.token.trim(), ...(options.headers ?? {}) },
    });
    const payload = await response.json().catch(() => ({})) as { error?: string } & T;
    if (!response.ok) throw new Error(payload.error || `Print service returned HTTP ${response.status}.`);
    return payload;
  }

  function bridgeAmount(amount: number) {
    return currency === "LBP" ? Math.round(amount * exchangeRate) : amount;
  }

  function bridgeReceipt(customerReceipt: Receipt) {
    return {
      storeName: "Cocktaillo", ...customerReceipt,
      items: customerReceipt.items.map((item) => ({ ...item, price: bridgeAmount(item.price) })),
      subtotal: bridgeAmount(customerReceipt.subtotal),
      discount: customerReceipt.discount ? bridgeAmount(customerReceipt.discount) : undefined,
      deliveryFee: customerReceipt.deliveryFee ? bridgeAmount(customerReceipt.deliveryFee) : undefined,
      total: bridgeAmount(customerReceipt.total),
      cashReceived: customerReceipt.cashReceived !== undefined ? bridgeAmount(customerReceipt.cashReceived) : undefined,
      change: customerReceipt.change !== undefined ? bridgeAmount(customerReceipt.change) : undefined,
      currency,
    };
  }

  async function sendPrintJob(customerReceipt: Receipt | null, order: KitchenOrder | null, jobId: string, openDrawer: boolean) {
    if (!printerSettings.printerName) throw new Error(tr("Select the POS80 Windows printer in Settings.", "اختر طابعة POS80 من إعدادات ويندوز."));
    await bridgeRequest<{ ok: boolean }>("/print", {
      method: "POST",
      body: JSON.stringify({
        jobId, printerName: printerSettings.printerName, paperWidth: printerSettings.paperWidth,
        copies: customerReceipt ? printerSettings.copies : 1, openDrawer, drawerPin: printerSettings.drawerPin,
        receipt: customerReceipt ? bridgeReceipt(customerReceipt) : null, kitchen: order,
      }),
    });
  }

  async function refreshPrinters() {
    setPrintBusy(true); setPrinterError("");
    try {
      const payload = await bridgeRequest<{ printers: string[] }>("/printers");
      setWindowsPrinters(payload.printers); setPrinterStatus("connected");
      if (!printerSettings.printerName && payload.printers.length === 1) setPrinterSettings((current) => ({ ...current, printerName: payload.printers[0] }));
      showNotice(tr("Local print service connected", "تم الاتصال بخدمة الطباعة المحلية"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not connect to the print service.";
      setPrinterStatus("error"); setPrinterError(message); showNotice(message);
    } finally { setPrintBusy(false); }
  }

  async function printCompletedOrder(customerReceipt: Receipt, order: KitchenOrder) {
    if (!printerSettings.autoPrint) {
      showNotice(tr(`Order ${customerReceipt.number} saved — automatic printing is disabled`, `تم حفظ الطلب ${customerReceipt.number} — الطباعة التلقائية معطلة`));
      return;
    }
    const shouldOpenDrawer = printerSettings.autoOpenDrawer && (customerReceipt.paymentMethod === "Cash" || printerSettings.openDrawerAllPayments);
    setPrintBusy(true); setPrinterError(""); setLastFailedPrint(null);
    try {
      await sendPrintJob(customerReceipt, order, `order-${customerReceipt.number.replace("#", "")}`, shouldOpenDrawer);
      setPrinterStatus("connected");
      showNotice(tr(`Order ${customerReceipt.number} saved and printed`, `تم حفظ وطباعة الطلب ${customerReceipt.number}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printing failed.";
      setPrinterStatus("error"); setPrinterError(message); setLastFailedPrint({ receipt: customerReceipt, kitchen: order, message });
      showNotice(tr(`Order ${customerReceipt.number} is saved. Printing failed: ${message}`, `تم حفظ الطلب ${customerReceipt.number}. فشلت الطباعة: ${message}`));
    } finally { setPrintBusy(false); }
  }

  async function printReceipt() {
    const now = new Date();
    const testReceipt: Receipt = {
      number: "#TEST", type: "Takeaway", cashier: currentUser?.name ?? "Cocktailliio", createdAt: now.toLocaleString(),
      items: [{ name: "Printer test", quantity: 1, price: 0 }], subtotal: 0, total: 0, paymentMethod: "Cash",
    };
    setPrintBusy(true); setPrinterError("");
    try {
      await sendPrintJob(testReceipt, null, `test-${now.getTime()}`, false);
      setPrinterStatus("connected"); showNotice(tr("Test receipt printed", "تمت طباعة الإيصال التجريبي"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test print failed.";
      setPrinterStatus("error"); setPrinterError(message); showNotice(message);
    } finally { setPrintBusy(false); }
  }

  async function printCurrentReceipt() {
    if (!receipt) return;
    setPrintBusy(true); setPrinterError("");
    try {
      await sendPrintJob(receipt, null, `reprint-${receipt.number.replace("#", "")}-${Date.now()}`, false);
      setLastFailedPrint(null); setPrinterStatus("connected"); showNotice(tr("Receipt reprinted", "تمت إعادة طباعة الإيصال"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reprint failed.";
      setPrinterStatus("error"); setPrinterError(message); showNotice(message);
    } finally { setPrintBusy(false); }
  }

  async function printKitchenReceipt(order: KitchenOrder) {
    setPrintBusy(true); setPrinterError("");
    try {
      await sendPrintJob(null, order, `kitchen-${order.number.replace("#", "")}-${Date.now()}`, false);
      setPrinterStatus("connected"); showNotice(tr(`Kitchen ticket ${order.number} printed`, `تمت طباعة تذكرة المطبخ ${order.number}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kitchen printing failed.";
      setPrinterStatus("error"); setPrinterError(message); showNotice(message);
    } finally { setPrintBusy(false); }
  }

  async function openCashDrawer() {
    if (!printerSettings.printerName) {
      const message = tr("Select the POS80 Windows printer first.", "اختر طابعة POS80 أولاً.");
      setPrinterError(message); showNotice(message); return;
    }
    setPrintBusy(true); setPrinterError("");
    try {
      await bridgeRequest<{ ok: boolean }>("/drawer", {
        method: "POST",
        body: JSON.stringify({ jobId: `drawer-${Date.now()}`, printerName: printerSettings.printerName, drawerPin: printerSettings.drawerPin }),
      });
      setPrinterStatus("connected"); showNotice(tr("Cash drawer command sent", "تم إرسال أمر فتح درج النقود"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cash drawer test failed.";
      setPrinterStatus("error"); setPrinterError(message); showNotice(message);
    } finally { setPrintBusy(false); }
  }

  function toggleKitchenOrder(id: number) {
    setKitchenOrders((current) => current.map((order) => order.id === id
      ? { ...order, status: order.status === "pending" ? "done" : "pending" }
      : order));
  }

  function openAddExpense() {
    setExpenseForm({ ...emptyExpenseForm, date: getTodayInputValue() });
    setExpenseFormError("");
    setExpenseEditor({ mode: "add", id: null });
  }

  function openEditExpense(expense: Expense) {
    const displayedAmount = currency === "LBP"
      ? String(Math.round(expense.amount * exchangeRate))
      : expense.amount.toFixed(2);
    setExpenseForm({
      item: expense.item,
      category: expense.category,
      amount: displayedAmount,
      date: expense.date,
      paidFrom: expense.paidFrom ?? "owner",
    });
    setExpenseFormError("");
    setExpenseEditor({ mode: "edit", id: expense.id });
  }

  function closeExpenseEditor() {
    setExpenseEditor(null);
    setExpenseForm(emptyExpenseForm);
    setExpenseFormError("");
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseEditor) return;
    const item = expenseForm.item.trim().replace(/\s+/g, " ");
    const enteredAmount = Number(expenseForm.amount.replace(/,/g, "").trim());
    const existing = expenseEditor.mode === "edit"
      ? expenses.find((expense) => expense.id === expenseEditor.id)
      : null;

    if (item.length < 2 || item.length > 80) {
      setExpenseFormError(tr("Enter a description between 2 and 80 characters.", "أدخل وصفاً من حرفين إلى 80 حرفاً."));
      return;
    }
    if (!expenseForm.amount.trim() || !Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      setExpenseFormError(tr("Enter a valid amount greater than zero.", "أدخل مبلغاً صحيحاً أكبر من صفر."));
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseForm.date)) {
      setExpenseFormError(tr("Choose a valid expense date.", "اختر تاريخاً صحيحاً للمصروف."));
      return;
    }
    if (expenseForm.paidFrom === "cash_drawer" && !shiftOpen) {
      setExpenseFormError(tr("Open a shift before recording a cash drawer expense.", "افتح الدوام قبل تسجيل مصروف من صندوق النقد."));
      return;
    }

    const amount = currency === "LBP" ? enteredAmount / exchangeRate : enteredAmount;
    let persistedId: string | null = null;
    if (hasBackendConfig()) {
      try {
        const result = await posApi<{ id: string }>(existing?`/api/expenses/${encodeURIComponent(existing.id)}`:"/api/expenses", { method: existing?"PUT":"POST", body: JSON.stringify({ description: item, category: expenseForm.category, amountCents: Math.round(amount * 100), paidFrom: expenseForm.paidFrom, expenseDate: expenseForm.date }) });
        persistedId = result.id;
      } catch (error) { setExpenseFormError(error instanceof Error ? error.message : tr("Could not save expense.", "تعذر حفظ المصروف.")); return; }
    }
    const nextExpense: Expense = {
      id: existing?.id ?? persistedId ?? crypto.randomUUID(),
      item,
      category: expenseForm.category,
      amount,
      date: expenseForm.date,
      addedBy: existing?.addedBy ?? currentUser?.name ?? "Cocktailliio",
      paidFrom: expenseForm.paidFrom,
    };
    setExpenses((current) => existing
      ? current.map((expense) => expense.id === existing.id ? nextExpense : expense)
      : [nextExpense, ...current]);
    closeExpenseEditor();
    showNotice(tr(existing ? "Expense updated" : "Expense added", existing ? "تم تعديل المصروف" : "تمت إضافة المصروف"));
  }

  async function deleteExpense() {
    if (!expenseDeleteConfirmation) return;
    try{if(hasBackendConfig())await posApi(`/api/expenses/${encodeURIComponent(expenseDeleteConfirmation.id)}`,{method:"DELETE"});}catch(error){showNotice(error instanceof Error?error.message:tr("Could not delete expense.","تعذر حذف المصروف."));return;}
    setExpenses((current) => current.filter((expense) => expense.id !== expenseDeleteConfirmation.id));
    showNotice(tr("Expense deleted", "تم حذف المصروف"));
    setExpenseDeleteConfirmation(null);
  }

  function formatExpenseDate(date: string) {
    if (date === getTodayInputValue()) return tr("Today", "اليوم");
    const value = new Date(`${date}T12:00:00`);
    return new Intl.DateTimeFormat(language === "ar" ? "ar-LB" : "en-LB", { day: "numeric", month: "short", year: "numeric" }).format(value);
  }

  function openAddInventoryItem() {
    setInventoryForm(emptyInventoryForm);
    setInventoryFormError("");
    setInventoryEditor({ mode: "add", id: null });
  }

  function openEditInventoryItem(item: InventoryItem) {
    const displayedCost = currency === "LBP"
      ? String(Math.round(item.cost * exchangeRate))
      : item.cost.toFixed(2);
    setInventoryForm({
      item: item.item,
      category: item.category,
      stock: String(item.stock),
      unit: item.unit,
      min: String(item.min),
      cost: displayedCost,
    });
    setInventoryFormError("");
    setInventoryEditor({ mode: "edit", id: item.id });
  }

  function closeInventoryEditor() {
    setInventoryEditor(null);
    setInventoryForm(emptyInventoryForm);
    setInventoryFormError("");
  }

  async function submitInventoryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inventoryEditor) return;
    const itemName = inventoryForm.item.trim().replace(/\s+/g, " ");
    const category = inventoryForm.category.trim().replace(/\s+/g, " ");
    const stock = Number(inventoryForm.stock.replace(/,/g, ""));
    const min = Number(inventoryForm.min.replace(/,/g, ""));
    const enteredCost = Number(inventoryForm.cost.replace(/,/g, ""));
    const existing = inventoryEditor.mode === "edit"
      ? inventory.find((item) => item.id === inventoryEditor.id)
      : null;
    const duplicate = inventory.some((item) => item.id !== existing?.id && item.item.trim().toLowerCase() === itemName.toLowerCase());

    if (itemName.length < 2 || itemName.length > 80) {
      setInventoryFormError(tr("Enter an item name between 2 and 80 characters.", "أدخل اسم الصنف من حرفين إلى 80 حرفاً."));
      return;
    }
    if (category.length < 2 || category.length > 50) {
      setInventoryFormError(tr("Enter a category between 2 and 50 characters.", "أدخل فئة من حرفين إلى 50 حرفاً."));
      return;
    }
    if (duplicate) {
      setInventoryFormError(tr("An inventory item with this name already exists.", "يوجد صنف مخزون بهذا الاسم."));
      return;
    }
    if (![stock, min, enteredCost].every((value) => Number.isFinite(value) && value >= 0)) {
      setInventoryFormError(tr("Quantity, alert level and cost must be valid positive numbers or zero.", "يجب أن تكون الكمية وحد التنبيه والتكلفة أرقاماً صحيحة موجبة أو صفراً."));
      return;
    }

    const cost = currency === "LBP" ? enteredCost / exchangeRate : enteredCost;
    let nextId=existing?.id ?? crypto.randomUUID();
    if(hasBackendConfig()) try { const result=await posApi<{id:string}>(existing?`/api/inventory/${encodeURIComponent(existing.id)}`:"/api/inventory",{method:existing?"PUT":"POST",body:JSON.stringify({name:itemName,category,quantityBase:stock,alertQuantityBase:min,displayUnit:inventoryForm.unit==="item"?"piece":inventoryForm.unit==="box"?"pack":inventoryForm.unit,costMicrosPerBase:Math.round(cost*1_000_000)})});nextId=result.id;} catch(error){setInventoryFormError(error instanceof Error?error.message:tr("Could not save inventory item.","تعذر حفظ صنف المخزون."));return;}
    const nextItem: InventoryItem = {
      id: nextId,
      item: itemName,
      category,
      stock,
      unit: inventoryForm.unit,
      min,
      cost,
    };
    setInventory((current) => existing
      ? current.map((item) => item.id === existing.id ? nextItem : item)
      : [...current, nextItem]);
    closeInventoryEditor();
    showNotice(tr(existing ? "Inventory item updated" : "Inventory item added", existing ? "تم تعديل صنف المخزون" : "تمت إضافة صنف المخزون"));
  }

  async function deleteInventoryItem() {
    if (!inventoryDeleteConfirmation) return;
    try{if(hasBackendConfig())await posApi(`/api/inventory/${encodeURIComponent(inventoryDeleteConfirmation.id)}`,{method:"DELETE"});}catch(error){showNotice(error instanceof Error?error.message:tr("Could not delete inventory item.","تعذر حذف صنف المخزون."));return;}
    setInventory((current) => current.filter((item) => item.id !== inventoryDeleteConfirmation.id));
    showNotice(tr("Inventory item deleted", "تم حذف صنف المخزون"));
    setInventoryDeleteConfirmation(null);
  }

  function openRestock(item: InventoryItem) {
    setRestockTarget(item);
    setRestockAmount("");
    setRestockError("");
  }

  function closeRestock() {
    setRestockTarget(null);
    setRestockAmount("");
    setRestockError("");
  }

  async function submitRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restockTarget) return;
    const amount = Number(restockAmount.replace(/,/g, ""));
    if (!restockAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setRestockError(tr("Enter a quantity greater than zero.", "أدخل كمية أكبر من صفر."));
      return;
    }
    try{if(hasBackendConfig())await posApi(`/api/inventory/${encodeURIComponent(restockTarget.id)}/restock`,{method:"POST",body:JSON.stringify({amount})});}catch(error){setRestockError(error instanceof Error?error.message:tr("Could not restock item.","تعذر تحديث المخزون."));return;}
    setInventory((current) => current.map((item) => item.id === restockTarget.id ? { ...item, stock: item.stock + amount } : item));
    showNotice(tr(`${restockTarget.item} restocked`, `تمت زيادة مخزون ${restockTarget.item}`));
    closeRestock();
  }

  async function toggleShift() {
    if (shiftOpen) {
      if (hasBackendConfig()) {
        try { await posApi("/api/shifts/close", { method: "POST", body: JSON.stringify({ closingCashCents: Math.round((openingCash ?? 0) * 100) }) }); }
        catch (error) { showNotice(error instanceof Error ? error.message : tr("Could not close shift", "تعذر إغلاق الدوام")); return; }
      }
      setShiftOpen(false);
      setOpeningCash(null);
      setOpeningCashInput("");
      setShiftStartedAt("");
      setShiftOpenedBy("");
      showNotice(tr("Shift closed and summary saved", "تم إغلاق الدوام وحفظ الملخص"));
      return;
    }
    const rawOpeningCash = openingCashInput.replace(/,/g, "").trim();
    const amount = Number(rawOpeningCash);
    if (!rawOpeningCash || Number.isNaN(amount) || amount < 0) {
      showNotice(tr("Enter a valid opening cash amount", "أدخل مبلغًا صحيحًا"));
      return;
    }
    const openingAmount = currency === "LBP" ? amount / exchangeRate : amount;
    if (hasBackendConfig()) {
      try { await posApi("/api/shifts/open", { method: "POST", body: JSON.stringify({ openingCashCents: Math.round(openingAmount * 100) }) }); }
      catch (error) { showNotice(error instanceof Error ? error.message : tr("Could not open shift", "تعذر فتح الدوام")); return; }
    }
    setOpeningCash(openingAmount);
    setShiftOpen(true);
    setShiftStartedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setShiftOpenedBy(currentUser?.name ?? tr("Current user", "المستخدم الحالي"));
    setOpeningCashInput("");
    showNotice(tr("Shift opened successfully", "تم فتح الدوام بنجاح"));
  }

  function exportExcel() {
    const esc = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const cell = (value: string | number, type = "String", style = "") => `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${type}">${esc(value)}</Data></Cell>`;
    const row = (values: (string | number)[], header = false) => `<Row>${values.map((value) => cell(value, typeof value === "number" ? "Number" : "String", header ? "Header" : "")).join("")}</Row>`;
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const sales = salesTotal;
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Styles><Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#921414" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="18" ss:Color="#921414"/></Style></Styles>
      <Worksheet ss:Name="Summary"><Table><Column ss:Width="180"/><Column ss:Width="130"/><Row ss:Height="30">${cell(`Cocktailliio ${period} Report`, "String", "Title")}</Row>${row(["Generated", new Date().toLocaleString()])}${row(["Period", period])}${row(["Gross sales (USD)", sales])}${row(["Expenses (USD)", expenseTotal])}${row(["Cash drawer expenses (USD)", expenses.filter((expense) => (expense.paidFrom ?? "owner") === "cash_drawer").reduce((sum, expense) => sum + expense.amount, 0)])}${row(["Owner-paid expenses (USD)", expenses.filter((expense) => (expense.paidFrom ?? "owner") === "owner").reduce((sum, expense) => sum + expense.amount, 0)])}${row(["Estimated net (USD)", sales - expenseTotal])}${row(["Orders", orders])}</Table></Worksheet>
      <Worksheet ss:Name="Expenses"><Table><Column ss:Width="190"/><Column ss:Width="110"/><Column ss:Width="100"/><Column ss:Width="130"/><Column ss:Width="100"/>${row(["Description","Category","Date","Added by","Amount USD"], true)}${expenses.map((expense) => row([expense.item,expense.category,expense.date,expense.addedBy,expense.amount])).join("")}${row(["TOTAL","","","",expenseTotal], true)}</Table></Worksheet>
      <Worksheet ss:Name="Inventory"><Table><Column ss:Width="170"/><Column ss:Width="110"/><Column ss:Width="80"/><Column ss:Width="70"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="100"/><Column ss:Width="100"/>${row(["Item","Category","Quantity","Unit","Alert at","Status","Cost per unit USD","Stock value USD"], true)}${inventory.map((item) => row([item.item,item.category,item.stock,item.unit,item.min,item.stock <= item.min ? "LOW STOCK" : "In stock",item.cost,item.stock * item.cost])).join("")}</Table></Worksheet>
      <Worksheet ss:Name="Menu"><Table><Column ss:Width="180"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="110"/><Column ss:Width="110"/>${row(["Menu item","Category","Price USD","Availability","Customizable"], true)}${menuItems.map((item) => row([item.name,item.category,item.price,item.available ? "Available" : "Hidden",item.customizable ? "Yes" : "No"])).join("")}</Table></Worksheet>
      <Worksheet ss:Name="Toppings"><Table><Column ss:Width="180"/><Column ss:Width="100"/><Column ss:Width="110"/>${row(["Topping","Price USD","Availability"], true)}${toppings.map((topping) => row([`${topping.emoji} ${topping.name}`,topping.price,topping.available ? "Available" : "Hidden"])).join("")}</Table></Worksheet>
    </Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Cocktailliio-${period}-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice(`${period} Excel report exported`);
  }

  function applyBackend(data: BackendBootstrap) {
    const backendRole: Role = data.user.role === "cashier" ? "cashier" : "manager";
    const signedIn: UserAccount = { id: data.user.id, username: data.user.username, password: "", name: data.user.name, initials: makeInitials(data.user.name), role: backendRole, active: true };
    setAccounts((current) => [signedIn, ...current.filter((entry) => entry.id !== signedIn.id)]);
    setCurrentUserId(signedIn.id);
    setMenuItems(data.menu.map((item) => ({ id: item.id, name: item.name, description: item.description, price: item.price_cents / 100, image: item.image_url ?? "", category: item.category as MenuCategory, available: Boolean(item.available), customizable: Boolean(item.customizable) })));
    setToppings(data.addons.map((item) => ({ id: item.id, name: item.name, price: item.price_cents / 100, emoji: item.emoji, available: Boolean(item.available) })));
    setInventory(data.inventory.map((item) => ({ id: item.id, item: item.name, category: item.category, stock: item.quantity_base, unit: (item.display_unit === "piece" ? "item" : item.display_unit === "pack" ? "box" : item.display_unit) as InventoryUnit, min: item.alert_quantity_base, cost: item.cost_micros_per_base / 1_000_000 })));
    setTables(data.tables.map((table) => ({ id: table.id, number: Number(table.name.match(/\d+/)?.[0] ?? table.id.match(/\d+/)?.[0] ?? 0), seats: table.capacity, currentGuests: table.current_guests, status: table.status as TableStatus })));
    setReservations(data.reservations.map((raw) => {
      const reservation = raw as { id: string; customer_name: string; guest_count: number; table_id: string; starts_at: string; phone?: string | null; notes?: string | null; status: string };
      const start = new Date(reservation.starts_at);
      return { id: reservation.id, customerName: reservation.customer_name, guests: reservation.guest_count, tableNumber: Number(reservation.table_id.match(/\d+/)?.[0] ?? 0), date: start.toISOString().slice(0, 10), time: start.toTimeString().slice(0, 5), phone: reservation.phone ?? "", notes: reservation.notes ?? "", status: reservation.status.replace("_", "-") as ReservationStatus };
    }));
    setExpenses(data.expenses.map((expense) => ({ id: expense.id, item: expense.description, category: expense.category as ExpenseCategory, amount: expense.amount_cents / 100, date: expense.expense_date, addedBy: expense.added_by, paidFrom: expense.paid_from })));
    setShiftOpen(Boolean(data.shift));
    setOpeningCash(data.shift ? data.shift.opening_cash_cents / 100 : null);
    setShiftStartedAt(data.shift?.opened_at ?? "");
    setShiftOpenedBy(data.shift ? data.user.name : "");
    setSalesTotal((data.metrics?.sales_cents ?? 0) / 100);
    setOrders(data.metrics?.orders ?? 0);
    setNextOrderNumber(data.metrics?.next_order_number ?? 1);
    setRecentOrders(data.recentOrders.map((order) => ({ number: `#${order.order_number}`, type: order.order_type.replace("_", " "), cashier: order.cashier, time: new Date(order.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), status: order.status === "finalized" ? "Paid" : "Preparing", total: order.total_cents / 100 })));
    setView(backendRole === "manager" ? "dashboard" : data.shift ? "pos" : "shift");
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountsReady) return;
    if (hasBackendConfig()) {
      setBackendBusy(true); setLoginError("");
      try {
        const login = await posApi<{ token: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username: loginForm.username.trim(), password: loginForm.password }) });
        saveSessionToken(login.token);
        const bootstrap = await posApi<BackendBootstrap>("/api/bootstrap");
        applyBackend(bootstrap);
        setLoginForm({ username: "", password: "" }); setShowPassword(false);
        showNotice(tr("Signed in securely", "تم تسجيل الدخول بأمان"));
      } catch (error) {
        clearSessionToken();
        setLoginError(error instanceof Error ? error.message : tr("Could not sign in.", "تعذر تسجيل الدخول."));
      } finally { setBackendBusy(false); }
      return;
    }
    const username = loginForm.username.trim().toLowerCase();
    const account = accounts.find((user) => (
      user.active
      && user.username.toLowerCase() === username
      && user.password === loginForm.password
    ));
    if (!account) {
      setLoginError(tr("Incorrect username or password.", "اسم المستخدم أو كلمة المرور غير صحيحة."));
      return;
    }
    setCurrentUserId(account.id);
    setView(account.role === "manager" ? "dashboard" : "shift");
    setLoginForm({ username: "", password: "" });
    setLoginError("");
    setShowPassword(false);
    showNotice(account.role === "manager"
      ? tr("Manager access enabled", "تم تفعيل صلاحيات المدير")
      : tr("Cashier signed in — open your shift to begin", "تم تسجيل دخول الكاشير — افتح الدوام للبدء"));
  }

  function logout() {
    if (shiftOpen) {
      setView("shift");
      showNotice(tr("Close the open shift before signing out", "أغلق الدوام المفتوح قبل تسجيل الخروج"));
      return;
    }
    setCurrentUserId(null);
    clearSessionToken();
    setView("dashboard");
    setLoginForm({ username: "", password: "" });
    setLoginError("");
    setShowPassword(false);
  }

  function openAddUser() {
    setUserMenuId(null);
    setUserForm(emptyUserForm);
    setUserFormError("");
    setShowUserPassword(false);
    setUserEditor({ mode: "add", userId: null });
  }

  function openEditUser(user: UserAccount) {
    setUserMenuId(null);
    setUserForm({
      name: user.name,
      username: user.username,
      password: "",
      confirmPassword: "",
      role: user.role,
      active: user.active,
    });
    setUserFormError("");
    setShowUserPassword(false);
    setUserEditor({ mode: "edit", userId: user.id });
  }

  function closeUserEditor() {
    setUserEditor(null);
    setUserForm(emptyUserForm);
    setUserFormError("");
    setShowUserPassword(false);
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userEditor) return;

    const cleanName = userForm.name.trim().replace(/\s+/g, " ");
    const cleanUsername = userForm.username.trim().toLowerCase();
    const existing = userEditor.mode === "edit"
      ? accounts.find((account) => account.id === userEditor.userId)
      : null;
    const duplicateUsername = accounts.some((account) => (
      account.id !== existing?.id
      && account.username.toLowerCase() === cleanUsername
    ));

    if (cleanName.length < 2 || cleanName.length > 60) {
      setUserFormError(tr("Enter a name between 2 and 60 characters.", "أدخل اسماً من حرفين إلى 60 حرفاً."));
      return;
    }
    if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(cleanUsername)) {
      setUserFormError(tr(
        "Username must be 3–24 characters using letters, numbers, dot, dash or underscore.",
        "اسم المستخدم يجب أن يكون من 3 إلى 24 حرفاً ويحتوي أحرفاً إنجليزية أو أرقاماً أو . أو - أو _.",
      ));
      return;
    }
    if (duplicateUsername) {
      setUserFormError(tr("Username is already in use.", "اسم المستخدم مستخدم بالفعل."));
      return;
    }

    const passwordRequired = userEditor.mode === "add";
    const passwordChanged = Boolean(userForm.password || userForm.confirmPassword);
    if (passwordRequired || passwordChanged) {
      if (userForm.password !== userForm.password.trim() || userForm.password.length < 4 || userForm.password.length > 64) {
        setUserFormError(tr(
          "Password must be 4–64 characters with no spaces at the beginning or end.",
          "كلمة المرور يجب أن تكون من 4 إلى 64 حرفاً ومن دون فراغات في البداية أو النهاية.",
        ));
        return;
      }
      if (userForm.password !== userForm.confirmPassword) {
        setUserFormError(tr("Passwords do not match.", "كلمتا المرور غير متطابقتين."));
        return;
      }
    }

    if (userEditor.mode === "edit") {
      if (!existing) {
        closeUserEditor();
        showNotice(tr("User no longer exists.", "المستخدم لم يعد موجوداً."));
        return;
      }
      if (existing.id === currentUserId && (userForm.role !== existing.role || !userForm.active)) {
        setUserFormError(tr(
          "You cannot remove your own access while signed in.",
          "لا يمكنك إزالة صلاحيات حسابك أثناء تسجيل الدخول.",
        ));
        return;
      }
      const removesActiveManager = existing.role === "manager"
        && existing.active
        && (userForm.role !== "manager" || !userForm.active);
      const otherActiveManagers = accounts.filter((account) => (
        account.id !== existing.id && account.role === "manager" && account.active
      )).length;
      if (removesActiveManager && otherActiveManagers === 0) {
        setUserFormError(tr(
          "Add another active manager before changing this account.",
          "أضف مديراً آخر مفعّلاً قبل تغيير هذا الحساب.",
        ));
        return;
      }

      const updatedAccount: UserAccount = {
        ...existing,
        name: cleanName,
        initials: makeInitials(cleanName),
        username: cleanUsername,
        password: passwordChanged ? userForm.password : existing.password,
        role: userForm.role,
        active: userForm.active,
      };
      try{if(hasBackendConfig())await posApi(`/api/users/${encodeURIComponent(existing.id)}`,{method:"PUT",body:JSON.stringify({name:cleanName,username:cleanUsername,password:passwordChanged?userForm.password:undefined,role:userForm.role,active:userForm.active})});}catch(error){setUserFormError(error instanceof Error?error.message:tr("Could not update user.","تعذر تعديل المستخدم."));return;}
      setAccounts((current) => current.map((account) => account.id === existing.id ? updatedAccount : account));
      closeUserEditor();
      showNotice(tr(`${cleanName} updated`, `تم تعديل ${cleanName}`));
      return;
    }

    let newUserId=typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `user-${Date.now()}`;
    try{if(hasBackendConfig()){const result=await posApi<{id:string}>("/api/users",{method:"POST",body:JSON.stringify({name:cleanName,username:cleanUsername,password:userForm.password,role:userForm.role,active:userForm.active})});newUserId=result.id;}}catch(error){setUserFormError(error instanceof Error?error.message:tr("Could not add user.","تعذر إضافة المستخدم."));return;}
    const newAccount: UserAccount = {
      id: newUserId,
      name: cleanName,
      initials: makeInitials(cleanName),
      username: cleanUsername,
      password: userForm.password,
      role: userForm.role,
      active: userForm.active,
    };
    setAccounts((current) => [...current, newAccount]);
    closeUserEditor();
    showNotice(tr(`${cleanName} added and ready to sign in`, `تمت إضافة ${cleanName} وأصبح الحساب جاهزاً للدخول`));
  }

  function canRemoveUserAccess(user: UserAccount) {
    if (user.id === currentUserId) {
      showNotice(tr("You cannot deactivate or delete your own account.", "لا يمكنك تعطيل أو حذف حسابك الحالي."));
      return false;
    }
    const otherActiveManagers = accounts.filter((account) => (
      account.id !== user.id && account.role === "manager" && account.active
    )).length;
    if (user.role === "manager" && user.active && otherActiveManagers === 0) {
      showNotice(tr("At least one active manager is required.", "يجب أن يبقى مدير واحد مفعّلاً على الأقل."));
      return false;
    }
    return true;
  }

  function requestUserConfirmation(kind: "deactivate" | "delete", user: UserAccount) {
    setUserMenuId(null);
    if (!canRemoveUserAccess(user)) return;
    setUserConfirmation({ kind, userId: user.id });
  }

  async function activateUser(user: UserAccount) {
    setUserMenuId(null);
    try{if(hasBackendConfig())await posApi(`/api/users/${encodeURIComponent(user.id)}`,{method:"PUT",body:JSON.stringify({name:user.name,username:user.username,role:user.role,active:true})});}catch(error){showNotice(error instanceof Error?error.message:"Could not activate user");return;}
    setAccounts((current) => current.map((account) => account.id === user.id ? { ...account, active: true } : account));
    showNotice(tr(`${user.name} activated`, `تم تفعيل ${user.name}`));
  }

  async function confirmUserChange() {
    if (!userConfirmation) return;
    const target = accounts.find((account) => account.id === userConfirmation.userId);
    if (!target) {
      setUserConfirmation(null);
      showNotice(tr("User no longer exists.", "المستخدم لم يعد موجوداً."));
      return;
    }
    if (!canRemoveUserAccess(target)) {
      setUserConfirmation(null);
      return;
    }

    if (userConfirmation.kind === "deactivate") {
      try{if(hasBackendConfig())await posApi(`/api/users/${encodeURIComponent(target.id)}`,{method:"PUT",body:JSON.stringify({name:target.name,username:target.username,role:target.role,active:false})});}catch(error){showNotice(error instanceof Error?error.message:"Could not deactivate user");return;}
      setAccounts((current) => current.map((account) => (
        account.id === target.id ? { ...account, active: false } : account
      )));
      showNotice(tr(`${target.name} deactivated`, `تم تعطيل ${target.name}`));
    } else {
      try{if(hasBackendConfig())await posApi(`/api/users/${encodeURIComponent(target.id)}`,{method:"DELETE"});}catch(error){showNotice(error instanceof Error?error.message:"Could not delete user");return;}
      setAccounts((current) => current.filter((account) => account.id !== target.id));
      showNotice(tr(`${target.name} deleted`, `تم حذف ${target.name}`));
    }
    setUserConfirmation(null);
  }

  function openAddMenuEntry(kind: "item" | "topping") {
    setMenuFormError("");
    if (kind === "item") {
      setMenuItemForm(emptyMenuItemForm);
      setMenuEditor({ kind, mode: "add", id: null });
    } else {
      setToppingForm(emptyToppingForm);
      setMenuEditor({ kind, mode: "add", id: null });
    }
  }

  function openEditMenuItem(item: MenuItem) {
    setMenuFormError("");
    setMenuItemForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      image: item.image,
      category: item.category,
      available: item.available,
      customizable: item.customizable,
    });
    setMenuEditor({ kind: "item", mode: "edit", id: item.id });
  }

  function openEditTopping(topping: Topping) {
    setMenuFormError("");
    setToppingForm({
      name: topping.name,
      price: String(topping.price),
      emoji: topping.emoji,
      available: topping.available,
    });
    setMenuEditor({ kind: "topping", mode: "edit", id: topping.id });
  }

  function closeMenuEditor() {
    setMenuEditor(null);
    setMenuItemForm(emptyMenuItemForm);
    setToppingForm(emptyToppingForm);
    setMenuFormError("");
  }

  async function uploadMenuImage(file: File | undefined) {
    if (!file) return;
    if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type) || file.size > 750 * 1024) {
      setMenuFormError(tr("Choose a JPG, PNG or WebP image smaller than 750 KB.", "اختر صورة JPG أو PNG أو WebP أصغر من 750 كيلوبايت.")); return;
    }
    setMenuImageUploading(true); setMenuFormError("");
    try {
      const image = await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Image upload failed."));reader.readAsDataURL(file);});
      setMenuItemForm((current) => ({ ...current, image }));
    } catch (error) {
      setMenuFormError(error instanceof Error ? error.message : tr("Image upload failed.", "فشل رفع الصورة."));
    } finally { setMenuImageUploading(false); }
  }

  async function submitMenuEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!menuEditor) return;

    if (menuEditor.kind === "item") {
      const name = menuItemForm.name.trim().replace(/\s+/g, " ");
      const description = menuItemForm.description.trim().replace(/\s+/g, " ");
      const image = menuItemForm.image.trim();
      const price = Number(menuItemForm.price.replace(",", "."));
      const existing = menuEditor.mode === "edit"
        ? menuItems.find((item) => item.id === menuEditor.id)
        : null;
      const duplicate = menuItems.some((item) => item.id !== existing?.id && item.name.trim().toLowerCase() === name.toLowerCase());

      if (name.length < 2 || name.length > 60) {
        setMenuFormError(tr("Enter an item name between 2 and 60 characters.", "أدخل اسم الصنف من حرفين إلى 60 حرفاً."));
        return;
      }
      if (!menuItemForm.price.trim() || !Number.isFinite(price) || price < 0 || price > 10000) {
        setMenuFormError(tr("Enter a valid USD price between 0 and 10,000.", "أدخل سعراً صحيحاً بالدولار بين 0 و10,000."));
        return;
      }
      if (duplicate) {
        setMenuFormError(tr("A menu item with this name already exists.", "يوجد صنف بهذا الاسم بالفعل."));
        return;
      }
      if (image && !/^(https?:\/\/|\/|data:image\/(jpeg|png|webp);base64,)/i.test(image)) {
        setMenuFormError(tr("Photo must be a valid web URL, or leave it blank.", "يجب أن تكون الصورة رابطاً صحيحاً، أو اتركها فارغة."));
        return;
      }

      let nextId=existing?.id ?? (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `menu-${Date.now()}`);
      try{if(hasBackendConfig()){const result=await posApi<{id:string}>(existing?`/api/menu-items/${encodeURIComponent(existing.id)}`:"/api/menu-items",{method:existing?"PUT":"POST",body:JSON.stringify({name,description,priceCents:Math.round(price*100),imageUrl:image,category:menuItemForm.category,available:menuItemForm.available,customizable:menuItemForm.customizable})});nextId=result.id;}}catch(error){setMenuFormError(error instanceof Error?error.message:tr("Could not save menu item.","تعذر حفظ الصنف."));return;}
      const nextItem: MenuItem = {
        id: nextId,
        name,
        description,
        price,
        image,
        category: menuItemForm.category,
        available: menuItemForm.available,
        customizable: menuItemForm.customizable,
      };
      setMenuItems((current) => existing
        ? current.map((item) => item.id === existing.id ? nextItem : item)
        : [...current, nextItem]);
      closeMenuEditor();
      showNotice(tr(
        existing ? `${name} updated` : `${name} added to the menu`,
        existing ? `تم تعديل ${name}` : `تمت إضافة ${name} إلى القائمة`,
      ));
      return;
    }

    const name = toppingForm.name.trim().replace(/\s+/g, " ");
    const price = Number(toppingForm.price.replace(",", "."));
    const existing = menuEditor.mode === "edit"
      ? toppings.find((topping) => topping.id === menuEditor.id)
      : null;
    const duplicate = toppings.some((topping) => topping.id !== existing?.id && topping.name.trim().toLowerCase() === name.toLowerCase());

    if (name.length < 2 || name.length > 60) {
      setMenuFormError(tr("Enter a topping name between 2 and 60 characters.", "أدخل اسم الإضافة من حرفين إلى 60 حرفاً."));
      return;
    }
    if (!toppingForm.price.trim() || !Number.isFinite(price) || price < 0 || price > 10000) {
      setMenuFormError(tr("Enter a valid USD price between 0 and 10,000.", "أدخل سعراً صحيحاً بالدولار بين 0 و10,000."));
      return;
    }
    if (duplicate) {
      setMenuFormError(tr("A topping with this name already exists.", "توجد إضافة بهذا الاسم بالفعل."));
      return;
    }

    let nextToppingId=existing?.id ?? (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `topping-${Date.now()}`);
    try{if(hasBackendConfig()){const result=await posApi<{id:string}>(existing?`/api/addons/${encodeURIComponent(existing.id)}`:"/api/addons",{method:existing?"PUT":"POST",body:JSON.stringify({name,priceCents:Math.round(price*100),emoji:toppingForm.emoji.trim()||"✦",available:toppingForm.available})});nextToppingId=result.id;}}catch(error){setMenuFormError(error instanceof Error?error.message:tr("Could not save topping.","تعذر حفظ الإضافة."));return;}
    const nextTopping: Topping = {
      id: nextToppingId,
      name,
      price,
      emoji: toppingForm.emoji.trim() || "✦",
      available: toppingForm.available,
    };
    setToppings((current) => existing
      ? current.map((topping) => topping.id === existing.id ? nextTopping : topping)
      : [...current, nextTopping]);
    closeMenuEditor();
    showNotice(tr(
      existing ? `${name} updated` : `${name} topping added`,
      existing ? `تم تعديل ${name}` : `تمت إضافة ${name}`,
    ));
  }

  async function toggleMenuEntry(kind: "item" | "topping", id: string) {
    if (kind === "item") {
      const target = menuItems.find((item) => item.id === id);
      if (!target) return;
      try{if(hasBackendConfig())await posApi(`/api/menu-items/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({name:target.name,description:target.description,priceCents:Math.round(target.price*100),imageUrl:target.image,category:target.category,available:!target.available,customizable:target.customizable})});}catch(error){showNotice(error instanceof Error?error.message:"Could not update menu item");return;}
      setMenuItems((current) => current.map((item) => item.id === id ? { ...item, available: !item.available } : item));
      showNotice(tr(`${target.name} ${target.available ? "hidden" : "available"}`, `${target.name} ${target.available ? "مخفي" : "متاح"}`));
      return;
    }
    const target = toppings.find((topping) => topping.id === id);
    if (!target) return;
    try{if(hasBackendConfig())await posApi(`/api/addons/${encodeURIComponent(id)}`,{method:"PUT",body:JSON.stringify({name:target.name,priceCents:Math.round(target.price*100),emoji:target.emoji,available:!target.available})});}catch(error){showNotice(error instanceof Error?error.message:"Could not update topping");return;}
    setToppings((current) => current.map((topping) => topping.id === id ? { ...topping, available: !topping.available } : topping));
    showNotice(tr(`${target.name} ${target.available ? "hidden" : "available"}`, `${target.name} ${target.available ? "مخفي" : "متاح"}`));
  }

  async function confirmMenuDelete() {
    if (!menuDeleteConfirmation) return;
    try{if(hasBackendConfig())await posApi(`/${menuDeleteConfirmation.kind==="item"?"api/menu-items":"api/addons"}/${encodeURIComponent(menuDeleteConfirmation.id)}`,{method:"DELETE"});}catch(error){showNotice(error instanceof Error?error.message:"Could not delete menu entry");return;}
    if (menuDeleteConfirmation.kind === "item") {
      setMenuItems((current) => current.filter((item) => item.id !== menuDeleteConfirmation.id));
    } else {
      setToppings((current) => current.filter((topping) => topping.id !== menuDeleteConfirmation.id));
    }
    showNotice(tr(`${menuDeleteConfirmation.name} deleted`, `تم حذف ${menuDeleteConfirmation.name}`));
    setMenuDeleteConfirmation(null);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function navigate(next: View) {
    const item = nav.find((entry) => entry.id === next);
    if (role === "cashier" && item?.manager) {
      showNotice("Manager permission required");
      return;
    }
    setView(next);
  }

  async function performFactoryReset() {
    if (factoryResetConfirmation !== "RESET") return;
    if (hasBackendConfig()) {
      try { await posApi("/api/admin/factory-reset", { method: "POST", body: JSON.stringify({ confirmation: factoryResetConfirmation }) }); }
      catch (error) { showNotice(error instanceof Error ? error.message : tr("Factory reset failed.", "فشلت إعادة الضبط.")); return; }
    }
    const cleanTables = tables.map(({ id, number, seats }) => ({ id, number, seats, currentGuests: 0, status: "available" as const }));

    localStorage.setItem(expenseStorageKey, JSON.stringify([]));
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory.map((item) => ({ ...item, stock: 0 }))));
    localStorage.setItem(salesStorageKey, JSON.stringify({ salesTotal: 0, orders: 0, nextOrderNumber: 1, recentOrders: [] } satisfies SalesSnapshot));
    localStorage.setItem(tablesStorageKey, JSON.stringify(cleanTables));
    localStorage.setItem(kitchenStorageKey, JSON.stringify([]));
    localStorage.setItem(reservationStorageKey, JSON.stringify([]));

    setExpenses([]);
    setInventory((current) => current.map((item) => ({ ...item, stock: 0 })));
    setTables(cleanTables);
    setReservations([]);
    setKitchenOrders([]);
    setReceipt(null);
    setReceiptPreviewOpen(false);
    setShiftOpen(false);
    setOpeningCash(null);
    setOpeningCashInput("");
    setShiftStartedAt("");
    setShiftOpenedBy("");
    setCounterOrderType(null);
    setCounterTable(null);
    setOrderContact({ name: "", phone: "", address: "", driver: "" });
    setSelectedMenuItem(null);
    setSelectedToppingIds([]);
    setOrderToppings([]);
    setToppingStep(0);
    setNextOrderNumber(1);
    setOrders(0);
    setSalesTotal(0);
    setRecentOrders([]);
    setFactoryResetOpen(false);
    setFactoryResetConfirmation("");
    setView("dashboard");
    showNotice("Factory reset complete — master data and settings were preserved");
  }

  const lowStock = inventory.filter((item) => item.stock <= item.min);
  const availableTables = tables.filter((table) => table.status === "available").length;
  const todayKey = getTodayInputValue();
  const todayExpenses = expenses.filter((expense) => expense.date === todayKey);
  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(todayKey.slice(0, 7)));
  const cashDrawerExpenses = expenses.filter((expense) => (expense.paidFrom ?? "owner") === "cash_drawer");
  const ownerExpenses = expenses.filter((expense) => (expense.paidFrom ?? "owner") === "owner");
  const topExpenseCategory = expenseCategories
    .map((category) => ({ category, total: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0) }))
    .sort((a, b) => b.total - a.total)[0]?.category ?? "Other";
  const availableMenuItems = menuItems.filter((item) => item.available);
  const visibleMenuItems = posMenuFilter === "All"
    ? availableMenuItems
    : availableMenuItems.filter((item) => item.category === posMenuFilter);
  const availableToppings = toppings.filter((topping) => topping.available);
  const currentTopping = orderToppings[toppingStep];
  const selectedCheeseTotal = orderToppings
    .filter((topping) => selectedToppingIds.includes(topping.id) && topping.price > 0)
    .reduce((sum, topping) => sum + topping.price, 0);
  const selectedTotal = (selectedMenuItem?.price ?? 0) + selectedCheeseTotal;
  const contactName = orderContact.name.trim();
  const contactPhone = orderContact.phone.trim();
  const contactAddress = orderContact.address.trim();
  const counterServiceReady = (counterOrderType === "Dine-in" && counterTable !== null)
    || (counterOrderType === "Takeaway" && Boolean(contactName && contactPhone))
    || (counterOrderType === "Delivery" && Boolean(contactName && contactPhone && contactAddress));

  async function completeOrder(item: MenuItem, chosenToppings: Topping[]) {
    if (!counterOrderType || completionLock.current) return;
    const cheeseAddOns = chosenToppings.filter((topping) => topping.price > 0);
    const total = item.price + cheeseAddOns.reduce((sum, topping) => sum + topping.price, 0);
    const enteredCash = cashReceivedInput.trim() ? Number(cashReceivedInput) : total;
    if (paymentMethod === "Cash" && (!Number.isFinite(enteredCash) || enteredCash < total)) {
      showNotice(tr(`Cash received must be at least ${money(total)}`, `يجب أن يكون المبلغ المستلم ${money(total)} على الأقل`));
      return;
    }
    completionLock.current = true;
    let persistedOrder: { orderNumber: number; totalCents: number } | null = null;
    if (hasBackendConfig()) {
      try {
        const result = await posApi<{ order: { orderNumber: number; totalCents: number } }>("/api/orders/finalize", {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({
            orderType: counterOrderType === "Dine-in" ? "dine_in" : counterOrderType.toLowerCase(),
            tableId: counterOrderType === "Dine-in" && counterTable !== null ? tables.find((table) => table.number === counterTable)?.id ?? null : null,
            paymentMethod: paymentMethod.toLowerCase(), cashReceivedCents: Math.round(enteredCash * 100),
            customerName: contactName || undefined, customerPhone: contactPhone || undefined,
            deliveryAddress: contactAddress || undefined, driverName: orderContact.driver.trim() || undefined,
            items: [{ menuItemId: item.id, quantity: 1, addonIds: chosenToppings.map((topping) => topping.id) }],
          }),
        });
        persistedOrder = result.order;
      } catch (error) {
        completionLock.current = false;
        showNotice(error instanceof Error ? error.message : tr("Order could not be finalized.", "تعذر إنهاء الطلب."));
        return;
      }
    }
    const confirmedOrderNumber = persistedOrder?.orderNumber ?? nextOrderNumber;
    const number = `#${confirmedOrderNumber}`;
    const now = new Date();
    const receiptLines: ReceiptLine[] = [
      { name: item.name, quantity: 1, price: item.price },
      ...cheeseAddOns.map((cheese) => ({ name: cheese.name, quantity: 1, price: cheese.price })),
    ];
    const toppingNotes = chosenToppings.map((topping) => topping.name);
    const customizationNotes = chosenToppings.map((topping) => topping.price > 0 ? `${topping.name} (+${money(topping.price)})` : topping.name);
    const kitchenCustomer = counterOrderType === "Dine-in" && counterTable !== null ? `Table ${counterTable}` : `${counterOrderType} · ${contactName}`;
    const kitchenOrder: KitchenOrder = {
      id: confirmedOrderNumber, number, type: counterOrderType,
      items: [item.name, ...customizationNotes.map((name) => `+ ${name}`)],
      status: "pending", time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), customer: kitchenCustomer,
    };
    const completedReceipt: Receipt = {
      number, type: counterOrderType,
      table: counterOrderType === "Dine-in" ? counterTable ?? undefined : undefined,
      cashier: currentUser?.name ?? "Cocktailliio", createdAt: now.toLocaleString(),
      customer: counterOrderType === "Dine-in" ? undefined : contactName,
      phone: counterOrderType === "Dine-in" ? undefined : contactPhone,
      address: counterOrderType === "Delivery" ? contactAddress : undefined,
      driver: counterOrderType === "Delivery" ? orderContact.driver.trim() || tr("Not assigned", "غير محدد") : undefined,
      items: receiptLines, notes: toppingNotes, subtotal: total, total, paymentMethod,
      cashReceived: paymentMethod === "Cash" ? enteredCash : undefined,
      change: paymentMethod === "Cash" ? enteredCash - total : undefined,
    };
    const nextKitchenOrders = [kitchenOrder, ...kitchenOrders];
    const nextRecentOrders: RecentOrder[] = [{
      number,
      type: counterOrderType === "Dine-in" && counterTable !== null ? `Table ${counterTable}` : counterOrderType,
      cashier: currentUser?.name ?? "Cocktailliio", time: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      status: "Preparing" as const, total,
    }, ...recentOrders].slice(0, 20);
    const nextTables = counterOrderType === "Dine-in" && counterTable !== null
      ? tables.map((table) => table.number === counterTable ? { ...table, status: "occupied" as const, order: number, total } : table)
      : tables;
    const nextSales: SalesSnapshot = {
      salesTotal: salesTotal + total, orders: orders + 1, nextOrderNumber: confirmedOrderNumber + 1, recentOrders: nextRecentOrders,
    };

    try {
      localStorage.setItem(kitchenStorageKey, JSON.stringify(nextKitchenOrders));
      localStorage.setItem(salesStorageKey, JSON.stringify(nextSales));
      if (nextTables !== tables) localStorage.setItem(tablesStorageKey, JSON.stringify(nextTables));
    } catch {
      completionLock.current = false;
      showNotice(tr("The order could not be saved on this device. Please try again.", "تعذر حفظ الطلب على هذا الجهاز. حاول مرة أخرى."));
      return;
    }

    setKitchenOrders(nextKitchenOrders); setRecentOrders(nextRecentOrders); setTables(nextTables);
    setReceipt(completedReceipt); setNextOrderNumber(nextSales.nextOrderNumber);
    setOrders(nextSales.orders); setSalesTotal(nextSales.salesTotal); setReceiptPreviewOpen(true);
    setSelectedMenuItem(null); setSelectedToppingIds([]); setOrderToppings([]); setToppingStep(0);
    void printCompletedOrder(completedReceipt, kitchenOrder);
  }

  function beginMenuItem(item: MenuItem) {
    if (!shiftOpen) {
      showNotice("Open your shift before taking orders");
      setView("shift");
      return;
    }
    if (!counterOrderType) {
      showNotice(tr("Choose Dine-in, Takeaway or Delivery first", "اختر داخل المطعم أو سفري أو توصيل أولاً"));
      return;
    }
    if (counterOrderType === "Dine-in" && counterTable === null) {
      showNotice(tr("Choose a table number first", "اختر رقم الطاولة أولاً"));
      return;
    }
    if (counterOrderType === "Takeaway" && (!contactName || !contactPhone)) {
      showNotice(tr("Add the pickup name and phone first", "أدخل اسم ورقم هاتف طلب الاستلام أولاً"));
      return;
    }
    if (counterOrderType === "Delivery" && (!contactName || !contactPhone || !contactAddress)) {
      showNotice(tr("Add the delivery name, phone and address first", "أدخل اسم ورقم هاتف وعنوان طلب التوصيل أولاً"));
      return;
    }
    if (!item.available) {
      showNotice(tr("This menu item is currently unavailable", "هذا الصنف غير متوفر حالياً"));
      return;
    }
    if (!item.customizable || availableToppings.length === 0) {
      completeOrder(item, []);
      return;
    }
    setSelectedMenuItem({ ...item });
    setOrderToppings(availableToppings.map((topping) => ({ ...topping })));
    setToppingStep(0);
    setSelectedToppingIds([]);
  }

  function answerTopping(yes: boolean) {
    if (!selectedMenuItem || !counterOrderType || !currentTopping) return;
    const kind = toppingKind(currentTopping);
    const limit = toppingLimit(selectedMenuItem, currentTopping);
    const selectedInGroup = selectedToppingIds.filter((id) => {
      const topping = orderToppings.find((entry) => entry.id === id);
      return topping ? toppingKind(topping) === kind : false;
    }).length;
    const canSelect = !selectedToppingIds.includes(currentTopping.id) && selectedInGroup < limit;
    const nextSelectedIds = yes && canSelect
      ? [...selectedToppingIds, currentTopping.id]
      : selectedToppingIds;
    const nextSelectedInGroup = selectedInGroup + (yes && canSelect ? 1 : 0);

    let nextStep = toppingStep + 1;
    if (nextSelectedInGroup >= limit) {
      while (nextStep < orderToppings.length && toppingKind(orderToppings[nextStep]) === kind) nextStep += 1;
    }

    const leavingRequiredGroup = (kind === "pasta" || kind === "sauce")
      && (nextStep >= orderToppings.length || toppingKind(orderToppings[nextStep]) !== kind);
    if (leavingRequiredGroup && nextSelectedInGroup < limit) {
      const firstUnselected = orderToppings.findIndex((topping) => toppingKind(topping) === kind && !nextSelectedIds.includes(topping.id));
      setSelectedToppingIds(nextSelectedIds);
      setToppingStep(firstUnselected >= 0 ? firstUnselected : toppingStep);
      showNotice(kind === "pasta"
        ? tr("Choose one pasta type", "اختر نوع باستا واحداً")
        : tr(`Choose ${limit} sauce${limit === 1 ? "" : "s"}`, `اختر ${limit} من الصلصات`));
      return;
    }

    const chosenToppings = orderToppings.filter((topping) => nextSelectedIds.includes(topping.id));
    if (nextStep >= orderToppings.length) {
      completeOrder(selectedMenuItem, chosenToppings);
      return;
    }
    setSelectedToppingIds(nextSelectedIds);
    setToppingStep(nextStep);
  }

  function startNextOrder() {
    completionLock.current = false;
    setReceiptPreviewOpen(false);
    setReceipt(null);
    setCounterOrderType(null);
    setCounterTable(null);
    setOrderContact({ name: "", phone: "", address: "", driver: "" });
    setPaymentMethod("Cash");
    setCashReceivedInput("");
    setSelectedMenuItem(null);
    setSelectedToppingIds([]);
    setOrderToppings([]);
    setToppingStep(0);
  }

  function updateTable(number: number) {
    const table = tables.find((entry) => entry.number === number);
    if (!table) return;
    setTableFormError("");
    setTableEditor({ mode: "edit", id: table.id, number, capacity: String(table.seats), guests: String(table.currentGuests ?? 0), status: table.status });
  }

  function addTable() {
    let number = 1;
    while (tables.some((table) => table.number === number)) number += 1;
    setTableFormError("");
    setTableEditor({ mode: "add", id: null, number, capacity: "4", guests: "0", status: "available" });
  }

  async function saveTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tableEditor) return;
    const capacity = Number(tableEditor.capacity);
    const guests = Number(tableEditor.guests);
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isInteger(guests) || guests < 0) {
      setTableFormError(tr("Capacity and guests must be whole positive numbers.", "يجب أن تكون السعة وعدد الضيوف أرقاماً صحيحة.")); return;
    }
    if (guests > capacity) {
      setTableFormError(tr(`This table can seat at most ${capacity} guests.`, `تتسع هذه الطاولة لحد أقصى ${capacity} ضيوف.`)); return;
    }
    const status = guests > 0 ? "occupied" : tableEditor.status;
    let tableId = tableEditor.id ?? `table-${tableEditor.number}`;
    if (hasBackendConfig()) {
      try {
        if (tableEditor.mode === "add") {
          const result = await posApi<{ id: string }>("/api/tables", { method: "POST", body: JSON.stringify({ name: `Table ${tableEditor.number}`, capacity }) });
          tableId = result.id;
        } else await posApi(`/api/tables/${encodeURIComponent(tableId)}`, { method: "PUT", body: JSON.stringify({ capacity, currentGuests: guests, status }) });
      }
      catch (error) { setTableFormError(error instanceof Error ? error.message : tr("Could not update table.", "تعذر تحديث الطاولة.")); return; }
    }
    setTables((current) => tableEditor.mode === "add" ? [...current, { id: tableId, number: tableEditor.number, seats: capacity, currentGuests: 0, status: "available" }] : current.map((table) => table.number === tableEditor.number ? { ...table, seats: capacity, currentGuests: guests, status } : table));
    const wasAdded = tableEditor.mode === "add";
    setTableEditor(null); showNotice(tr(wasAdded ? "Table added" : "Table updated", wasAdded ? "تمت إضافة الطاولة" : "تم تحديث الطاولة"));
  }

  async function deleteTable() {
    if (!tableEditor?.id || tableEditor.mode !== "edit") return;
    try { if (hasBackendConfig()) await posApi(`/api/tables/${encodeURIComponent(tableEditor.id)}`, { method: "DELETE" }); }
    catch (error) { setTableFormError(error instanceof Error ? error.message : tr("Could not delete table.", "تعذر حذف الطاولة.")); return; }
    const removedId = tableEditor.id;
    setTables((current) => current.filter((table) => table.id !== removedId));
    setTableEditor(null); showNotice(tr("Table deleted", "تم حذف الطاولة"));
  }

  function openReservation() {
    setReservationForm({ ...emptyReservationForm, date: getTodayInputValue() });
    setReservationFormError(""); setReservationEditorOpen(true);
  }

  async function saveReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const guests = Number(reservationForm.guests); const tableNumber = Number(reservationForm.tableNumber);
    const table = tables.find((entry) => entry.number === tableNumber);
    if (reservationForm.customerName.trim().length < 2) { setReservationFormError(tr("Enter the customer name.", "أدخل اسم الزبون.")); return; }
    if (!table || !Number.isInteger(guests) || guests < 1) { setReservationFormError(tr("Choose a table and a valid guest count.", "اختر طاولة وعدد ضيوف صحيح.")); return; }
    if (guests > table.seats) { setReservationFormError(tr(`Table ${table.number} can seat at most ${table.seats} guests.`, `تتسع الطاولة ${table.number} لحد أقصى ${table.seats} ضيوف.`)); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reservationForm.date) || !/^\d{2}:\d{2}$/.test(reservationForm.time)) { setReservationFormError(tr("Choose a valid date and time.", "اختر تاريخاً ووقتاً صحيحين.")); return; }
    const conflict = reservations.some((entry) => entry.tableNumber === tableNumber && entry.date === reservationForm.date && entry.time === reservationForm.time && (entry.status === "upcoming" || entry.status === "seated"));
    if (conflict) { setReservationFormError(tr("This table already has an active reservation at that time.", "لدى هذه الطاولة حجز نشط في هذا الوقت.")); return; }
    let reservationId = crypto.randomUUID();
    if (hasBackendConfig()) {
      try {
        const result = await posApi<{ id: string }>("/api/reservations", { method: "POST", body: JSON.stringify({ customerName: reservationForm.customerName.trim(), guestCount: guests, tableId: table.id, startsAt: new Date(`${reservationForm.date}T${reservationForm.time}:00`).toISOString(), phone: reservationForm.phone.trim(), notes: reservationForm.notes.trim() }) });
        reservationId = result.id;
      } catch (error) { setReservationFormError(error instanceof Error ? error.message : tr("Could not create reservation.", "تعذر إنشاء الحجز.")); return; }
    }
    setReservations((current) => [...current, { id: reservationId, customerName: reservationForm.customerName.trim(), guests, tableNumber, date: reservationForm.date, time: reservationForm.time, phone: reservationForm.phone.trim(), notes: reservationForm.notes.trim(), status: "upcoming" }]);
    setTables((current) => current.map((entry) => entry.number === tableNumber && entry.status === "available" ? { ...entry, status: "reserved" as const } : entry));
    setReservationEditorOpen(false); showNotice(tr("Reservation created", "تم إنشاء الحجز"));
  }

  async function seatReservation(reservation: Reservation) {
    const table = tables.find((entry) => entry.number === reservation.tableNumber);
    if (!table || reservation.guests > table.seats) { showNotice(tr("Table capacity is no longer sufficient.", "سعة الطاولة لم تعد كافية.")); return; }
    if (hasBackendConfig()) {
      try { await posApi(`/api/reservations/${encodeURIComponent(reservation.id)}/seat`, { method: "POST", body: JSON.stringify({}) }); }
      catch (error) { showNotice(error instanceof Error ? error.message : tr("Could not seat reservation.", "تعذر إجلاس الحجز.")); return; }
    }
    setReservations((current) => current.map((entry) => entry.id === reservation.id ? { ...entry, status: "seated" as const } : entry));
    setTables((current) => current.map((entry) => entry.number === reservation.tableNumber ? { ...entry, status: "occupied" as const, currentGuests: reservation.guests } : entry));
    showNotice(tr(`${reservation.customerName} seated at table ${reservation.tableNumber}`, `تم إجلاس ${reservation.customerName} على الطاولة ${reservation.tableNumber}`));
  }

  if (!currentUser) {
    return (
      <main className="auth-screen">
        <section className="auth-brand" aria-label="Cocktaillo">
          <div className="auth-brand-logo"><img src="/cocktaillo-logo.png" alt="Cocktaillo Resto Café"/></div>
          <div>
            <p>{tr("RESTO CAFÉ • LOUNGE • HOOKAH • COCKTAILS", "مطعم ومقهى ولاونج وأرجيلة وكوكتيلات")}</p>
            <h1>{tr("One clear start for every shift.", "دخول واضح لكل دوام.")}</h1>
            <span>{tr(
              "Cashiers open only the tools they need. Managers enter with their own account for full control.",
              "يفتح الكاشير الأدوات التي يحتاجها فقط، ويدخل المدير بحسابه الخاص للتحكم الكامل.",
            )}</span>
          </div>
          <small>Cocktaillo POS • v1.0</small>
        </section>
        <section className="auth-panel">
          <div className="auth-language">
            <button type="button" onClick={() => setLanguage((current) => current === "en" ? "ar" : "en")}>
              {language === "en" ? "عربي" : "EN"}
            </button>
            <button type="button" onClick={() => setDark((current) => !current)} aria-label={tr("Toggle theme", "تغيير المظهر")}>
              {dark ? "☀" : "◐"}
            </button>
          </div>
          <div className="auth-card">
            <div className="auth-mobile-brand"><img src="/cocktaillo-logo.png" alt="Cocktaillo Resto Café"/></div>
            <p className="page-kicker">{tr("STAFF SIGN IN", "دخول الموظفين")}</p>
            <h2>{tr("Welcome back", "أهلاً بعودتك")}</h2>
            <p>{tr(
              "Enter your staff username and password. Your correct access opens automatically.",
              "أدخل اسم المستخدم وكلمة المرور. ستفتح صلاحيات حسابك تلقائياً.",
            )}</p>
            <form className="auth-form" onSubmit={handleLogin}>
              <label className="auth-field">
                {tr("Username", "اسم المستخدم")}
                <input
                  autoFocus
                  autoComplete="username"
                  dir="ltr"
                  value={loginForm.username}
                  onChange={(event) => {
                    setLoginForm((current) => ({ ...current, username: event.target.value }));
                    setLoginError("");
                  }}
                  placeholder={tr("Enter username", "أدخل اسم المستخدم")}
                />
              </label>
              <label className="auth-field">
                {tr("Password", "كلمة المرور")}
                <span className="password-field">
                  <input
                    autoComplete="current-password"
                    dir="ltr"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(event) => {
                      setLoginForm((current) => ({ ...current, password: event.target.value }));
                      setLoginError("");
                    }}
                    placeholder={tr("Enter password", "أدخل كلمة المرور")}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? tr("Hide", "إخفاء") : tr("Show", "إظهار")}
                  </button>
                </span>
              </label>
              {loginError && <p className="auth-error" role="alert">{loginError}</p>}
              <button className="auth-submit" type="submit" disabled={backendBusy || !accountsReady || !loginForm.username.trim() || !loginForm.password}>
                {backendBusy ? tr("Signing in…", "جارٍ تسجيل الدخول…") : tr("Sign in to Cocktaillo", "تسجيل الدخول إلى كوكتايلو")} <span>→</span>
              </button>
            </form>
            <div className="auth-security-note">
              <span>⌾</span>
              <p><strong>{tr("Role-based access", "دخول حسب الصلاحية")}</strong>{tr(
                "Cashier accounts cannot open inventory, menu management, expenses, reports, users or settings.",
                "لا يستطيع حساب الكاشير فتح المخزون أو إدارة القائمة أو المصاريف أو التقارير أو المستخدمين أو الإعدادات.",
              )}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const title = language === "ar" ? arabicNav[view] : nav.find((item) => item.id === view)?.label ?? "Cocktaillo";
  const confirmationUser = userConfirmation
    ? accounts.find((account) => account.id === userConfirmation.userId) ?? null
    : null;

  return (
    <div className="system-shell">
      {notice && <div className="toast">{notice}</div>}
      {receiptPreviewOpen && receipt && (
        <div className="sale-receipt-backdrop" role="presentation">
          <section className="sale-receipt-dialog" role="dialog" aria-modal="true" aria-labelledby="receipt-preview-title">
            <header className="sale-receipt-header"><div><p>{tr("ORDER COMPLETE", "اكتمل الطلب")}</p><h2 id="receipt-preview-title">{tr("Receipt preview", "معاينة الإيصال")}</h2></div><button onClick={startNextOrder} aria-label={tr("Close receipt", "إغلاق الإيصال")}>×</button></header>
            <div className="sale-receipt-scroll"><ReceiptContent receipt={receipt} money={money} tr={tr}/></div>
            {lastFailedPrint?.receipt.number === receipt.number && <div className="receipt-print-error" role="alert"><strong>{tr("Order saved — printing failed", "تم حفظ الطلب — فشلت الطباعة")}</strong><span>{lastFailedPrint.message}</span></div>}
            <div className="sale-receipt-actions"><button onClick={startNextOrder}>{tr("New order", "طلب جديد")}</button><button disabled={printBusy} className="print-kitchen-receipt" onClick={() => { const order = kitchenOrders.find((entry) => entry.number === receipt.number); if (order) void printKitchenReceipt(order); }}>♨ {tr("Kitchen ticket", "تذكرة المطبخ")}</button><button disabled={printBusy} className="print-sale-receipt" onClick={() => void printCurrentReceipt()}>▤ {tr("Reprint receipt", "إعادة طباعة الإيصال")}</button></div>
          </section>
        </div>
      )}
      {userEditor && (
        <div
          className="user-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeUserEditor();
          }}
        >
          <section className="user-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
            <header className="user-modal-header">
              <div>
                <p>{tr(userEditor.mode === "add" ? "NEW STAFF ACCOUNT" : "ACCOUNT SETTINGS", userEditor.mode === "add" ? "حساب موظف جديد" : "إعدادات الحساب")}</p>
                <h2 id="user-modal-title">{tr(userEditor.mode === "add" ? "Add user" : "Edit user", userEditor.mode === "add" ? "إضافة مستخدم" : "تعديل المستخدم")}</h2>
              </div>
              <button type="button" className="user-modal-close" onClick={closeUserEditor} aria-label={tr("Close", "إغلاق")}>×</button>
            </header>
            <form className="user-form" onSubmit={submitUser}>
              <div className="user-modal-scroll">
                <label className="user-field">
                  {tr("Full name", "الاسم الكامل")}
                  <input
                    autoFocus
                    autoComplete="off"
                    value={userForm.name}
                    onChange={(event) => {
                      setUserForm((current) => ({ ...current, name: event.target.value }));
                      setUserFormError("");
                    }}
                    placeholder={tr("Example: Jad Daher", "مثال: جاد ضاهر")}
                  />
                </label>
                <div className="user-form-grid">
                  <label className="user-field">
                    {tr("Username", "اسم المستخدم")}
                    <input
                      autoComplete="off"
                      dir="ltr"
                      value={userForm.username}
                      onChange={(event) => {
                        setUserForm((current) => ({ ...current, username: event.target.value }));
                        setUserFormError("");
                      }}
                      placeholder="jad"
                    />
                  </label>
                  <label className="user-field">
                    {tr(userEditor.mode === "add" ? "Password" : "New password (optional)", userEditor.mode === "add" ? "كلمة المرور" : "كلمة مرور جديدة (اختياري)")}
                    <span className="user-password-field">
                      <input
                        autoComplete="new-password"
                        dir="ltr"
                        type={showUserPassword ? "text" : "password"}
                        value={userForm.password}
                        onChange={(event) => {
                          setUserForm((current) => ({ ...current, password: event.target.value }));
                          setUserFormError("");
                        }}
                        placeholder={userEditor.mode === "add" ? tr("Minimum 4 characters", "4 أحرف على الأقل") : tr("Leave blank to keep it", "اتركها فارغة للإبقاء عليها")}
                      />
                      <button type="button" onClick={() => setShowUserPassword((current) => !current)}>
                        {showUserPassword ? tr("Hide", "إخفاء") : tr("Show", "إظهار")}
                      </button>
                    </span>
                  </label>
                </div>
                <label className="user-field">
                  {tr("Confirm password", "تأكيد كلمة المرور")}
                  <input
                    autoComplete="new-password"
                    dir="ltr"
                    type={showUserPassword ? "text" : "password"}
                    value={userForm.confirmPassword}
                    onChange={(event) => {
                      setUserForm((current) => ({ ...current, confirmPassword: event.target.value }));
                      setUserFormError("");
                    }}
                    placeholder={tr("Repeat the password", "أعد كتابة كلمة المرور")}
                  />
                </label>
                <fieldset className="user-role-choice">
                  <legend>{tr("Access level", "مستوى الصلاحيات")}</legend>
                  <div className="user-role-options">
                    {(["cashier", "manager"] as Role[]).map((option) => {
                      const protectsCurrentAccount = userEditor.mode === "edit"
                        && userEditor.userId === currentUserId
                        && option !== currentUser.role;
                      return (
                        <button
                          type="button"
                          className={userForm.role === option ? "selected" : ""}
                          disabled={protectsCurrentAccount}
                          onClick={() => {
                            setUserForm((current) => ({ ...current, role: option }));
                            setUserFormError("");
                          }}
                          key={option}
                        >
                          <strong>{option === "manager" ? tr("Manager", "مدير") : tr("Cashier", "كاشير")}</strong>
                          <small>{option === "manager" ? tr("Full POS access", "صلاحيات كاملة") : tr("Orders, tables, reservations & shift", "الطلبات والطاولات والحجوزات والدوام")}</small>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className={`user-active-toggle ${userEditor.mode === "edit" && userEditor.userId === currentUserId ? "is-locked" : ""}`}>
                  <input
                    type="checkbox"
                    checked={userForm.active}
                    disabled={userEditor.mode === "edit" && userEditor.userId === currentUserId}
                    onChange={(event) => setUserForm((current) => ({ ...current, active: event.target.checked }))}
                  />
                  <span><strong>{tr("Active account", "حساب مفعّل")}</strong><small>{tr("This user can sign in to the POS.", "يمكن لهذا المستخدم تسجيل الدخول إلى النظام.")}</small></span>
                </label>
                {userFormError && <p className="user-form-error" role="alert">{userFormError}</p>}
              </div>
              <footer className="user-modal-actions">
                <button type="button" className="secondary-action" onClick={closeUserEditor}>{tr("Cancel", "إلغاء")}</button>
                <button type="submit" className="user-save-action">{tr(userEditor.mode === "add" ? "Add user" : "Save changes", userEditor.mode === "add" ? "إضافة المستخدم" : "حفظ التغييرات")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {tableEditor && (
        <div className="menu-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTableEditor(null); }}>
          <section className="menu-modal-dialog compact-dialog" role="dialog" aria-modal="true" aria-labelledby="table-editor-title">
            <header className="menu-modal-header"><div><p>TABLE {tableEditor.number}</p><h2 id="table-editor-title">{tr(tableEditor.mode === "add" ? "Add table" : "Table occupancy", tableEditor.mode === "add" ? "إضافة طاولة" : "إشغال الطاولة")}</h2></div><button type="button" onClick={() => setTableEditor(null)} aria-label="Close">×</button></header>
            <form onSubmit={saveTable}><div className="menu-modal-scroll"><div className="menu-form-grid">
              <label className="menu-field">{tr("Maximum capacity", "السعة القصوى")}<input autoFocus inputMode="numeric" value={tableEditor.capacity} onChange={(event) => { setTableEditor((current) => current ? { ...current, capacity: event.target.value.replace(/\D/g, "") } : current); setTableFormError(""); }}/></label>
              <label className="menu-field">{tr("Current guests", "عدد الضيوف الحالي")}<input inputMode="numeric" value={tableEditor.guests} onChange={(event) => { setTableEditor((current) => current ? { ...current, guests: event.target.value.replace(/\D/g, "") } : current); setTableFormError(""); }}/></label>
              <label className="menu-field wide">{tr("Status", "الحالة")}<select value={tableEditor.status} onChange={(event) => setTableEditor((current) => current ? { ...current, status: event.target.value as TableStatus } : current)}><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option></select></label>
            </div>{tableFormError && <p className="menu-form-error" role="alert">{tableFormError}</p>}</div><footer className="menu-modal-actions">{tableEditor.mode === "edit" && <button className="danger-action" type="button" onClick={deleteTable}>{tr("Delete table", "حذف الطاولة")}</button>}<button type="button" onClick={() => setTableEditor(null)}>{tr("Cancel", "إلغاء")}</button><button className="menu-save-action" type="submit">{tr("Save table", "حفظ الطاولة")}</button></footer></form>
          </section>
        </div>
      )}

      {reservationEditorOpen && (
        <div className="menu-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReservationEditorOpen(false); }}>
          <section className="menu-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="reservation-editor-title">
            <header className="menu-modal-header"><div><p>RESERVATION</p><h2 id="reservation-editor-title">{tr("New reservation", "حجز جديد")}</h2></div><button type="button" onClick={() => setReservationEditorOpen(false)} aria-label="Close">×</button></header>
            <form onSubmit={saveReservation}><div className="menu-modal-scroll"><div className="menu-form-grid">
              <label className="menu-field wide">{tr("Customer name", "اسم الزبون")}<input autoFocus value={reservationForm.customerName} onChange={(event) => setReservationForm((current) => ({ ...current, customerName: event.target.value }))}/></label>
              <label className="menu-field">{tr("Guests", "الضيوف")}<input inputMode="numeric" value={reservationForm.guests} onChange={(event) => setReservationForm((current) => ({ ...current, guests: event.target.value.replace(/\D/g, "") }))}/></label>
              <label className="menu-field">{tr("Assigned table", "الطاولة")}<select value={reservationForm.tableNumber} onChange={(event) => setReservationForm((current) => ({ ...current, tableNumber: event.target.value }))}><option value="">{tr("Choose table", "اختر طاولة")}</option>{tables.map((table) => <option key={table.number} value={table.number}>{tr("Table", "طاولة")} {table.number} · {table.seats} {tr("seats", "مقاعد")}</option>)}</select></label>
              <label className="menu-field">{tr("Date", "التاريخ")}<input type="date" value={reservationForm.date} onChange={(event) => setReservationForm((current) => ({ ...current, date: event.target.value }))}/></label>
              <label className="menu-field">{tr("Time", "الوقت")}<input type="time" value={reservationForm.time} onChange={(event) => setReservationForm((current) => ({ ...current, time: event.target.value }))}/></label>
              <label className="menu-field">{tr("Phone (optional)", "الهاتف (اختياري)")}<input type="tel" value={reservationForm.phone} onChange={(event) => setReservationForm((current) => ({ ...current, phone: event.target.value }))}/></label>
              <label className="menu-field wide">{tr("Notes (optional)", "ملاحظات (اختياري)")}<textarea value={reservationForm.notes} onChange={(event) => setReservationForm((current) => ({ ...current, notes: event.target.value }))}/></label>
            </div>{reservationFormError && <p className="menu-form-error" role="alert">{reservationFormError}</p>}</div><footer className="menu-modal-actions"><button type="button" onClick={() => setReservationEditorOpen(false)}>{tr("Cancel", "إلغاء")}</button><button className="menu-save-action" type="submit">{tr("Create reservation", "إنشاء الحجز")}</button></footer></form>
          </section>
        </div>
      )}

      {factoryResetOpen && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFactoryResetOpen(false);
          }}
        >
          <section className="confirm-dialog factory-reset-dialog" role="alertdialog" aria-modal="true" aria-labelledby="factory-reset-title" aria-describedby="factory-reset-description">
            <span className="confirm-icon">!</span>
            <h2 id="factory-reset-title">{tr("Factory reset this POS?", "إعادة ضبط المصنع لهذا الجهاز؟")}</h2>
            <p id="factory-reset-description">{tr("This permanently clears transactional data. Type RESET to confirm.", "سيؤدي هذا إلى حذف بيانات التشغيل نهائياً. اكتب RESET للتأكيد.")}</p>
            <div className="factory-reset-scope">
              <div><span>×</span><p><strong>{tr("Will be reset", "سيتم حذفه")}</strong>{tr("Orders, sales, expenses, shifts, reservations, table sessions, cash history and inventory quantities.", "الطلبات والمبيعات والمصاريف والدوامات والحجوزات وجلسات الطاولات وحركة النقد وكميات المخزون.")}</p></div>
              <div className="preserved"><span>✓</span><p><strong>{tr("Will be preserved", "سيبقى محفوظاً")}</strong>{tr("Menu, prices, images, recipes, inventory definitions, tables, users, roles and settings.", "القائمة والأسعار والصور والوصفات وتعريفات المخزون والطاولات والمستخدمون والصلاحيات والإعدادات.")}</p></div>
            </div>
            <label className="reset-confirm-field">{tr("Type RESET", "اكتب RESET")}<input autoFocus value={factoryResetConfirmation} onChange={(event) => setFactoryResetConfirmation(event.target.value)} autoComplete="off"/></label>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => { setFactoryResetOpen(false); setFactoryResetConfirmation(""); }}>{tr("Cancel", "إلغاء")}</button>
              <button className="danger-action" type="button" disabled={factoryResetConfirmation !== "RESET"} onClick={performFactoryReset}>{tr("Reset transactional data", "حذف بيانات التشغيل")}</button>
            </div>
          </section>
        </div>
      )}
      {restockTarget && (
        <div
          className="menu-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRestock();
          }}
        >
          <section className="menu-modal-dialog restock-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="restock-modal-title">
            <header className="menu-modal-header">
              <div><p>{tr("STOCK RECEIPT", "استلام مخزون")}</p><h2 id="restock-modal-title">{tr(`Restock ${restockTarget.item}`, `زيادة مخزون ${restockTarget.item}`)}</h2></div>
              <button type="button" className="menu-modal-close" onClick={closeRestock} aria-label={tr("Close", "إغلاق")}>×</button>
            </header>
            <form className="menu-modal-form" onSubmit={submitRestock}>
              <div className="menu-modal-scroll">
                <div className="restock-current"><span>{tr("Current stock", "المخزون الحالي")}</span><strong>{restockTarget.stock} {restockTarget.unit}</strong></div>
                <label className="menu-field">
                  {tr(`Quantity received (${restockTarget.unit})`, `الكمية المستلمة (${restockTarget.unit})`)}
                  <input autoFocus dir="ltr" inputMode="decimal" value={restockAmount} onChange={(event) => { setRestockAmount(event.target.value.replace(/[^\d.,]/g, "")); setRestockError(""); }} placeholder="0"/>
                </label>
                {restockAmount && Number(restockAmount.replace(/,/g, "")) > 0 && <div className="restock-result"><span>{tr("New stock after saving", "المخزون الجديد بعد الحفظ")}</span><strong>{restockTarget.stock + Number(restockAmount.replace(/,/g, ""))} {restockTarget.unit}</strong></div>}
                {restockError && <p className="menu-form-error" role="alert">{restockError}</p>}
              </div>
              <footer className="menu-modal-actions">
                <button type="button" className="secondary-action" onClick={closeRestock}>{tr("Cancel", "إلغاء")}</button>
                <button type="submit" className="user-save-action">{tr("Add to stock", "إضافة إلى المخزون")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {inventoryEditor && (
        <div
          className="menu-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInventoryEditor();
          }}
        >
          <section className="menu-modal-dialog inventory-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
            <header className="menu-modal-header">
              <div>
                <p>{tr("INVENTORY RECORD", "سجل المخزون")}</p>
                <h2 id="inventory-modal-title">{tr(inventoryEditor.mode === "add" ? "Add inventory item" : "Edit inventory item", inventoryEditor.mode === "add" ? "إضافة صنف مخزون" : "تعديل صنف المخزون")}</h2>
              </div>
              <button type="button" className="menu-modal-close" onClick={closeInventoryEditor} aria-label={tr("Close", "إغلاق")}>×</button>
            </header>
            <form className="menu-modal-form" onSubmit={submitInventoryItem}>
              <div className="menu-modal-scroll">
                <div className="menu-form-grid">
                  <label className="menu-field wide">
                    {tr("Item name", "اسم الصنف")}
                    <input autoFocus autoComplete="off" value={inventoryForm.item} onChange={(event) => { setInventoryForm((current) => ({ ...current, item: event.target.value })); setInventoryFormError(""); }} placeholder={tr("Example: Parmesan cheese", "مثال: جبنة بارميزان")}/>
                  </label>
                  <label className="menu-field">
                    {tr("Category", "الفئة")}
                    <input autoComplete="off" value={inventoryForm.category} onChange={(event) => { setInventoryForm((current) => ({ ...current, category: event.target.value })); setInventoryFormError(""); }} placeholder={tr("Example: Dairy", "مثال: ألبان")}/>
                  </label>
                  <label className="menu-field">
                    {tr("Measurement unit", "وحدة القياس")}
                    <select value={inventoryForm.unit} onChange={(event) => setInventoryForm((current) => ({ ...current, unit: event.target.value as InventoryUnit }))}>
                      <option value="g">{tr("Grams (g)", "غرام (g)")}</option>
                      <option value="kg">{tr("Kilograms (kg)", "كيلوغرام (kg)")}</option>
                      <option value="ml">{tr("Milliliters (ml)", "ملليلتر (ml)")}</option>
                      <option value="L">{tr("Liters (L)", "ليتر (L)")}</option>
                      <option value="item">{tr("Items / pieces", "حبة / قطعة")}</option>
                      <option value="box">{tr("Boxes", "علب")}</option>
                    </select>
                  </label>
                  <label className="menu-field">
                    {tr("Current quantity", "الكمية الحالية")}
                    <input dir="ltr" inputMode="decimal" value={inventoryForm.stock} onChange={(event) => { setInventoryForm((current) => ({ ...current, stock: event.target.value.replace(/[^\d.,]/g, "") })); setInventoryFormError(""); }} placeholder="0"/>
                  </label>
                  <label className="menu-field">
                    {tr("Low-stock alert at", "تنبيه انخفاض المخزون عند")}
                    <input dir="ltr" inputMode="decimal" value={inventoryForm.min} onChange={(event) => { setInventoryForm((current) => ({ ...current, min: event.target.value.replace(/[^\d.,]/g, "") })); setInventoryFormError(""); }} placeholder="0"/>
                  </label>
                  <label className="menu-field wide">
                    {tr(`Cost per ${inventoryForm.unit}`, `تكلفة كل ${inventoryForm.unit}`)}
                    <span className="menu-price-input"><b>{currency}</b><input dir="ltr" inputMode="decimal" value={inventoryForm.cost} onChange={(event) => { setInventoryForm((current) => ({ ...current, cost: event.target.value.replace(/[^\d.,]/g, "") })); setInventoryFormError(""); }} placeholder={currency === "LBP" ? "0" : "0.00"}/></span>
                  </label>
                </div>
                <div className="expense-form-note">ⓘ {tr("The low-stock alert updates immediately after saving.", "يتحدث تنبيه انخفاض المخزون فور الحفظ.")}</div>
                {inventoryFormError && <p className="menu-form-error" role="alert">{inventoryFormError}</p>}
              </div>
              <footer className="menu-modal-actions">
                <button type="button" className="secondary-action" onClick={closeInventoryEditor}>{tr("Cancel", "إلغاء")}</button>
                <button type="submit" className="user-save-action">{tr(inventoryEditor.mode === "add" ? "Add item" : "Save changes", inventoryEditor.mode === "add" ? "إضافة الصنف" : "حفظ التغييرات")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {inventoryDeleteConfirmation && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setInventoryDeleteConfirmation(null);
          }}
        >
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-inventory-title" aria-describedby="confirm-inventory-description">
            <span className="confirm-icon">×</span>
            <h2 id="confirm-inventory-title">{tr(`Delete ${inventoryDeleteConfirmation.item}?`, `حذف ${inventoryDeleteConfirmation.item}؟`)}</h2>
            <p id="confirm-inventory-description">{tr("This removes the inventory record and its low-stock alert from this POS.", "سيتم حذف سجل المخزون وتنبيه انخفاضه من هذا الجهاز.")}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setInventoryDeleteConfirmation(null)}>{tr("Cancel", "إلغاء")}</button>
              <button className="danger-action" type="button" onClick={deleteInventoryItem}>{tr("Delete item", "حذف الصنف")}</button>
            </div>
          </section>
        </div>
      )}
      {expenseEditor && (
        <div
          className="menu-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeExpenseEditor();
          }}
        >
          <section className="menu-modal-dialog expense-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="expense-modal-title">
            <header className="menu-modal-header">
              <div>
                <p>{tr("EXPENSE RECORD", "سجل المصروف")}</p>
                <h2 id="expense-modal-title">{tr(expenseEditor.mode === "add" ? "Add expense" : "Edit expense", expenseEditor.mode === "add" ? "إضافة مصروف" : "تعديل المصروف")}</h2>
              </div>
              <button type="button" className="menu-modal-close" onClick={closeExpenseEditor} aria-label={tr("Close", "إغلاق")}>×</button>
            </header>
            <form className="menu-modal-form" onSubmit={submitExpense}>
              <div className="menu-modal-scroll">
                <div className="menu-form-grid">
                  <label className="menu-field wide">
                    {tr("Description", "الوصف")}
                    <input autoFocus autoComplete="off" value={expenseForm.item} onChange={(event) => { setExpenseForm((current) => ({ ...current, item: event.target.value })); setExpenseFormError(""); }} placeholder={tr("Example: July electricity bill", "مثال: فاتورة كهرباء شهر تموز")}/>
                  </label>
                  <label className="menu-field">
                    {tr("Category", "الفئة")}
                    <select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value as ExpenseCategory }))}>
                      {expenseCategories.map((category) => <option value={category} key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="menu-field">
                    {tr("Amount", "المبلغ")}
                    <span className="menu-price-input"><b>{currency}</b><input dir="ltr" inputMode="decimal" value={expenseForm.amount} onChange={(event) => { setExpenseForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d.,]/g, "") })); setExpenseFormError(""); }} placeholder={currency === "LBP" ? "0" : "0.00"}/></span>
                  </label>
                  <label className="menu-field wide">
                    {tr("Expense date", "تاريخ المصروف")}
                    <input type="date" value={expenseForm.date} onChange={(event) => { setExpenseForm((current) => ({ ...current, date: event.target.value })); setExpenseFormError(""); }}/>
                  </label>
                  <label className="menu-field wide">
                    {tr("Paid from", "دُفع من")}
                    <select value={expenseForm.paidFrom} onChange={(event) => { setExpenseForm((current) => ({ ...current, paidFrom: event.target.value as "cash_drawer" | "owner" })); setExpenseFormError(""); }}>
                      <option value="cash_drawer">{tr("Cash Drawer", "صندوق النقد")}</option><option value="owner">{tr("Owner", "المالك")}</option>
                    </select>
                  </label>
                </div>
                <div className="expense-form-note">ⓘ {tr(`The amount is entered in ${currency} and reports store its USD value.`, `يُدخل المبلغ بعملة ${currency} وتحفظ التقارير قيمته بالدولار.`)}</div>
                {expenseFormError && <p className="menu-form-error" role="alert">{expenseFormError}</p>}
              </div>
              <footer className="menu-modal-actions">
                <button type="button" className="secondary-action" onClick={closeExpenseEditor}>{tr("Cancel", "إلغاء")}</button>
                <button type="submit" className="user-save-action">{tr(expenseEditor.mode === "add" ? "Add expense" : "Save changes", expenseEditor.mode === "add" ? "إضافة المصروف" : "حفظ التغييرات")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {expenseDeleteConfirmation && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpenseDeleteConfirmation(null);
          }}
        >
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-expense-title" aria-describedby="confirm-expense-description">
            <span className="confirm-icon">×</span>
            <h2 id="confirm-expense-title">{tr(`Delete ${expenseDeleteConfirmation.item}?`, `حذف ${expenseDeleteConfirmation.item}؟`)}</h2>
            <p id="confirm-expense-description">{tr("This removes the expense from this POS and future Excel reports.", "سيتم حذف المصروف من هذا الجهاز ومن تقارير Excel المستقبلية.")}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setExpenseDeleteConfirmation(null)}>{tr("Cancel", "إلغاء")}</button>
              <button className="danger-action" type="button" onClick={deleteExpense}>{tr("Delete expense", "حذف المصروف")}</button>
            </div>
          </section>
        </div>
      )}
      {menuEditor && (
        <div
          className="menu-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMenuEditor();
          }}
        >
          <section className="menu-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-modal-title">
            <header className="menu-modal-header">
              <div>
                <p>{menuEditor.kind === "item" ? tr("MENU ITEM", "صنف من القائمة") : tr("TOPPING", "إضافة")}</p>
                <h2 id="menu-modal-title">{tr(
                  menuEditor.mode === "add" ? `Add ${menuEditor.kind === "item" ? "menu item" : "topping"}` : `Edit ${menuEditor.kind === "item" ? "menu item" : "topping"}`,
                  menuEditor.mode === "add" ? `إضافة ${menuEditor.kind === "item" ? "صنف" : "إضافة"}` : `تعديل ${menuEditor.kind === "item" ? "الصنف" : "الإضافة"}`,
                )}</h2>
              </div>
              <button type="button" className="menu-modal-close" onClick={closeMenuEditor} aria-label={tr("Close", "إغلاق")}>×</button>
            </header>
            <form className="menu-modal-form" onSubmit={submitMenuEntry}>
              <div className="menu-modal-scroll">
                {menuEditor.kind === "item" ? (
                  <>
                    <div className="menu-form-grid">
                      <label className="menu-field wide">
                        {tr("Item name", "اسم الصنف")}
                        <input autoFocus autoComplete="off" value={menuItemForm.name} onChange={(event) => { setMenuItemForm((current) => ({ ...current, name: event.target.value })); setMenuFormError(""); }} placeholder={tr("Example: Sparkling water", "مثال: مياه غازية")}/>
                      </label>
                      <label className="menu-field">
                        {tr("Category", "الفئة")}
                        <select value={menuItemForm.category} onChange={(event) => { const category = event.target.value as MenuCategory; setMenuItemForm((current) => ({ ...current, category })); setMenuFormError(""); }}>
                          {menuCategories.map((category) => <option value={category} key={category}>{menuCategoryIcon(category)} {category}</option>)}
                        </select>
                      </label>
                      <label className="menu-field">
                        {tr("Price", "السعر")}
                        <span className="menu-price-input"><b>USD</b><input dir="ltr" inputMode="decimal" value={menuItemForm.price} onChange={(event) => { setMenuItemForm((current) => ({ ...current, price: event.target.value.replace(/[^\d.,]/g, "") })); setMenuFormError(""); }} placeholder="0.00"/></span>
                      </label>
                      <label className="menu-field wide">
                        {tr("Description", "الوصف")}
                        <textarea value={menuItemForm.description} onChange={(event) => setMenuItemForm((current) => ({ ...current, description: event.target.value }))} placeholder={tr("Short description shown to the cashier", "وصف قصير يظهر للكاشير")} maxLength={140}/>
                      </label>
                      <label className="menu-field wide">
                        {tr("Menu photo (optional)", "صورة الصنف (اختياري)")}
                        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={menuImageUploading} onChange={(event) => void uploadMenuImage(event.target.files?.[0])}/>
                      </label>
                    </div>
                    <div className="menu-image-preview">
                      <span aria-hidden="true">{menuCategoryIcon(menuItemForm.category)}</span>
                      {menuItemForm.image && <img key={menuItemForm.image} src={menuItemForm.image} alt="" onLoad={(event) => { event.currentTarget.style.display = "block"; }} onError={(event) => { event.currentTarget.style.display = "none"; }}/>}
                      <p><strong>{menuImageUploading ? tr("Uploading…", "جارٍ الرفع…") : tr("Persistent photo preview", "معاينة الصورة المحفوظة")}</strong><small>{tr("JPG, PNG or WebP · maximum 5 MB", "JPG أو PNG أو WebP · بحد أقصى 5 ميغابايت")}</small></p>
                    </div>
                    {menuItemForm.image && <button className="remove-menu-image" type="button" onClick={() => setMenuItemForm((current) => ({ ...current, image: "" }))}>{tr("Remove photo", "إزالة الصورة")}</button>}
                    <label className="menu-active-toggle">
                      <input type="checkbox" checked={menuItemForm.customizable} onChange={(event) => setMenuItemForm((current) => ({ ...current, customizable: event.target.checked }))}/>
                      <span><strong>{tr("Ask add-on questions", "اسأل عن الإضافات")}</strong><small>{tr("Cashier chooses available flavors and add-ons with Yes or No.", "يختار الكاشير النكهات والإضافات المتاحة بنعم أو لا.")}</small></span>
                    </label>
                    <label className="menu-active-toggle">
                      <input type="checkbox" checked={menuItemForm.available} onChange={(event) => setMenuItemForm((current) => ({ ...current, available: event.target.checked }))}/>
                      <span><strong>{tr("Available for sale", "متوفر للبيع")}</strong><small>{tr("Show this item to the cashier in New Order.", "أظهر هذا الصنف للكاشير في الطلب الجديد.")}</small></span>
                    </label>
                  </>
                ) : (
                  <>
                    <div className="menu-form-grid">
                      <label className="menu-field wide">
                        {tr("Topping name", "اسم الإضافة")}
                        <input autoFocus autoComplete="off" value={toppingForm.name} onChange={(event) => { setToppingForm((current) => ({ ...current, name: event.target.value })); setMenuFormError(""); }} placeholder={tr("Example: Extra cheese", "مثال: جبنة إضافية")}/>
                      </label>
                      <label className="menu-field">
                        {tr("Icon", "الرمز")}
                        <input value={toppingForm.emoji} onChange={(event) => setToppingForm((current) => ({ ...current, emoji: event.target.value.slice(0, 8) }))} placeholder="🧀"/>
                      </label>
                      <label className="menu-field">
                        {tr("Extra price", "السعر الإضافي")}
                        <span className="menu-price-input"><b>USD</b><input dir="ltr" inputMode="decimal" value={toppingForm.price} onChange={(event) => { setToppingForm((current) => ({ ...current, price: event.target.value.replace(/[^\d.,]/g, "") })); setMenuFormError(""); }} placeholder="0.00"/></span>
                      </label>
                    </div>
                    <label className="menu-active-toggle">
                      <input type="checkbox" checked={toppingForm.available} onChange={(event) => setToppingForm((current) => ({ ...current, available: event.target.checked }))}/>
                      <span><strong>{tr("Available during customization", "متاحة أثناء التخصيص")}</strong><small>{tr("Cashier will be asked about this topping.", "سيُسأل الكاشير عن هذه الإضافة.")}</small></span>
                    </label>
                  </>
                )}
                {menuFormError && <p className="menu-form-error" role="alert">{menuFormError}</p>}
              </div>
              <footer className="menu-modal-actions">
                <button type="button" className="secondary-action" onClick={closeMenuEditor}>{tr("Cancel", "إلغاء")}</button>
                <button type="submit" className="user-save-action">{tr(menuEditor.mode === "add" ? "Add" : "Save changes", menuEditor.mode === "add" ? "إضافة" : "حفظ التغييرات")}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      {menuDeleteConfirmation && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMenuDeleteConfirmation(null);
          }}
        >
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-menu-title" aria-describedby="confirm-menu-description">
            <span className="confirm-icon">×</span>
            <h2 id="confirm-menu-title">{tr(`Delete ${menuDeleteConfirmation.name}?`, `حذف ${menuDeleteConfirmation.name}؟`)}</h2>
            <p id="confirm-menu-description">{tr(
              menuDeleteConfirmation.kind === "item"
                ? "This removes the item from Menu Management and New Order. You can hide it instead if it may return."
                : "This removes the topping from future customization questions.",
              menuDeleteConfirmation.kind === "item"
                ? "سيتم حذف الصنف من إدارة القائمة والطلب الجديد. يمكنك إخفاؤه بدلاً من ذلك إذا كان سيعود لاحقاً."
                : "سيتم حذف الإضافة من أسئلة التخصيص المستقبلية.",
            )}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setMenuDeleteConfirmation(null)}>{tr("Cancel", "إلغاء")}</button>
              <button className="danger-action" type="button" onClick={confirmMenuDelete}>{tr("Delete", "حذف")}</button>
            </div>
          </section>
        </div>
      )}
      {userConfirmation && confirmationUser && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setUserConfirmation(null);
          }}
        >
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-user-title"
            aria-describedby="confirm-user-description"
          >
            <span className="confirm-icon">{userConfirmation.kind === "delete" ? "×" : "!"}</span>
            <h2 id="confirm-user-title">{tr(
              userConfirmation.kind === "delete" ? `Delete ${confirmationUser.name}?` : `Deactivate ${confirmationUser.name}?`,
              userConfirmation.kind === "delete" ? `حذف ${confirmationUser.name}؟` : `تعطيل ${confirmationUser.name}؟`,
            )}</h2>
            <p id="confirm-user-description">{tr(
              userConfirmation.kind === "delete"
                ? "This removes the account from this POS. The user will no longer be able to sign in."
                : "The account will stay in the list but the user will not be able to sign in until you activate it again.",
              userConfirmation.kind === "delete"
                ? "سيتم حذف الحساب من هذا الجهاز ولن يتمكن المستخدم من تسجيل الدخول."
                : "سيبقى الحساب في اللائحة، لكن لن يتمكن المستخدم من الدخول حتى تفعّله مجدداً.",
            )}</p>
            <div className="confirm-actions">
              <button className="secondary-action" type="button" onClick={() => setUserConfirmation(null)}>{tr("Cancel", "إلغاء")}</button>
              <button className="danger-action" type="button" onClick={confirmUserChange}>{tr(userConfirmation.kind === "delete" ? "Delete user" : "Deactivate", userConfirmation.kind === "delete" ? "حذف المستخدم" : "تعطيل")}</button>
            </div>
          </section>
        </div>
      )}
      <aside className="sidebar">
        <button className="side-brand" onClick={() => navigate(role === "manager" ? "dashboard" : "pos")}>
          <img src="/cocktaillo-logo.png" alt="Cocktaillo Resto Café"/>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.filter((item) => role === "manager" || !item.manager).map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => navigate(item.id as View)}>
              <i>{item.icon}</i><span>{language === "ar" ? arabicNav[item.id] : item.label}</span>{item.id === "inventory" && lowStock.length > 0 && <b>{lowStock.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className={`shift-state ${shiftOpen ? "open" : ""}`}>
            <i /> <span>{shiftOpen ? tr("Shift is open", "الدوام مفتوح") : tr("Shift is closed", "الدوام مغلق")}</span>
          </div>
          <small>Cocktaillo POS • v1.0</small>
        </div>
      </aside>

      <div className="main-area">
        <header className="system-topbar">
          <div>
            <p>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <button className="locale-quick" onClick={() => setCurrency((current) => current === "USD" ? "LBP" : "USD")}>{currency}</button>
            <button className="locale-quick" onClick={() => setLanguage((current) => current === "en" ? "ar" : "en")}>{language === "en" ? "عربي" : "EN"}</button>
            <button className="theme-quick" onClick={() => setDark((current) => !current)} aria-label="Toggle theme">{dark ? "☀" : "◐"}</button>
            <div className="profile"><span>{currentUser.initials}</span><div><strong>{currentUser.name}</strong><small>{role}</small></div></div>
            <button className="logout-button" onClick={logout}>{tr("Log out", "خروج")}</button>
          </div>
        </header>

        <main className="content-area">
          {view === "dashboard" && role === "manager" && (
            <>
              <div className="welcome-row">
                <div><p className="page-kicker">LIVE OVERVIEW</p><h2>{tr(`Good evening, ${currentUser.name.split(" ")[0]}.`, `مساء الخير، ${currentUser.name.split(" ")[0]}.`)}</h2><p>Here&apos;s what&apos;s happening at Cocktaillo today.</p></div>
                <button className="primary-button" onClick={() => navigate("reports")}>View full report →</button>
              </div>
              <div className="metric-grid">
                <Metric label={tr("Net sales", "صافي المبيعات")} value={money(salesTotal)} trend={tr("Recorded on this POS", "مسجلة على هذا الجهاز")} icon="$" />
                <Metric label={tr("Orders", "الطلبات")} value={String(orders)} trend={tr("Completed orders", "طلبات مكتملة")} icon="#" />
                <Metric label={tr("Avg. order", "معدل الطلب")} value={money(orders > 0 ? salesTotal / orders : 0)} trend={tr("Sales ÷ orders", "المبيعات ÷ الطلبات")} icon="↗" />
                <Metric label="Available tables" value={`${availableTables} / 12`} trend="Floor status" icon="▦" />
              </div>
              <div className="dashboard-grid">
                <section className="panel sales-panel">
                  <PanelHead title="Sales today" caption="Hourly performance" action="Live" />
                  {salesTotal > 0 ? <>
                    <div className="chart-bars">
                      {[22, 34, 27, 45, 54, 48, 72, 64, 82, 68, 91, 76].map((height, index) => <i key={index} style={{ height: `${height}%` }}><span /></i>)}
                    </div>
                    <div className="chart-labels"><span>10am</span><span>1pm</span><span>4pm</span><span>7pm</span><span>10pm</span></div>
                  </> : <div className="sales-chart-empty"><span>$</span><strong>{tr("No sales recorded", "لا توجد مبيعات مسجلة")}</strong><small>{tr("Completed orders will build today's chart.", "ستظهر الطلبات المكتملة في الرسم البياني.")}</small></div>}
                </section>
                <section className="panel alert-panel">
                  <PanelHead title="Inventory alerts" caption={`${lowStock.length} items need attention`} action="View all" onAction={() => navigate("inventory")} />
                  {lowStock.map((item) => <div className="alert-line" key={item.id}><span className="alert-icon">!</span><div><strong>{item.item}</strong><small>{item.stock} {item.unit} left • Min {item.min}</small></div><b>Low</b></div>)}
                </section>
              </div>
              <section className="panel">
                <PanelHead title={tr("Recent orders", "الطلبات الأخيرة")} caption={tr("Latest activity across the restaurant", "آخر النشاطات في المطعم")} action={tr("Today", "اليوم")} />
                <div className="order-table table-head"><span>Order</span><span>Type</span><span>Cashier</span><span>Time</span><span>Status</span><span>Total</span></div>
                {recentOrders.map((order) => <div className="order-table" key={order.number}><span>{order.number}</span><span>{order.type}</span><span>{order.cashier}</span><span>{order.time}</span><span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span><span>{money(order.total)}</span></div>)}
                {!recentOrders.length && <div className="recent-orders-empty"><span>#</span><strong>{tr("No recent orders", "لا توجد طلبات حديثة")}</strong><small>{tr("New completed orders will appear here.", "ستظهر الطلبات الجديدة المكتملة هنا.")}</small></div>}
              </section>
            </>
          )}

          {view === "pos" && (
            <section>
              <div className="welcome-row compact">
                <div><p className="page-kicker">ORDER #{nextOrderNumber}</p><h2>{selectedMenuItem ? tr("Customize item", "تخصيص الصنف") : tr("New counter order", "طلب جديد")}</h2><p>{shiftOpen ? tr("Choose the service type, then build the order.", "اختر نوع الطلب ثم حضّر الطلب.") : tr("Your shift must be open before taking orders.", "يجب فتح الدوام قبل أخذ الطلبات.")}</p></div>
                <button className={`shift-button ${shiftOpen ? "danger" : ""}`} onClick={() => navigate("shift")}>{shiftOpen ? "Shift open" : "Open shift"}</button>
              </div>
              {!selectedMenuItem ? <>
                <section className="order-service-panel">
                  <div className="order-step-copy"><span>1</span><div><p>{tr("STEP 1", "الخطوة ١")}</p><h3>{tr("How will they receive the order?", "كيف سيستلم الزبون الطلب؟")}</h3></div></div>
                  <div className="order-service-options">
                    <button disabled={!shiftOpen} className={counterOrderType === "Dine-in" ? "active" : ""} onClick={() => { setCounterOrderType("Dine-in"); setCounterTable(null); setOrderContact({ name: "", phone: "", address: "", driver: "" }); }}><i>▦</i><span><strong>{tr("Dine-in", "داخل المطعم")}</strong><small>{tr("Serve at a numbered table", "تقديم على طاولة")}</small></span><b>✓</b></button>
                    <button disabled={!shiftOpen} className={counterOrderType === "Takeaway" ? "active" : ""} onClick={() => { setCounterOrderType("Takeaway"); setCounterTable(null); setOrderContact((current) => ({ ...current, address: "", driver: "" })); }}><i>▢</i><span><strong>{tr("Takeaway / Online", "سفري / أونلاين")}</strong><small>{tr("One pickup flow", "مسار استلام واحد")}</small></span><b>✓</b></button>
                    <button disabled={!shiftOpen} className={counterOrderType === "Delivery" ? "active" : ""} onClick={() => { setCounterOrderType("Delivery"); setCounterTable(null); }}><i>⌁</i><span><strong>{tr("Delivery", "توصيل")}</strong><small>{tr("Address and driver receipt", "عنوان وإيصال للسائق")}</small></span><b>✓</b></button>
                  </div>
                  {counterOrderType === "Dine-in" && (
                    <div className="counter-table-picker">
                      <div><strong>{tr("Choose table number", "اختر رقم الطاولة")}</strong><small>{tr("Occupied tables cannot receive a new order.", "لا يمكن إضافة طلب جديد إلى طاولة مشغولة.")}</small></div>
                      <div>{tables.map((table) => <button key={table.number} disabled={table.status === "occupied"} className={`${counterTable === table.number ? "selected" : ""} ${table.status}`} onClick={() => setCounterTable(table.number)}><b>{table.number}</b><small>{table.status}</small></button>)}</div>
                    </div>
                  )}
                  {(counterOrderType === "Takeaway" || counterOrderType === "Delivery") && (
                    <div className="order-contact-panel">
                      <div className="order-contact-heading">
                        <div><strong>{counterOrderType === "Delivery" ? tr("Delivery details", "معلومات التوصيل") : tr("Takeaway / online pickup details", "معلومات السفري / الاستلام أونلاين")}</strong><small>{counterOrderType === "Delivery" ? tr("These details print on the driver receipt.", "تُطبع هذه المعلومات على إيصال السائق.") : tr("Takeaway and online pickup now use this same flow.", "السفري والاستلام أونلاين أصبحا في نفس المسار.")}</small></div>
                        <span className={counterServiceReady ? "ready" : ""}>{counterServiceReady ? tr("Ready", "جاهز") : tr("Required", "مطلوب")}</span>
                      </div>
                      <div className="order-contact-grid">
                        <label>{tr("Customer name", "اسم الزبون")} *<input autoComplete="name" value={orderContact.name} onChange={(event) => setOrderContact((current) => ({ ...current, name: event.target.value }))} placeholder={tr("Full name", "الاسم الكامل")}/></label>
                        <label>{tr("Phone number", "رقم الهاتف")} *<input autoComplete="tel" inputMode="tel" value={orderContact.phone} onChange={(event) => setOrderContact((current) => ({ ...current, phone: event.target.value }))} placeholder="+961"/></label>
                        {counterOrderType === "Delivery" && <label className="wide">{tr("Delivery address", "عنوان التوصيل")} *<textarea value={orderContact.address} onChange={(event) => setOrderContact((current) => ({ ...current, address: event.target.value }))} placeholder={tr("Area, street, building, floor", "المنطقة، الشارع، المبنى، الطابق")}/></label>}
                        {counterOrderType === "Delivery" && <label className="wide">{tr("Driver name", "اسم السائق")} <small>{tr("(optional)", "(اختياري)")}</small><input value={orderContact.driver} onChange={(event) => setOrderContact((current) => ({ ...current, driver: event.target.value }))} placeholder={tr("Assign now or later", "عيّنه الآن أو لاحقاً")}/></label>}
                      </div>
                    </div>
                  )}
                  <div className="payment-panel">
                    <div><strong>{tr("Payment method", "طريقة الدفع")}</strong><small>{tr("The drawer opens for cash payments by default.", "يفتح الدرج للدفع النقدي تلقائياً.")}</small></div>
                    <div className="payment-options">
                      {(["Cash", "Card", "Online"] as PaymentMethod[]).map((method) => <button type="button" className={paymentMethod === method ? "active" : ""} onClick={() => { setPaymentMethod(method); if (method !== "Cash") setCashReceivedInput(""); }} key={method}>{method === "Cash" ? "▣" : method === "Card" ? "▰" : "◎"} {tr(method, method === "Cash" ? "نقداً" : method === "Card" ? "بطاقة" : "أونلاين")}</button>)}
                    </div>
                    {paymentMethod === "Cash" && <label>{tr("Cash received", "المبلغ المستلم")} <small>{tr("(leave blank for exact amount)", "(اتركه فارغاً للمبلغ المحدد)")}</small><input type="number" min="0" step="0.01" inputMode="decimal" value={cashReceivedInput} onChange={(event) => setCashReceivedInput(event.target.value)} placeholder={tr("Exact amount", "المبلغ المحدد")}/></label>}
                  </div>
                </section>
                <section className={`menu-step ${counterServiceReady ? "" : "locked"}`}>
                  <div className="order-step-copy"><span>2</span><div><p>{tr("STEP 2", "الخطوة ٢")}</p><h3>{tr("Choose a menu item", "اختر صنفاً من القائمة")}</h3></div></div>
                  <div className="pos-category-filter" role="tablist" aria-label={tr("Menu categories", "فئات القائمة")}>
                    {(["All", ...menuCategories] as const).map((category) => (
                      <button
                        type="button"
                        role="tab"
                        aria-selected={posMenuFilter === category}
                        className={`pos-category-button ${posMenuFilter === category ? "active" : ""}`}
                        onClick={() => setPosMenuFilter(category)}
                        key={category}
                      >
                        <span>{category === "All" ? "☷" : menuCategoryIcon(category)}</span>
                        {category === "All" ? tr("All", "الكل") : category}
                      </button>
                    ))}
                  </div>
                  {visibleMenuItems.length ? (
                    <div className="pos-grid">
                      {visibleMenuItems.map((item) => (
                        <button disabled={!counterServiceReady} className="pos-dish" key={item.id} onClick={() => beginMenuItem(item)}>
                          <span className="pos-dish-media">
                            <span className="pos-dish-placeholder" aria-hidden="true">{menuCategoryIcon(item.category)}</span>
                            {item.image && <img src={item.image} alt={item.name} onLoad={(event) => { event.currentTarget.style.display = "block"; }} onError={(event) => { event.currentTarget.style.display = "none"; }}/>}
                            <em className="pos-dish-category">{item.category}</em>
                          </span>
                          <span className="pos-dish-details"><span><strong>{item.name}</strong><small>{item.description || tr("Freshly made to order", "تحضير طازج حسب الطلب")}</small></span><b>{money(item.price)}</b></span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="pos-empty-state"><span>☷</span><strong>{tr("No available items in this category", "لا توجد أصناف متاحة في هذه الفئة")}</strong><small>{tr("A manager can add or show items from Menu Management.", "يمكن للمدير إضافة الأصناف أو إظهارها من إدارة القائمة.")}</small></div>
                  )}
                </section>
              </> :
                <div className="customizer">
                  <aside>
                    <span className="pos-dish-media customizer-media">
                      <span className="pos-dish-placeholder" aria-hidden="true">{menuCategoryIcon(selectedMenuItem.category)}</span>
                      {selectedMenuItem.image && <img src={selectedMenuItem.image} alt={selectedMenuItem.name} onLoad={(event) => { event.currentTarget.style.display = "block"; }} onError={(event) => { event.currentTarget.style.display = "none"; }}/>}
                    </span>
                    <span className="counter-order-context">{counterOrderType === "Dine-in" ? `${tr("Dine-in", "داخل المطعم")} · ${tr("Table", "طاولة")} ${counterTable}` : `${counterOrderType === "Delivery" ? tr("Delivery", "توصيل") : tr("Takeaway / Online", "سفري / أونلاين")} · ${contactName}`}</span>
                    <p>{tr("Your item", "الصنف المختار")}</p><h3>{selectedMenuItem.name}</h3><strong>{money(selectedTotal)}</strong>
                    <button onClick={() => { setSelectedMenuItem(null); setSelectedToppingIds([]); setOrderToppings([]); setToppingStep(0); }}>{tr("Change item", "تغيير الصنف")}</button>
                  </aside>
                  {currentTopping ? (
                    <div className="topping-question">
                      <p className="page-kicker">{tr("QUESTION", "السؤال")} {toppingStep + 1} {tr("OF", "من")} {orderToppings.length}</p>
                      <div className="food-emoji">{currentTopping.emoji}</div>
                      <h2>{tr("Would you like", "هل ترغب بإضافة")}<br/><em>{currentTopping.name}?</em></h2>
                      <p>{currentTopping.price > 0 ? `+${money(currentTopping.price)} · ${tr("optional add-on", "إضافة اختيارية")}` : tr("Included in the item price", "مشمول بسعر الصنف")}</p>
                      <div><button className="no-answer" onClick={() => answerTopping(false)}>× <span>{tr("No", "لا")}<small>{tr("Skip this", "تخطي")}</small></span></button><button className="yes-answer" onClick={() => answerTopping(true)}>✓ <span>{tr("Yes", "نعم")}<small>{tr("Add it", "إضافة")}</small></span></button></div>
                    </div>
                  ) : (
                    <div className="topping-question"><div className="food-emoji">✓</div><h2>{tr("Item ready", "الصنف جاهز")}</h2><p>{tr("No available toppings to ask about.", "لا توجد إضافات متاحة حالياً.")}</p><div><button className="yes-answer" onClick={() => completeOrder(selectedMenuItem, orderToppings.filter((topping) => selectedToppingIds.includes(topping.id)))}>✓ <span>{tr("Complete order", "إكمال الطلب")}</span></button></div></div>
                  )}
                </div>}
            </section>
          )}

          {view === "tables" && (
            <section className="tables-page">
              <div className="welcome-row compact"><div><p className="page-kicker">DINING ROOM</p><h2>{tr("Tables & reservations", "الطاولات والحجوزات")}</h2><p>{tr("Manage live guest occupancy and upcoming reservations.", "إدارة إشغال الضيوف والحجوزات القادمة.")}</p></div><div className="table-page-actions"><div className="legend"><span><i className="available"/>Available</span><span><i className="occupied"/>Occupied</span><span><i className="reserved"/>Reserved</span></div><button className="secondary-action" type="button" onClick={addTable}>+ {tr("Table", "طاولة")}</button><button className="primary-button" type="button" onClick={openReservation}>+ {tr("Reservation", "حجز")}</button></div></div>
              <div className="table-grid">{tables.map((table) => <button className={`restaurant-table ${table.status}`} key={table.number} onClick={() => updateTable(table.number)}><span className="table-number">{table.number}</span><small>{tr("Table", "طاولة")}</small><strong>{table.status}</strong><div><span>♙ <b>{table.currentGuests ?? 0} / {table.seats}</b> {tr("Guests", "ضيوف")}</span>{table.order && <span>{table.order}</span>}</div>{table.total && <b>${table.total.toFixed(2)}</b>}</button>)}</div>
              <section className="panel reservations-panel"><div className="panel-head"><div><h3>{tr("Reservations", "الحجوزات")}</h3><p>{tr("Upcoming and seated guests", "الضيوف القادمون والجالسون")}</p></div></div>
                <div className="reservation-list">{reservations.map((reservation) => <article className="reservation-card" key={reservation.id}><div><strong>{reservation.customerName}</strong><small>{reservation.date} · {reservation.time}{reservation.phone ? ` · ${reservation.phone}` : ""}</small></div><span>{reservation.guests} / {tables.find((table) => table.number === reservation.tableNumber)?.seats ?? "—"} {tr("Guests", "ضيوف")}</span><span>{tr("Table", "طاولة")} {reservation.tableNumber}</span><b className={reservation.status}>{reservation.status}</b>{reservation.status === "upcoming" && <button type="button" onClick={() => seatReservation(reservation)}>{tr("Seat reservation", "إجلاس الحجز")}</button>}</article>)}{!reservations.length && <div className="reservation-empty">{tr("No reservations yet.", "لا توجد حجوزات بعد.")}</div>}</div>
              </section>
            </section>
          )}

          {view === "shift" && (
            <section className="narrow-page">
              <div className="shift-hero"><span className={shiftOpen ? "open" : ""}>◷</span><p className="page-kicker">CURRENT REGISTER</p><h2>{shiftOpen ? tr("Shift in progress", "الدوام مفتوح") : tr("Ready to start?", "جاهز للبدء؟")}</h2><p>{shiftOpen ? tr(`Opened today at ${shiftStartedAt} by ${shiftOpenedBy}`, `فُتح اليوم الساعة ${shiftStartedAt} بواسطة ${shiftOpenedBy}`) : tr(`Signed in as ${currentUser.name}. Enter the exact cash currently in the drawer.`, `تم الدخول باسم ${currentUser.name}. أدخل المبلغ الموجود حالياً في الصندوق.`)}</p></div>
              <div className="shift-stats"><div><span>Opening cash</span><strong>{shiftOpen && openingCash !== null ? money(openingCash) : "—"}</strong></div><div><span>Cash sales</span><strong>{shiftOpen ? money(426.5) : "—"}</strong></div><div><span>Card sales</span><strong>{shiftOpen ? money(858) : "—"}</strong></div><div><span>Orders</span><strong>{shiftOpen ? orders : "—"}</strong></div></div>
              {!shiftOpen ? (
                <form className="shift-open-form" onSubmit={(event) => { event.preventDefault(); toggleShift(); }}>
                  <label>
                    <span>{tr("Opening cash amount", "المبلغ الافتتاحي")}</span>
                    <small>{tr(`Enter the amount in ${currency}. It is never filled automatically.`, `أدخل المبلغ بعملة ${currency}. لا تتم تعبئته تلقائياً.`)}</small>
                    <div className="shift-cash-input">
                      <b>{currency}</b>
                      <input
                        aria-label={tr("Opening cash amount", "المبلغ الافتتاحي")}
                        autoComplete="off"
                        dir="ltr"
                        inputMode="decimal"
                        value={openingCashInput}
                        onChange={(event) => setOpeningCashInput(event.target.value.replace(/[^\d.,]/g, ""))}
                        placeholder={currency === "LBP" ? "0" : "0.00"}
                      />
                    </div>
                  </label>
                  <button className="shift-open-submit" type="submit" disabled={!openingCashInput.trim()}>
                    {tr("Open shift", "فتح الدوام")} <span>→</span>
                  </button>
                </form>
              ) : (
                <button className="big-shift-button close" onClick={toggleShift}>{tr("Close shift & count cash", "إغلاق الدوام وعدّ الصندوق")}</button>
              )}
            </section>
          )}

          {view === "inventory" && role === "manager" && (
            <section className="inventory-page">
              <div className="welcome-row compact"><div><p className="page-kicker">{tr("STOCK CONTROL", "إدارة المخزون")}</p><h2>{tr("Inventory", "المخزون")}</h2><p>{tr("Add, edit and delete stock tracked by grams, kilograms, liters, pieces or boxes.", "أضف وعدّل واحذف المخزون المقاس بالغرام أو الكيلوغرام أو الليتر أو القطعة أو العلبة.")}</p></div><button className="primary-button" onClick={openAddInventoryItem}>+ {tr("Add inventory item", "إضافة صنف مخزون")}</button></div>
              <div className="user-storage-note"><span>⌂</span><p><strong>{tr("Saved on this POS device", "محفوظ على جهاز نقطة البيع هذا")}</strong>{tr("Quantities, costs and low-stock alerts update immediately after every change.", "تتحدث الكميات والتكاليف وتنبيهات انخفاض المخزون فور كل تعديل.")}</p></div>
              <div className="unit-guide"><span><b>g / kg</b>Weight</span><span><b>ml / L</b>Volume</span><span><b>item</b>Individual pieces</span><span><b>box</b>Packaged stock</span></div>
              <div className="inventory-summary"><span><b>{inventory.length}</b>Total items</span><span className="warning"><b>{lowStock.length}</b>Low stock alerts</span><span><b>{money(inventory.reduce((sum, item) => sum + item.stock * item.cost, 0))}</b>Stock value</span></div>
              <section className="panel data-panel">
                <div className="inventory-table table-head"><span>{tr("Item", "الصنف")}</span><span>{tr("Category", "الفئة")}</span><span>{tr("In stock", "الكمية")}</span><span>{tr("Alert at", "التنبيه عند")}</span><span>{tr("Status", "الحالة")}</span><span>{tr("Actions", "إجراءات")}</span></div>
                {inventory.map((item) => <div className="inventory-table" key={item.id}><span><strong>{item.item}</strong><small>{money(item.cost)} / {item.unit}</small></span><span>{item.category}</span><span>{item.stock} {item.unit}</span><span>{item.min} {item.unit}</span><span><b className={item.stock <= item.min ? "low-pill" : "good-pill"}>{item.stock <= item.min ? tr("Low stock", "مخزون منخفض") : tr("In stock", "متوفر")}</b></span><span className="inventory-row-actions"><button type="button" className="restock" onClick={() => openRestock(item)}>+ {tr("Restock", "زيادة")}</button><button type="button" onClick={() => openEditInventoryItem(item)}>✎ {tr("Edit", "تعديل")}</button><button type="button" className="delete" onClick={() => setInventoryDeleteConfirmation(item)}>× {tr("Delete", "حذف")}</button></span></div>)}
                {!inventory.length && <div className="inventory-empty"><span>□</span><strong>{tr("No inventory items", "لا توجد أصناف مخزون")}</strong><small>{tr("Use Add inventory item to create the first record.", "استخدم إضافة صنف مخزون لإنشاء أول سجل.")}</small></div>}
              </section>
            </section>
          )}

          {view === "menu" && role === "manager" && (
            <section className="menu-page">
              <div className="welcome-row compact menu-heading">
                <div><p className="page-kicker">{tr("CATALOG CONTROL", "إدارة القائمة")}</p><h2>{tr("Menu management", "إدارة قائمة الطعام")}</h2><p>{tr("Add beverages and dishes, edit toppings and pricing, or hide anything that is unavailable.", "أضف المشروبات والأطباق وعدّل الإضافات والأسعار أو أخفِ أي صنف غير متوفر.")}</p></div>
                <button className="primary-button" onClick={() => openAddMenuEntry(menuTab === "items" ? "item" : "topping")}>+ {menuTab === "items" ? tr("Add menu item", "إضافة صنف") : tr("Add topping", "إضافة إضافة")}</button>
              </div>
              <div className="user-storage-note menu-storage-note"><span>⌂</span><p><strong>{tr("Saved on this POS device", "محفوظ على جهاز نقطة البيع هذا")}</strong>{tr("Changes appear immediately in New Order on this same device.", "تظهر التعديلات فوراً في شاشة الطلب الجديد على هذا الجهاز.")}</p></div>
              <div className="menu-tabs" role="tablist" aria-label={tr("Menu management sections", "أقسام إدارة القائمة")}>
                <button type="button" role="tab" aria-selected={menuTab === "items"} className={`menu-tab ${menuTab === "items" ? "active" : ""}`} onClick={() => setMenuTab("items")}><span>☷</span><strong>{tr("Menu items", "أصناف القائمة")}</strong><b>{menuItems.length}</b></button>
                <button type="button" role="tab" aria-selected={menuTab === "toppings"} className={`menu-tab ${menuTab === "toppings" ? "active" : ""}`} onClick={() => setMenuTab("toppings")}><span>✦</span><strong>{tr("Toppings", "الإضافات")}</strong><b>{toppings.length}</b></button>
              </div>
              {menuTab === "items" ? (
                menuItems.length ? (
                  <div className="menu-management-grid">
                    {menuItems.map((item) => (
                      <article className={`menu-card ${item.available ? "" : "is-unavailable"}`} key={item.id}>
                        <div className="menu-card-media">
                          <span aria-hidden="true">{menuCategoryIcon(item.category)}</span>
                          {item.image && <img src={item.image} alt={item.name} onLoad={(event) => { event.currentTarget.style.display = "block"; }} onError={(event) => { event.currentTarget.style.display = "none"; }}/>}
                          <b>{item.category}</b>
                        </div>
                        <div className="menu-card-copy">
                          <div className="menu-card-top"><div><h3>{item.name}</h3><p>{item.description || tr("No description", "لا يوجد وصف")}</p></div><strong className="menu-card-price">{money(item.price)}</strong></div>
                          <div className="menu-card-status"><span className={item.available ? "available" : "hidden"}>● {item.available ? tr("Available", "متوفر") : tr("Hidden from cashier", "مخفي عن الكاشير")}</span><small>{item.customizable ? tr("Uses topping questions", "مع خيارات الإضافات") : tr("Quick add — no toppings", "إضافة سريعة بلا إضافات")}</small></div>
                          <div className="menu-card-actions">
                            <button type="button" className="menu-action edit" onClick={() => openEditMenuItem(item)}>✎ {tr("Edit", "تعديل")}</button>
                            <button type="button" className="menu-action availability" onClick={() => toggleMenuEntry("item", item.id)}>{item.available ? "◷" : "✓"} {item.available ? tr("Hide", "إخفاء") : tr("Show", "إظهار")}</button>
                            <button type="button" className="menu-action delete" onClick={() => setMenuDeleteConfirmation({ kind: "item", id: item.id, name: item.name })}>× {tr("Delete", "حذف")}</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="menu-empty"><span>☷</span><h3>{tr("No menu items yet", "لا توجد أصناف بعد")}</h3><p>{tr("Add food, hookah, cocktails, drinks, desserts or any other item.", "أضف الطعام والأرجيلة والكوكتيلات والمشروبات والحلويات أو أي صنف آخر.")}</p><button className="primary-button" onClick={() => openAddMenuEntry("item")}>+ {tr("Add first item", "إضافة أول صنف")}</button></div>
                )
              ) : (
                toppings.length ? (
                  <div className="menu-management-grid">
                    {toppings.map((topping) => (
                      <article className={`menu-card is-topping ${topping.available ? "" : "is-unavailable"}`} key={topping.id}>
                        <span className="menu-topping-icon" aria-hidden="true">{topping.emoji}</span>
                        <div className="menu-card-copy">
                          <div className="menu-card-top"><div><h3>{topping.name}</h3><p>{tr("Optional order add-on", "إضافة اختيارية للطلب")}</p></div><strong className="menu-card-price">+ {money(topping.price)}</strong></div>
                          <div className="menu-card-status"><span className={topping.available ? "available" : "hidden"}>● {topping.available ? tr("Asked during customization", "تظهر أثناء التخصيص") : tr("Hidden from cashier", "مخفية عن الكاشير")}</span></div>
                          <div className="menu-card-actions">
                            <button type="button" className="menu-action edit" onClick={() => openEditTopping(topping)}>✎ {tr("Edit", "تعديل")}</button>
                            <button type="button" className="menu-action availability" onClick={() => toggleMenuEntry("topping", topping.id)}>{topping.available ? "◷" : "✓"} {topping.available ? tr("Hide", "إخفاء") : tr("Show", "إظهار")}</button>
                            <button type="button" className="menu-action delete" onClick={() => setMenuDeleteConfirmation({ kind: "topping", id: topping.id, name: topping.name })}>× {tr("Delete", "حذف")}</button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="menu-empty"><span>✦</span><h3>{tr("No toppings yet", "لا توجد إضافات بعد")}</h3><p>{tr("Add the optional extras the cashier should ask about.", "أضف الخيارات الإضافية التي يسأل عنها الكاشير.")}</p><button className="primary-button" onClick={() => openAddMenuEntry("topping")}>+ {tr("Add first topping", "إضافة أول خيار")}</button></div>
                )
              )}
            </section>
          )}

          {view === "expenses" && role === "manager" && (
            <section className="expenses-page">
              <div className="welcome-row compact"><div><p className="page-kicker">{tr("COST TRACKING", "تتبع المصاريف")}</p><h2>{tr("Expenses", "المصاريف")}</h2><p>{tr("Add, edit and delete electricity, salaries, internet, rent, supplies and other costs.", "أضف وعدّل واحذف تكاليف الكهرباء والرواتب والإنترنت والإيجار واللوازم وغيرها.")}</p></div><button className="primary-button" onClick={openAddExpense}>+ {tr("Add expense", "إضافة مصروف")}</button></div>
              <div className="user-storage-note"><span>⌂</span><p><strong>{tr("Saved on this POS device", "محفوظ على جهاز نقطة البيع هذا")}</strong>{tr("Every change is included automatically in future Excel reports.", "كل تعديل يُضاف تلقائياً إلى تقارير Excel المستقبلية.")}</p></div>
              <div className="expense-categories">{["⚡ Electricity","♙ Salary","⌁ Internet","⌂ Rent","□ Supplies","••• Other"].map((category) => <span key={category}>{category}</span>)}</div>
              <div className="metric-grid"><Metric label={tr("Total expenses", "إجمالي المصاريف")} value={money(expenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={`${expenses.length} ${tr("entries", "قيود")}`} icon="↘"/><Metric label={tr("Cash Drawer", "صندوق النقد")} value={money(cashDrawerExpenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={tr("Deducted from shifts", "مخصوم من الدوامات")} icon="$"/><Metric label={tr("Owner Paid", "دفع المالك")} value={money(ownerExpenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={tr("Does not affect drawer", "لا يؤثر على الصندوق")} icon="♙"/><Metric label={tr("This month", "هذا الشهر")} value={money(monthExpenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={topExpenseCategory} icon="□"/></div>
              <section className="panel data-panel"><PanelHead title={tr("Recent expenses", "المصاريف الأخيرة")} caption={tr("All recorded operating costs", "جميع تكاليف التشغيل المسجلة")} action={tr("Export Excel", "تصدير Excel")} onAction={exportExcel}/>
                <div className="expense-table table-head"><span>{tr("Description", "الوصف")}</span><span>{tr("Category", "الفئة")}</span><span>{tr("Date", "التاريخ")}</span><span>{tr("Paid from", "دُفع من")}</span><span>{tr("Amount", "المبلغ")}</span><span>{tr("Actions", "إجراءات")}</span></div>
                {expenses.map((expense) => <div className="expense-table" key={expense.id}><span><strong>{expense.item}</strong></span><span>{expense.category}</span><span>{formatExpenseDate(expense.date)}</span><span>{(expense.paidFrom ?? "owner") === "cash_drawer" ? tr("Cash Drawer", "صندوق النقد") : tr("Owner", "المالك")}</span><span><strong>{money(expense.amount)}</strong></span><span className="expense-row-actions"><button type="button" onClick={() => openEditExpense(expense)}>✎ {tr("Edit", "تعديل")}</button><button type="button" className="delete" onClick={() => setExpenseDeleteConfirmation(expense)}>× {tr("Delete", "حذف")}</button></span></div>)}
                {!expenses.length && <div className="expense-empty"><span>↘</span><strong>{tr("No expenses recorded", "لا توجد مصاريف مسجلة")}</strong><small>{tr("Use Add expense to create the first record.", "استخدم إضافة مصروف لإنشاء أول سجل.")}</small></div>}
              </section>
            </section>
          )}

          {view === "users" && role === "manager" && (
            <section className="users-page">
              <div className="welcome-row compact"><div><p className="page-kicker">{tr("ADMIN CONTROL CENTER", "مركز تحكم الإدارة")}</p><h2>{tr("Admin dashboard", "لوحة الإدارة")}</h2><p>{tr("Manage staff access, reset passwords, change roles and disable accounts from one place.", "أدر صلاحيات الموظفين وغيّر كلمات السر والأدوار وعطّل الحسابات من مكان واحد.")}</p></div><button className="primary-button" onClick={openAddUser}>+ {tr("Add user", "إضافة مستخدم")}</button></div>
              <div className="metric-grid">
                <Metric label={tr("Total users", "كل المستخدمين")} value={String(accounts.length)} trend={tr("Registered on this POS", "مسجّلون على هذا الجهاز")} icon="♙"/>
                <Metric label={tr("Managers", "المدراء")} value={String(accounts.filter((account) => account.role === "manager").length)} trend={tr("Full admin access", "صلاحيات إدارة كاملة")} icon="◆"/>
                <Metric label={tr("Cashiers", "الكاشير")} value={String(accounts.filter((account) => account.role === "cashier").length)} trend={tr("POS access", "صلاحية نقطة البيع")} icon="▣"/>
                <Metric label={tr("Disabled", "المعطّلون")} value={String(accounts.filter((account) => !account.active).length)} trend={tr("Cannot sign in", "لا يمكنهم تسجيل الدخول")} icon="×"/>
              </div>
              <div className="permission-note"><span>🔒</span><div><strong>{tr("Password recovery is available here", "استعادة كلمات السر متاحة هنا")}</strong><p>{tr("Open a user menu, choose Edit user, enter a new password and save. Cashiers cannot open this admin dashboard.", "افتح قائمة المستخدم واختر تعديل المستخدم، ثم أدخل كلمة سر جديدة واحفظ. حسابات الكاشير لا يمكنها فتح لوحة الإدارة.")}</p></div></div>
              <div className="user-storage-note"><span>⌂</span><p><strong>{tr("Saved on this POS device", "محفوظ على جهاز نقطة البيع هذا")}</strong>{tr("Every added or edited account is used immediately by the sign-in screen.", "كل حساب تتم إضافته أو تعديله يصبح جاهزاً فوراً على شاشة تسجيل الدخول.")}</p></div>
              <div className="user-grid">
                {accounts.map((user) => (
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
              <div className="metric-grid"><Metric label="Gross sales" value={money(salesTotal)} trend={tr("Persisted finalized sales", "المبيعات النهائية المحفوظة")} icon="$"/><Metric label="Net profit" value={money(salesTotal - expenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={tr("Sales minus expenses", "المبيعات ناقص المصاريف")} icon="↗"/><Metric label="Orders" value={String(orders)} trend={tr("Finalized orders", "الطلبات النهائية")} icon="#"/><Metric label="Expenses" value={money(expenses.reduce((sum, expense) => sum + expense.amount, 0))} trend={`${cashDrawerExpenses.length} ${tr("drawer", "صندوق")} · ${ownerExpenses.length} ${tr("owner", "مالك")}`} icon="↘"/></div>
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
