import { Router, Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { TransactionRepository } from "../repositories/transaction.repository";
import { VaultPackageRepository } from "../repositories/vault-package.repository";

dotenv.config();

const router = Router();

const BASE_URL = process.env.COLLECTO_BASE_URL;
const API_KEY = process.env.COLLECTO_API_KEY;

// Initialize repositories
const customerRepository = new CustomerRepository();
const tierRepository = new TierRepository();
const earningRuleRepository = new EarningRuleRepository();
const transactionRepository = new TransactionRepository();
const vaultPackageRepository = new VaultPackageRepository();

// Initialize customer service for point calculations
const customerService = new CustomerService(
  customerRepository,
  tierRepository,
  earningRuleRepository,
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

const pendingPayments: Map<
  string,
  { payment: any; status: "pending" | "confirmed" | "failed"; createdAt: Date }
> = new Map();

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
    const { vaultOTPToken, collectoId, page } = req.body;
    const token = req.headers.authorization as string | undefined;
    const pageNumber = typeof page === "number" ? page : parseInt(page) || 1;

    console.log(req.body);
    
    if (!collectoId && !vaultOTPToken) {
      return res
        .status(400)
        .json({ message: "collectoId is required in the request body" });
    }


    const response = await axios.post(
      `${BASE_URL}/servicesAndProducts`,
      { vaultOTPToken, collectoId, page: pageNumber },
      {
        headers: collectoHeaders(token),
      },
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

router.post("/invoiceDetails", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).send("Missing user token");

    const { vaultOTPToken, clientId, collectoId, invoiceId } = req.body;

    const params: any = {
      vaultOTPToken,
      clientId,
      collectoId,
      invoiceId,
    };
    console.log(params);

    const response = await axios.post(`${BASE_URL}/invoiceDetails`, params, {
      headers: collectoHeaders(token),
    });
    console.log(BASE_URL);
    console.log(response.data);
    return res.json(response.data);
  } catch (error: any) {
    console.error(
      "Failed to fetch invoice details",
      error?.response?.data || error.message,
    );
    return res.status(error?.response?.status || 500).json({
      message: "Failed to fetch invoices",
      error: error?.response?.data || error.message,
    });
  }
});

router.post("/requestToPay", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;

    const {
      vaultOTPToken,
      collectoId,
      clientId,
      paymentOption,
      phone,
      amount,
      reference,
    } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!paymentOption) return res.status(400).send("Missing payment method");
    if (!collectoId || !clientId)
      return res.status(400).send("Missing collectoId or clientId");

    const payload: any = {
      paymentOption,
      collectoId,
      clientId,
      reference,
      amount,
    };

    if (vaultOTPToken) payload.vaultOTPToken = vaultOTPToken;

    // Normalize phone to 256 format
    if (phone) {
      payload.phone = phone.replace(/^0/, "256");
    }

    try {
      console.log("Calling Collecto requestToPay API", payload);
      const response = await axios.post(`${BASE_URL}/requestToPay`, payload, {
        headers: collectoHeaders(userToken),
      });

      const collectoData = response.data;

      const innerData = collectoData?.data || {};
      const transactionId =
        innerData.transactionId || innerData.id || `TXN-${Date.now()}`;

      // Store in local memory/cache as "pending" so the /requestToPayStatus can find it later
      pendingPayments.set(transactionId, {
        status: "pending",
        payment: {
          transactionId,
          amount,
          collectoId,
          clientId,
        },
        createdAt: new Date(),
      });

      // If this is a BUYPOINTS transaction, log it to the database immediately as pending
      if (reference && reference.includes("BUYPOINTS")) {
        try {
          const customer = await customerService.getOrCreateCustomer(
            collectoId,
            clientId,
            clientId
          );

          // Look up the package by price to get the points amount
          let pointsToAdd = Math.floor(amount || 0); // Default to amount if package not found
          const vaultPackage = await vaultPackageRepository.findByPrice(amount, collectoId);
          
          if (vaultPackage) {
            pointsToAdd = vaultPackage.pointsAmount;
            console.log(`Found package for price ${amount}: ${vaultPackage.name} with ${pointsToAdd} points`);
          } else {
            console.log(`No package found for price ${amount}, using default points calculation`);
          }

          await transactionRepository.create(
            customer.id,
            collectoId,
            clientId,
            transactionId,
            reference,
            amount || 0,
            pointsToAdd,
            payload.paymentOption || null,
            "PENDING" 
          );

          console.log(`BUYPOINTS transaction logged with ID: ${transactionId}, Status: pending, Points: ${pointsToAdd}`);
        } catch (txnErr: any) {
          console.error("Error logging BUYPOINTS transaction:", txnErr.message);
          // Continue even if logging fails, the payment can still be tracked
        }
      }

      // Return the specific format you requested
      return res.json({
        status: collectoData.status || "200",
        status_message: collectoData.status_message || "success",
        data: {
          requestToPay: true,
          message:
            innerData.message ||
            "Confirm payment via the prompt on your phone.",
          transactionId: transactionId,
        },
      });
    } catch (err: any) {
      console.error(
        "Collecto Request failed:",
        err.message,
      );
      return res.status(500).json({
        message: "Request to pay failed",
        error: err.message,
      });
    }
  } catch (err: any) {
    console.error("Critical BuyPoints Error:", err.message);
    return res.status(500).json({
      message: "Buy points failed",
      error: err.message,
    });
  }
});

// Query payment/invoice status via POST
router.post("/requestToPayStatus", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    // Extract transactionId specifically from the request body
    const { vaultOTPToken, collectoId, clientId, transactionId, reference } = req.body;
    console.log("RequestToPayStatus for transactionId:", req.body);

    if (!userToken) return res.status(401).send("Missing user token");
    if (!transactionId)
      return res.status(400).send("Missing transactionId in body");

    try {
      const response = await axios.post(
        `${BASE_URL}/requestToPayStatus`,
        req.body,
        {
          headers: collectoHeaders(userToken),
        },
      );

      console.log("Collecto payment status response:", response.data);
      const data = response.data;
      let payment: any = null;

      // Logic to find the specific payment record in the response
      if (Array.isArray(data)) {
        payment =
          data.find(
            (p: any) => p.invoiceId === transactionId || p.id === transactionId,
          ) || data[0];
      } else if (data && Array.isArray(data.data)) {
        payment =
          data.data.find(
            (p: any) => p.invoiceId === transactionId || p.id === transactionId,
          ) || data.data[0];
      } else if (data && data.data) {
        payment = data.data;
      } else {
        payment = data;
      }

      if (!payment) {
        return res.json({
          transactionId,
          status: "unknown",
          message: "No payment found in Collecto",
        });
      }

      // Normalize status string
      const statusFromCollecto = (
        payment.status ||
        payment.paymentStatus ||
        payment.invoiceStatus ||
        (payment.invoice && payment.invoice.status) ||
        ""
      )
        .toString()
        .toLowerCase();

      const isConfirmed = ["success", "paid", "confirmed"].some((s) =>
        statusFromCollecto.includes(s),
      );

      // Handle BUYPOINTS transactions
      if (reference && reference.includes("BUYPOINTS")) {
        try {
          let transaction = await transactionRepository.findByTransactionId(transactionId);
          if (transaction) {
            // Update existing transaction payment status
            transaction = await transactionRepository.updatePaymentStatus(
              transaction.id,
              statusFromCollecto
            );

            // If transaction is confirmed, update customer points
            if (isConfirmed) {
              const customer = await customerService.getOrCreateCustomer(
                collectoId,
                clientId,
                clientId
              );
              
              customer.addBoughtPoints(transaction.points);
              await customerRepository.update(customer.id, {
                boughtPoints: customer.boughtPoints,
                currentPoints: customer.currentPoints
              });

              // Determine tier based on current points
              const tier = await tierRepository.findTierForPoints(customer.currentPoints);
              if (tier && customer.currentTierId !== tier.id) {
                customer.currentTierId = tier.id;
                await customerRepository.update(customer.id, {
                  currentTierId: tier.id
                });
              }

              console.log(`Buy Points Transaction Confirmed: Customer ${customer.id} received ${transaction.points} points`);
            }

            if (pendingPayments.has(transactionId)) {
              const rec = pendingPayments.get(transactionId)!;
              rec.status = isConfirmed ? "confirmed" : "pending";
              rec.payment = payment;
              pendingPayments.set(transactionId, rec);
            }

            return res.json({
              transactionId,
              status: isConfirmed ? "confirmed" : "pending",
              payment,
              transaction: {
                id: transaction.id,
                points: transaction.points,
                paymentStatus: transaction.paymentStatus
              }
            });
          } else {
            // Transaction not found in database
            return res.status(404).json({
              transactionId,
              message: "Transaction not found in database",
              status: isConfirmed ? "confirmed" : "pending"
            });
          }
        } catch (txnErr: any) {
          console.error("Error processing BUYPOINTS transaction:", txnErr.message);
          // Still return payment status even if transaction storage fails
          return res.json({
            transactionId,
            status: isConfirmed ? "confirmed" : "pending",
            payment,
            error: "Transaction storage failed but payment processed"
          });
        }
      }

      // Non-BUYPOINTS transactions
      if (isConfirmed) {
        if (pendingPayments.has(transactionId)) {
          const rec = pendingPayments.get(transactionId)!;
          rec.status = "confirmed";
          rec.payment = payment;
          pendingPayments.set(transactionId, rec);
        }
        return res.json({ transactionId, status: "confirmed", payment });
      }

      return res.json({ transactionId, status: "pending", payment });
    } catch (err: any) {
      console.warn(
        "Failed to query Collecto for payment status:",
        err?.response?.data || err.message,
      );

      // Fallback to local store using transactionId as the key
      const local = pendingPayments.get(transactionId);
      if (local) {
        return res.json({
          transactionId,
          status: local.status,
          payment: local.payment,
          message: "Local record used - Collecto unreachable",
        });
      }

      return res.status(503).json({
        transactionId,
        status: "unknown",
        message: "Collecto unreachable and no local record",
      });
    }
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Failed to get invoice status",
      error: err?.response?.data || err.message,
    });
  }
});
// Verify phone number endpoint - accepts phoneNumber (or phone_number / phone) in body
router.post("/verifyPhoneNumber", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { vaultOTPToken, collectoId, clientId, phoneNumber } = req.body;
    console.log("Phone verification request for number:", req.body);

    if (!userToken) return res.status(401).send("Missing user token");
    if (!phoneNumber) return res.status(400).send("Missing phoneNumber");

    try {
      const response = await axios.post(
        `${BASE_URL}/verifyPhoneNumber`,
        { vaultOTPToken, collectoId, clientId, phone: phoneNumber },
        { headers: collectoHeaders(userToken) },
      );

      console.log("Phone verification response:", response.data);
      return res.json(response.data);
    } catch (err: any) {
      console.warn(
        "Collecto phone verification failed, returning local dummy:",
        err?.response?.data || err.message,
      );
      const trxnId = `VER-${Date.now()}`;
      return res.json({
        success: true,
        phoneNumber: phoneNumber,
        verified: true,
        trxnId,
        message: "Local verification (Collecto unreachable)",
      });
    }
  } catch (err: any) {
    console.error(err?.response?.data || err.message);
    return res.status(err?.response?.status || 500).json({
      message: "Phone verification failed",
      error: err?.response?.data || err.message,
    });
  }
});

router.post("/invoice", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { items, vaultOTPToken, totalAmount, staffId } = req.body;

    if (!userToken) return res.status(401).send("Missing user token");
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).send("Invalid or missing items");

    const collectoId = items[0].collectoId || req.body.collectoId;
    const clientId = items[0].clientId || req.body.clientId;

    if (!collectoId || !clientId) {
      return res.status(400).send("collectoId and clientId are required");
    }

    // 2. Normalize items to a standard shape
    const forwardItems = items.map((it: any) => {
      const quantity = Number(it.quantity ?? it.Quantity ?? it.qty ?? 0);
      const total = Number(it.totalAmount ?? it.total ?? it.amount ?? 0);

      const unitAmount =
        it.amount && !it.totalAmount
          ? Number(it.amount)
          : quantity > 0
            ? total / quantity
            : total;

      return {
        serviceId: it.serviceId,
        serviceName: it.serviceName,
        amount: unitAmount,
        quantity: quantity,
      };
    });

    // 3. Determine final total
    const computedTotal = forwardItems.reduce(
      (acc, it) => acc + it.amount * it.quantity,
      0,
    );
    const finalAmount =
      totalAmount !== undefined ? Number(totalAmount) : computedTotal;

    const payload = {
      ...(vaultOTPToken && { vaultOTPToken }),
      items: forwardItems,
      amount: finalAmount,
      collectoId: String(collectoId),
      clientId: String(clientId),
      ...(staffId && { staffId })
    };

    const response = await axios.post(`${BASE_URL}/createInvoice`, payload, {
      headers: collectoHeaders(userToken),
    });

    return res.json(response.data);
  } catch (err: any) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || err.message;
    console.error("Invoice Error:", data);
    return res
      .status(status)
      .json({ message: "Invoice creation failed", error: data });
  }
});

// Query transactions endpoint
router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { collectoId, clientId, customerId,  limit, offset } = req.query;
    const pageLimit = Math.min(Number(limit) || 50, 100);
    const pageOffset = Number(offset) || 0;

    if (!collectoId && !clientId && !customerId) {
      return res.status(400).json({
        message: "At least one of collectoId, clientId, or customerId is required"
      });
    }

    let transactions: any[] = [];

    if (customerId) {
      transactions = await transactionRepository.findByCustomerId(
        Number(customerId),
        pageLimit,
        pageOffset
      );
    } else if (clientId && collectoId) {
      transactions = await transactionRepository.findByCollectoIdAndClientId(
        String(collectoId),
        String(clientId),
        pageLimit,
        pageOffset
      );
    } else if (collectoId) {
      transactions = await transactionRepository.findByCollectoId(
        String(collectoId),
        pageLimit,
        pageOffset
      );
    }

    return res.json({
      success: true,
      total: transactions.length,
      limit: pageLimit,
      offset: pageOffset,
      transactions: transactions.map(t => ({
        id: t.id,
        customerId: t.customerId,
        transactionId: t.transactionId,
        amount: t.amount,
        points: t.points,
        paymentStatus: t.paymentStatus,
        paymentMethod: t.paymentMethod,
        reference: t.reference,
        createdAt: t.createdAt,
        confirmedAt: t.confirmedAt
      }))
    });
  } catch (err: any) {
    console.error("Transactions Query Error:", err.message);
    return res.status(500).json({
      message: "Failed to fetch transactions",
      error: err.message
    });
  }
});

// Query transactions by customer (POST)
router.post("/transactions", async (req: Request, res: Response) => {
  try {
    const { customerId, limit, offset } = req.body;
    const pageLimit = Math.min(Number(limit) || 50, 100);
    const pageOffset = Number(offset) || 0;

    if (!customerId) {
      return res.status(400).json({
        message: "customerId is required"
      });
    }
     
    console.log("Fetching transactions for customerId:", customerId, "limit:", pageLimit, "offset:", pageOffset);
    let transactions = await transactionRepository.findByCustomerId(
      customerId,
      pageLimit,
      pageOffset
    );

    console.log(`Found ${transactions.length} transactions for customerId:`, customerId);
    return res.json({
      success: true,
      customerId,
      total: transactions.length,
      limit: pageLimit,
      offset: pageOffset,
      transactions: transactions.map(t => ({
        id: t.id,
        transactionId: t.transactionId,
        amount: t.amount,
        points: t.points,
        paymentStatus: t.paymentStatus,
        paymentMethod: t.paymentMethod,
        reference: t.reference,
        createdAt: t.createdAt,
        confirmedAt: t.confirmedAt
      }))
    });

    console
  } catch (err: any) {
    console.error("Transactions Customer Query Error:", err.message);
    return res.status(500).json({
      message: "Failed to fetch customer transactions",
      error: err.message
    });
  }
});

// Query single transaction
router.get("/transactions/:transactionId", async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        message: "transactionId is required"
      });
    }

    const transaction = await transactionRepository.findByTransactionId(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    return res.json({
      success: true,
      transaction: {
        id: transaction.id,
        customerId: transaction.customerId,
        collectoId: transaction.collectoId,
        clientId: transaction.clientId,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        points: transaction.points,
        paymentStatus: transaction.paymentStatus,
        paymentMethod: transaction.paymentMethod,
        reference: transaction.reference,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        confirmedAt: transaction.confirmedAt
      }
    });
  } catch (err: any) {
    console.error("Transaction Query Error:", err.message);
    return res.status(500).json({
      message: "Failed to fetch transaction",
      error: err.message
    });
  }
});

export default router;
