import { pool } from "../db";
import { ChatMessage } from "../models/ChatMessage.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface ChatMessageRow extends RowDataPacket {
  id: number;
  customerId: number;
  senderType: string;
  message: string;
  attachments: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export class ChatMessageRepository {
  private mapRowToChatMessage(row: ChatMessageRow): ChatMessage {
    return new ChatMessage(
      row.id,
      row.customerId,
      row.senderType as any,
      row.message,
      row.attachments ? JSON.parse(row.attachments) : null,
      row.isRead,
      row.readAt,
      row.createdAt
    );
  }

  async create(customerId: number, senderType: 'customer' | 'support', data: {
    message: string;
    attachments?: string[];
  }): Promise<ChatMessage> {
    const query = `
      INSERT INTO chat_messages (customerId, senderType, message, attachments)
      VALUES (?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.query<ResultSetHeader>(query, [
        customerId,
        senderType,
        data.message,
        data.attachments ? JSON.stringify(data.attachments) : null,
      ]);

      const message = await this.findById(result.insertId);
      if (!message) throw new Error("Failed to retrieve created message");
      return message;
    } catch (error) {
      console.error("Database error in create:", error);
      throw error;
    }
  }

  async findById(id: number): Promise<ChatMessage | null> {
    const query = "SELECT * FROM chat_messages WHERE id = ?";
    const [rows] = await pool.query<ChatMessageRow[]>(query, [id]);
    return rows.length > 0 ? this.mapRowToChatMessage(rows[0]) : null;
  }

  async findByCustomerId(customerId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const query = `
      SELECT * FROM chat_messages 
      WHERE customerId = ? 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query<ChatMessageRow[]>(query, [customerId, limit, offset]);
    return rows.map((row) => this.mapRowToChatMessage(row)).reverse();
  }

  async markAsRead(id: number): Promise<void> {
    const query = "UPDATE chat_messages SET isRead = TRUE, readAt = CURRENT_TIMESTAMP WHERE id = ?";
    try {
      await pool.query(query, [id]);
    } catch (error) {
      console.error("Database error in markAsRead:", error);
      throw error;
    }
  }

  async markAllAsRead(customerId: number): Promise<void> {
    const query = "UPDATE chat_messages SET isRead = TRUE, readAt = CURRENT_TIMESTAMP WHERE customerId = ? AND isRead = FALSE";
    try {
      await pool.query(query, [customerId]);
    } catch (error) {
      console.error("Database error in markAllAsRead:", error);
      throw error;
    }
  }

  async countUnread(customerId: number): Promise<number> {
    const query = "SELECT COUNT(*) as count FROM chat_messages WHERE customerId = ? AND isRead = FALSE";
    const [rows] = await pool.query<RowDataPacket[]>(query, [customerId]);
    return (rows[0] as any).count;
  }

  async delete(id: number): Promise<void> {
    try {
      await pool.query("DELETE FROM chat_messages WHERE id = ?", [id]);
    } catch (error) {
      console.error("Database error in delete:", error);
      throw error;
    }
  }
}
