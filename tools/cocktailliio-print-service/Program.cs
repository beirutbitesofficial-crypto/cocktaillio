
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace CocktailliioPrintService
{
    internal sealed class BridgeConfig
    {
        public string Token { get; set; }
        public string[] AllowedOrigins { get; set; }
        public int Port { get; set; }
    }

    internal sealed class PrintRequest
    {
        public string JobId { get; set; }
        public string PrinterName { get; set; }
        public int PaperWidth { get; set; }
        public int Copies { get; set; }
        public bool OpenDrawer { get; set; }
        public int DrawerPin { get; set; }
        public ReceiptData Receipt { get; set; }
        public KitchenData Kitchen { get; set; }
    }

    internal sealed class DrawerRequest
    {
        public string JobId { get; set; }
        public string PrinterName { get; set; }
        public int DrawerPin { get; set; }
    }

    internal sealed class ReceiptData
    {
        public string StoreName { get; set; }
        public string Number { get; set; }
        public string CreatedAt { get; set; }
        public string Type { get; set; }
        public int? Table { get; set; }
        public string Cashier { get; set; }
        public List<ReceiptItem> Items { get; set; }
        public List<string> Notes { get; set; }
        public decimal Subtotal { get; set; }
        public decimal? Discount { get; set; }
        public decimal? DeliveryFee { get; set; }
        public decimal Total { get; set; }
        public string PaymentMethod { get; set; }
        public decimal? CashReceived { get; set; }
        public decimal? Change { get; set; }
        public string Currency { get; set; }
        public string Customer { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string Driver { get; set; }
    }

    internal sealed class ReceiptItem
    {
        public string Name { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    internal sealed class KitchenData
    {
        public string Number { get; set; }
        public string Type { get; set; }
        public string Customer { get; set; }
        public string Time { get; set; }
        public List<string> Items { get; set; }
    }

    internal static class Program
    {
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 1024 * 1024 };
        private static readonly object JobsLock = new object();
        private static readonly Dictionary<string, DateTime> CompletedJobs = new Dictionary<string, DateTime>();
        private static BridgeConfig _config;

        private static void Main()
        {
            try
            {
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.json");
                _config = Json.Deserialize<BridgeConfig>(File.ReadAllText(configPath, Encoding.UTF8));
                if (_config == null || string.IsNullOrWhiteSpace(_config.Token)) throw new InvalidOperationException("Missing service token.");
                if (_config.Port <= 0) _config.Port = 17891;
                if (_config.AllowedOrigins == null || _config.AllowedOrigins.Length == 0)
                    _config.AllowedOrigins = new[] { "http://localhost:3000", "http://127.0.0.1:3000" };

                using (var listener = new HttpListener())
                {
                    listener.Prefixes.Add("http://127.0.0.1:" + _config.Port + "/");
                    listener.Start();
                    while (listener.IsListening)
                    {
                        HttpListenerContext context = listener.GetContext();
                        ThreadPool.QueueUserWorkItem(_ => Handle(context));
                    }
                }
            }
            catch (Exception ex)
            {
                try { File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "service-error.log"), DateTime.Now + " " + ex + Environment.NewLine); }
                catch { }
            }
        }

        private static void Handle(HttpListenerContext context)
        {
            try
            {
                string origin = context.Request.Headers["Origin"] ?? "";
                bool allowed = _config.AllowedOrigins.Any(value => string.Equals(value, origin, StringComparison.OrdinalIgnoreCase));
                if (!allowed) { Write(context, 403, new { error = "Origin is not allowed." }, null); return; }
                AddCors(context.Response, origin);
                if (context.Request.HttpMethod == "OPTIONS") { context.Response.StatusCode = 204; context.Response.Close(); return; }
                if (!ConstantTimeEquals(context.Request.Headers["X-Cocktailliio-Token"] ?? "", _config.Token))
                { Write(context, 401, new { error = "Invalid print-service token." }, origin); return; }

                string path = context.Request.Url.AbsolutePath.TrimEnd('/').ToLowerInvariant();
                if (context.Request.HttpMethod == "GET" && path == "/health")
                { Write(context, 200, new { ok = true, service = "Cocktailliio Print Service", version = "1.0.0" }, origin); return; }
                if (context.Request.HttpMethod == "GET" && path == "/printers")
                { Write(context, 200, new { printers = RawPrinter.ListPrinters() }, origin); return; }
                if (context.Request.HttpMethod == "POST" && path == "/print")
                {
                    var request = Read<PrintRequest>(context.Request);
                    ValidatePrint(request);
                    if (AlreadyCompleted(request.JobId)) { Write(context, 200, new { ok = true, duplicate = true }, origin); return; }
                    byte[] bytes = EscPos.Build(request);
                    RawPrinter.Send(request.PrinterName, "Cocktailliio " + request.JobId, bytes);
                    MarkCompleted(request.JobId);
                    Write(context, 200, new { ok = true, duplicate = false }, origin);
                    return;
                }
                if (context.Request.HttpMethod == "POST" && path == "/drawer")
                {
                    var request = Read<DrawerRequest>(context.Request);
                    if (request == null || string.IsNullOrWhiteSpace(request.PrinterName)) throw new InvalidOperationException("Select a Windows printer first.");
                    if (string.IsNullOrWhiteSpace(request.JobId)) request.JobId = Guid.NewGuid().ToString("N");
                    if (AlreadyCompleted(request.JobId)) { Write(context, 200, new { ok = true, duplicate = true }, origin); return; }
                    RawPrinter.Send(request.PrinterName, "Cocktailliio drawer test", EscPos.DrawerKick(request.DrawerPin));
                    MarkCompleted(request.JobId);
                    Write(context, 200, new { ok = true, duplicate = false }, origin);
                    return;
                }
                Write(context, 404, new { error = "Endpoint not found." }, origin);
            }
            catch (Exception ex)
            {
                Write(context, 500, new { error = ex.Message }, context.Request.Headers["Origin"]);
            }
        }

        private static void ValidatePrint(PrintRequest request)
        {
            if (request == null) throw new InvalidOperationException("Invalid print request.");
            if (string.IsNullOrWhiteSpace(request.JobId)) throw new InvalidOperationException("A job ID is required.");
            if (string.IsNullOrWhiteSpace(request.PrinterName)) throw new InvalidOperationException("Select a Windows printer first.");
            if (request.Receipt == null && request.Kitchen == null) throw new InvalidOperationException("No receipt data was supplied.");
            request.Copies = Math.Max(1, Math.Min(request.Copies, 5));
            request.PaperWidth = request.PaperWidth == 58 ? 58 : 80;
            request.DrawerPin = request.DrawerPin == 1 ? 1 : 0;
        }

        private static T Read<T>(HttpListenerRequest request)
        {
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding ?? Encoding.UTF8))
                return Json.Deserialize<T>(reader.ReadToEnd());
        }

        private static void AddCors(HttpListenerResponse response, string origin)
        {
            if (string.IsNullOrEmpty(origin)) return;
            response.Headers["Access-Control-Allow-Origin"] = origin;
            response.Headers["Vary"] = "Origin";
            response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
            response.Headers["Access-Control-Allow-Headers"] = "Content-Type, X-Cocktailliio-Token";
            response.Headers["Access-Control-Allow-Private-Network"] = "true";
            response.Headers["Access-Control-Max-Age"] = "600";
        }

        private static void Write(HttpListenerContext context, int status, object payload, string origin)
        {
            try
            {
                AddCors(context.Response, origin);
                byte[] bytes = Encoding.UTF8.GetBytes(Json.Serialize(payload));
                context.Response.StatusCode = status;
                context.Response.ContentType = "application/json; charset=utf-8";
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                context.Response.Close();
            }
            catch { }
        }

        private static bool ConstantTimeEquals(string a, string b)
        {
            byte[] left = Encoding.UTF8.GetBytes(a ?? ""); byte[] right = Encoding.UTF8.GetBytes(b ?? "");
            int diff = left.Length ^ right.Length; int length = Math.Max(left.Length, right.Length);
            for (int i = 0; i < length; i++)
            {
                byte leftValue = i < left.Length ? left[i] : (byte)0;
                byte rightValue = i < right.Length ? right[i] : (byte)0;
                diff |= leftValue ^ rightValue;
            }
            return diff == 0;
        }

        private static bool AlreadyCompleted(string jobId)
        {
            lock (JobsLock)
            {
                DateTime cutoff = DateTime.UtcNow.AddHours(-24);
                foreach (string key in CompletedJobs.Where(pair => pair.Value < cutoff).Select(pair => pair.Key).ToList()) CompletedJobs.Remove(key);
                return CompletedJobs.ContainsKey(jobId);
            }
        }

        private static void MarkCompleted(string jobId) { lock (JobsLock) CompletedJobs[jobId] = DateTime.UtcNow; }
    }

    internal static class EscPos
    {
        private static readonly byte[] Init = { 0x1b, 0x40 };
        private static readonly byte[] Cut = { 0x1d, 0x56, 0x00 };
        public static byte[] DrawerKick(int pin) { return new byte[] { 0x1b, 0x70, (byte)(pin == 1 ? 1 : 0), 25, 250 }; }

        public static byte[] Build(PrintRequest request)
        {
            var data = new List<byte>(); data.AddRange(Init);
            if (request.Kitchen != null) { data.AddRange(Kitchen(request.Kitchen, request.PaperWidth)); data.AddRange(Cut); }
            if (request.Receipt != null)
            {
                for (int i = 0; i < request.Copies; i++) { data.AddRange(Receipt(request.Receipt, request.PaperWidth)); data.AddRange(Cut); }
            }
            if (request.OpenDrawer) data.AddRange(DrawerKick(request.DrawerPin));
            return data.ToArray();
        }

        private static byte[] Kitchen(KitchenData ticket, int paperWidth)
        {
            int width = paperWidth == 58 ? 32 : 48; var sb = new StringBuilder();
            Center(sb, "COCKTAILLIIO", width); Center(sb, "KITCHEN TICKET", width); Line(sb, width);
            Center(sb, ticket.Number ?? "ORDER", width); Pair(sb, "Type", ticket.Type, width); Pair(sb, "For", ticket.Customer, width); Pair(sb, "Received", ticket.Time, width); Line(sb, width);
            int number = 1; foreach (string item in ticket.Items ?? new List<string>()) Wrap(sb, (number++) + ". " + item, width);
            Line(sb, width); Center(sb, "NO PRICES - PREPARE IN ORDER", width); Feed(sb, 3); return Encode(sb.ToString());
        }

        private static byte[] Receipt(ReceiptData receipt, int paperWidth)
        {
            int width = paperWidth == 58 ? 32 : 48;
            var data = new List<byte>();
            var sb = new StringBuilder();

            data.AddRange(new byte[] { 0x1b, 0x61, 0x01, 0x1b, 0x45, 0x01, 0x1d, 0x21, 0x11 });
            data.AddRange(Encode("COCKTAILLIIO\n"));
            data.AddRange(new byte[] { 0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00 });
            data.AddRange(Encode("RESTO CAFÉ • LOUNGE • HOOKAH • COCKTAILS\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x01 });
            data.AddRange(Encode(string.Equals(receipt.Type, "Delivery", StringComparison.OrdinalIgnoreCase) ? "DRIVER RECEIPT\n" : "CUSTOMER RECEIPT\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x00, 0x1b, 0x61, 0x00 });

            Line(sb, width);
            Pair(sb, "Order", receipt.Number, width);
            Pair(sb, "Type", receipt.Type, width);
            if (receipt.Table.HasValue) Pair(sb, "Table", receipt.Table.Value.ToString(), width);
            Pair(sb, "Cashier", receipt.Cashier, width);
            Pair(sb, "Time", receipt.CreatedAt, width);
            if (!string.IsNullOrWhiteSpace(receipt.Customer))
            {
                Line(sb, width);
                Pair(sb, "Customer", receipt.Customer, width);
            }
            if (!string.IsNullOrWhiteSpace(receipt.Phone)) Pair(sb, "Phone", receipt.Phone, width);
            if (!string.IsNullOrWhiteSpace(receipt.Address)) Wrap(sb, "Address: " + receipt.Address, width);
            if (!string.IsNullOrWhiteSpace(receipt.Driver)) Pair(sb, "Driver", receipt.Driver, width);
            Line(sb, width);
            data.AddRange(Encode(sb.ToString()));
            sb.Clear();

            foreach (ReceiptItem item in receipt.Items ?? new List<ReceiptItem>())
            {
                int quantity = Math.Max(1, item.Quantity);
                data.AddRange(new byte[] { 0x1b, 0x45, 0x01 });
                data.AddRange(Encode((item.Name ?? "Item") + "\n"));
                data.AddRange(new byte[] { 0x1b, 0x45, 0x00 });
                Pair(sb, quantity + " x " + Money(item.Price, receipt.Currency), Money(item.Price * quantity, receipt.Currency), width);
                data.AddRange(Encode(sb.ToString()));
                sb.Clear();
            }
            if (receipt.Notes != null && receipt.Notes.Count > 0)
            {
                data.AddRange(Encode(sb.ToString()));
                sb.Clear();
                data.AddRange(new byte[] { 0x1b, 0x45, 0x01 });
                data.AddRange(Encode("Notes\n"));
                data.AddRange(new byte[] { 0x1b, 0x45, 0x00 });
                foreach (string note in receipt.Notes) Wrap(sb, "  + " + note, width);
            }

            Line(sb, width);
            Pair(sb, "Subtotal", Money(receipt.Subtotal, receipt.Currency), width);
            if (receipt.Discount.GetValueOrDefault() > 0) Pair(sb, "Discount", "-" + Money(receipt.Discount.Value, receipt.Currency), width);
            if (receipt.DeliveryFee.GetValueOrDefault() > 0) Pair(sb, "Delivery fee", Money(receipt.DeliveryFee.Value, receipt.Currency), width);
            data.AddRange(Encode(sb.ToString()));
            sb.Clear();

            data.AddRange(new byte[] { 0x1b, 0x45, 0x01, 0x1d, 0x21, 0x10 });
            Pair(sb, "TOTAL", Money(receipt.Total, receipt.Currency), width);
            data.AddRange(Encode(sb.ToString()));
            sb.Clear();
            data.AddRange(new byte[] { 0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00 });
            Pair(sb, "Payment", receipt.PaymentMethod, width);
            if (receipt.CashReceived.HasValue) Pair(sb, "Cash received", Money(receipt.CashReceived.Value, receipt.Currency), width);
            if (receipt.Change.HasValue) Pair(sb, "Change", Money(receipt.Change.Value, receipt.Currency), width);
            Line(sb, width);
            data.AddRange(Encode(sb.ToString()));

            data.AddRange(new byte[] { 0x1b, 0x61, 0x01 });
            data.AddRange(Encode("Prices include applicable VAT\n\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x01 });
            data.AddRange(Encode("Scan to follow us on Instagram\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x00 });
            AddQrCode(data, "https://www.instagram.com/cocktailliio/");
            data.AddRange(Encode("@cocktailliio\n\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x01 });
            data.AddRange(Encode("Thank you!\n"));
            data.AddRange(new byte[] { 0x1b, 0x45, 0x00 });
            data.AddRange(Encode("Cocktailliio - Resto café, lounge, hookah and cocktails\n"));
            data.AddRange(Encode("JMR Mall - Mazboud, Chouf\n"));
            data.AddRange(new byte[] { 0x1b, 0x61, 0x00 });
            Feed(sb, 3);
            data.AddRange(Encode(sb.ToString()));
            return data.ToArray();
        }

        private static void AddQrCode(List<byte> data, string value)
        {
            byte[] content = Encoding.ASCII.GetBytes(value ?? "");
            int storeLength = content.Length + 3;
            data.AddRange(new byte[] { 0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00 });
            data.AddRange(new byte[] { 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06 });
            data.AddRange(new byte[] { 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30 });
            data.AddRange(new byte[] { 0x1d, 0x28, 0x6b, (byte)(storeLength & 0xff), (byte)((storeLength >> 8) & 0xff), 0x31, 0x50, 0x30 });
            data.AddRange(content);
            data.AddRange(new byte[] { 0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30 });
            data.AddRange(Encode("\n"));
        }

        private static string Money(decimal amount, string currency) { return string.Equals(currency, "LBP", StringComparison.OrdinalIgnoreCase) ? decimal.Round(amount, 0) + " LBP" : "$" + amount.ToString("0.00"); }
        private static byte[] Encode(string value) { return Encoding.GetEncoding(437).GetBytes(Ascii(value)); }
        private static string Ascii(string value) { return new string((value ?? "").Select(c => c >= 32 && c <= 126 || c == '\r' || c == '\n' ? c : '?').ToArray()); }
        private static void Line(StringBuilder sb, int width) { sb.AppendLine(new string('-', width)); }
        private static void Feed(StringBuilder sb, int lines) { for (int i = 0; i < lines; i++) sb.AppendLine(); }
        private static void Center(StringBuilder sb, string value, int width) { value = value ?? ""; sb.AppendLine(value.Length >= width ? value.Substring(0, width) : new string(' ', (width - value.Length) / 2) + value); }
        private static void Pair(StringBuilder sb, string left, string right, int width)
        {
            left = left ?? ""; right = right ?? ""; int gap = width - left.Length - right.Length;
            if (gap >= 1) sb.AppendLine(left + new string(' ', gap) + right); else { Wrap(sb, left, width); Wrap(sb, right, width); }
        }
        private static void Wrap(StringBuilder sb, string value, int width)
        {
            value = (value ?? "").Trim(); while (value.Length > width) { int split = value.LastIndexOf(' ', width); if (split < 1) split = width; sb.AppendLine(value.Substring(0, split)); value = value.Substring(split).TrimStart(); } if (value.Length > 0) sb.AppendLine(value);
        }
    }

    internal static class RawPrinter
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private class DOC_INFO_1 { public string pDocName; public string pOutputFile; public string pDataType; }
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)] private struct PRINTER_INFO_4 { public string pPrinterName; public string pServerName; public uint Attributes; }
        [StructLayout(LayoutKind.Sequential)] private struct PRINTER_INFO_6 { public uint dwStatus; }
        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool OpenPrinter(string name, out IntPtr printer, IntPtr defaults);
        [DllImport("winspool.drv", SetLastError = true)] private static extern bool ClosePrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern int StartDocPrinter(IntPtr printer, int level, [In] DOC_INFO_1 info);
        [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndDocPrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError = true)] private static extern bool StartPagePrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError = true)] private static extern bool EndPagePrinter(IntPtr printer);
        [DllImport("winspool.drv", SetLastError = true)] private static extern bool WritePrinter(IntPtr printer, byte[] bytes, int count, out int written);
        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool EnumPrinters(uint flags, string name, uint level, IntPtr buffer, uint size, out uint needed, out uint returned);
        [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool GetPrinter(IntPtr printer, uint level, IntPtr buffer, uint size, out uint needed);

        public static string[] ListPrinters()
        {
            const uint flags = 0x2 | 0x4; uint needed, returned; EnumPrinters(flags, null, 4, IntPtr.Zero, 0, out needed, out returned);
            if (needed == 0) return new string[0]; IntPtr buffer = Marshal.AllocHGlobal((int)needed);
            try
            {
                if (!EnumPrinters(flags, null, 4, buffer, needed, out needed, out returned)) Throw("Could not list Windows printers");
                int size = Marshal.SizeOf(typeof(PRINTER_INFO_4)); var names = new List<string>();
                for (int i = 0; i < returned; i++) names.Add(((PRINTER_INFO_4)Marshal.PtrToStructure(IntPtr.Add(buffer, i * size), typeof(PRINTER_INFO_4))).pPrinterName);
                return names.Where(name => !string.IsNullOrWhiteSpace(name)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(name => name).ToArray();
            }
            finally { Marshal.FreeHGlobal(buffer); }
        }

        public static void Send(string printerName, string documentName, byte[] bytes)
        {
            IntPtr printer; if (!OpenPrinter(printerName, out printer, IntPtr.Zero)) Throw("Could not open printer " + printerName);
            try
            {
                EnsurePrinterReady(printer);
                var info = new DOC_INFO_1 { pDocName = documentName, pDataType = "RAW" };
                if (StartDocPrinter(printer, 1, info) == 0) Throw("Could not start the print job");
                try
                {
                    if (!StartPagePrinter(printer)) Throw("Could not start the printer page");
                    try { int written; if (!WritePrinter(printer, bytes, bytes.Length, out written) || written != bytes.Length) Throw("The printer did not accept the complete job"); }
                    finally { EndPagePrinter(printer); }
                }
                finally { EndDocPrinter(printer); }
            }
            finally { ClosePrinter(printer); }
        }

        private static void EnsurePrinterReady(IntPtr printer)
        {
            uint needed;
            GetPrinter(printer, 6, IntPtr.Zero, 0, out needed);
            if (needed == 0) return;
            IntPtr buffer = Marshal.AllocHGlobal((int)needed);
            try
            {
                if (!GetPrinter(printer, 6, buffer, needed, out needed)) Throw("Could not read printer status");
                uint status = ((PRINTER_INFO_6)Marshal.PtrToStructure(buffer, typeof(PRINTER_INFO_6))).dwStatus;
                const uint blocked = 0x00000001 | 0x00000002 | 0x00000010 | 0x00000040 | 0x00000080 | 0x00001000 | 0x00100000 | 0x00400000;
                if ((status & blocked) != 0) throw new InvalidOperationException("The selected printer is offline or needs attention (status 0x" + status.ToString("X") + ").");
            }
            finally { Marshal.FreeHGlobal(buffer); }
        }

        private static void Throw(string message) { throw new InvalidOperationException(message + " (Windows error " + Marshal.GetLastWin32Error() + ")."); }
    }
}

