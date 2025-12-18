// repositories/earning-rule.repository.ts
import { pool } from "../db";
import { EarningRule } from "../models/EarningRules.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface EarningRuleRow extends RowDataPacket {
  id: number;
  description: string;
  rule_title: string;
  points: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_active: boolean;
}

export class EarningRuleRepository {
  private mapRowToEarningRule(row: EarningRuleRow): EarningRule {
    return new EarningRule(
      row.id,
      row.description,
      row.rule_title,
      row.points,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active)
    );
  }

  async findAll(includeInactive = false): Promise<EarningRule[]> {
    const query = includeInactive
      ? "SELECT * FROM earning_rules ORDER BY points DESC"
      : "SELECT * FROM earning_rules WHERE is_active = TRUE ORDER BY points DESC";

    const [rows] = await pool.query<EarningRuleRow[]>(query);
    return rows.map((row) => this.mapRowToEarningRule(row));
  }

  async findById(id: number): Promise<EarningRule | null> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM earning_rules WHERE id = ?",
      [id]
    );

    return rows.length > 0 ? this.mapRowToEarningRule(rows[0]) : null;
  }

  async findByTitle(ruleTitle: string): Promise<EarningRule | null> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM earning_rules WHERE rule_title = ?",
      [ruleTitle]
    );

    return rows.length > 0 ? this.mapRowToEarningRule(rows[0]) : null;
  }

  async findActive(): Promise<EarningRule[]> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM earning_rules WHERE is_active = TRUE ORDER BY points DESC"
    );

    return rows.map((row) => this.mapRowToEarningRule(row));
  }

  async findByPointsRange(
    minPoints: number,
    maxPoints: number
  ): Promise<EarningRule[]> {
    const [rows] = await pool.query<EarningRuleRow[]>(
      "SELECT * FROM earning_rules WHERE points BETWEEN ? AND ? AND is_active = TRUE ORDER BY points DESC",
      [minPoints, maxPoints]
    );

    return rows.map((row) => this.mapRowToEarningRule(row));
  }

  async create(
    ruleTitle: string,
    description: string,
    points: number,
    createdBy: string
  ): Promise<EarningRule> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO earning_rules (rule_title, description, points, created_by) 
       VALUES (?, ?, ?, ?)`,
      [ruleTitle, description, points, createdBy]
    );

    const earningRule = await this.findById(result.insertId);
    if (!earningRule) {
      throw new Error("Failed to create earning rule");
    }

    return earningRule;
  }

  async update(
    id: number,
    updates: {
      ruleTitle?: string;
      description?: string;
      points?: number;
      isActive?: boolean;
    }
  ): Promise<EarningRule | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.ruleTitle !== undefined) {
      fields.push("rule_title = ?");
      values.push(updates.ruleTitle);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.points !== undefined) {
      fields.push("points = ?");
      values.push(updates.points);
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
      `UPDATE earning_rules SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM earning_rules WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }

  async softDelete(id: number): Promise<EarningRule | null> {
    await pool.query(
      "UPDATE earning_rules SET is_active = FALSE WHERE id = ?",
      [id]
    );

    return this.findById(id);
  }

  async activate(id: number): Promise<EarningRule | null> {
    await pool.query("UPDATE earning_rules SET is_active = TRUE WHERE id = ?", [
      id,
    ]);

    return this.findById(id);
  }
}
