import { pool } from "../db";
import { Tier } from "../models/Tier.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TierRow extends RowDataPacket {
  id: number;
  collecto_id: string | null;
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
      row.collecto_id,
      row.name,
      row.points_required,
      row.earning_multiplier,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active),
    );
  }

  async findAll(includeInactive = false, collectoId?: string): Promise<Tier[]> {
    let query = "SELECT * FROM vault_tiers";
    const params: any[] = [];

    if (!includeInactive) {
      query += " WHERE is_active = TRUE";
    } else {
      query += " WHERE 1=1";
    }

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    query += " ORDER BY points_required ASC";

    const [rows] = await pool.query<TierRow[]>(query, params);
    return rows.map((row) => this.mapRowToTier(row));
  }

  async findById(id: number): Promise<Tier | null> {
    const [rows] = await pool.query<TierRow[]>(
      "SELECT * FROM vault_tiers WHERE id = ?",
      [id],
    );

    return rows.length > 0 ? this.mapRowToTier(rows[0]) : null;
  }

  async findByCollectoId(collectoId: string): Promise<Tier[]> {
    const [rows] = await pool.query<TierRow[]>(
      "SELECT * FROM vault_tiers WHERE collecto_id = ? AND is_active = TRUE ORDER BY points_required ASC",
      [collectoId],
    );

    return rows.map((row) => this.mapRowToTier(row));
  }

  async findTierForPoints(points: number): Promise<Tier | null> {
    const [rows] = await pool.query<TierRow[]>(
      `SELECT * FROM vault_tiers
       WHERE is_active = TRUE AND points_required <= ?
       ORDER BY points_required DESC
       LIMIT 1`,
      [points],
    );

    return rows.length > 0 ? this.mapRowToTier(rows[0]) : null;
  }

  async create(
    collectoId: string,
    name: string,
    pointsRequired: number,
    earningMultiplier: number,
    createdBy: string,
    isActive = true,
  ): Promise<Tier> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_tiers (collecto_id, name, points_required, earning_multiplier, created_at, updated_at, created_by, is_active)
       VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
      [collectoId, name, pointsRequired, earningMultiplier, createdBy, isActive],
    );

    const tierId = result.insertId;
    const tier = await this.findById(tierId);

    if (!tier) {
      throw new Error("Failed to create tier");
    }

    return tier;
  }

  async update(
    id: number,
    updates: Partial<Omit<Tier, "id" | "createdAt" | "createdBy">>,
  ): Promise<Tier | null> {
    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.collectoId !== undefined) {
      setClause.push("collecto_id = ?");
      params.push(updates.collectoId);
    }
    if (updates.name !== undefined) {
      setClause.push("name = ?");
      params.push(updates.name);
    }
    if (updates.pointsRequired !== undefined) {
      setClause.push("points_required = ?");
      params.push(updates.pointsRequired);
    }
    if (updates.earningMultiplier !== undefined) {
      setClause.push("earning_multiplier = ?");
      params.push(updates.earningMultiplier);
    }
    if (updates.isActive !== undefined) {
      setClause.push("is_active = ?");
      params.push(updates.isActive);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push("updated_at = NOW()");
    const query = `UPDATE vault_tiers SET ${setClause.join(", ")} WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);
    return this.findById(id);
  }

  async deactivate(id: number): Promise<Tier | null> {
    await pool.query("UPDATE vault_tiers SET is_active = FALSE, updated_at = NOW() WHERE id = ?", [id]);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM vault_tiers WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}
