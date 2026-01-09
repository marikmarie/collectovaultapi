import { pool } from "../db";


export async function computeAndApplyPointsForCustomer(
  collectoCustomerId: string,
  transactions: Array<any>
) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rulesRows] = await conn.query(
      `SELECT * FROM point_rules WHERE active = 1 ORDER BY id ASC`
    );
    const rules: any[] = rulesRows as any[];

    // Ensure customer record exists
    await conn.query(
      `INSERT INTO customer_points (collecto_customer_id, points_balance) 
        VALUES (?, 0) ON DUPLICATE KEY UPDATE collecto_customer_id = collecto_customer_id`,
      [collectoCustomerId]
    );

    // Get current balance
    const [balRows] = await conn.query(
      `SELECT id, points_balance FROM customer_points WHERE collecto_customer_id = ?`,
      [collectoCustomerId]
    );
    const balanceRow: any = (balRows as any[])[0];
    let currentBalance = Number(balanceRow.points_balance || 0);

    for (const tx of transactions) {
      const [existing] = await conn.query(
        `SELECT id FROM points_ledger WHERE source_type='transaction' AND source_id=? LIMIT 1`,
        [tx.id]
      );
      if ((existing as any[]).length > 0) {
        continue; // skip already processed
      }

      let earned = 0;

      for (const r of rules) {
        if (r.event_type !== "transaction") continue;
    
        const amount = Number(tx.amount || 0);
        if (
          r.min_amount !== null &&
          r.min_amount !== undefined &&
          amount < Number(r.min_amount)
        )
          continue;
        if (
          r.max_amount !== null &&
          r.max_amount !== undefined &&
          amount > Number(r.max_amount)
        ) {
                 }

        // compute from multiplier and/or fixed
        const multiplier = Number(r.multiplier || 0);
        const fixed = Number(r.fixed_points || 0);

        // earned = floor(amount * multiplier) + fixed
        earned += Math.floor(amount * multiplier) + fixed;
      }

      if (earned <= 0) continue;

      currentBalance += earned;

      // insert ledger
      await conn.query(
        `INSERT INTO points_ledger (collecto_customer_id, change_amount, balance_after, reason, source_type, source_id, metadata)
         VALUES (?, ?, ?, ?, 'transaction', ?, ?)`,
        [
          collectoCustomerId,
          earned,
          currentBalance,
          `EARN: ${tx.id}`,
          tx.id,
          JSON.stringify(tx),
        ]
      );

      // update balance
      await conn.query(
        `UPDATE customer_points SET points_balance = ?, updated_at = NOW() WHERE collecto_customer_id = ?`,
        [currentBalance, collectoCustomerId]
      );
    }

    await conn.commit();
    return { success: true, newBalance: currentBalance };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
