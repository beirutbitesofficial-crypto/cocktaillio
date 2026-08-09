
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("POS completion saves before silent printing and never uses the browser dialog", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const saveIndex = page.indexOf("localStorage.setItem(kitchenStorageKey");
  const printIndex = page.indexOf("void printCompletedOrder(completedReceipt, kitchenOrder)");

  assert.ok(saveIndex >= 0 && printIndex > saveIndex);
  assert.doesNotMatch(page, /window\.print\s*\(/);
  assert.match(page, /completionLock\.current/);
  assert.match(page, /Reprint receipt/);
  assert.match(page, /openDrawerAllPayments/);
  assert.match(page, /customerReceipt\.paymentMethod === "Cash"/);
});

test("Windows service uses raw ESC POS receipt, cut and drawer commands", async () => {
  const service = await readFile(new URL("../tools/cocktailliio-print-service/Program.cs", import.meta.url), "utf8");

  assert.match(service, /pDataType = "RAW"/);
  assert.match(service, /0x1b, 0x70/);
  assert.match(service, /25, 250/);
  assert.match(service, /0x1d, 0x56/);
  assert.match(service, /AlreadyCompleted\(request\.JobId\)/);
  assert.match(service, /EnsurePrinterReady\(printer\)/);
  assert.match(service, /127\.0\.0\.1/);
  assert.match(service, /X-Cocktailliio-Token/);
  assert.match(service, /RESTO CAFÉ • LOUNGE • HOOKAH • COCKTAILS/);
  assert.match(service, /AddQrCode\(data/);
  assert.match(service, /instagram\.com\/cocktailliio/);
  assert.match(service, /Prices include applicable VAT/);
  assert.match(service, /JMR Mall - Mazboud, Chouf/);
});


