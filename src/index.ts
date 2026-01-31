import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";
import collectoRouter from "./routes/authCollecto";
import tierRouter from "./routes/tier.routes";
import vaultPackageRouter from "./routes/vault-package.routes";
import earningRuleRouter from "./routes/earning-rule.routes";
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
    realConsoleLog(JSON.stringify({ status: "error", message: "Execution timeout" }));
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
    status: (code: number) => { mockRes.statusCode = code; return mockRes; },
    setHeader: (name: string, value: string) => { mockRes.headers[name] = value; return mockRes; },
    get: (name: string) => mockRes.headers[name],
    end: () => { if (!responsesSent) process.exit(0); },
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
        collectoRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

      case "authVerify":
        mockReq.method = "POST";
        mockReq.url = "/authVerify";
        mockReq.body = parseInputData(params);
        collectoRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Auth verify route not found" });
        });
        break;

      case "authCollecto":
        mockReq.method = "POST";
        mockReq.url = "/auth";
        mockReq.body = parseInputData(params);
        collectoRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

      // --- Services Routes ---
      case "services":
        mockReq.method = "POST";
        mockReq.url = "/services";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Service route not found" });
        });
        break;

      case "invoiceDetails":
        mockReq.method = "POST";
        mockReq.url = "/invoiceDetails";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Invoice details route not found" });
        });
        break;

      case "requestToPay":
        mockReq.method = "POST";
        mockReq.url = "/requestToPay";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Request to pay route not found" });
        });
        break;

      case "requestToPayStatus":
        mockReq.method = "POST";
        mockReq.url = "/requestToPayStatus";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Payment status route not found" });
        });
        break;

      case "verifyPhoneNumber":
        mockReq.method = "POST";
        mockReq.url = "/verifyPhoneNumber";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Verify phone route not found" });
        });
        break;

      case "invoice":
        mockReq.method = "POST";
        mockReq.url = "/invoice";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Service route not found" });
        });
        break;

        
      case "transactions":
        mockReq.method = "POST";
        mockReq.url = "/transactions";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent) mockRes.status(404).json({ error: "Transaction route not found" });
        });
        break;

      case "customers":
        mockReq.method = "GET";
        const customerAction = params[0]; 
        const clientId = params[1];
        mockReq.url = `/info/${clientId}`;
        mockReq.params = { clientId };
        CustomerRoutes()(mockReq, mockRes, () => {
           if (!responsesSent) mockRes.status(404).json({ error: "Customer route not found" });
        });
        break;


    case "pointRules":
    case "tier":
    case "vaultPackages": {
      const routers: any = {
        pointRules: earningRuleRouter,
        tier: tierRouter,
        vaultPackages: vaultPackageRouter,
      };
      
      const router = routers[path];
      const firstParam = params[0];

      // --- HANDLE CREATE (POST with /create/collectoId) ---
      if (firstParam === "create") {
        mockReq.method = "POST";
        const vendorId = params[1];
        mockReq.body = params[2] ? JSON.parse(params[2]) : {};
        mockReq.url = `/create/${vendorId}`;
        mockReq.params = { collectoId: vendorId };
      }
      // --- HANDLE UPDATE (PUT with /update/id) ---
      else if (firstParam === "update") {
        mockReq.method = "PUT";
        const id = params[1];
        mockReq.body = params[2] ? JSON.parse(params[2]) : {};
        mockReq.url = `/update/${id}`;
        mockReq.params = { id };
      }
      // --- HANDLE DELETE (DELETE with /delete/vendorId/id) ---
      else if (firstParam === "delete") {
        mockReq.method = "DELETE";
        const vendorId = params[1];
        const id = params[2];
        mockReq.url = `/delete/${vendorId}/${id}`;
        mockReq.params = { collectoId: vendorId, id, tierId: id, ruleId: id };
      }
      // --- HANDLE SAVE (POST with old format) ---
      else if (firstParam && firstParam.startsWith("{")) {
        mockReq.method = "POST";
        mockReq.body = JSON.parse(firstParam);
        mockReq.url = `/${mockReq.body.collectoId || ""}`;
      } 
      // --- HANDLE DELETE (old format DELETE) ---
      else if (firstParam === "DELETE") {
        mockReq.method = "DELETE";
        const vendorId = params[1];
        const ruleId = params[2];
        mockReq.url = `/delete/${vendorId}/${ruleId}`;
        mockReq.params = { collectoId: vendorId, ruleId, id: ruleId, tierId: ruleId };
      } 
      // --- HANDLE FETCH (GET) ---
      else {
        mockReq.method = "GET";
        const id = params[0];
        mockReq.url = id ? `/${id}` : "/";
        if (id) mockReq.params.id = id;
      }

      router(mockReq, mockRes, () => {
        if (!responsesSent) mockRes.status(404).json({ error: `Route not found in ${path}` });
      });
      break;
    }

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
  app.use("/tier", tierRouter);
  app.use("/vaultPackages", vaultPackageRouter);
  app.use("/pointRules", earningRuleRouter);
  
  // Mounted at root so internal routes like router.post("/services") work as /services
  app.use("/", servicesRouter);
  app.use("/", collectoRouter);

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