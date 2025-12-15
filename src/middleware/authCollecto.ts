import { Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const COLLECTO_BASE = process.env.COLLECTO_BASE_URL;
const COLLECTO_API_KEY = process.env.COLLECTO_API_KEY;

if (!COLLECTO_API_KEY) {
  console.warn("⚠️ COLLECTO_API_KEY not set");
}

function maskHeaders(headers: Record<string, any> | undefined) {
  if (!headers) return headers;
  const out: Record<string, any> = {};
  for (const k of Object.keys(headers)) {
    if (/api[key]|authorization|token|secret/i.test(k)) {
      out[k] = "***";
    } else {
      out[k] = headers[k];
    }
  }
  return out;
}

function safeStringify(x: any, max = 2000) {
  try {
    let s = typeof x === "string" ? x : JSON.stringify(x);
    if (s.length > max) s = s.slice(0, max) + "...[truncated]";
    return s;
  } catch {
    return String(x);
  }
}

/* --------------------------- Collecto Axios Client --------------------------- */

function makeCollectoClient() {
  const client = axios.create({
    baseURL: COLLECTO_BASE,
    timeout: 10000,
    headers: {
      "x-api-key": COLLECTO_API_KEY!,
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use((config) => {
    (config as any).metadata = { start: Date.now() };
    console.log(
      `[Collecto →] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
   if (config.data) 
      console.log("body:", safeStringify(config.data));
    return config;
  });

  client.interceptors.response.use(
    (res) => {
      const duration = Date.now() - (res.config as any).metadata.start;
      console.log(`[Collecto ←] ${res.status} (${duration}ms)`);
      console.log("data:", safeStringify(res.data));
      return res;
    },
    (err) => {
      console.error("[Collecto ERROR]", err?.response?.data || err.message);
      return Promise.reject(err);
    }
  );

  return client;
}

/**
 * POST /collecto/auth
 */
export async function collectoAuthHandler(req: Request, res: Response) {
  const start = Date.now();
  try {
    const client = makeCollectoClient();
    const r = await client.post("/auth", req.body);

    res.status(r.status).json(r.data);
    console.log(`[collectoAuth] OK (${Date.now() - start}ms)`);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const payload = err?.response?.data ?? { message: err.message };
    res.status(status).json(payload);
    console.error("[collectoAuth] ERROR", payload);
  }
}

/**
 * POST /collecto/authVerify
 */
export async function collectoAuthVerifyHandler(req: Request, res: Response) {
  const start = Date.now();
  try {
    const client = makeCollectoClient();
    const r = await client.post("/authVerify", req.body);

    res.status(r.status).json(r.data);
    console.log(`[collectoAuthVerify] OK (${Date.now() - start}ms)`);
  } catch (err: any) {
    const status = err?.response?.status ?? 500;
    const payload = err?.response?.data ?? { message: err.message };
    res.status(status).json(payload);
    console.error("[collectoAuthVerify] ERROR", payload);
  }
}

/* ------------------------ Optional Auth Middleware ------------------------ */
/**
 * Middleware to validate an already-issued Collecto token
 */
export async function collectoAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const client = makeCollectoClient();
    const r = await client.post("/authVerify", { token: auth.replace("Bearer ", "") });

    if (!r.data?.data?.verified) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as any).collectoUser = r.data.data;
    next();
  } catch (err: any) {
    console.error("collectoAuthMiddleware error", err?.response?.data || err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
