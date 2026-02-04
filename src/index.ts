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
const app = express();

app.use(cors());
app.use(express.json());

app.use("/", servicesRouter);
app.use("/", collectoRouter);
app.use("/tier", tierRouter);
app.use("/admin", CustomerRoutes());
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
