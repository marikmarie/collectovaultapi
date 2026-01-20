import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const BASE_URL = process.env.COLLECTO_BASE_URL;
const API_KEY = process.env.COLLECTO_API_KEY;

if (!BASE_URL || !API_KEY) {
  throw new Error("Collecto env variables missing");
}

function collectoHeaders(userToken?: string) {
  return {
    "x-api-key": API_KEY,
    ...(userToken ? { Authorization: userToken } : {}),
  };
}

// POST /auth
router.post("/auth", async (req: Request, res: Response) => {
  try {
    console.log("REQ BODY", req.body);
    const response = await axios.post(`${BASE_URL}/auth`, req.body, {
      headers: collectoHeaders(),
    });   
    console.log(BASE_URL);
    console.log("RESPONSE DATA", response.data);
    return res.status(response.status).json(response.data);

  } catch (err: any) {
    console.error("[Collecto /auth] ERROR", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Auth failed",
      error: err?.response?.data,
    });
  }
});

// POST /auth/verify
router.post("/authverify", async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const response = await axios.post(`${BASE_URL}/authVerify`, req.body, {
      headers: collectoHeaders(),
    });
    console.log(response.data);
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    console.error(
      "[Collecto /auth/verify] ERROR",
      err?.response?.data || err.message
    );
    return res.status(err?.response?.status || 500).json({
      message: "Auth verify failed",
      error: err?.response?.data,
    });
  }
});

export async function collectoAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing Authorization header" });

    const token = auth.replace("Bearer ", "");
    const response = await axios.post(
      `${BASE_URL}/authVerify`,
      { token },
      { headers: collectoHeaders() }
    );

    if (!response.data?.data?.verified) {
      return res.status(401).json({ error: "Invalid token" });
    }

    (req as any).collectoUser = response.data.data;
    next();
  } catch (err: any) {
    console.error("[Collecto Middleware] ERROR", err?.response?.data || err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}


// POST /invoice (Pay Later)
router.post("/invoice", collectoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { serviceId, serviceName } = req.body;

    if (!serviceId || !serviceName)
      return res.status(400).send("Missing serviceId or serviceName");

    const response = await axios.post(
      `${BASE_URL}/invoices`,
      { serviceId, serviceName },
      { headers: collectoHeaders(userToken) }
    );

    return res.json(response.data);
  } catch (err: any) {
    console.error("[Collecto /invoice] ERROR", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Invoice creation failed",
      error: err?.response?.data,
    });
  }
});

// POST /pay (Pay Now)
router.post("/pay", collectoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { serviceId, serviceName, amount, phone } = req.body;

    if (!serviceId || !serviceName || !amount || !phone)
      return res.status(400).send("Missing required fields");

    const response = await axios.post(
      `${BASE_URL}/pay`,
      { serviceId, serviceName, amount, phone },
      { headers: collectoHeaders(userToken) }
    );

    return res.json(response.data);
  } catch (err: any) {
    console.error("[Collecto /pay] ERROR", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Payment failed",
      error: err?.response?.data,
    });
  }
});

export default router;
