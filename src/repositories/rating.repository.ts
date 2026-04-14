import { pool } from "../db";
import { Rating } from "../models/Rating.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface RatingRow extends RowDataPacket {
  id: number;
  customerId: number;
  transactionId: number;
  orderRating: number;
  paymentRating: number;
  serviceRating: number;
  overallRating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RatingRepository {
  private mapRowToRating(row: RatingRow): Rating {
    return new Rating(
      row.id,
      row.customerId,
      row.transactionId,
      row.orderRating,
      row.paymentRating,
      row.serviceRating,
      row.overallRating,
      row.comment,
      row.createdAt,
      row.updatedAt
    );
  }

  async create(customerId: number, transactionId: number, data: {
    orderRating: number;
    paymentRating: number;
    serviceRating: number;
    overallRating: number;
    comment?: string;
  }): Promise<Rating> {
    const query = `
      INSERT INTO ratings (customerId, transactionId, orderRating, paymentRating, serviceRating, overallRating, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.query<ResultSetHeader>(query, [
        customerId,
        transactionId,
        data.orderRating,
        data.paymentRating,
        data.serviceRating,
        data.overallRating,
        data.comment || null,
      ]);

      const rating = await this.findById(result.insertId);
      if (!rating) throw new Error("Failed to retrieve created rating");
      return rating;
    } catch (error) {
      console.error("Database error in create:", error);
      throw error;
    }
  }

  async findById(id: number): Promise<Rating | null> {
    const query = "SELECT * FROM ratings WHERE id = ?";
    const [rows] = await pool.query<RatingRow[]>(query, [id]);
    return rows.length > 0 ? this.mapRowToRating(rows[0]) : null;
  }

  async findByTransactionId(transactionId: number): Promise<Rating | null> {
    const query = "SELECT * FROM ratings WHERE transactionId = ?";
    const [rows] = await pool.query<RatingRow[]>(query, [transactionId]);
    return rows.length > 0 ? this.mapRowToRating(rows[0]) : null;
  }

  async findByCustomerId(customerId: number, limit = 10, offset = 0): Promise<Rating[]> {
    const query = `
      SELECT * FROM ratings 
      WHERE customerId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<RatingRow[]>(query, [customerId, limit, offset]);
    return rows.map((row) => this.mapRowToRating(row));
  }

  async update(id: number, data: Partial<{
    orderRating: number;
    paymentRating: number;
    serviceRating: number;
    overallRating: number;
    comment: string;
  }>): Promise<void> {
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");

    if (!fields) return;

    const query = `UPDATE ratings SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    const values = Object.values(data);

    try {
      await pool.query(query, [...values, id]);
    } catch (error) {
      console.error("Database error in update:", error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await pool.query("DELETE FROM ratings WHERE id = ?", [id]);
    } catch (error) {
      console.error("Database error in delete:", error);
      throw error;
    }
  }

  async getAverageRatings(customerId: number): Promise<{
    avgOrderRating: number;
    avgPaymentRating: number;
    avgServiceRating: number;
    avgOverallRating: number;
    totalRatings: number;
  }> {
    const query = `
      SELECT 
        AVG(orderRating) as avgOrderRating,
        AVG(paymentRating) as avgPaymentRating,
        AVG(serviceRating) as avgServiceRating,
        AVG(overallRating) as avgOverallRating,
        COUNT(*) as totalRatings
      FROM ratings 
      WHERE customerId = ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [customerId]);
    return rows[0] as any;
  }
}
