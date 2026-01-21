import { pool } from "../db";
import { Transaction, TransactionType, TransactionStatus } from "../models/Transaction.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TransactionRow extends RowDataPacket {
  id: number;
  customer_id: number;
  collecto_id: string;
  client_id: string;
  transaction_id: string;
  reference: string | null;
  type: TransactionType;
  amount: number;
  points: number;
  payment_method: string | null;
  status: TransactionStatus;
  payment_status: string | null;
  staff_id: number | null;
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
      row.type,
      row.amount,
      row.points,
      row.payment_method,
      row.status,
      row.payment_status,
      row.staff_id,
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
    type: TransactionType,
    amount: number,
    points: number,
    paymentMethod: string | null,
    paymentStatus: string | null,
    staffId: number | null = null
  ): Promise<Transaction> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_transactions 
       (customer_id, collecto_id, client_id, transaction_id, reference, type, amount, points, payment_method, status, payment_status, staff_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customerId,
        collectoId,
        clientId,
        transactionId,
        reference,
        type,
        amount,
        points,
        paymentMethod,
        'PENDING',
        paymentStatus,
        staffId
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

  async findByCustomerId(customerId: number, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [customerId, limit, offset]
    );
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

  async findByStatus(
    status: TransactionStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    const [rows] = await pool.query<TransactionRow[]>(
      "SELECT * FROM vault_transactions WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [status, limit, offset]
    );
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByType(
    type: TransactionType,
    customerId?: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Transaction[]> {
    let query = "SELECT * FROM vault_transactions WHERE type = ?";
    const params: any[] = [type];

    if (customerId) {
      query += " AND customer_id = ?";
      params.push(customerId);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query<TransactionRow[]>(query, params);
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async updateStatus(id: number, status: TransactionStatus, paymentStatus?: string): Promise<Transaction> {
    const confirmedAt = status === 'CONFIRMED' ? new Date() : null;

    let query = "UPDATE vault_transactions SET status = ?, updated_at = NOW()";
    const params: any[] = [status];

    if (paymentStatus) {
      query += ", payment_status = ?";
      params.push(paymentStatus);
    }

    if (confirmedAt) {
      query += ", confirmed_at = ?";
      params.push(confirmedAt);
    }

    query += " WHERE id = ?";
    params.push(id);

    await pool.query<ResultSetHeader>(query, params);

    const transaction = await this.findById(id);
    if (!transaction) {
      throw new Error("Failed to update transaction");
    }
    return transaction;
  }

  async updateStatusByTransactionId(
    transactionId: string,
    status: TransactionStatus,
    paymentStatus?: string
  ): Promise<Transaction | null> {
    const transaction = await this.findByTransactionId(transactionId);
    if (!transaction) {
      return null;
    }

    return this.updateStatus(transaction.id, status, paymentStatus);
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

  async countByStatus(status: TransactionStatus): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) as count FROM vault_transactions WHERE status = ?",
      [status]
    );
    return rows[0].count as number;
  }
}
