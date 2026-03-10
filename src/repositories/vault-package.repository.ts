import { pool } from "../db";
import { VaultPackage } from "../models/Package.model";
import { RowDataPacket } from "mysql2";

interface VaultPackageRow extends RowDataPacket {
  id: number;
  collecto_id: string | null;
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
  private mapRowToPackage(row: VaultPackageRow): VaultPackage {
    return new VaultPackage(
      row.id,
      row.collecto_id,
      row.name,
      row.points_amount,
      row.price,
      row.created_at,
      row.updated_at,
      row.created_by,
      Boolean(row.is_active),
      Boolean(row.is_popular),
    );
  }

  async findByPrice(price: number, collectoId?: string): Promise<VaultPackage | null> {
    let query = "SELECT * FROM vault_packages WHERE price = ? AND is_active = TRUE";
    const params: any[] = [price];

    if (collectoId) {
      query += " AND collecto_id = ?";
      params.push(collectoId);
    }

    query += " LIMIT 1";

    const [rows] = await pool.query<VaultPackageRow[]>(query, params);
    return rows.length > 0 ? this.mapRowToPackage(rows[0]) : null;
  }
}
