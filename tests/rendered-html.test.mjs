import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../app/page.tsx", import.meta.url);
const cssUrl = new URL("../app/globals.css", import.meta.url);
const schemaUrl = new URL("../db/schema.ts", import.meta.url);

test("keeps the existing POS surface and removes the Kitchen Display System", async () => {
  const page = await readFile(pageUrl, "utf8");
  for (const label of ["Dashboard", "New order", "My shift", "Menu", "Inventory", "Expenses", "Admin", "Reports", "Settings"]) {
    assert.match(page, new RegExp(label, "i"));
  }
  assert.doesNotMatch(page, /id:\s*"kitchen"|view === "kitchen"|KITCHEN DISPLAY/);
  assert.match(page, /Tables & reservations/);
  assert.match(page, /Seat reservation/);
  assert.match(page, /currentGuests/);
});

test("defines centralized light and dark tokens plus responsive POS layouts", async () => {
  const css = await readFile(cssUrl, "utf8");
  assert.match(css, /:root\s*\{[^}]*--brand-solid:/s);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media\(max-width:720px\)/);
  assert.match(css, /@media\(pointer:coarse\)/);
  assert.match(css, /reservation-card/);
  assert.match(css, /reset-confirm-field/);
});

test("production schema separates master and transactional data", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  for (const table of ["menuItems", "inventoryItems", "recipes", "restaurantTables", "reservations", "orders", "orderItems", "payments", "expenses", "inventoryTransactions", "auditLog"]) {
    assert.match(schema, new RegExp(`export const ${table} = sqliteTable`));
  }
  assert.match(schema, /idempotency_key/);
  assert.match(schema, /quantity_before_base/);
  assert.match(schema, /paid_from/);
});
