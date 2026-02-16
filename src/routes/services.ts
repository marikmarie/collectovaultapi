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
  transactionRepository,
);


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
    // const token = req.headers.authorization;
    const token = req.headers.authorization as string | undefined;
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

    // Process invoice points with earning rule fetched from database
    try {
      const activeRules = await earningRuleRepository.findActive(collectoId);
      if (activeRules && activeRules.length > 0) {
        // Use the first active rule for this collectoId
        await processInvoicesForPoints(response.data, collectoId, clientId, activeRules[0]);
      } else {
        console.log(`No active earning rule found for collectoId ${collectoId}. Skipping point calculation.`);
      }
    } catch (pointsErr: any) {
      console.error("Error processing invoice points:", pointsErr.message);
    }

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

// Helper function to process invoices and calculate points
async function processInvoicesForPoints(
  response: any,
  collectoId: string,
  clientId: string,
  purchaseRule: any 
) {
  console.log(`Processing invoices for points with rule "${purchaseRule.ruleTitle}" (ID: ${purchaseRule.id}) for client ${clientId}`);
  if (!response?.data?.data || !Array.isArray(response.data.data)) {
    console.log("No invoice data to process");
    return;
  }

  if (!purchaseRule || !purchaseRule.id) {
    console.log("No earning rule provided for client", clientId);
    return;
  }

  const invoiceList = response.data.data;
  console.log(`Using earning rule "${purchaseRule.ruleTitle}" (ID: ${purchaseRule.id}): ${purchaseRule.points} points per invoice for client ${clientId}`);

  for (const invoice of invoiceList) {
    try {
      const invoiceId = invoice.details?.id;
      const totalAmountPaid = invoice.total_amount_paid || 0;

      // Skip invoices that haven't been paid
      if (!invoiceId || totalAmountPaid <= 0) {
        console.log(`Skipping invoice ${invoiceId}: Not fully paid (${totalAmountPaid})`);
        continue;
      }

      // Check if this invoice has already been processed
      const existingTransaction = await transactionRepository.findByTransactionId(invoiceId);
      if (existingTransaction) {
        console.log(`Invoice ${invoiceId} already processed, skipping`);
        continue;
      }

      // Get or create customer
      const customer = await customerService.getOrCreateCustomer(
        collectoId,
        clientId,
        clientId
      );

     const pointsEarned = purchaseRule.points;

      // Create transaction record for this invoice
      await transactionRepository.create(
        customer.id,
        collectoId,
        clientId,
        invoiceId,
        "INVOICE_PURCHASE",
        totalAmountPaid,
        pointsEarned,
        null,
        "CONFIRMED"
      );

      // Update customer's earned points and current points
      customer.addEarnedPoints(pointsEarned);
      await customerRepository.update(customer.id, {
        earnedPoints: customer.earnedPoints,
        currentPoints: customer.currentPoints,
      });

      // Determine and update tier based on current points
      const tier = await tierRepository.findTierForPoints(customer.currentPoints);
      if (tier && customer.currentTierId !== tier.id) {
        customer.currentTierId = tier.id;
        await customerRepository.update(customer.id, {
          currentTierId: tier.id,
        });
      }

      console.log(
        `Invoice ${invoiceId} processed: Customer ${customer.id} earned ${pointsEarned} points using rule "${purchaseRule.ruleTitle}" (ID: ${purchaseRule.id})`
      );
    } catch (invoiceErr: any) {
      console.error(
        `Error processing invoice ${invoice.details?.id}:`,
        invoiceErr.message
      );
      // Continue to next invoice if one fails
      continue;
    }
  }
}

router.post("/requestToPay", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
   

    const payload = { ...req.body }; 

    const {
      paymentOption,
      collectoId,
      clientId,
      phone,
      reference,
      amount,
      staffId,
      points,
    } = payload;

    if (!paymentOption)
      return res.status(400).send("Missing payment method");

    if (!collectoId || !clientId)
      return res.status(400).send("Missing collectoId or clientId");

    // Normalize phone to 256 format (only if provided)
    if (phone) {
      payload.phone = phone.replace(/^0/, "256");
    }

    try {
      
      const response = await axios.post(
        `${BASE_URL}/requestToPay`,
        payload,
        { headers: collectoHeaders(userToken) }
      );

      const collectoData = response.data;
      const innerData = collectoData?.data || {};

      const transactionId =
        innerData.transactionId || innerData.id || `TXN-${Date.now()}`;

      pendingPayments.set(transactionId, {
        status: "pending",
        payment: {
          transactionId,
          amount,
          collectoId,
          clientId,
          points,
        },
        createdAt: new Date(),
      });

      if (reference?.includes("BUYPOINTS")) {
        try {
          const customer = await customerService.getOrCreateCustomer(
            collectoId,
            clientId,
            clientId
          );

          let pointsToAdd =
            points?.points_used ??
            Math.floor(amount || 0);

          const vaultPackage =
            await vaultPackageRepository.findByPrice(amount, collectoId);

          if (vaultPackage) {
            pointsToAdd = vaultPackage.pointsAmount;
          }

          await transactionRepository.create(
            customer.id,
            collectoId,
            clientId,
            transactionId,
            reference,
            amount || 0,
            pointsToAdd,
            paymentOption,
            "PENDING"
          );

          console.log(
            `BUYPOINTS logged: ${transactionId}, Points: ${pointsToAdd}`
          );
        } catch (txnErr: any) {
          console.error("Error logging BUYPOINTS transaction:", txnErr.message);
        }
      }

      return res.json({
        status: collectoData.status || "200",
        status_message: collectoData.status_message || "success",
        data: {
          requestToPay: true,
          message:
            innerData.message ||
            "Confirm payment via the prompt on your phone.",
          transactionId,
        },
      });
    } catch (err: any) {
      console.error("Collecto Request failed:", err.message);
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
    const { vaultOTPToken, collectoId, clientId, transactionId } = req.body;
    console.log("RequestToPayStatus for transactionId:", transactionId);

    if (!transactionId)
      return res.status(400).send("Missing transactionId in body");

    // Check if this is a BUYPOINTS transaction by searching in the transactions table
    let isBuyPoints = false;
    let dbTransaction: any = null;
    try {
      dbTransaction = await transactionRepository.findByTransactionId(transactionId);
      isBuyPoints = !!dbTransaction;
    } catch (err: any) {
      console.log("Transaction not found in DB, proceeding as regular payment");
    }

    try {
      // Prepare payload without reference
      const payload: any = {
        vaultOTPToken,
        collectoId,
        clientId,
        transactionId,
      };

      const response = await axios.post(
        `${BASE_URL}/requestToPayStatus`,
        payload,
        {
          headers: collectoHeaders(userToken),
        },
      );

      console.log("Collecto payment status response:", response.data);
      const data = response.data;
      let payment: any = data.data;

      // Extract status from payment
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
      if (isBuyPoints && dbTransaction) {
        try {
          // Update transaction payment status
          await transactionRepository.updatePaymentStatus(
            dbTransaction.id,
            statusFromCollecto
          );

          // If payment is confirmed, update customer points
          if (isConfirmed) {
            const customer = await customerService.getOrCreateCustomer(
              collectoId,
              clientId,
              clientId
            );

            // Add bought points
            customer.addBoughtPoints(dbTransaction.points);
            await customerRepository.update(customer.id, {
              boughtPoints: customer.boughtPoints,
              currentPoints: customer.currentPoints
            });

            // Determine and update tier based on current points
            const tier = await tierRepository.findTierForPoints(customer.currentPoints);
            if (tier && customer.currentTierId !== tier.id) {
              customer.currentTierId = tier.id;
              await customerRepository.update(customer.id, {
                currentTierId: tier.id
              });
            }

            console.log(`Buy Points Transaction Confirmed: Customer ${customer.id} received ${dbTransaction.points} points`);
          }

          return res.json({
            transactionId,
            status: isConfirmed ? "confirmed" : "pending",
            payment,
            transaction: {
              id: dbTransaction.id,
              points: dbTransaction.points,
              paymentStatus: statusFromCollecto
            }
          });
        } catch (txnErr: any) {
          console.error("Error processing BUYPOINTS transaction:", txnErr.message);
          return res.status(500).json({
            transactionId,
            message: "Error updating transaction",
            error: txnErr.message
          });
        }
      }

      // Regular transactions (non-BUYPOINTS)
      return res.json({
        transactionId,
        status: isConfirmed ? "confirmed" : "pending",
        payment
      });

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

router.post("/verifyPhoneNumber", async (req: Request, res: Response) => {
  try {
    const userToken = req.headers.authorization;
    const { vaultOTPToken, collectoId, clientId, phoneNumber } = req.body;
    console.log("Phone verification request for number:", req.body);

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
