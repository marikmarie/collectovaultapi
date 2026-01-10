import { pool } from "../db";
import { Customer } from "../models/Customer.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface CustomerRow extends RowDataPacket {
  id: number;
  collecto_id: string;
  client_id: string;
  email: string;
  name: string;
  current_points: number;
  tier_id: number | null;
  total_purchased: number;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export class CustomerRepository {
  private mapRowToCustomer(row: CustomerRow): Customer {
    return new Customer(
      row.id,
      row.collecto_id,
      row.client_id,
      row.email,
      row.name,
      row.current_points,
      row.tier_id ?? null,
      row.total_purchased,
      row.created_at,
      row.updated_at,
      Boolean(row.is_active)
    );
  }

  async findAll(collectoId?: string): Promise<Customer[]> {
    let query = "SELECT * FROM vault_customers WHERE is_active = TRUE";
    const params: any[] = [];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query<CustomerRow[]>(query, params);
    return rows.map((row) => this.mapRowToCustomer(row));
  }

  async findById(id: number): Promise<Customer | null> {
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM vault_customers WHERE id = ? AND is_active = TRUE",
      [id]
    );

    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async findByClientId(clientId: string, collectoId?: string): Promise<Customer | null> {
    let query = "SELECT * FROM vault_customers WHERE client_id = ? AND is_active = TRUE";
    const params: any[] = [clientId];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    const [rows] = await pool.query<CustomerRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async findByEmail(email: string, collectoId?: string): Promise<Customer | null> {
    let query = "SELECT * FROM vault_customers WHERE email = ? AND is_active = TRUE";
    const params: any[] = [email];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    const [rows] = await pool.query<CustomerRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async findByCollectoId(collectoId: string): Promise<Customer[]> {
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM vault_customers WHERE collecto_id = ? AND is_active = TRUE ORDER BY created_at DESC",
      [collectoId]
    );

    return rows.map((row) => this.mapRowToCustomer(row));
  }

  async create(
    collectoId: string,
    clientId: string,
    email: string,
    name: string,
    currentPoints: number = 0,
    currentTierId: number | null = null
  ): Promise<Customer> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_customers (collecto_id, client_id, email, name, current_points, tier_id, total_purchased, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [collectoId, clientId, email, name, currentPoints, currentTierId, 0, true]
    );

    const customerId = result.insertId;
    const customer = await this.findById(customerId);

    if (!customer) {
      throw new Error("Failed to create customer");
    }

    return customer;
  }

  async updatePoints(customerId: number, points: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET current_points = ?, updated_at = NOW() WHERE id = ?",
      [points, customerId]
    );

    return this.findById(customerId);
  }

  async addPoints(customerId: number, pointsToAdd: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET current_points = current_points + ?, updated_at = NOW() WHERE id = ?",
      [pointsToAdd, customerId]
    );

    return this.findById(customerId);
  }

  async deductPoints(customerId: number, pointsToDeduct: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET current_points = GREATEST(0, current_points - ?), updated_at = NOW() WHERE id = ?",
      [pointsToDeduct, customerId]
    );

    return this.findById(customerId);
  }

  async updateTier(customerId: number, tierId: number | null): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET tier_id = ?, updated_at = NOW() WHERE id = ?",
      [tierId, customerId]
    );

    return this.findById(customerId);
  }

  async updateTotalPurchased(customerId: number, amount: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET total_purchased = total_purchased + ?, updated_at = NOW() WHERE id = ?",
      [amount, customerId]
    );

    return this.findById(customerId);
  }

  async deactivate(customerId: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_customers SET is_active = FALSE, updated_at = NOW() WHERE id = ?",
      [customerId]
    );

    // Return the deactivated customer (without the is_active filter)
    const [rows] = await pool.query<CustomerRow[]>(
      "SELECT * FROM vault_customers WHERE id = ?",
      [customerId]
    );

    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async update(customerId: number, updates: Partial<Customer>): Promise<Customer | null> {
    const setClause: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) {
      setClause.push("email = ?");
      values.push(updates.email);
    }
    if (updates.name !== undefined) {
      setClause.push("name = ?");
      values.push(updates.name);
    }
    if (updates.currentPoints !== undefined) {
      setClause.push("current_points = ?");
      values.push(updates.currentPoints);
    }
    if (updates.currentTierId !== undefined) {
      setClause.push("tier_id = ?");
      values.push(updates.currentTierId);
    }

    if (setClause.length === 0) {
      return this.findById(customerId);
    }

    setClause.push("updated_at = NOW()");
    values.push(customerId);

    const query = `UPDATE vault_customers SET ${setClause.join(", ")} WHERE id = ?`;
    await pool.query(query, values);

    return this.findById(customerId);
  }
}
