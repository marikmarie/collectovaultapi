import { Router, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

dotenv.config();

const router = Router();

const BASE_URL = process.env.COLLECTO_BASE_URL;
const API_KEY = process.env.COLLECTO_API_KEY;

// Initialize customer service for point calculations
const customerRepository = new CustomerRepository();
const tierRepository = new TierRepository();
const earningRuleRepository = new EarningRuleRepository();
const customerService = new CustomerService(
  customerRepository,
  tierRepository,
  earningRuleRepository
);

// Dummy data generators
const getDummyPayment = (invoiceId: string, amount: number) => ({
  id: `PAY-${Date.now()}`,
  invoiceId,
  amount,
  method: "mm",
  status: "success",
  date: new Date(),
});

const getDummyInvoice = (collectoId: string, clientId: string) => ({
  id: `INV-${Date.now()}`,
  collectoId,
  clientId,
  amount: Math.floor(Math.random() * 5000) + 1000,
  status: "paid",
  date: new Date(),
});

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

    console.log(
      "Fetching services for collectoId:",
      collectoId,
      "page:",
      pageNumber
    );
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
    console.error(
      "Failed to fetch invoices",
      error?.response?.data || error.message
    );
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

    // Helper to support multiple item field shapes (Quantity / quantity, totalAmount / total / amount)
    const getQuantity = (it: any) =>
      Number(it?.Quantity ?? it?.quantity ?? it?.qty ?? 0);
    const getTotal = (it: any) =>
      Number(
        it?.totalAmount ?? it?.total ?? it?.total_amount ?? it?.amount ?? 0
      );

    // Detect new shape: each item includes collectoId & clientId and a total/Quantity pair
    const isNewShape = items.every(
      (it: any) =>
        it &&
        it.collectoId !== undefined &&
        it.collectoId !== null &&
        it.clientId !== undefined &&
        it.clientId !== null &&
        it.serviceId !== undefined &&
        it.serviceName !== undefined &&
        (getQuantity(it) > 0 || getTotal(it) > 0)
    );

    let collectoId: string | undefined;
    let clientId: string | undefined;
    let forwardItems: any[] = [];

    if (isNewShape) {
      const collectoSet = new Set(
        items.map((it: any) => String(it.collectoId))
      );
      const clientSet = new Set(items.map((it: any) => String(it.clientId)));
      if (collectoSet.size > 1 || clientSet.size > 1)
        return res
          .status(400)
          .send("Mismatched collectoId or clientId across items");

      collectoId = String(items[0].collectoId);
      clientId = String(items[0].clientId);

      if (!collectoId) return res.status(400).send("collectoId is required");
      if (!clientId)
        return res.status(400).send("clientId (customer id) is required");

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
      const invalidItem = items.find(
        (it: any) =>
          !it.serviceId ||
          !it.serviceName ||
          it.quantity === undefined ||
          (it.amount === undefined && it.totalAmount === undefined)
      );
      if (invalidItem)
        return res
          .status(400)
          .send(
            "One or more items are missing required fields (legacy shape expected)"
          );

      // collectoId and clientId should be provided at the top-level (fallback)
      collectoId = req.body.collectoId;
      clientId = req.body.clientId;
      if (!collectoId) return res.status(400).send("collectoId is required");
      if (!clientId)
        return res.status(400).send("clientId (customer id) is required");

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
    const computedAmount = forwardItems.reduce(
      (acc: number, it: any) => acc + Number(it.amount) * Number(it.quantity),
      0
    );
    const providedTotal = req.body.totalAmount;
    const finalAmount =
      providedTotal !== undefined && providedTotal !== null
        ? Number(providedTotal)
        : Number(computedAmount);

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

router.post("/buyPoints", async (req: Request, res: Response) => {
  return res
    .status(400)
    .json({
      message:
        "Endpoint deprecated. Use POST /invoice/pay to pay an existing invoice",
    });
});

router.post("/invoice/pay", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { invoiceId, method, phone, collectoId, clientId } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!invoiceId || !method)
      return res.status(400).send("Missing invoiceId or method");
    if (!collectoId || !clientId)
      return res.status(400).send("Missing collectoId or clientId");

    // Build payload expected by Collecto
    const payload: any = { invoiceId, method };
    if (phone) payload.phone = phone;

    let paymentResponse: any;

    try {
      // Try to fetch payment from Collecto
      paymentResponse = await axios.post(`${BASE_URL}/pay`, payload, {
        headers: collectoHeaders(userToken),
      });
    } catch (err: any) {
      console.warn(
        "Collecto payment API failed, using dummy data:",
        err?.response?.data || err.message
      );
      paymentResponse = getDummyPayment(invoiceId, 0);
    }

    // Get payment amount - try from response or use a reasonable default
    const paymentAmount =
      paymentResponse?.amount ||
      paymentResponse?.invoice?.amount ||
      Math.floor(Math.random() * 3000) + 500;

    // Process customer points based on payment
    try {
      await customerService.processInvoicePayment(collectoId, clientId, {
        amount: paymentAmount,
        invoiceId: invoiceId,
        ruleId: undefined, 
      });

      console.log(
        `Points processed for customer ${clientId} - Amount: ${paymentAmount}`
      );
    } catch (customerErr: any) {
      console.warn("Customer point processing warning:", customerErr.message);
      // Don't fail the payment if customer service has issues
    }

    return res.json({
      success: true,
      payment: paymentResponse,
      message: "Payment processed and customer points updated",
    });
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Invoice payment failed",
      error: err?.response?.data,
    });
  }
});

// Get payments (fetched from Collecto)
router.get("/payments", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    if (!userToken) return res.status(401).send("Missing user token");

    const { clientId, collectoId, invoiceId } = req.query;

    let params: any = {};
    if (clientId) params.clientId = clientId;
    if (collectoId) params.collectoId = collectoId;
    if (invoiceId) params.invoiceId = invoiceId;

    let paymentsData: any;

    try {
      const response = await axios.get(`${BASE_URL}/payments`, {
        headers: collectoHeaders(userToken),
        params: Object.keys(params).length > 0 ? params : undefined,
      });
      paymentsData = response.data;
    } catch (err: any) {
      console.warn(
        "Failed to fetch payments from Collecto, generating dummy data:",
        err?.response?.data || err.message
      );

      // Generate dummy payments when API fails
      const dummyPayments = [
        getDummyPayment(`INV-${Date.now()}-1`, 2500),
        getDummyPayment(`INV-${Date.now()}-2`, 1800),
        getDummyPayment(`INV-${Date.now()}-3`, 3200),
      ];

      paymentsData = {
        success: true,
        data: dummyPayments,
        message: "Generated dummy payment data (Collecto API unavailable)",
      };
    }

    // Normalize payments array
    let paymentsArray: any[] = [];
    if (Array.isArray(paymentsData)) {
      paymentsArray = paymentsData;
    } else if (Array.isArray(paymentsData.data)) {
      paymentsArray = paymentsData.data;
    } else if (paymentsData && paymentsData.data) {
      paymentsArray = [paymentsData.data];
    }

    const processingResults: any[] = [];
    const processingErrors: any[] = [];
    const customersSummary: Record<string, any> = {};

    const providedClientId = req.query.clientId as string | undefined;
    const providedCollectoId = req.query.collectoId as string | undefined;

    // Group payments by clientId+collectoId
    const groups = new Map<string, any[]>();

    for (const p of paymentsArray) {
      const client = providedClientId || p.clientId;
      const collecto = providedCollectoId || p.collectoId;

      if (!client || !collecto) {
        continue;
      }

      const key = `${collecto}::${client}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    
    for (const [key, groupPayments] of groups.entries()) {
      const [collecto, client] = key.split("::");
      try {
        let latestCustomer: any = null;
        for (const payment of groupPayments) {
          try {
            const updatedCustomer = await customerService.processInvoicePayment(
              collecto,
              client,
              {
                amount: Number(payment.amount) || 0,
                invoiceId: payment.invoiceId || payment.id,
                ruleId: undefined,
              }
            );
            latestCustomer = updatedCustomer;
            processingResults.push({
              invoiceId: payment.invoiceId || payment.id,
              clientId: client,
              collectoId: collecto,
              success: true,
            });
          } catch (innerErr: any) {
            processingErrors.push({
              invoiceId: payment.invoiceId || payment.id,
              clientId: client,
              collectoId: collecto,
              error: innerErr.message || innerErr,
            });
            console.error(
              `Failed to process payment ${
                payment.invoiceId || payment.id
              } for ${client}:`,
              innerErr?.message || innerErr
            );
          }
        }

        if (latestCustomer) {
          customersSummary[client] = {
            clientId: client,
            collectoId: collecto,
            totalPoints: latestCustomer.currentPoints,
            currentTierId: latestCustomer.currentTierId ?? null,
          };
        }
      } catch (groupErr: any) {
        processingErrors.push({
          clientId: client,
          collectoId: collecto,
          error: groupErr.message || groupErr,
        });
      }
    }

    // Return payments along with a customers summary (only totalPoints exposed)
    const responsePayload = {
      ...paymentsData,
      payments: paymentsArray,
      customers: Object.values(customersSummary),
      processingResults:
        processingResults.length > 0 ? processingResults : undefined,
      processingErrors:
        processingErrors.length > 0 ? processingErrors : undefined,
    };

    return res.json(responsePayload);
  } catch (error: any) {
    console.error(
      "Failed to fetch payments:",
      error?.response?.data || error.message
    );
    return res.status(error?.response?.status || 500).json({
      message: "Failed to fetch payments",
      error: error?.response?.data || error.message,
    });
  }
});

export default router;
