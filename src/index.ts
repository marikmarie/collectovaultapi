import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";
import authCollecto from "./routes/authCollecto";
import { CustomerRoutes } from "./routes/customer.routes";

dotenv.config();

const isCLIMode = !process.env.PORT || process.argv.length > 2;

if (isCLIMode) {
  const realConsoleLog = console.log;
  console.log = () => {};
  console.error = () => {};

  const args = process.argv.slice(2);
  const path = args[0];
  const params = args.slice(1);

  const timeout = setTimeout(() => {
    realConsoleLog(
      JSON.stringify({ status: "error", message: "Execution timeout" }),
    );
    process.exit(1);
  }, 10000);

  let responsesSent = false;

  const mockRes: any = {
    statusCode: 200,
    headers: {},
    json: (data: any) => {
      if (responsesSent) return;
      responsesSent = true;
      clearTimeout(timeout);
      realConsoleLog(JSON.stringify(data));
      process.exit(0);
    },
    send: (data: any) => {
      if (responsesSent) return;
      responsesSent = true;
      clearTimeout(timeout);
      realConsoleLog(typeof data === "object" ? JSON.stringify(data) : data);
      process.exit(0);
    },
    status: (code: number) => {
      mockRes.statusCode = code;
      return mockRes;
    },
    setHeader: (name: string, value: string) => {
      mockRes.headers[name] = value;
      return mockRes;
    },
    get: (name: string) => mockRes.headers[name],
    end: () => {
      if (!responsesSent) process.exit(0);
    },
  };

  const mockReq: any = {
    url: "/",
    method: "GET",
    params: {},
    query: {},
    body: {},
    headers: { "content-type": "application/json" },
    header: (name: string) => mockReq.headers[name.toLowerCase()],
    get: (name: string) => mockReq.headers[name.toLowerCase()],
  };

  try {
    switch (path) {
      // --- Auth Routes ---
      case "auth":
        mockReq.method = "POST";
        mockReq.url = "/auth";
        mockReq.body = parseInputData(params);
        authCollecto(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

      case "authVerify":
        mockReq.method = "POST";
        mockReq.url = "/authVerify";
        mockReq.body = parseInputData(params);
        authCollecto(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth verify route not found" });
        });
        break;

      case "authCollecto":
        mockReq.method = "POST";
        mockReq.url = "/auth";
        mockReq.body = parseInputData(params);
        authCollecto(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

      case "getByUsername":
        mockReq.method = "POST";
        mockReq.url = "/getByUsername";
        mockReq.body = parseInputData(params);
        authCollecto(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Get username route not found" });
        });
        break;

      case "setUsername":
        mockReq.method = "POST";
        mockReq.url = "/setUsername";
        mockReq.body = parseInputData(params);
        authCollecto(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Set Username route not found" });
        });
        break;

      // --- Services Routes ---
      case "services":
        mockReq.method = "POST";
        mockReq.url = "/services";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Service route not found" });
        });
        break;

      case "invoiceDetails":
        mockReq.method = "POST";
        mockReq.url = "/invoiceDetails";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes
              .status(404)
              .json({ error: "Invoice details route not found" });
        });
        break;

      case "requestToPay":
        mockReq.method = "POST";
        mockReq.url = "/requestToPay";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes
              .status(404)
              .json({ error: "Request to pay route not found" });
        });
        break;

      case "requestToPayStatus":
        mockReq.method = "POST";
        mockReq.url = "/requestToPayStatus";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes
              .status(404)
              .json({ error: "Payment status route not found" });
        });
        break;

      case "verifyPhoneNumber":
        mockReq.method = "POST";
        mockReq.url = "/verifyPhoneNumber";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Verify phone route not found" });
        });
        break;

      case "invoice":
        mockReq.method = "POST";
        mockReq.url = "/invoice";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Service route not found" });
        });
        break;

      case "loyaltySettings":
        mockReq.method = "POST";
        mockReq.url = "/loyaltySettings";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes
              .status(404)
              .json({ error: "Loyalty Settngs route not found" });
        });
        break;

      case "transactions":
        mockReq.method = "POST";
        mockReq.url = "/transactions";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Transaction route not found" });
        });
        break;

      case "customers":
        mockReq.method = "GET";
        const customerAction = params[0];
        const clientId = params[1];
        mockReq.url = `/info/${clientId}`;
        mockReq.params = { clientId };
        CustomerRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Customer route not found" });
        });
        break;

      case "admin":
        mockReq.method = "GET";
        const adminAction = params[0];
        const collectoIdParam = params[1];
        mockReq.url = `/${adminAction}`;
        mockReq.query = { collectoId: collectoIdParam || "all" };
        CustomerRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Admin route not found" });
        });
        break;

      default:
        mockRes.status(404).json({ error: "Unknown path", path });
    }
  } catch (err: any) {
    realConsoleLog(JSON.stringify({ status: "error", message: err.message }));
    process.exit(1);
  }
} else {
  // Server Mode
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/customers", CustomerRoutes());
  app.use("/admin", CustomerRoutes());

  // Mounted at root so internal routes like router.post("/services") work as /services
  app.use("/", servicesRouter);
  app.use("/", authCollecto);

  app.listen(process.env.PORT || 4000);
}

function parseInputData(args: string[]): Record<string, any> {
  if (!args || args.length === 0) return {};
  try {
    if (args[0].startsWith("{")) return JSON.parse(args[0]);
  } catch (e) {}

  const body: Record<string, any> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i]) body[args[i]] = args[i + 1] !== undefined ? args[i + 1] : "";
  }
  return body;
}
