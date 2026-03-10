import { pool } from "../db";
import { EarningRule } from "../models/EarningRules.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface EarningRuleRow extends RowDataPacket {
  id: number;
  collecto_id: string | null;
  description: string;
  rule_title: string;
  points: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_active: boolean;
}

export class EarningRuleRepository {
  private mapRowToRule(row: EarningRuleRow): EarningRule {
    return new EarningRule(
      row.id,
      row.collecto_id,
      row.description,
      row.rule_title,
      row.points,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active),
    );
  }

  async findAll(includeInactive = false, collectoId?: string): Promise<EarningRule[]> {
    let query = "SELECT * FROM vault_earning_rules";
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

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query<EarningRuleRow[]>(query, params);
    return rows.map((row) => this.mapRowToRule(row));
  }

  async findActive(collectoId?: string): Promise<EarningRule[]> {
    return this.findAll(false, collectoId);
  }

  async findById(id: number): Promise<EarningRule | null> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM vault_earning_rules WHERE id = ?",
      [id],
    );

    return rows.length > 0 ? this.mapRowToRule(rows[0]) : null;
  }

  async findByCollectoId(collectoId: string): Promise<EarningRule[]> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM vault_earning_rules WHERE collecto_id = ? AND is_active = TRUE ORDER BY created_at DESC",
      [collectoId],
    );

    return rows.map((row) => this.mapRowToRule(row));
  }

  async findByTitle(ruleTitle: string): Promise<EarningRule | null> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM vault_earning_rules WHERE rule_title = ?",
      [ruleTitle],
    );

    return rows.length > 0 ? this.mapRowToRule(rows[0]) : null;
  }

  async findByPointsRange(minPoints: number, maxPoints: number, collectoId?: string): Promise<EarningRule[]> {
    let query = "SELECT * FROM vault_earning_rules WHERE points BETWEEN ? AND ?";
    const params: any[] = [minPoints, maxPoints];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    query += " ORDER BY points ASC";

    const [rows] = await pool.query<EarningRuleRow[]>(query, params);
    return rows.map((row) => this.mapRowToRule(row));
  }

  async create(
    collectoId: string,
    ruleTitle: string,
    description: string,
    points: number,
    createdBy: string,
  ): Promise<EarningRule> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_earning_rules (collecto_id, rule_title, description, points, created_at, updated_at, created_by, is_active)
       VALUES (?, ?, ?, ?, NOW(), NOW(), ?, TRUE)`,
      [collectoId, ruleTitle, description, points, createdBy],
    );

    const ruleId = result.insertId;
    const rule = await this.findById(ruleId);
    if (!rule) {
      throw new Error("Failed to create earning rule");
    }

    return rule;
  }

  async update(id: number, updates: Partial<EarningRule>): Promise<EarningRule | null> {
    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.collectoId !== undefined) {
      setClause.push("collecto_id = ?");
      params.push(updates.collectoId);
    }
    if (updates.ruleTitle !== undefined) {
      setClause.push("rule_title = ?");
      params.push(updates.ruleTitle);
    }
    if (updates.description !== undefined) {
      setClause.push("description = ?");
      params.push(updates.description);
    }
    if (updates.points !== undefined) {
      setClause.push("points = ?");
      params.push(updates.points);
    }
    if (updates.isActive !== undefined) {
      setClause.push("is_active = ?");
      params.push(updates.isActive);
    }

    if (setClause.length === 0) {
      return this.findById(id);
    }

    setClause.push("updated_at = NOW()");
    const query = `UPDATE vault_earning_rules SET ${setClause.join(", ")} WHERE id = ?`;
    params.push(id);

    await pool.query(query, params);
    return this.findById(id);
  }

  async activate(id: number): Promise<EarningRule | null> {
    await pool.query("UPDATE vault_earning_rules SET is_active = TRUE, updated_at = NOW() WHERE id = ?", [id]);
    return this.findById(id);
  }

  async softDelete(id: number): Promise<EarningRule | null> {
    await pool.query("UPDATE vault_earning_rules SET is_active = FALSE, updated_at = NOW() WHERE id = ?", [id]);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM vault_earning_rules WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  }
}
