import { pool } from "../db";
import { Customer } from "../models/Customer.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface CustomerRow extends RowDataPacket {
  id: number;
  collecto_id: string;
  client_id: string;
  name: string;
  current_points: number;
  earned_points: number;
  bought_points: number;
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
      row.name,
      row.current_points,
      row.earned_points,
      row.bought_points,
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
    name: string,
    currentPoints: number = 0,
    currentTierId: number | null = null
  ): Promise<Customer> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_customers (collecto_id, client_id, name, current_points, earned_points, bought_points, tier_id, total_purchased, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [collectoId, clientId, name, currentPoints, 0, 0, currentTierId, 0, true]
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

  // Add earned (non-purchased) points
  async addEarnedPoints(customerId: number, pointsToAdd: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_customers
       SET earned_points = earned_points + ?, current_points = current_points + ?, updated_at = NOW()
       WHERE id = ?`,
      [pointsToAdd, pointsToAdd, customerId]
    );

    return this.findById(customerId);
  }

  // Add bought (purchased) points
  async addBoughtPoints(customerId: number, pointsToAdd: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_customers
       SET bought_points = bought_points + ?, current_points = current_points + ?, updated_at = NOW()
       WHERE id = ?`,
      [pointsToAdd, pointsToAdd, customerId]
    );

    return this.findById(customerId);
  }

  // Redeem points: consume earned points first, then bought points
  async redeemPoints(customerId: number, pointsToRedeem: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_customers
       SET
         earned_points = GREATEST(0, earned_points - LEAST(earned_points, ?)),
         bought_points = GREATEST(0, bought_points - GREATEST(0, ? - earned_points)),
         current_points = GREATEST(0, current_points - ?),
         updated_at = NOW()
       WHERE id = ?`,
      [pointsToRedeem, pointsToRedeem, pointsToRedeem, customerId]
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


    if (updates.name !== undefined) {
      setClause.push("name = ?");
      values.push(updates.name);
    }
    if (updates.currentPoints !== undefined) {
      setClause.push("current_points = ?");
      values.push(updates.currentPoints);
    }
    if (updates.earnedPoints !== undefined) {
      setClause.push("earned_points = ?");
      values.push(updates.earnedPoints);
    }
    if (updates.boughtPoints !== undefined) {
      setClause.push("bought_points = ?");
      values.push(updates.boughtPoints);
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
