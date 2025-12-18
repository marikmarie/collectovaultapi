import { pool } from "../db";
import { Tier } from "../models/Tier.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TierRow extends RowDataPacket {
  id: number;
  name: string;
  points_required: number;
  earning_multiplier: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_active: boolean;
}

export class TierRepository {
  private mapRowToTier(row: TierRow): Tier {
    return new Tier(
      row.id,
      row.name,
      row.points_required,
      row.earning_multiplier,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active)
    );
  }

  async findAll(includeInactive = false): Promise<Tier[]> {
    const query = includeInactive
      ? "SELECT * FROM tiers ORDER BY points_required ASC"
      : "SELECT * FROM tiers WHERE is_active = TRUE ORDER BY points_required ASC";

    const [rows] = await pool.query<TierRow[]>(query);
    return rows.map((row) => this.mapRowToTier(row));
  }

  async findById(id: number): Promise<Tier | null> {
    const [rows] = await pool.query<TierRow[]>(
      "SELECT * FROM tiers WHERE id = ?",
      [id]
    );

    return rows.length > 0 ? this.mapRowToTier(rows[0]) : null;
  }

  async findByName(name: string): Promise<Tier | null> {
    const [rows] = await pool.query<TierRow[]>(
      "SELECT * FROM tiers WHERE name = ?",
      [name]
    );

    return rows.length > 0 ? this.mapRowToTier(rows[0]) : null;
  }

  async create(
    name: string,
    pointsRequired: number,
    earningMultiplier: number,
    createdBy: string
  ): Promise<Tier> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO tiers (name, points_required, earning_multiplier, created_by) 
       VALUES (?, ?, ?, ?)`,
      [name, pointsRequired, earningMultiplier, createdBy]
    );

    const tier = await this.findById(result.insertId);
    if (!tier) {
      throw new Error("Failed to create tier");
    }

    return tier;
  }

  async update(
    id: number,
    updates: {
      name?: string;
      pointsRequired?: number;
      earningMultiplier?: number;
      isActive?: boolean;
    }
  ): Promise<Tier | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.pointsRequired !== undefined) {
      fields.push("points_required = ?");
      values.push(updates.pointsRequired);
    }
    if (updates.earningMultiplier !== undefined) {
      fields.push("earning_multiplier = ?");
      values.push(updates.earningMultiplier);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE tiers SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM tiers WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }

  async softDelete(id: number): Promise<Tier | null> {
    await pool.query("UPDATE tiers SET is_active = FALSE WHERE id = ?", [id]);

    return this.findById(id);
  }
}
