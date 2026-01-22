import { pool } from "../db";
import { Transaction } from "../models/Transaction.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TransactionRow extends RowDataPacket {
  id: number;
  customer_id: number;
  collecto_id: string;
  client_id: string;
  transaction_id: string;
  reference: string | null;
  amount: number;
  points: number;
  payment_method: string | null;
  payment_status: string | null;
  created_at: Date;
  updated_at: Date;
  confirmed_at: Date | null;
}

export class TransactionRepository {
  private mapRowToTransaction(row: TransactionRow): Transaction {
    return new Transaction(
      row.id,
      row.customer_id,
      row.collecto_id,
      row.client_id,
      row.transaction_id,
      row.reference,
      row.amount,
      row.points,
      row.payment_method,
      row.payment_status,
      row.created_at,
      row.updated_at,
      row.confirmed_at
    );
  }

  async create(
    customerId: number,
    collectoId: string,
    clientId: string,
    transactionId: string,
    reference: string | null,
    amount: number,
    points: number,
    paymentMethod: string | null,
    paymentStatus: string | null
  ): Promise<Transaction> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_transactions 
       (customer_id, collecto_id, client_id, transaction_id, reference, amount, points, payment_method, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        collectoId,
        clientId,
        transactionId,
        reference,
        amount,
        points,
        paymentMethod,
        paymentStatus
      ]
    );

    const newId = result.insertId;
    const transaction = await this.findById(newId);
    if (!transaction) {
      throw new Error("Failed to create transaction");
    }
    return transaction;
  }

  async findById(id: number): Promise<Transaction | null> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE id = ?",
      [id]
    );
    return rows.length > 0 ? this.mapRowToTransaction(rows[0]) : null;
  }

  async findByTransactionId(transactionId: string): Promise<Transaction | null> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE transaction_id = ?",
      [transactionId]
    );
    return rows.length > 0 ? this.mapRowToTransaction(rows[0]) : null;
  }

  async findByCustomerId(customerId: number | string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    let query: string;
    const params: any[] = [];
    
    if (typeof customerId === 'number') {
      query = "SELECT * FROM vault_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(customerId);
    } else {
      // If string, treat as collecto_id
      query = "SELECT * FROM vault_transactions WHERE client_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
      params.push(customerId);
    }
    
    params.push(limit, offset);
    const [rows] = await pool.query<TransactionRow[]>(query, params);
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByCollectoIdAndClientId(
    collectoId: string,
    clientId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE collecto_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [collectoId, clientId, limit, offset]
    );
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByCollectoId(
    collectoId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE collecto_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [collectoId, limit, offset]
    );
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async updatePaymentStatus(id: number, paymentStatus: string): Promise<Transaction> {
    let query = "UPDATE vault_transactions SET payment_status = ?, updated_at = NOW()";
    const params: any[] = [paymentStatus];

    query += " WHERE id = ?";
    params.push(id);

    await pool.query<ResultSetHeader>(query, params);

    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error("Failed to update transaction");
    }
    return transaction;
  }

  async updatePaymentStatusByTransactionId(
    transactionId: string,
    paymentStatus: string
  ): Promise<Transaction | null> {
    const transaction = await this.findByTransactionId(transactionId);
    if (!transaction) {
      return null;
    }

    return this.updatePaymentStatus(transaction.id, paymentStatus);
  }

  async countByCustomerId(customerId: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM vault_transactions WHERE customer_id = ?",
      [customerId]
    );
    return rows[0].count as number;
  }

  async countByCollectoId(collectoId: string): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM vault_transactions WHERE collecto_id = ?",
      [collectoId]
    );
    return rows[0].count as number;
  }


}
