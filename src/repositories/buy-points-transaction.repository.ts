import { pool } from "../db";
import { BuyPointsTransaction } from "../models/BuyPointsTransaction.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface BuyPointsTransactionRow extends RowDataPacket {
  id: number;
  customer_id: number;
  collecto_id: string;
  client_id: string;
  transaction_id: string;
  reference_id: string;
  points: number;
  amount: number;
  payment_method: string;
  status: "pending" | "confirmed" | "failed";
  staff_id?: string;
  staff_name?: string;
  created_at: Date;
  updated_at: Date;
}

export class BuyPointsTransactionRepository {
  private mapRowToTransaction(row: BuyPointsTransactionRow): BuyPointsTransaction {
    return new BuyPointsTransaction(
      row.id,
      row.customer_id,
      row.collecto_id,
      row.client_id,
      row.transaction_id,
      row.reference_id,
      row.points,
      row.amount,
      row.payment_method,
      row.status,
      row.staff_id,
      row.staff_name,
      row.created_at,
      row.updated_at
    );
  }

  async create(
    customerId: number,
    collectoId: string,
    clientId: string,
    transactionId: string,
    referenceId: string,
    points: number,
    amount: number,
    paymentMethod: string,
    staffId?: string,
    staffName?: string
  ): Promise<BuyPointsTransaction> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO buy_points_transactions 
       (customer_id, collecto_id, client_id, transaction_id, reference_id, points, amount, payment_method, status, staff_id, staff_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerId, collectoId, clientId, transactionId, referenceId, points, amount, paymentMethod, "pending", staffId || null, staffName || null]
    );

    const transactionId_new = result.insertId;
    const transaction = await this.findById(transactionId_new);

    if (!transaction) {
      throw new Error("Failed to create buy points transaction");
    }

    return transaction;
  }

  async findById(id: number): Promise<BuyPointsTransaction | null> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE id = ?",
      [id]
    );

    return rows.length > 0 ? this.mapRowToTransaction(rows[0]) : null;
  }

  async findByTransactionId(transactionId: string): Promise<BuyPointsTransaction | null> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE transaction_id = ?",
      [transactionId]
    );

    return rows.length > 0 ? this.mapRowToTransaction(rows[0]) : null;
  }

  async findByReferenceId(referenceId: string): Promise<BuyPointsTransaction | null> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE reference_id = ?",
      [referenceId]
    );

    return rows.length > 0 ? this.mapRowToTransaction(rows[0]) : null;
  }

  async findByCustomerId(customerId: number): Promise<BuyPointsTransaction[]> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE customer_id = ? ORDER BY created_at DESC",
      [customerId]
    );

    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByCustomerIdAndStatus(
    customerId: number,
    status: "pending" | "confirmed" | "failed"
  ): Promise<BuyPointsTransaction[]> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE customer_id = ? AND status = ? ORDER BY created_at DESC",
      [customerId, status]
    );

    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByCollectoId(collectoId: string): Promise<BuyPointsTransaction[]> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE collecto_id = ? ORDER BY created_at DESC",
      [collectoId]
    );

    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findByClientId(clientId: string): Promise<BuyPointsTransaction[]> {
    const [rows] = await pool.query<BuyPointsTransactionRow[]>(
      "SELECT * FROM buy_points_transactions WHERE client_id = ? ORDER BY created_at DESC",
      [clientId]
    );

    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async findAll(
    collectoId?: string,
    status?: "pending" | "confirmed" | "failed"
  ): Promise<BuyPointsTransaction[]> {
    let query = "SELECT * FROM buy_points_transactions WHERE 1=1";
    const params: any[] = [];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query<BuyPointsTransactionRow[]>(query, params);
    return rows.map((row) => this.mapRowToTransaction(row));
  }

  async updateStatus(
    id: number,
    status: "pending" | "confirmed" | "failed"
  ): Promise<BuyPointsTransaction | null> {
    await pool.query(
      "UPDATE buy_points_transactions SET status = ?, updated_at = NOW() WHERE id = ?",
      [status, id]
    );

    return this.findById(id);
  }

  async updateByTransactionId(
    transactionId: string,
    status: "pending" | "confirmed" | "failed",
    staffId?: string,
    staffName?: string
  ): Promise<BuyPointsTransaction | null> {
    const updateQuery = staffId && staffName
      ? "UPDATE buy_points_transactions SET status = ?, staff_id = ?, staff_name = ?, updated_at = NOW() WHERE transaction_id = ?"
      : "UPDATE buy_points_transactions SET status = ?, updated_at = NOW() WHERE transaction_id = ?";

    const params = staffId && staffName
      ? [status, staffId, staffName, transactionId]
      : [status, transactionId];

    await pool.query(updateQuery, params);

    return this.findByTransactionId(transactionId);
  }
}
