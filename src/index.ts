import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";
import { authCollectoRoutes } from "./routes/authCollecto";
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
        authCollectoRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

        case "getByUsername":
        mockReq.method = "POST";
        mockReq.url = "/getByUsername";
        mockReq.body = parseInputData(params);
        authCollectoRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

        case "setUsername":
        mockReq.method = "POST";
        mockReq.url = "/setUsername";
        mockReq.body = parseInputData(params);
        authCollectoRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
        });
        break;

      case "authVerify":
        mockReq.method = "POST";
        mockReq.url = "/authVerify";
        mockReq.body = parseInputData(params);
        authCollectoRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth verify route not found" });
        });
        break;

      case "authCollecto":
        mockReq.method = "POST";
        mockReq.url = "/auth";
        mockReq.body = parseInputData(params);
        authCollectoRoutes()(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Auth route not found" });
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

      case "vaultPackages":
        mockReq.method = "GET";
        const [p1, p2] = params;
        if (!isNaN(Number(p1))) {
          // Request like /vaultPackages/141122 (only collectoId was passed)
          mockReq.url = "/vaultPackages";
          mockReq.query = { collectoId: p1 };
        } else {
          // Request like /vaultPackages or /vaultPackages/:collectoId
          const vaultAction = p1;
          const vaultParam = p2;
          mockReq.url = `/${vaultAction}`;
          mockReq.query = { collectoId: vaultParam || "all" };
        }
        vaultPackageRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes
              .status(404)
              .json({ error: "Vault packages route not found" });
        });
        break;

      case "pointRules":
        mockReq.method = "GET";
        mockReq.url = "/pointRules";
        mockReq.body = parseInputData(params);
        servicesRouter(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: "Transaction route not found" });
        });
        break;

      case "pointRules":
      //case "vaultPackages":
      case "tier": {
        const routers: any = {
          pointRules: earningRuleRouter,
          tier: tierRouter,
          vaultPackages: vaultPackageRouter,
        };

        const router = routers[path];

        const tryParse = (v: string) => {
          try {
            return JSON.parse(v);
          } catch {
            return undefined;
          }
        };

        let urlParams = [...params];
        const last = urlParams[urlParams.length - 1];
        const parsedBody = tryParse(last);

        if (parsedBody !== undefined) {
          mockReq.body = parsedBody;
          urlParams = urlParams.slice(0, -1);
        } else {
          mockReq.body = {};
        }

        const action = urlParams[0];

        // ---------- CREATE ----------
        if (action === "create") {
          mockReq.method = "POST";
          const collectoId = urlParams[1];
          mockReq.url = `/${path}/create/${collectoId}`;
          mockReq.params = { collectoId };
        }

        // ---------- UPDATE ----------
        else if (action === "update") {
          mockReq.method = "PUT";
          const id = urlParams[1];
          mockReq.url = `/${path}/update/${id}`;
          mockReq.params = { id };
        }

        // ---------- DELETE ----------
        else if (action === "delete") {
          mockReq.method = "DELETE";

          if (path === "tier") {
            const tierId = urlParams[1];
            mockReq.url = `/tier/delete/${tierId}`;
            mockReq.params = { tierId };
          } else if (path === "pointRules") {
            const collectoId = urlParams[1];
            const ruleId = urlParams[2];
            mockReq.url = `/pointRules/delete/${collectoId}/${ruleId}`;
            mockReq.params = { collectoId, ruleId };
          } else {
            const collectoId = urlParams[1];
            const id = urlParams[2];
            mockReq.url = `/vaultPackages/delete/${collectoId}/${id}`;
            mockReq.params = { collectoId, id };
          }
        }

        // ---------- GET ----------
        else {
          mockReq.method = "GET";
          const id = urlParams[0];
          mockReq.url = id ? `/${path}/${id}` : `/${path}`;
          if (id) mockReq.params = { id, collectoId: id };
        }

        router(mockReq, mockRes, () => {
          if (!responsesSent)
            mockRes.status(404).json({ error: `Route not found in ${path}` });
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
  app.use("/admin", CustomerRoutes());
  app.use("/", tierRouter);
  app.use("/", vaultPackageRouter);
  app.use("/", earningRuleRouter);

  // Mounted at root so internal routes like router.post("/services") work as /services
  app.use("/", servicesRouter);
  app.use("/", authCollectoRoutes());

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
