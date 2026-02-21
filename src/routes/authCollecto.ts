import { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { TransactionRepository } from "../repositories/transaction.repository";

dotenv.config();

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

export function authCollectoRoutes(): Router {
  const router = Router();

  // Initialize repositories and services for username functionality
  const customerRepository = new CustomerRepository();
  const tierRepository = new TierRepository();
  const earningRuleRepository = new EarningRuleRepository();
  const tranRepo = new TransactionRepository();
  const customerService = new CustomerService(
    customerRepository,
    tierRepository,
    earningRuleRepository,
    tranRepo
  );

  // POST /auth
  router.post("/auth", async (req: Request, res: Response) => {
    try {

      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Request body is required" });
      }
      const response = await axios.post(`${BASE_URL}/auth`, req.body, {
        headers: collectoHeaders(),
      });
      return res.status(response.status).json(response.data);

    } catch (err: any) {
      console.error("[Collecto /auth] ERROR", err?.response?.data || err.message);
      return res.status(err?.response?.status || 500).json({
        message: "Auth failed",
        error: err?.response?.data,
      });
    }
  });

  // POST /authVerify
  router.post("/authVerify", async (req: Request, res: Response) => {
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

  // POST /set-username - Set username for a customer
  router.post("/setUsername", async (req: Request, res: Response) => {
    try {
      const { clientId, username, collectoId } = req.body;

      // Validate required fields
      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: "clientId is required",
        });
      }

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "username is required",
        });
      }

      // Set the username
      const updatedCustomer = await customerService.setUsername(clientId, username, collectoId);

      return res.status(200).json({
        success: true,
        message: "Username set successfully",
        data: updatedCustomer,
      });
    } catch (err: any) {
      console.error("[Collecto /set-username] ERROR", err?.message);
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to set username",
      });
    }
  });

  // POST /get-by-username - Get customer by username and retrieve their client ID
  router.post("/getByUsername", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "username is required",
        });
      }

      const customer = await customerService.getCustomerByUsername(username);

      return res.status(200).json({
        success: true,
        data: {
          clientId: customer.clientId,
          collectoId: customer.collectoId,
          username: customer.username,
          name: customer.name,
        },
      });
    } catch (err: any) {
      console.error("[Collecto /get-by-username] ERROR", err?.message);
      return res.status(404).json({
        success: false,
        message: err.message || "Username not found",
      });
    }
  });

  return router;
}

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
