import { pool } from "../db";
import { Feedback } from "../models/Feedback.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface FeedbackRow extends RowDataPacket {
  id: number;
  customerId: number;
  feedbackType: string;
  title: string;
  message: string;
  attachments: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FeedbackRepository {
  private mapRowToFeedback(row: FeedbackRow): Feedback {
    return new Feedback(
      row.id,
      row.customerId,
      row.feedbackType as any,
      row.title,
      row.message,
      row.attachments ? JSON.parse(row.attachments) : null,
      row.status as any,
      row.priority as any,
      row.createdAt,
      row.updatedAt
    );
  }

  async create(customerId: number, data: {
    feedbackType: 'order' | 'service' | 'app' | 'general';
    title: string;
    message: string;
    attachments?: string[];
  }): Promise<Feedback> {
    const query = `
      INSERT INTO feedback (customerId, feedbackType, title, message, attachments, status, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.query<ResultSetHeader>(query, [
        customerId,
        data.feedbackType,
        data.title,
        data.message,
        data.attachments ? JSON.stringify(data.attachments) : null,
        'open',
        'medium',
      ]);

      const feedback = await this.findById(result.insertId);
      if (!feedback) throw new Error("Failed to retrieve created feedback");
      return feedback;
    } catch (error) {
      console.error("Database error in create:", error);
      throw error;
    }
  }

  async findById(id: number): Promise<Feedback | null> {
    const query = "SELECT * FROM feedback WHERE id = ?";
    const [rows] = await pool.query<FeedbackRow[]>(query, [id]);
    return rows.length > 0 ? this.mapRowToFeedback(rows[0]) : null;
  }

  async findByCustomerId(customerId: number, limit = 20, offset = 0): Promise<Feedback[]> {
    const query = `
      SELECT * FROM feedback 
      WHERE customerId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<FeedbackRow[]>(query, [customerId, limit, offset]);
    return rows.map((row) => this.mapRowToFeedback(row));
  }

  async findByStatus(status: string, limit = 20, offset = 0): Promise<Feedback[]> {
    const query = `
      SELECT * FROM feedback 
      WHERE status = ? 
      ORDER BY priority DESC, createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<FeedbackRow[]>(query, [status, limit, offset]);
    return rows.map((row) => this.mapRowToFeedback(row));
  }

  async update(id: number, data: Partial<{
    title: string;
    message: string;
    status: string;
    priority: string;
    attachments: string[];
  }>): Promise<void> {
    const fields = Object.keys(data)
      .map((key) => {
        if (key === 'attachments') return 'attachments = ?';
        return `${key} = ?`;
      })
      .join(", ");

    if (!fields) return;

    const query = `UPDATE feedback SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    const values = Object.entries(data).map((entry) => {
      if (entry[0] === 'attachments') return JSON.stringify(entry[1]);
      return entry[1];
    });

    try {
      await pool.query(query, [...values, id]);
    } catch (error) {
      console.error("Database error in update:", error);
      throw error;
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await pool.query("DELETE FROM feedback WHERE id = ?", [id]);
    } catch (error) {
      console.error("Database error in delete:", error);
      throw error;
    }
  }

  async countByStatus(status: string): Promise<number> {
    const query = "SELECT COUNT(*) as count FROM feedback WHERE status = ?";
    const [rows] = await pool.query<RowDataPacket[]>(query, [status]);
    return (rows[0] as any).count;
  }
}
