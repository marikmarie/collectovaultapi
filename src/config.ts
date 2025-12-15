import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: process.env.PORT || "4000",
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_PORT: process.env.DB_PORT || "3306",
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "",
  DB_DATABASE: process.env.DB_DATABASE || "collecto_vault",
  COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
  COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!
};
