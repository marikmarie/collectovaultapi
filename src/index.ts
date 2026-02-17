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
    realConsoleLog(
      JSON.stringify({ status: "error", message: "Execution timeout" }),
    );
    process.exit(1);
  }, 10000);

  let responsesSent = false;

  // Create a temporary Express app for CLI routing (ensures proper route matching)
  const cliApp = express();
  cliApp.use(express.json());

  // Mount all routers
  cliApp.use("/tier", tierRouter);
  cliApp.use("/vaultPackages", vaultPackageRouter);
  cliApp.use("/pointRules", earningRuleRouter);
  cliApp.use("/customers", CustomerRoutes());
  cliApp.use("/admin", CustomerRoutes());
  cliApp.use("/", servicesRouter);
  cliApp.use("/", collectoRouter);

  // 404 handler
  cliApp.use((req: any, res: any) => {
    res
      .status(404)
      .json({ error: "Route not found", path: req.path, method: req.method });
  });

  // Error handler
  cliApp.use((err: any, req: any, res: any, next: any) => {
    res.status(err.status || 500).json({
      error: err.message,
      status: err.status || 500,
    });
  });

  // Create a response wrapper that captures output
  const mockRes: any = {
    statusCode: 200,
    statusMessage: "OK",
    headers: {},
    _data: null,
    json: (data: any) => {
      if (responsesSent) return mockRes;
      responsesSent = true;
      clearTimeout(timeout);
      realConsoleLog(JSON.stringify(data));
      process.exit(0);
    },
    send: (data: any) => {
      if (responsesSent) return mockRes;
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
    writeHead: () => mockRes,
    end: () => {
      if (!responsesSent) process.exit(0);
    },
    write: () => mockRes,
  };

  try {
    // Build the request method and URL based on path and params
    let method = "GET";
    let urlPath = "/";
    let body: any = {};

    // Parse the path and params to build the request
    if (path) {
      const firstParam = params[0];

      // Detect method from parameters
      if (firstParam === "create") {
        method = "POST";
        const vendorId = params[1];
        const bodyData = params[2];
        urlPath = `/${path}/create/${vendorId}`;
        if (bodyData) {
          try {
            body = JSON.parse(bodyData);
          } catch (e) {
            body = parseInputData([bodyData]);
          }
        }
      } else if (firstParam === "update") {
        method = "PUT";
        const id = params[1];
        const bodyData = params[2];
        urlPath = `/${path}/update/${id}`;
        if (bodyData) {
          try {
            body = JSON.parse(bodyData);
          } catch (e) {
            body = parseInputData([bodyData]);
          }
        }
      } else if (firstParam === "delete") {
        method = "DELETE";
        const vendorId = params[1];
        const id = params[2];
        urlPath = `/${path}/delete/${vendorId}/${id}`;
      } else if (firstParam === "DELETE") {
        method = "DELETE";
        const vendorId = params[1];
        const ruleId = params[2];
        urlPath = `/${path}/delete/${vendorId}/${ruleId}`;
      } else if (firstParam && firstParam.startsWith("{")) {
        method = "POST";
        try {
          body = JSON.parse(firstParam);
        } catch (e) {
          body = parseInputData([firstParam]);
        }
        urlPath = `/${path}`;
      } else if (path === "admin") {
        method = "GET";
        urlPath = `/${path}/${firstParam}`;
        if (params[1]) {
          urlPath += `?collectoId=${params[1]}`;
        }
      } else if (path === "customers") {
        method = "GET";
        urlPath = `/${path}/info/${firstParam}`;
      } else if (["auth", "authCollecto", "authVerify"].includes(path)) {
        method = "POST";
        urlPath = `/${path}`;
        body = parseInputData(params);
      } else if (["services", "invoiceDetails", "requestToPay", "requestToPayStatus", "verifyPhoneNumber", "invoice", "transactions"].includes(path)) {
        method = "POST";
        urlPath = `/${path}`;
        body = parseInputData(params);
      } else {
        // GET request with optional ID (for tier, vaultPackages, pointRules)
        method = "GET";
        if (firstParam) {
          urlPath = `/${path}/${firstParam}`;
        } else {
          urlPath = `/${path}`;
        }
      }
    }

    // Create a mock request object
    const mockReq: any = {
      method,
      url: urlPath,
      path: urlPath,
      originalUrl: urlPath,
      headers: {
        "content-type": "application/json",
        "user-agent": "cli",
      },
      query: {},
      params: {},
      body,
      header: (name: string) => mockReq.headers[name.toLowerCase()],
      get: (name: string) => mockReq.headers[name.toLowerCase()],
    };

    // Handle query parameters if present
    if (urlPath.includes("?")) {
      const [pathPart, queryPart] = urlPath.split("?");
      mockReq.url = pathPart;
      mockReq.path = pathPart;
      mockReq.originalUrl = urlPath;
      const queryParams = new URLSearchParams(queryPart);
      for (const [key, value] of queryParams) {
        mockReq.query[key] = value;
      }
    }

    // Route the request through the Express app
    cliApp(mockReq, mockRes);
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
  app.use("/tier", tierRouter);
  app.use("/vaultPackages", vaultPackageRouter);
  app.use("/pointRules", earningRuleRouter);

  // Mounted at root so internal routes like router.post("/services") work as /services
  app.use("/", servicesRouter);
  app.use("/", collectoRouter);

  // 404 handler for unmatched routes
  app.use((req: any, res: any) => {
    res
      .status(404)
      .json({ error: "Route not found", path: req.path, method: req.method });
  });

  // Error handling middleware (MUST be last)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message,
      status: err.status || 500,
    });
  });

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
