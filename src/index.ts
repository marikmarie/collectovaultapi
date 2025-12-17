import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import servicesRouter from "./routes/services";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", servicesRouter);

app.get("/", (_, res) => {
  res.send("CollectoVault API proxy running");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
