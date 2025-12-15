import express from "express";
import { collectoAuth } from "../middleware/authCollecto";
import { fetchTransactionsForCustomer } from "../collectoClient";
import { computeAndApplyPointsForCustomer } from "../services/pointsService";
import { pool } from "../db";
const router = express.Router();

/** GET /me/points - get my points (uses collectoAuth) */
router.get("/me/points", collectoAuth, async (req, res) => {
  const customer = (req as any).collectoUser;
  const [rows] = await pool.query(`SELECT points_balance FROM customer_points WHERE collecto_customer_id = ? LIMIT 1`, [customer.id]);
  const rb = (rows as any[])[0];
  res.json({ points: rb ? Number(rb.points_balance) : 0 });
});

/** POST /me/compute - fetch transactions and compute points */
router.post("/me/compute", collectoAuth, async (req, res) => {
  const customer = (req as any).collectoUser;
  const { from, to, limit } = req.body;
  // fetch transactions from collecto
  const txs = await fetchTransactionsForCustomer(customer.id, { from, to, limit });
  const result = await computeAndApplyPointsForCustomer(customer.id, txs.data || txs || []);
  res.json(result);
});

/** GET /:collectoCustomerId/ledger - admin: get ledger for a customer */
router.get("/:collectoCustomerId/ledger", async (req, res) => {
  const id = req.params.collectoCustomerId;
  const [rows] = await pool.query(`SELECT * FROM points_ledger WHERE collecto_customer_id = ? ORDER BY created_at DESC LIMIT 200`, [id]);
  res.json(rows);
});

export default router;
