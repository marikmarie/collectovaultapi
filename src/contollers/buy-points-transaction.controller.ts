import { Request, Response } from "express";
import { BuyPointsTransactionService } from "../services/buy-points-transaction.service";

export class BuyPointsTransactionController {
  constructor(private readonly transactionService: BuyPointsTransactionService) {}

  /**
   * Query all transactions for a customer
   */
  async getCustomerTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        res.status(400).json({ message: "customerId is required" });
        return;
      }

      const transactions = await this.transactionService.getCustomerTransactions(
        parseInt(customerId)
      );

      res.json({
        status: "success",
        data: transactions,
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch customer transactions",
        error: error.message,
      });
    }
  }

  /**
   * Query transactions by status for a customer
   */
  async getCustomerTransactionsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { status } = req.query;

      if (!customerId) {
        res.status(400).json({ message: "customerId is required" });
        return;
      }

      if (!status || !["pending", "confirmed", "failed"].includes(status as string)) {
        res.status(400).json({
          message: "status is required and must be one of: pending, confirmed, failed",
        });
        return;
      }

      const transactions = await this.transactionService.getCustomerTransactionsByStatus(
        parseInt(customerId),
        status as "pending" | "confirmed" | "failed"
      );

      res.json({
        status: "success",
        data: transactions,
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch customer transactions",
        error: error.message,
      });
    }
  }

  /**
   * Query all transactions by collectoId
   */
  async getCollectoTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { collectoId } = req.params;

      if (!collectoId) {
        res.status(400).json({ message: "collectoId is required" });
        return;
      }

      const transactions = await this.transactionService.getCollectoTransactions(collectoId);

      res.json({
        status: "success",
        data: transactions,
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch collecto transactions",
        error: error.message,
      });
    }
  }

  /**
   * Query all transactions by clientId
   */
  async getClientTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;

      if (!clientId) {
        res.status(400).json({ message: "clientId is required" });
        return;
      }

      const transactions = await this.transactionService.getClientTransactions(clientId);

      res.json({
        status: "success",
        data: transactions,
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch client transactions",
        error: error.message,
      });
    }
  }

  /**
   * Get all transactions with optional filters
   */
  async getAllTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { collectoId, status } = req.query;

      const transactions = await this.transactionService.getAllTransactions(
        collectoId as string | undefined,
        status as "pending" | "confirmed" | "failed" | undefined
      );

      res.json({
        status: "success",
        data: transactions,
        count: transactions.length,
      });
    } catch (error: any) {
      res.status(500).json({
        message: "Failed to fetch transactions",
        error: error.message,
      });
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({ message: "transactionId is required" });
        return;
      }

      const transaction = await this.transactionService.getTransactionById(parseInt(transactionId));

      res.json({
        status: "success",
        data: transaction,
      });
    } catch (error: any) {
      res.status(404).json({
        message: "Transaction not found",
        error: error.message,
      });
    }
  }

  /**
   * Confirm a transaction and update customer points
   */
  async confirmTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { staffId, staffName } = req.body;

      if (!transactionId) {
        res.status(400).json({ message: "transactionId is required" });
        return;
      }

      const result = await this.transactionService.confirmTransaction(
        transactionId,
        staffId,
        staffName
      );

      res.json({
        status: "success",
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        message: "Failed to confirm transaction",
        error: error.message,
      });
    }
  }

  /**
   * Fail a transaction
   */
  async failTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({ message: "transactionId is required" });
        return;
      }

      const transaction = await this.transactionService.failTransaction(transactionId);

      res.json({
        status: "success",
        data: transaction,
        message: "Transaction marked as failed",
      });
    } catch (error: any) {
      res.status(400).json({
        message: "Failed to fail transaction",
        error: error.message,
      });
    }
  }
}
