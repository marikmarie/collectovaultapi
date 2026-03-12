import { pool } from "../db";
import { Customer } from "../models/Customer.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface CustomerRow extends RowDataPacket {
  id: number;
  collectoId: string;
  clientId: string;
  username: string | null;
  name: string;
  current_points: number;
  earned_points: number;
  bought_points: number;
  tier_id: number | null;
  total_purchased: number;
  recorddate: Date;
  IsActive: boolean;
}

export class CustomerRepository {
  private mapRowToCustomer(row: CustomerRow): Customer {
    return new Customer(
      row.id,
      row.collectoId,
      row.clientId,
      row.username ?? null,
      row.name,
      row.current_points,
      row.earned_points,
      row.bought_points,
      row.tier_id ?? null,
      Number(row.total_purchased),
      row.recorddate,
      row.recorddate, // Using recorddate for both for now
      Boolean(row.IsActive)
    );
  }

  private readonly JOIN_QUERY = `
    SELECT 
      bc.id, bc.collectoId, bc.clientId, c.username, bc.name,
      bc.current_points, bc.earned_points, bc.bought_points,
      bc.tier_id, bc.total_purchased, bc.recorddate, bc.IsActive
    FROM vault_business_clients bc
    INNER JOIN vault_clients c ON bc.userId = c.id
  `;

  async findAll(collectoId?: string): Promise<Customer[]> {
    let query = `${this.JOIN_QUERY} WHERE bc.IsActive = TRUE`;
    const params: any[] = [];

    if (collectoId && collectoId.trim() !== "") {
      query += " AND bc.collectoId = ?";
      params.push(collectoId.trim());
    }

    query += " ORDER BY bc.recorddate DESC";

    try {
      const [rows] = await pool.query<CustomerRow[]>(query, params);
      return rows.map((row) => this.mapRowToCustomer(row));
    } catch (error) {
      console.error("Database error in findAll:", error);
      throw error;
    }
  }

  async findById(id: number): Promise<Customer | null> {
    const [rows] = await pool.query<CustomerRow[]>(
      `${this.JOIN_QUERY} WHERE bc.id = ? AND bc.IsActive = TRUE`,
      [id]
    );

    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async findByClientId(clientId: string, collectoId?: string): Promise<Customer | null> {
    let query = `${this.JOIN_QUERY} WHERE bc.clientId = ? AND bc.IsActive = TRUE`;
    const params: any[] = [clientId];

    if (collectoId) {
      query += " AND bc.collectoId = ?";
      params.push(collectoId);
    }

    const [rows] = await pool.query<CustomerRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToCustomer(rows[0]) : null;
  }

  async findByCollectoId(collectoId: string): Promise<Customer[]> {
    const [rows] = await pool.query<CustomerRow[]>(
      `${this.JOIN_QUERY} WHERE bc.collectoId = ? AND bc.IsActive = TRUE ORDER BY bc.recorddate DESC`,
      [collectoId]
    );

    return rows.map((row) => this.mapRowToCustomer(row));
  }

  async findByUsername(username: string, collectoId?: string): Promise<Customer[]> {
    let query = `${this.JOIN_QUERY} WHERE c.username = ? AND bc.IsActive = TRUE`;
    const params: any[] = [username];

    if (collectoId) {
      query += " AND bc.collectoId = ?";
      params.push(collectoId);
    }

    const [rows] = await pool.query<CustomerRow[]>(query, params);
    return rows.map((row) => this.mapRowToCustomer(row));
  }

  async checkUsernameExists(username: string): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM vault_clients WHERE username = ? LIMIT 1",
      [username]
    );

    return rows.length > 0;
  }

  async create(
    collectoId: string,
    clientId: string,
    name: string,
    currentPoints: number = 0,
    currentTierId: number | null = null,
    username?: string
  ): Promise<Customer> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let userId: number;

      // 1. Handle vault_clients
      // If username is provided, check if client already exists in vault_clients
      // If not provided, we might need a placeholder or the user might provide it later.
      // Given the new structure, every business client needs a userId.
      
      const effectiveUsername = username || `user_${clientId}`; // Fallback if no username given yet

      const [existingClients] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM vault_clients WHERE username = ?",
        [effectiveUsername]
      );

      if (existingClients.length > 0) {
        userId = existingClients[0].id;
      } else {
        const [clientResult] = await connection.query<ResultSetHeader>(
          "INSERT INTO vault_clients (username) VALUES (?)",
          [effectiveUsername]
        );
        userId = clientResult.insertId;
      }

      // 2. Handle vault_business_clients
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO vault_business_clients 
         (userId, clientId, collectoId, name, current_points, earned_points, bought_points, tier_id, total_purchased, IsActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, clientId, collectoId, name, currentPoints, 0, 0, currentTierId, 0, true]
      );

      await connection.commit();

      const customerId = result.insertId;
      const customer = await this.findById(customerId);

      if (!customer) {
        throw new Error("Failed to create customer after commit");
      }

      return customer;
    } catch (error) {
      await connection.rollback();
      console.error("Error creating customer:", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updatePoints(customerId: number, points: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_business_clients SET current_points = ? WHERE id = ?",
      [points, customerId]
    );

    return this.findById(customerId);
  }

  async addEarnedPoints(customerId: number, pointsToAdd: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_business_clients
       SET earned_points = earned_points + ?, current_points = current_points + ?
       WHERE id = ?`,
      [pointsToAdd, pointsToAdd, customerId]
    );

    return this.findById(customerId);
  }

  async addBoughtPoints(customerId: number, pointsToAdd: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_business_clients
       SET bought_points = bought_points + ?, current_points = current_points + ?
       WHERE id = ?`,
      [pointsToAdd, pointsToAdd, customerId]
    );

    return this.findById(customerId);
  }

  async redeemPoints(customerId: number, pointsToRedeem: number): Promise<Customer | null> {
    await pool.query(
      `UPDATE vault_business_clients
       SET
         earned_points = GREATEST(0, earned_points - LEAST(earned_points, ?)),
         bought_points = GREATEST(0, bought_points - GREATEST(0, ? - earned_points)),
         current_points = GREATEST(0, current_points - ?)
       WHERE id = ?`,
      [pointsToRedeem, pointsToRedeem, pointsToRedeem, customerId]
    );

    return this.findById(customerId);
  }

  async updateTier(customerId: number, tierId: number | null): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_business_clients SET tier_id = ? WHERE id = ?",
      [tierId, customerId]
    );

    return this.findById(customerId);
  }

  async updateTotalPurchased(customerId: number, amount: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_business_clients SET total_purchased = total_purchased + ? WHERE id = ?",
      [amount, customerId]
    );

    return this.findById(customerId);
  }

  async deactivate(customerId: number): Promise<Customer | null> {
    await pool.query(
      "UPDATE vault_business_clients SET IsActive = FALSE WHERE id = ?",
      [customerId]
    );

    return this.findById(customerId);
  }

  async update(customerId: number, updates: Partial<Customer>): Promise<Customer | null> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // If username is being updated, we need to handle vault_clients
      if (updates.username !== undefined) {
        // Find the business client to get the userId
        const [rows] = await connection.query<RowDataPacket[]>(
          "SELECT userId FROM vault_business_clients WHERE id = ?",
          [customerId]
        );

        if (rows.length > 0) {
          const userId = rows[0].userId;
          
          // Check if username is already taken by another user
          const [existing] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM vault_clients WHERE username = ? AND id != ?",
            [updates.username, userId]
          );

          if (existing.length > 0) {
            throw new Error("Username already taken");
          }

          // Update or change userId affiliation
          // Actually, 'setUsername' logic from user implies we might change the username of the user.
          // Or we might link this business_client to a DIFFERENT vault_clients record.
          
          // Let's check if the username already exists for ANY user.
          const [targetUser] = await connection.query<RowDataPacket[]>(
            "SELECT id FROM vault_clients WHERE username = ?",
            [updates.username]
          );

          if (targetUser.length > 0) {
            // Link this business_client to the existing user
            await connection.query(
              "UPDATE vault_business_clients SET userId = ? WHERE id = ?",
              [targetUser[0].id, customerId]
            );
          } else {
            // Update the username of the CURRENT user
            await connection.query(
              "UPDATE vault_clients SET username = ? WHERE id = ?",
              [updates.username, userId]
            );
          }
        }
      }

      // Update business-specific fields
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

      if (setClause.length > 0) {
        values.push(customerId);
        const query = `UPDATE vault_business_clients SET ${setClause.join(", ")} WHERE id = ?`;
        await connection.query(query, values);
      }

      await connection.commit();
      return this.findById(customerId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
