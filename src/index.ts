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

if (!process.env.PORT || process.argv.length > 2) {
    // --- CLI MODE: SILENCE OUTPUT ---
    const realConsoleLog = console.log;
    console.log = () => {}; 
    console.error = () => {};

    const args = process.argv.slice(2);
    const path = args[0];
    const params = args.slice(1);

    const timeout = setTimeout(() => {
        realConsoleLog(JSON.stringify({ status: "error", message: "Timeout" }));
        process.exit(1);
    }, 5000);

    let responsesSent = false;

    const mockRes: any = {
        statusCode: 200,
        json: (data: any) => {
            if (responsesSent) return;
            responsesSent = true;
            clearTimeout(timeout);
            realConsoleLog(JSON.stringify(data)); // ONLY JSON OUTPUT
            process.exit(0);
        },
        send: (data: any) => {
            if (responsesSent) return;
            responsesSent = true;
            clearTimeout(timeout);
            realConsoleLog(typeof data === 'object' ? JSON.stringify(data) : data);
            process.exit(0);
        },
        status: (code: number) => { mockRes.statusCode = code; return mockRes; },
        setHeader: () => mockRes,
        end: () => { if (!responsesSent) process.exit(0); }
    };

    const mockReq: any = {
        url: `/${path}/${params.join('/')}`,
        method: 'GET',
        params: {},
        query: {},
        body: {},
        headers: {}
    };

    try {
        switch (path) {
          case 'authCollecto':
                collectoRouter(mockReq, mockRes, () => {});
            case 'customers':
                let clientId = params[0] === 'info' ? params[1] : params[0];
                mockReq.url = `/info/${clientId}`;
                mockReq.params.clientId = clientId;
                CustomerRoutes()(mockReq, mockRes, () => {});
                break;
            case 'tier':
                tierRouter(mockReq, mockRes, () => {});
                break;
            case 'vaultPackages':
                vaultPackageRouter(mockReq, mockRes, () => {});
                break;
            case 'pointRules':
                earningRuleRouter(mockReq, mockRes, () => {});
                break;
            case 'services':
                servicesRouter(mockReq, mockRes, () => {});
                break;
            default:
                mockRes.status(404).json({ error: "Unknown Route" });
        }
    } catch (err: any) {
        realConsoleLog(JSON.stringify({ status: "error", message: err.message }));
        process.exit(1);
    }
} else {
    // --- SERVER MODE ---
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use("/customers", CustomerRoutes());
    app.use("/tier", tierRouter);
    app.use("/vaultPackages", vaultPackageRouter);
    app.use("/pointRules", earningRuleRouter);
    app.use("/services", servicesRouter);
    app.listen(process.env.PORT || 4000);
}