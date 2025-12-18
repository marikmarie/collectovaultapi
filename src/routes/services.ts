import { Router } from "express";
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


router.get("/services", async (req, res) => {
  try {
    const userToken = req.headers.authorization;
    if (!userToken) return res.status(401).send("Missing user token");

    const response = await axios.get(`${BASE_URL}/services`, {
      headers: collectoHeaders(userToken),
    });
    
    return res.json(response.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Failed to fetch services",
      error: err?.response?.data,
    });
  }
});

/**
 * POST /api/invoice
 * PAY LATER
 * body: { serviceId, serviceName }
 */
router.post("/invoice", async (req, res) => {
  try {
    const userToken = req.headers.authorization;
    const { serviceId, serviceName } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!serviceId || !serviceName)
      return res.status(400).send("Missing serviceId or serviceName");

    const response = await axios.post(
      `${BASE_URL}/invoices`,
      { serviceId, serviceName },
      { headers: collectoHeaders(userToken) }
    );

    return res.json(response.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Invoice creation failed",
      error: err?.response?.data,
    });
  }
});

/**
 * POST /api/pay
 * PAY NOW
 * body: { serviceId, serviceName, amount, phone }
 */
router.post("/pay", async (req, res) => {
  try {
    const userToken = req.headers.authorization;
    const { serviceId, serviceName, amount, phone } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!serviceId || !serviceName || !amount || !phone)
      return res.status(400).send("Missing required fields");

    const response = await axios.post(
      `${BASE_URL}/pay`,
      {
        serviceId,
        serviceName,
        amount,
        phone,
      },
      { headers: collectoHeaders(userToken) }
    );

    return res.json(response.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Payment failed",
      error: err?.response?.data,
    });
  }
});

export default router;
