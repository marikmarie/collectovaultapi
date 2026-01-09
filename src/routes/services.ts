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
    const { collectoId, page } = req.body;
    const token = req.headers.authorization as string | undefined;
    const pageNumber = typeof page === "number" ? page : parseInt(page) || 1;
    //console.log("Collecto ID:", collectoId);

    if (!collectoId) {
      return res
        .status(400)
        .json({ message: "collectoId is required in the request body" });
    }

    console.log("Fetching services for collectoId:", collectoId, "page:", pageNumber);
    const response = await axios.post(
      `${BASE_URL}/servicesAndProducts`,
      { collectoId, page: pageNumber },
      {
        headers: collectoHeaders(token),
      }
    );
   // console.log("Services Response:", JSON.stringify(response.data, null, 2));
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


router.post("/invoice", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { items, amount, vaultOTPToken } = req.body;
    console.log("Invoice request received:", req.body);
    if (!userToken) return res.status(401).send("Missing user token");
    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).send("Missing items in request body");

   // 1) New: items: [{ collectoId, clientId, serviceId, serviceName, Quantity, totalAmount }, ...]
    // 2) Legacy: items: [{ serviceId, serviceName, amount, quantity }, ...] with collectoId & clientId at top-level

     // Helper to support multiple item field shapes (Quantity / quantity, totalAmount / total / amount)
    const getQuantity = (it: any) => (Number(it?.Quantity ?? it?.quantity ?? it?.qty ?? 0));
    const getTotal = (it: any) => (Number(it?.totalAmount ?? it?.total ?? it?.total_amount ?? it?.amount ?? 0));

    // Detect new shape: each item includes collectoId & clientId and a total/Quantity pair
    const isNewShape = items.every((it: any) => (
      it && (it.collectoId !== undefined && it.collectoId !== null) && (it.clientId !== undefined && it.clientId !== null) && (it.serviceId !== undefined) && (it.serviceName !== undefined) && (getQuantity(it) > 0 || getTotal(it) > 0)
    ));

    let collectoId: string | undefined;
    let clientId: string | undefined;
    let forwardItems: any[] = [];

    if (isNewShape) {
      const collectoSet = new Set(items.map((it: any) => String(it.collectoId)));
      const clientSet = new Set(items.map((it: any) => String(it.clientId)));
      if (collectoSet.size > 1 || clientSet.size > 1) return res.status(400).send("Mismatched collectoId or clientId across items");

      collectoId = String(items[0].collectoId);
      clientId = String(items[0].clientId);

      if (!collectoId) return res.status(400).send("collectoId is required");
      if (!clientId) return res.status(400).send("clientId (customer id) is required");

      // Convert to { serviceId, serviceName, amount, quantity } expected by Collecto
      forwardItems = items.map((it: any) => {
        const quantity = getQuantity(it);
        const total = getTotal(it);
        const unit = quantity > 0 ? total / quantity : total;
        return {
          serviceId: it.serviceId,
          serviceName: it.serviceName,
          amount: Number(unit),
          quantity: Number(quantity),
        };
      });
    } else {
      // Legacy shapes:
      // - items with { amount, quantity }
      // - or items with { totalAmount, quantity } and top-level collectoId & clientId
      const invalidItem = items.find((it: any) => !it.serviceId || !it.serviceName || (it.quantity === undefined) || (it.amount === undefined && it.totalAmount === undefined));
      if (invalidItem) return res.status(400).send("One or more items are missing required fields (legacy shape expected)");

      // collectoId and clientId should be provided at the top-level (fallback)
      collectoId = req.body.collectoId;
      clientId = req.body.clientId;
      if (!collectoId) return res.status(400).send("collectoId is required");
      if (!clientId) return res.status(400).send("clientId (customer id) is required");

      forwardItems = items.map((it: any) => {
        const quantity = Number(it.quantity);
        if (it.amount !== undefined) {
          return {
            serviceId: it.serviceId,
            serviceName: it.serviceName,
            amount: Number(it.amount),
            quantity,
          };
        }
        // totalAmount provided per item - compute unit amount
        const total = Number(it.totalAmount);
        const unit = quantity > 0 ? total / quantity : total;
        return {
          serviceId: it.serviceId,
          serviceName: it.serviceName,
          amount: Number(unit),
          quantity,
        };
      });
    }

    // Compute total amount from items
    const computedAmount = forwardItems.reduce((acc: number, it: any) => acc + Number(it.amount) * Number(it.quantity), 0);
    const providedTotal = req.body.totalAmount;
    const finalAmount = providedTotal !== undefined && providedTotal !== null ? Number(providedTotal) : Number(computedAmount);

    const payload: any = {
      // include vaultOTPToken if provided by client
      ...(vaultOTPToken ? { vaultOTPToken } : {}),
      items: forwardItems,
      amount: Number(finalAmount),
      collectoId,
      clientId,
    };

    // Forward to Collecto createInvoice
    const response = await axios.post(`${BASE_URL}/createInvoice`, payload, {
      headers: collectoHeaders(userToken),
    });

    console.log("Invoice created:", response.data);

    return res.json(response.data);
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Invoice creation failed",
      error: err?.response?.data,
    });
  }
});


router.post("/pay", async (req: Request, res: Response) => {
  return res.status(400).json({ message: "Endpoint deprecated. Use POST /invoice/pay to pay an existing invoice" });
});

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
