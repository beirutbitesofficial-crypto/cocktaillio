import assert from "node:assert/strict";
import test from "node:test";
import * as domain from "../lib/pos-domain.ts";

test("recipe multiplication and exact kg-to-gram base conversion", () => {
  const stock = domain.toBaseQuantity("5", "kg").quantityBase;
  const perItem = domain.toBaseQuantity("120", "g").quantityBase;
  assert.equal(stock, 5_000_000);
  assert.equal(stock - domain.recipeConsumption(perItem, 1), 4_880_000);
  assert.equal(domain.recipeConsumption(perItem, 3), 360_000);
});

test("table and reservation capacity is enforced", () => {
  domain.assertTableOccupancy(6, 4);
  assert.throws(() => domain.assertTableOccupancy(6, 7), /at most 6/);
  domain.assertReservation({ capacity: 6, guests: 5, startsAt: "2026-08-20T18:00:00Z", endsAt: "2026-08-20T20:00:00Z" });
});

test("reservation overlap uses half-open time ranges", () => {
  assert.equal(domain.reservationsOverlap({ startsAt: "2026-08-20T18:00:00Z", endsAt: "2026-08-20T20:00:00Z" }, { startsAt: "2026-08-20T19:00:00Z", endsAt: "2026-08-20T21:00:00Z" }), true);
  assert.equal(domain.reservationsOverlap({ startsAt: "2026-08-20T18:00:00Z", endsAt: "2026-08-20T20:00:00Z" }, { startsAt: "2026-08-20T20:00:00Z", endsAt: "2026-08-20T21:00:00Z" }), false);
});

test("expense source and expected drawer cash remain separated", () => {
  assert.equal(domain.expenseDrawerImpactCents("cash_drawer", 10_000, true), -10_000);
  assert.equal(domain.expenseDrawerImpactCents("owner", 10_000, false), 0);
  assert.throws(() => domain.expenseDrawerImpactCents("cash_drawer", 10_000, false), /Open a shift/);
  assert.equal(domain.expectedDrawerCashCents({ openingCashCents: 50_000, cashSalesCents: 20_000, cashDrawerExpensesCents: 10_000, cashRefundsCents: 2_000 }), 58_000);
});

test("refund restores the original deduction, not a current recipe", () => {
  assert.deepEqual(domain.restoreFromOriginalTransactions([{ quantityChangedBase: -120_000, transactionType: "sale_consumption" }]), [120_000]);
});

test("RBAC keeps destructive and administrative actions away from cashiers", () => {
  domain.requirePermission("cashier", "orders:write");
  assert.throws(() => domain.requirePermission("cashier", "factory_reset:write"), /permission/);
  domain.requirePermission("admin", "factory_reset:write");
});
