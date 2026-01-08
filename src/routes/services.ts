import { Router, Request, Response } from "express";
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
  const headers: Record<string, string> = {
    "x-api-key": API_KEY!,
  };
  if (userToken) {
    headers["authorization"] = userToken;
  }
  return headers;
} 

router.post("/services", async (req: Request, res: Response) => {
  try {
    // In a POST request, data usually comes from req.body
    const { collectoId, page } = req.body;
    const token = req.headers.authorization as string | undefined;
    const pageNumber = typeof page === "number" ? page : parseInt(page) || 1;
    console.log("Collecto ID:", collectoId);

    if (!collectoId) {
      return res
        .status(400)
        .json({ message: "collectoId is required in the request body" });
    }

    const response = await axios.post(
      `${BASE_URL}/servicesAndProducts`,
      { collectoId, page: pageNumber },
      {
        headers: collectoHeaders(token),
      }
    );
    console.log("Services Response:", JSON.stringify(response.data, null, 2));
    return res.json(response.data);
  } catch (err: any) {
    console.error("Fetch Error:", err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Failed to fetch services",
      error: err?.response?.data || err.message,
    });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("Missing user token");

    // allow optional query filtering by clientId or collectoId
    const { clientId, collectoId } = req.query;

    const response = await axios.get(`${BASE_URL}/invoices`, {
      headers: collectoHeaders(token),
      params: clientId || collectoId ? { clientId, collectoId } : undefined,
    });

    return res.json(response.data);
  } catch (error: any) {
    console.error('Failed to fetch invoices', error?.response?.data || error.message);
    return res.status(error?.response?.status || 500).json({
      message: "Failed to fetch invoices",
      error: error?.response?.data || error.message,
    });
  }
});
/**
 * POST /api/invoice
 * Unified invoice endpoint for creating invoices (Place Order behavior).
 * body: {
 *   items: [{ serviceId, serviceName, amount, quantity }],
 *   amount: number,
 *   phone?: string,
 * }
 */

router.post("/invoice", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { items, amount, phone } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).send("Missing items in request body");

   // 1) New: items: [{ collectoId, clientId, serviceId, serviceName, Quantity, totalAmount }, ...]
    // 2) Legacy: items: [{ serviceId, serviceName, amount, quantity }, ...] with collectoId & clientId at top-level

    // Detect new shape
    const isNewShape = items.every((it: any) => (
      it && (it.collectoId || it.collectoId === 0) && (it.clientId || it.clientId === 0) && (it.serviceId || it.serviceId === 0) && (it.serviceName !== undefined) && (it.Quantity !== undefined) && (it.totalAmount !== undefined)
    ));

    let collectoId: string | undefined;
    let clientId: string | undefined;
    let forwardItems: any[] = [];

    if (isNewShape) {
      // Ensure all items have the same collectoId and clientId
      const collectoSet = new Set(items.map((it: any) => String(it.collectoId)));
      const clientSet = new Set(items.map((it: any) => String(it.clientId)));
      if (collectoSet.size > 1 || clientSet.size > 1) return res.status(400).send("Mismatched collectoId or clientId across items");

      collectoId = String(items[0].collectoId);
      clientId = String(items[0].clientId);

      // Convert to { serviceId, serviceName, amount, quantity } expected by Collecto
      forwardItems = items.map((it: any) => {
        const quantity = Number(it.Quantity);
        const total = Number(it.totalAmount);
        const unit = quantity > 0 ? total / quantity : total;
        return {
          serviceId: it.serviceId,
          serviceName: it.serviceName,
          amount: unit,
          quantity,
        };
      });
    } else {
      // Legacy shape - validate elements
      const invalidItem = items.find((it: any) => !it.serviceId || !it.serviceName || !it.quantity || (it.amount === undefined));
      if (invalidItem) return res.status(400).send("One or more items are missing required fields");

      // collectoId and clientId should be provided at the top-level (fallback)
      collectoId = req.body.collectoId;
      clientId = req.body.clientId;
      if (!collectoId) return res.status(400).send("collectoId is required");
      if (!clientId) return res.status(400).send("clientId (customer id) is required");

      forwardItems = items.map((it: any) => ({
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        amount: Number(it.amount),
        quantity: Number(it.quantity),
      }));
    }

    // Compute total amount from items
    const computedAmount = forwardItems.reduce((acc: number, it: any) => acc + Number(it.amount) * Number(it.quantity), 0);

    const payload: any = {
      items: forwardItems,
      amount: Number(computedAmount),
      collectoId,
      clientId,
    };

    if (phone) payload.phone = phone;

    // Forward to Collecto createInvoice
    const response = await axios.post(`${BASE_URL}/createInvoice`, payload, {
      headers: collectoHeaders(userToken),
    });

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
 * DEPRECATED: use POST /api/invoice with { payNow: 1 }
 */
router.post("/pay", async (req: Request, res: Response) => {
  return res.status(400).json({ message: "Endpoint deprecated. Use POST /invoice/pay to pay an existing invoice" });
});


// Pay an existing invoice
router.post("/invoice/pay", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { invoiceId, method, phone } = req.body; // method: 'points' | 'mm'

    if (!userToken) return res.status(401).send("Missing user token");
    if (!invoiceId || !method) return res.status(400).send("Missing invoiceId or method");

    // Build payload expected by Collecto - include phone for mobile money
    const payload: any = { invoiceId, method };
    if (phone) payload.phone = phone;

    const response = await axios.post(`${BASE_URL}/pay`, payload, {
      headers: collectoHeaders(userToken),
    });

    return res.json(response.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Invoice payment failed",
      error: err?.response?.data,
    });
  }
});

export default router;
