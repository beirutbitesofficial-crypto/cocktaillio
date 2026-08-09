# Cocktailliio Windows ESC/POS print service

This loopback-only service lets the browser POS send raw ESC/POS jobs to the Windows USB printer without opening the browser print dialog. Requests are accepted only from `https://cocktailliio.beirutbites.shop` and require a random per-computer token.

## Install

1. Install the POS80/Xprinter Windows driver and confirm the printer appears in **Windows Settings > Bluetooth & devices > Printers & scanners**.
2. Right-click `install.ps1` and choose **Run with PowerShell**. Accept the one-time Windows administrator prompt used to reserve the loopback address. If Windows blocks the script, open PowerShell in this folder and run `powershell -ExecutionPolicy Bypass -File .\install.ps1`.
3. Copy the yellow token printed by the installer. It is also stored at `%LOCALAPPDATA%\CocktailliioPrintService\token.txt`.
4. In Cocktailliio, sign in as manager and open **Settings > POS hardware**. Paste the token, click **Connect / refresh printers**, select the POS80 printer, choose the paper width and save.

The service starts automatically when this Windows user signs in. It listens only on `127.0.0.1:17891`; it is not exposed to the local network or internet.

## Drawer cable

Connect the cash drawer's RJ11/RJ12 cable to the drawer port on the receipt printer, not to the computer. The default kick is `ESC p 0 25 250`. If the drawer does not open, select **Pin 1** in Cocktailliio settings and use **Test cash drawer**.

## Remove

Run `uninstall.ps1`. This stops the service, removes its Startup shortcut, and removes `%LOCALAPPDATA%\CocktailliioPrintService`.

## Troubleshooting

- Ensure the printer name selected in Cocktailliio exactly matches Windows.
- Ensure the POS80 is online, has paper, and can print a Windows test page.
- Re-run `install.ps1` after updating `Program.cs`.
- Check `%LOCALAPPDATA%\CocktailliioPrintService\service-error.log` if the service cannot start.
- If the POS says it cannot connect, check that `CocktailliioPrintService.exe` is running in Task Manager and that the token was pasted without extra spaces.


