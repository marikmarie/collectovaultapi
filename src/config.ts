import dotenv from "dotenv";

dotenv.config();

type EnvType = "development" | "staging" | "production";

const envType = (process.env.ENV_TYPE as EnvType) ?? "development";

// const configs = {
//   development: {
//     PORT: "4000",
//     DB_HOST: "127.0.0.1",
//     DB_PORT: "3306",
//     DB_USER: "root",
//     DB_PASSWORD: "",
//     DB_DATABASE: "collecto_vault",
//     COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
//     COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
//   },
const configs = {
  development: {
   // PORT: "4000",
    DB_HOST: process.env.VAULT_DB,
   // DB_PORT: "3306",
    DB_USER: process.env.VAULT_DB_USER,
    DB_PASSWORD: process.env.VAULT_DB_PASS,
    DB_DATABASE: process.env.VAULT_DB_NAME,
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  },


  staging: {
    PORT: process.env.PORT!,
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: process.env.DB_PORT!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_DATABASE: process.env.DB_DATABASE!,
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  },

  production: {
    PORT: process.env.PORT!,
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: process.env.DB_PORT!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_DATABASE: process.env.DB_DATABASE!,
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  },
} as const;

export const config = configs[envType];
