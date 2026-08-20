export type Role = "admin" | "manager" | "cashier";
export type Permission =
  | "orders:write" | "tables:write" | "reservations:write" | "shifts:write"
  | "menu:write" | "recipes:write" | "inventory:write" | "expenses:write"
  | "reports:read" | "users:write" | "settings:write" | "factory_reset:write";
export type StockDimension = "mass" | "volume" | "count";
export type StockUnit = "g" | "kg" | "ml" | "L" | "piece" | "pack";
export type ExpenseSource = "cash_drawer" | "owner";

const permissions: Record<Role, ReadonlySet<Permission>> = {
  admin: new Set<Permission>(["orders:write", "tables:write", "reservations:write", "shifts:write", "menu:write", "recipes:write", "inventory:write", "expenses:write", "reports:read", "users:write", "settings:write", "factory_reset:write"]),
  manager: new Set<Permission>(["orders:write", "tables:write", "reservations:write", "shifts:write", "menu:write", "recipes:write", "inventory:write", "expenses:write", "reports:read"]),
  cashier: new Set<Permission>(["orders:write", "tables:write", "reservations:write", "shifts:write"]),
};

export class PosDomainError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = "PosDomainError";
  }
}

export function requirePermission(role: Role, permission: Permission) {
  if (!permissions[role].has(permission)) throw new PosDomainError("FORBIDDEN", "You do not have permission to perform this action.", 403);
}

export function assertTableOccupancy(capacity: number, guests: number) {
  if (!Number.isInteger(capacity) || capacity < 1) throw new PosDomainError("INVALID_CAPACITY", "Table capacity must be at least one.");
  if (!Number.isInteger(guests) || guests < 0) throw new PosDomainError("INVALID_GUEST_COUNT", "Guest count must be zero or greater.");
  if (guests > capacity) throw new PosDomainError("TABLE_CAPACITY_EXCEEDED", `This table can seat at most ${capacity} guests.`);
}

export function assertReservation(input: { capacity: number; guests: number; startsAt: string; endsAt: string }) {
  assertTableOccupancy(input.capacity, input.guests);
  if (input.guests < 1) throw new PosDomainError("INVALID_GUEST_COUNT", "A reservation must include at least one guest.");
  const startsAt = Date.parse(input.startsAt);
  const endsAt = Date.parse(input.endsAt);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) {
    throw new PosDomainError("INVALID_RESERVATION_TIME", "Choose a valid reservation start and end time.");
  }
}

export function reservationsOverlap(a: { startsAt: string; endsAt: string }, b: { startsAt: string; endsAt: string }) {
  return Date.parse(a.startsAt) < Date.parse(b.endsAt) && Date.parse(b.startsAt) < Date.parse(a.endsAt);
}

export function toBaseQuantity(value: string | number, unit: StockUnit): { quantityBase: number; dimension: StockDimension } {
  const raw = typeof value === "number" ? String(value) : value.trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(raw)) throw new PosDomainError("INVALID_QUANTITY", "Quantity must be a positive number with at most three decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const thousandths = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  if (!Number.isSafeInteger(thousandths) || thousandths <= 0) throw new PosDomainError("INVALID_QUANTITY", "Quantity must be greater than zero.");
  if (unit === "kg" || unit === "L") return { quantityBase: thousandths * 1000, dimension: unit === "kg" ? "mass" : "volume" };
  if (unit === "g") return { quantityBase: thousandths, dimension: "mass" };
  if (unit === "ml") return { quantityBase: thousandths, dimension: "volume" };
  return { quantityBase: thousandths, dimension: "count" };
}

export function recipeConsumption(recipeQuantityBase: number, soldQuantity: number) {
  if (!Number.isSafeInteger(recipeQuantityBase) || recipeQuantityBase <= 0 || !Number.isInteger(soldQuantity) || soldQuantity <= 0) {
    throw new PosDomainError("INVALID_RECIPE_QUANTITY", "Recipe and sold quantities must be greater than zero.");
  }
  const result = recipeQuantityBase * soldQuantity;
  if (!Number.isSafeInteger(result)) throw new PosDomainError("QUANTITY_OVERFLOW", "Inventory quantity is too large.");
  return result;
}

export function expectedDrawerCashCents(input: {
  openingCashCents: number; cashSalesCents: number; cashInCents?: number;
  cashDrawerExpensesCents: number; cashRefundsCents: number;
}) {
  const values = [input.openingCashCents, input.cashSalesCents, input.cashInCents ?? 0, input.cashDrawerExpensesCents, input.cashRefundsCents];
  if (!values.every(Number.isSafeInteger)) throw new PosDomainError("INVALID_MONEY", "Cash values must use whole cents.");
  return input.openingCashCents + input.cashSalesCents + (input.cashInCents ?? 0) - input.cashDrawerExpensesCents - input.cashRefundsCents;
}

export function expenseDrawerImpactCents(source: ExpenseSource, amountCents: number, hasOpenShift: boolean) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new PosDomainError("INVALID_MONEY", "Expense amount must be greater than zero.");
  if (source === "cash_drawer" && !hasOpenShift) throw new PosDomainError("NO_ACTIVE_SHIFT", "Open a shift before recording a cash drawer expense.");
  return source === "cash_drawer" ? -amountCents : 0;
}

export function restoreFromOriginalTransactions(transactions: Array<{ quantityChangedBase: number; transactionType: string }>) {
  return transactions
    .filter((entry) => entry.transactionType === "sale_consumption")
    .map((entry) => {
      if (!Number.isSafeInteger(entry.quantityChangedBase) || entry.quantityChangedBase >= 0) throw new PosDomainError("INVALID_SALE_TRANSACTION", "Sale consumption must be a negative base quantity.");
      return -entry.quantityChangedBase;
    });
}
