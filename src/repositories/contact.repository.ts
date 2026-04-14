import { pool } from "../db";
import { WhatsAppContact, BusinessContact } from "../models/Contact.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface WhatsAppContactRow extends RowDataPacket {
  id: number;
  customerId: number;
  whatsappNumber: string;
  isPreferred: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BusinessContactRow extends RowDataPacket {
  id: number;
  contactType: string;
  value: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContactRepository {
  private mapRowToWhatsAppContact(row: WhatsAppContactRow): WhatsAppContact {
    return new WhatsAppContact(
      row.id,
      row.customerId,
      row.whatsappNumber,
      row.isPreferred,
      row.verifiedAt,
      row.createdAt,
      row.updatedAt
    );
  }

  private mapRowToBusinessContact(row: BusinessContactRow): BusinessContact {
    return new BusinessContact(
      row.id,
      row.contactType as any,
      row.value,
      row.isActive,
      row.createdAt,
      row.updatedAt
    );
  }

  // WhatsApp Contact Methods
  async createWhatsAppContact(customerId: number, whatsappNumber: string): Promise<WhatsAppContact> {
    const query = `
      INSERT INTO whatsapp_contacts (customerId, whatsappNumber, isPreferred)
      VALUES (?, ?, TRUE)
      ON DUPLICATE KEY UPDATE 
        whatsappNumber = VALUES(whatsappNumber),
        updatedAt = CURRENT_TIMESTAMP
    `;

    try {
      const [result] = await pool.query<ResultSetHeader>(query, [customerId, whatsappNumber]);
      const contact = await this.getWhatsAppContact(customerId);
      if (!contact) throw new Error("Failed to retrieve created WhatsApp contact");
      return contact;
    } catch (error) {
      console.error("Database error in createWhatsAppContact:", error);
      throw error;
    }
  }

  async getWhatsAppContact(customerId: number): Promise<WhatsAppContact | null> {
    const query = "SELECT * FROM whatsapp_contacts WHERE customerId = ? AND isPreferred = TRUE";
    const [rows] = await pool.query<WhatsAppContactRow[]>(query, [customerId]);
    return rows.length > 0 ? this.mapRowToWhatsAppContact(rows[0]) : null;
  }

  async verifyWhatsAppContact(whatsappContactId: number): Promise<void> {
    const query = "UPDATE whatsapp_contacts SET verifiedAt = CURRENT_TIMESTAMP WHERE id = ?";
    try {
      await pool.query(query, [whatsappContactId]);
    } catch (error) {
      console.error("Database error in verifyWhatsAppContact:", error);
      throw error;
    }
  }

  async deleteWhatsAppContact(customerId: number): Promise<void> {
    try {
      await pool.query("DELETE FROM whatsapp_contacts WHERE customerId = ?", [customerId]);
    } catch (error) {
      console.error("Database error in deleteWhatsAppContact:", error);
      throw error;
    }
  }

  // Business Contact Methods
  async getBusinessContact(contactType: 'whatsapp' | 'email' | 'phone'): Promise<BusinessContact | null> {
    const query = "SELECT * FROM business_contacts WHERE contactType = ? AND isActive = TRUE";
    const [rows] = await pool.query<BusinessContactRow[]>(query, [contactType]);
    return rows.length > 0 ? this.mapRowToBusinessContact(rows[0]) : null;
  }

  async setBusinessContact(contactType: 'whatsapp' | 'email' | 'phone', value: string): Promise<BusinessContact> {
    const query = `
      INSERT INTO business_contacts (contactType, value, isActive)
      VALUES (?, ?, TRUE)
      ON DUPLICATE KEY UPDATE 
        value = VALUES(value),
        isActive = TRUE,
        updatedAt = CURRENT_TIMESTAMP
    `;

    try {
      await pool.query(query, [contactType, value]);
      const contact = await this.getBusinessContact(contactType);
      if (!contact) throw new Error("Failed to retrieve business contact");
      return contact;
    } catch (error) {
      console.error("Database error in setBusinessContact:", error);
      throw error;
    }
  }

  async getAllBusinessContacts(): Promise<BusinessContact[]> {
    const query = "SELECT * FROM business_contacts WHERE isActive = TRUE";
    const [rows] = await pool.query<BusinessContactRow[]>(query);
    return rows.map((row) => this.mapRowToBusinessContact(row));
  }
}
