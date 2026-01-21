import { Router, Request, Response } from "express";
import { BuyPointsTransactionController } from "../contollers/buy-points-transaction.controller";
import { BuyPointsTransactionService } from "../services/buy-points-transaction.service";
import { BuyPointsTransactionRepository } from "../repositories/buy-points-transaction.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

const router = Router();

// Initialize dependencies
const customerRepository = new CustomerRepository();
const tierRepository = new TierRepository();
const earningRuleRepository = new EarningRuleRepository();
const buyPointsTransactionRepository = new BuyPointsTransactionRepository();
const buyPointsTransactionService = new BuyPointsTransactionService(
  buyPointsTransactionRepository,
  customerRepository,
  tierRepository,
  earningRuleRepository
);
const buyPointsTransactionController = new BuyPointsTransactionController(
  buyPointsTransactionService
);

/**
 * GET /buy-points-transactions
 * Query all transactions with optional filters (collectoId, status)
 */
router.get("/", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getAllTransactions(req, res);
});

/**
 * GET /buy-points-transactions/:collectoId
 * Query all transactions for a specific collectoId
 */
router.get("/collecto/:collectoId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getCollectoTransactions(req, res);
});

/**
 * GET /buy-points-transactions/client/:clientId
 * Query all transactions for a specific clientId
 */
router.get("/client/:clientId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getClientTransactions(req, res);
});

/**
 * GET /buy-points-transactions/customer/:customerId
 * Query all transactions for a specific customerId
 */
router.get("/customer/:customerId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getCustomerTransactions(req, res);
});

/**
 * GET /buy-points-transactions/customer/:customerId/status
 * Query transactions by status for a specific customerId
 */
router.get("/customer/:customerId/status", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getCustomerTransactionsByStatus(req, res);
});

/**
 * GET /buy-points-transactions/transaction/:transactionId
 * Get a specific transaction by its ID
 */
router.get("/transaction/:transactionId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.getTransactionById(req, res);
});

/**
 * POST /buy-points-transactions/confirm/:transactionId
 * Confirm a transaction and update customer points and tier
 * Body: { staffId?: string, staffName?: string }
 */
router.post("/confirm/:transactionId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.confirmTransaction(req, res);
});

/**
 * POST /buy-points-transactions/fail/:transactionId
 * Mark a transaction as failed
 */
router.post("/fail/:transactionId", async (req: Request, res: Response) => {
  await buyPointsTransactionController.failTransaction(req, res);
});

export default router;
