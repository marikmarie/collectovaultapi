import e, { Router, Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
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

// export function collectoRouter(): Router {
  const router = Router();

  // Initialize repositories and services for username functionality
  const customerRepository = new CustomerRepository();
  const tranRepo = new TransactionRepository();
  const customerService = new CustomerService(
    customerRepository,
    tranRepo
  );

  // POST /auth
  router.post("/auth", async (req: Request, res: Response) => {
    try {

      console.log(req.body);
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Request body is required" });
      }
      const response = await axios.post(`${BASE_URL}/auth`, req.body, {
        headers: collectoHeaders(),
      });
      console.log(response.data);
      return res.status(response.status).json(response.data);

    } catch (err: any) {
      console.error("[Collecto /auth] ERROR", err?.response?.data || err.message);
      return res.status(err?.response?.status || 500).json({
        message: err?.response?.data?.message ,
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

  // POST /set-username - Set username for a customer via Collecto endpoint
  // POST /setUsername - Set username for a customer via Collecto endpoint
router.post("/setUsername", async (req: Request, res: Response) => {
  try {
    const { clientId, username, action } = req.body;
    const userToken = req.headers.authorization;

    // 1. Validate required fields
    if (!clientId || !username) {
      return res.status(400).json({
        success: false,
        message: "Both clientId and username are required",
      });
    }

    // 2. Validate action field (must be 'create' or 'update')
    if (action && !['create', 'update'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'create' or 'update'",
      });
    }

    // 3. Validate username format
    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3 and 100 characters",
      });
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username can only contain letters, numbers, underscores, and hyphens",
      });
    }

    try {
      // 4. Call external Collecto API
      const collectoResponse = await axios.post(
        `${BASE_URL}/clientUsername`,
        req.body,
        {
          headers: collectoHeaders(userToken),
        }
      );

      const responseData = collectoResponse.data;
      console.log("[Collecto /setUsername] Response", responseData);

      /**
       * 5. Treat the response right:
       * Based on your logs, the username is found in responseData.data.clientUsername
       * and the success message is in responseData.data.message
       */
      const resultData = responseData.data;

      return res.status(200).json({
        success: true,
        message: resultData?.message || "Username set successfully",
        data: {
          clientId: clientId,
          username: resultData?.clientUsername || username,
          status: responseData.status_message // 'success'
        },
      });

    } catch (collectoErr: any) {
      const errorData = collectoErr?.response?.data;
      const errorStatus = collectoErr?.response?.status;

      console.error("[Collecto /setUsername] ERROR", errorData || collectoErr.message);

      // Handle Username Already Taken
      if (errorStatus === 409 || errorData?.message?.toLowerCase().includes('taken')) {
        return res.status(409).json({
          success: false,
          message: "That username is already taken. Please choose another.",
        });
      }

      // Handle other API errors
      return res.status(errorStatus || 400).json({
        success: false,
        message: errorData?.message || "Could not set username at this time",
      });
    }

  } catch (err: any) {
    console.error("[Global /setUsername] ERROR", err?.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error occurred while setting username",
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

      // fetch username from collecto endpoint to verify it exists and get clientId
      const collectoResponse = await axios.post(
        `${BASE_URL}/getByUsername`,
        { username },
        {
          headers: collectoHeaders(),
        }
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return res.status(404).json({
          success: false,
          message: "Username not found",
        });
      }
    }
  });
export default router;
  // return router;
// }


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
