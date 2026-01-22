// repositories/vault-package.repository.ts
import { pool } from "../db";
import { VaultPackage } from "../models/Package.model";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface VaultPackageRow extends RowDataPacket {
  id: number;
  collecto_id?: string | null;
  name: string;
  points_amount: number;
  price: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_active: boolean;
  is_popular: boolean;
}

export class VaultPackageRepository {
  private mapRowToVaultPackage(row: VaultPackageRow): VaultPackage {
    return new VaultPackage(
      row.id,
      row.collecto_id ?? null,
      row.name,
      row.points_amount,
      row.price,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active),
      Boolean(row.is_popular)
    );
  }

  async findAll(includeInactive = false, collectoId?: string): Promise<VaultPackage[]> {
    if (collectoId) {
      const query = includeInactive
        ? "SELECT * FROM vault_packages WHERE collecto_id = ? ORDER BY price ASC"
        : "SELECT * FROM vault_packages WHERE is_active = TRUE AND collecto_id = ? ORDER BY price ASC";
      const [rows] = await pool.query<VaultPackageRow[]>(query, [collectoId]);
      return rows.map((row) => this.mapRowToVaultPackage(row));
    }

    const query = includeInactive
      ? "SELECT * FROM vault_packages ORDER BY price ASC"
      : "SELECT * FROM vault_packages WHERE is_active = TRUE ORDER BY price ASC";

    const [rows] = await pool.query<VaultPackageRow[]>(query);
    return rows.map((row) => this.mapRowToVaultPackage(row));
  }

  async findById(id: number): Promise<VaultPackage | null> {
    const [rows] = await pool.query<VaultPackageRow[]>(
      "SELECT * FROM vault_packages WHERE id = ?",
      [id]
    );

    return rows.length > 0 ? this.mapRowToVaultPackage(rows[0]) : null;
  }

  async findByCollectoId(collectoId: string): Promise<VaultPackage[]> {
    const [rows] = await pool.query<VaultPackageRow[]>(
      "SELECT * FROM vault_packages WHERE collecto_id = ? ORDER BY price ASC",
      [collectoId]
    );

    return rows.map((row) => this.mapRowToVaultPackage(row));
  }

  async findByName(name: string): Promise<VaultPackage | null> {
    const [rows] = await pool.query<VaultPackageRow[]>(
      "SELECT * FROM vault_packages WHERE name = ?",
      [name]
    );

    return rows.length > 0 ? this.mapRowToVaultPackage(rows[0]) : null;
  }

  async findByPrice(price: number, collectoId?: string): Promise<VaultPackage | null> {
    let query = "SELECT * FROM vault_packages WHERE price = ? AND is_active = TRUE";
    const params: any[] = [price];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    const [rows] = await pool.query<VaultPackageRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToVaultPackage(rows[0]) : null;
  }

  async findPopular(collectoId?: string): Promise<VaultPackage[]> {
    if (collectoId) {
      const [rows] = await pool.query<VaultPackageRow[]>(
        "SELECT * FROM vault_packages WHERE is_popular = TRUE AND is_active = TRUE AND collecto_id = ? ORDER BY price ASC",
        [collectoId]
      );

      return rows.map((row) => this.mapRowToVaultPackage(row));
    }

    const [rows] = await pool.query<VaultPackageRow[]>(
      "SELECT * FROM vault_packages WHERE is_popular = TRUE AND is_active = TRUE ORDER BY price ASC"
    );

    return rows.map((row) => this.mapRowToVaultPackage(row));
  }

  async findActive(collectoId?: string): Promise<VaultPackage[]> {
    if (collectoId) {
      const [rows] = await pool.query<VaultPackageRow[]>(
        "SELECT * FROM vault_packages WHERE is_active = TRUE AND collecto_id = ? ORDER BY price ASC",
        [collectoId]
      );

      return rows.map((row) => this.mapRowToVaultPackage(row));
    }

    const [rows] = await pool.query<VaultPackageRow[]>(
      "SELECT * FROM vault_packages WHERE is_active = TRUE ORDER BY price ASC"
    );

    return rows.map((row) => this.mapRowToVaultPackage(row));
  }

  async create(
    collectoId: string | null,
    name: string,
    pointsAmount: number,
    price: number,
    createdBy: string,
    isPopular = false
  ): Promise<VaultPackage> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO vault_packages (collecto_id, name, points_amount, price, created_by, is_popular) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [collectoId, name, pointsAmount, price, createdBy, isPopular]
    );

    const vaultPackage = await this.findById(result.insertId);
    if (!vaultPackage) {
      throw new Error("Failed to create vault package");
    }

    return vaultPackage;
  }

  async update(
    id: number,
    updates: {
      name?: string;
      pointsAmount?: number;
      price?: number;
      isActive?: boolean;
      isPopular?: boolean;
    }
  ): Promise<VaultPackage | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.pointsAmount !== undefined) {
      fields.push("points_amount = ?");
      values.push(updates.pointsAmount);
    }
    if (updates.price !== undefined) {
      fields.push("price = ?");
      values.push(updates.price);
    }
    if (updates.isActive !== undefined) {
      fields.push("is_active = ?");
      values.push(updates.isActive);
    }
    if (updates.isPopular !== undefined) {
      fields.push("is_popular = ?");
      values.push(updates.isPopular);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE vault_packages SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM vault_packages WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }

  async softDelete(id: number): Promise<VaultPackage | null> {
    await pool.query(
      "UPDATE vault_packages SET is_active = FALSE WHERE id = ?",
      [id]
    );

    return this.findById(id);
  }

  async activate(id: number): Promise<VaultPackage | null> {
    await pool.query(
      "UPDATE vault_packages SET is_active = TRUE WHERE id = ?",
      [id]
    );

    return this.findById(id);
  }

  async markAsPopular(id: number): Promise<VaultPackage | null> {
    await pool.query(
      "UPDATE vault_packages SET is_popular = TRUE WHERE id = ?",
      [id]
    );

    return this.findById(id);
  }

  async unmarkAsPopular(id: number): Promise<VaultPackage | null> {
    await pool.query(
      "UPDATE vault_packages SET is_popular = FALSE WHERE id = ?",
      [id]
    );

    return this.findById(id);
  }
}
