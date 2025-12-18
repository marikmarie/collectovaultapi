import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";
import collectoRouter from "./routes/authCollecto";
import tierRouter from "./routes/tier.routes";
import vaultPackageRouter from "./routes/vault-package.routes";
import earningRuleRouter from "./routes/earning-rule.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", servicesRouter);
app.use("/api", collectoRouter);
app.use("/api/tiers", tierRouter);
app.use("/api/vaultPackages", vaultPackageRouter);
app.use("/api/earningRules", earningRuleRouter);

app.get("/", (_, res) => {
  res.send("CollectoVault API proxy running");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
