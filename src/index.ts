import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";
import collectoRouter from "./routes/authCollecto";
import tierRouter from "./routes/tier.routes";
import vaultPackageRouter from "./routes/vault-package.routes";
import earningRuleRouter from "./routes/earning-rule.routes";
import { CustomerRoutes } from "./routes/customer.routes";
import { url } from "inspector";

dotenv.config();


const isCLIMode = !process.env.PORT || process.argv.length > 2;

if (isCLIMode) {
  const realConsoleLog = console.log;
  console.log = () => {};
  console.error = () => {};

  const args = process.argv.slice(2);
  const mainPath = args[0] || "";
  const subPath = args[1] || "";
  const otherParams = args.slice(2);

  const timeout = setTimeout(() => {
    realConsoleLog(
      JSON.stringify({ status: "error", message: "Execution timeout" })
    );
    process.exit(1);
  }, 10000);

  try {
    const app = express();
    app.use(express.json());

    // Mount EXACTLY like server mode
    app.use("/customers", CustomerRoutes());
    app.use("/admin", CustomerRoutes());
    app.use("/tier", tierRouter);
    app.use("/vaultPackages", vaultPackageRouter);
    app.use("/pointRules", earningRuleRouter);
    app.use("/", servicesRouter);
    app.use("/", collectoRouter);

    // Determine HTTP method
    let method = "GET";

    if (subPath === "create") method = "POST";
    else if (subPath === "update") method = "PUT";
    else if (subPath === "delete") method = "DELETE";

    // Extract JSON body if present
    let body: any = {};
    if (
      otherParams.length > 0 &&
      otherParams[otherParams.length - 1].startsWith("{")
    ) {
      body = JSON.parse(otherParams.pop() as string);
    }

    const fullPath =
      "/" +
      [mainPath, subPath, ...otherParams]
        .filter(Boolean)
        .join("/");

    // 🔥 Create a real HTTP server internally
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;

      const http = await import("http");

      const options = {
        hostname: "127.0.0.1",
        port,
        path: fullPath,
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          clearTimeout(timeout);
          realConsoleLog(data);
          server.close();
          process.exit(0);
        });
      });

      req.on("error", (err) => {
        clearTimeout(timeout);
        realConsoleLog(
          JSON.stringify({ status: "error", message: err.message })
        );
        server.close();
        process.exit(1);
      });

      if (method !== "GET" && Object.keys(body).length > 0) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  } catch (err: any) {
    realConsoleLog(
      JSON.stringify({ status: "error", message: err.message })
    );
    process.exit(1);
  }
}
else {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/customers", CustomerRoutes());
  app.use("/admin", CustomerRoutes());
  app.use("/tier", tierRouter);
  app.use("/vaultPackages", vaultPackageRouter);
  app.use("/pointRules", earningRuleRouter);
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
