import express from "express";
import bodyParser from "body-parser";
import { config } from "./config";
//import pointRulesRouter from "./routes/pointRules";
import customersRouter from "./routes/customers";


const app = express();
app.use(bodyParser.json());

// app.use("/api/point-rules", pointRulesRouter);
// app.use("/api/tier-rules", tierRulesRouter);
// app.use("/api/packages", packagesRouter);
app.use("/api/customers", customersRouter);

app.listen(Number(config.PORT), () => {
  console.log(`Collecto Vault API running on ${config.PORT}`);
});
