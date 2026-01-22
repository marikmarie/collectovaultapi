import dotenv from "dotenv";
import path from "path";

// Ensure dotenv looks for the .env file relative to the execution context
dotenv.config();

type EnvType = "development" | "staging" | "production";
const envType = (process.env.ENV_TYPE as EnvType) ?? "development";

const getDbHost = () =>
  process.env.VAULT_DB || process.env.DB_HOST || "127.0.0.1";
const getDbUser = () =>
  process.env.VAULT_DB_USER || process.env.DB_USER || "root";
const getDbPassword = () =>
  process.env.VAULT_DB_PASS || process.env.DB_PASSWORD || "";
const getDbName = () =>
  process.env.VAULT_DB_NAME || process.env.DB_DATABASE || "collecto_vault";
const getPort = () => process.env.PORT || "4000";

const configs = {
  development: {
    PORT: getPort(),
    DB_HOST: getDbHost(),
    DB_USER: getDbUser(),
    DB_PASSWORD: getDbPassword(),
    DB_DATABASE: getDbName(),
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  },
  staging: {
    PORT: getPort(),
    DB_HOST: getDbHost(),
    DB_USER: getDbUser(),
    DB_PASSWORD: getDbPassword(),
    DB_DATABASE: getDbName(),
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  }, 
  production: {
    PORT: getPort(),
    DB_HOST: getDbHost(),
    DB_USER: getDbUser(),
    DB_PASSWORD: getDbPassword(),
    DB_DATABASE: getDbName(),
    COLLECTO_BASE_URL: process.env.COLLECTO_BASE_URL!,
    COLLECTO_API_KEY: process.env.COLLECTO_API_KEY!,
  }, 
} as const;

// Logic to export specific config
export const config = configs[envType];
// NO CONSOLE LOGS HERE
