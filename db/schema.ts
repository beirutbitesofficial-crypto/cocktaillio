import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["admin", "manager", "cashier"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("uq_users_username").on(table.username)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("uq_sessions_token_hash").on(table.tokenHash), index("idx_sessions_user").on(table.userId)]);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const menuCategories = sqliteTable("menu_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("uq_menu_categories_name").on(table.name)]);

export const menuItems = sqliteTable("menu_items", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => menuCategories.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  imageKey: text("image_key"),
  imageUrl: text("image_url"),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  customizable: integer("customizable", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [index("idx_menu_items_category").on(table.categoryId)]);

export const menuAddons = sqliteTable("menu_addons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
  emoji: text("emoji").notNull().default("✦"),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("uq_menu_addons_name").on(table.name)]);

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  // Exact quantities are stored in base units: mg, ml or milli-pieces.
  quantityBase: integer("quantity_base").notNull().default(0),
  alertQuantityBase: integer("alert_quantity_base").notNull().default(0),
  unitDimension: text("unit_dimension", { enum: ["mass", "volume", "count"] }).notNull(),
  displayUnit: text("display_unit", { enum: ["g", "kg", "ml", "L", "piece", "pack"] }).notNull(),
  costMicrosPerBase: integer("cost_micros_per_base").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("uq_inventory_items_name").on(table.name)]);

export const recipes = sqliteTable("recipes", {
  menuItemId: text("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
  inventoryItemId: text("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantityBase: integer("quantity_base").notNull(),
  displayUnit: text("display_unit", { enum: ["g", "kg", "ml", "L", "piece", "pack"] }).notNull(),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.menuItemId, table.inventoryItemId] }),
  index("idx_recipes_inventory").on(table.inventoryItemId),
]);

export const restaurantTables = sqliteTable("restaurant_tables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  currentGuests: integer("current_guests").notNull().default(0),
  status: text("status", { enum: ["available", "occupied", "reserved"] }).notNull().default("available"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("uq_restaurant_tables_name").on(table.name)]);

export const reservations = sqliteTable("reservations", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  guestCount: integer("guest_count").notNull(),
  tableId: text("table_id").notNull().references(() => restaurantTables.id),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  phone: text("phone"),
  notes: text("notes"),
  status: text("status", { enum: ["upcoming", "seated", "completed", "cancelled", "no_show"] }).notNull().default("upcoming"),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [
  index("idx_reservations_date_table").on(table.startsAt, table.tableId),
  index("idx_reservations_status").on(table.status),
]);

export const shifts = sqliteTable("shifts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  openedAt: text("opened_at").notNull(),
  closedAt: text("closed_at"),
  openingCashCents: integer("opening_cash_cents").notNull(),
  closingCashCents: integer("closing_cash_cents"),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  ...timestamps,
}, (table) => [
  index("idx_shifts_user_status").on(table.userId, table.status),
  index("idx_shifts_opened_at").on(table.openedAt),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: integer("order_number").notNull(),
  status: text("status", { enum: ["draft", "finalized", "refunded", "cancelled"] }).notNull().default("draft"),
  orderType: text("order_type", { enum: ["dine_in", "takeaway", "delivery"] }).notNull(),
  tableId: text("table_id").references(() => restaurantTables.id, { onDelete: "set null" }),
  shiftId: text("shift_id").notNull().references(() => shifts.id),
  cashierId: text("cashier_id").notNull().references(() => users.id),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  deliveryAddress: text("delivery_address"),
  driverName: text("driver_name"),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  finalizedAt: text("finalized_at"),
  refundedAt: text("refunded_at"),
  ...timestamps,
}, (table) => [
  uniqueIndex("uq_orders_number").on(table.orderNumber),
  index("idx_orders_status_created").on(table.status, table.createdAt),
  index("idx_orders_shift").on(table.shiftId),
]);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: text("menu_item_id").notNull().references(() => menuItems.id),
  itemNameSnapshot: text("item_name_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  ...timestamps,
}, (table) => [index("idx_order_items_order").on(table.orderId), index("idx_order_items_menu").on(table.menuItemId)]);

export const orderItemAddons = sqliteTable("order_item_addons", {
  id: text("id").primaryKey(),
  orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  addonId: text("addon_id").references(() => menuAddons.id, { onDelete: "set null" }),
  nameSnapshot: text("name_snapshot").notNull(),
  priceCentsSnapshot: integer("price_cents_snapshot").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_order_item_addons_item").on(table.orderItemId)]);

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  method: text("method", { enum: ["cash", "card", "online"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status", { enum: ["captured", "refunded", "failed"] }).notNull(),
  ...timestamps,
}, (table) => [index("idx_payments_order").on(table.orderId), index("idx_payments_created").on(table.createdAt)]);

export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  amountCents: integer("amount_cents").notNull(),
  paidFrom: text("paid_from", { enum: ["cash_drawer", "owner"] }).notNull(),
  shiftId: text("shift_id").references(() => shifts.id),
  expenseDate: text("expense_date").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("idx_expenses_date_source").on(table.expenseDate, table.paidFrom), index("idx_expenses_shift").on(table.shiftId)]);

export const inventoryTransactions = sqliteTable("inventory_transactions", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  inventoryItemId: text("inventory_item_id").notNull().references(() => inventoryItems.id),
  quantityBeforeBase: integer("quantity_before_base").notNull(),
  quantityChangedBase: integer("quantity_changed_base").notNull(),
  quantityAfterBase: integer("quantity_after_base").notNull(),
  transactionType: text("transaction_type", { enum: ["sale_consumption", "manual_adjustment", "purchase_restock", "refund_restoration", "waste", "reset", "correction"] }).notNull(),
  reason: text("reason").notNull(),
  orderId: text("order_id").references(() => orders.id),
  orderItemId: text("order_item_id").references(() => orderItems.id),
  menuItemId: text("menu_item_id").references(() => menuItems.id),
  userId: text("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("uq_inventory_transactions_idempotency").on(table.idempotencyKey),
  index("idx_inventory_transactions_item_created").on(table.inventoryItemId, table.createdAt),
  index("idx_inventory_transactions_order").on(table.orderId),
]);

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_log_created").on(table.createdAt), index("idx_audit_log_entity").on(table.entityType, table.entityId)]);
