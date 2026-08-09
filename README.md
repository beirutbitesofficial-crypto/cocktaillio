# Cocktailliio POS

Independent green-and-white point-of-sale system for a resto café, lounge, hookah and cocktail business. This project was adapted from the proven Pastino architecture without modifying the Pastino repository.

## Included operations

- Manager and cashier accounts with role-based navigation
- Dashboard, counter/dine-in/takeaway/delivery ordering, tables and shifts
- Cash, card and online payments with completion locking to prevent duplicate orders
- Customer receipts and practical kitchen/bar tickets
- Silent Windows POS80 raw ESC/POS printing, reprints and automatic cash-drawer kick
- Reports and spreadsheet export, menu/add-on management, inventory and expenses
- English/Arabic UI, USD/LBP display and light/dark green themes
- Device-local persistence under Cocktailliio-specific storage keys

The seeded menu and prices are examples only. Replace them with the approved menu before production.

## Requirements and local setup

- Node.js 22.13 or newer
- npm

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Seed credentials are `manager` / `2300` and `cashier` / `1234`; change them before production.

Validation:

```powershell
npm run lint
npm test
```

`npm test` performs a production build and verifies the rendered application and printing contract, including save-before-print ordering, duplicate-job protection, raw ESC/POS output, cutter and drawer commands.

## Windows POS80 silent printing

1. Install the printer manufacturer's Windows driver and confirm a Windows test page works.
2. Before production, add the final HTTPS app origin to `AllowedOrigins` in `tools/cocktailliio-print-service/install.ps1`.
3. Run `tools/cocktailliio-print-service/install.ps1` as administrator.
4. Copy the generated token into **Cocktailliio > Settings > POS hardware**.
5. Select the exact Windows printer name and 58mm or 80mm paper.
6. Run **Test print**, then **Test cash drawer**. The drawer must connect to the printer's RJ11/RJ12 drawer port.

The default drawer command is `ESC p 0 25 250`; pin 1 remains selectable. The service listens only on loopback, validates the configured browser origin and token, checks printer readiness, and suppresses duplicate job IDs.

See `tools/cocktailliio-print-service/README.md` for troubleshooting and uninstall steps.

## Production checklist

Before deployment, provide and configure:

- final menu items, categories, modifiers and prices
- official logo
- business phone and physical address
- Instagram/social URL and receipt QR destination
- tax rate and legal receipt text
- production domain (also required by the print-service origin allowlist)
- destination GitHub repository name

Then run the complete test suite, test one real customer receipt and one kitchen/bar ticket on each register, verify cash-drawer behavior for cash and non-cash payments, and confirm reprints do not create a second order.

## Deployment

The app supports Next.js locally and the included vinext/Cloudflare worker build. Configure the intended hosting environment and access policy, run `npm test`, deploy the resulting source, then reinstall or update the Windows print service so its `AllowedOrigins` contains the exact deployed HTTPS origin.

Do not reuse the Pastino deployment, storage namespace, print token, or repository remote.

