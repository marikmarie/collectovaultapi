import { BuyPointsTransactionRepository } from "../repositories/buy-points-transaction.repository";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { BuyPointsTransaction } from "../models/BuyPointsTransaction.model";

export interface CreateBuyPointsTransactionDTO {
  customerId: number;
  collectoId: string;
  clientId: string;
  transactionId: string;
  referenceId: string;
  points: number;
  amount: number;
  paymentMethod: string;
  staffId?: string;
  staffName?: string;
}

export class BuyPointsTransactionService {
  constructor(
    private readonly transactionRepository: BuyPointsTransactionRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly tierRepository: TierRepository,
    private readonly earningRuleRepository: EarningRuleRepository
  ) {}

  async createTransaction(
    dto: CreateBuyPointsTransactionDTO
  ): Promise<BuyPointsTransaction> {
    const transaction = await this.transactionRepository.create(
      dto.customerId,
      dto.collectoId,
      dto.clientId,
      dto.transactionId,
      dto.referenceId,
      dto.points,
      dto.amount,
      dto.paymentMethod,
      dto.staffId,
      dto.staffName
    );

    return transaction;
  }

  async getTransactionById(id: number): Promise<BuyPointsTransaction> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw new Error(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  async getTransactionByTransactionId(transactionId: string): Promise<BuyPointsTransaction> {
    const transaction = await this.transactionRepository.findByTransactionId(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with transactionId ${transactionId} not found`);
    }
    return transaction;
  }

  async getCustomerTransactions(customerId: number): Promise<BuyPointsTransaction[]> {
    return this.transactionRepository.findByCustomerId(customerId);
  }

  async getCustomerTransactionsByStatus(
    customerId: number,
    status: "pending" | "confirmed" | "failed"
  ): Promise<BuyPointsTransaction[]> {
    return this.transactionRepository.findByCustomerIdAndStatus(customerId, status);
  }

  async getCollectoTransactions(collectoId: string): Promise<BuyPointsTransaction[]> {
    return this.transactionRepository.findByCollectoId(collectoId);
  }

  async getClientTransactions(clientId: string): Promise<BuyPointsTransaction[]> {
    return this.transactionRepository.findByClientId(clientId);
  }

  async getAllTransactions(
    collectoId?: string,
    status?: "pending" | "confirmed" | "failed"
  ): Promise<BuyPointsTransaction[]> {
    return this.transactionRepository.findAll(collectoId, status);
  }

  /**
   * Confirm a buy points transaction
   * - Updates transaction status to "confirmed"
   * - Updates customer's bought_points and current_points
   * - Recalculates customer tier based on current points
   */
  async confirmTransaction(
    transactionId: string,
    staffId?: string,
    staffName?: string
  ): Promise<{ transaction: BuyPointsTransaction; message: string }> {
    const transaction = await this.transactionRepository.findByTransactionId(transactionId);

    if (!transaction) {
      throw new Error(`Transaction with transactionId ${transactionId} not found`);
    }

    if (transaction.status === "confirmed") {
      throw new Error("Transaction is already confirmed");
    }

    // Update transaction status
    const updatedTransaction = await this.transactionRepository.updateByTransactionId(
      transactionId,
      "confirmed",
      staffId,
      staffName
    );

    if (!updatedTransaction) {
      throw new Error("Failed to update transaction status");
    }

    // Add bought points to customer
    const customer = await this.customerRepository.addBoughtPoints(
      transaction.customerId,
      transaction.points
    );

    if (!customer) {
      throw new Error("Failed to update customer points");
    }

    // Recalculate and update tier based on current points
    const tier = await this.tierRepository.findTierByPoints(customer.currentPoints);
    if (tier) {
      await this.customerRepository.updateTier(transaction.customerId, tier.id);
    }

    return {
      transaction: updatedTransaction,
      message: `Buy points transaction confirmed. Customer received ${transaction.points} points. Tier updated.`
    };
  }

  /**
   * Fail a transaction
   */
  async failTransaction(transactionId: string): Promise<BuyPointsTransaction> {
    const transaction = await this.transactionRepository.findByTransactionId(transactionId);

    if (!transaction) {
      throw new Error(`Transaction with transactionId ${transactionId} not found`);
    }

    const updatedTransaction = await this.transactionRepository.updateByTransactionId(
      transactionId,
      "failed"
    );

    if (!updatedTransaction) {
      throw new Error("Failed to update transaction status");
    }

    return updatedTransaction;
  }
}
