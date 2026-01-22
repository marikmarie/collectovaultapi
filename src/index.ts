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

// --- LOGIC FOR PHP COMMAND LINE EXECUTION ---
// If PORT is missing or we are running the file directly, enter CLI mode
if (require.main === module || !process.env.PORT) {
    const args = process.argv.slice(2);
    const path = args[0]; // The first part of the path (e.g., 'customers')
    const params = args.slice(1);
    
    const mockRes: any = {
        statusCode: 200,
        json: (data: any) => {
            process.stdout.write(JSON.stringify(data));
            process.exit(0);
        },
        send: (data: any) => {
            process.stdout.write(typeof data === 'object' ? JSON.stringify(data) : data);
            process.exit(0);
        },
        status: (code: number) => {
            mockRes.statusCode = code;
            return mockRes;
        },
        setHeader: () => mockRes,
        end: () => process.exit(0)
    };

    const mockReq: any = {
        url: `/${params.join('/')}`, // Reconstruct the sub-path
        method: 'GET',
        params: {},
        query: {},
        body: {},
        headers: {}
    };

    switch (path) {
        case 'customers':
            // For customers, we handle the sub-route logic
            if (params[0] === 'info' && params[1]) {
                mockReq.params.clientId = params[1];
            }
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

        case 'auth':
            collectoRouter(mockReq, mockRes, () => {});
            break;

        default:
            mockRes.status(404).json({
                status: "error",
                message: "Route not found in CLI mode",
                received_path: path
            });
    }
} else {
    // --- NORMAL EXPRESS SERVER MODE ---
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use("/", servicesRouter);
    app.use("/", collectoRouter);
    app.use("/tier", tierRouter);
    app.use("/vaultPackages", vaultPackageRouter);
    app.use("/pointRules", earningRuleRouter);
    app.use("/customers", CustomerRoutes());

    app.get("/", (_, res) => {
        res.send("CollectoVault API proxy running");
    });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}