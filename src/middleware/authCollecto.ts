import { Request, Response, NextFunction } from "express";
import { validateUserTokenWithCollecto } from "../collectoClient";

/**
 * Attaches req.collectoUser = { id: string, ... } on success.
 * If token invalid -> 401.
 */
export async function collectoAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing Authorization header" });

    const data = await validateUserTokenWithCollecto(auth);
    // 'data' should include the collecto customer id. Adapt property name.
    // Example: data = { id: 'cust_123', phone: '...', email: '...', ...}
    if (!data || !data.id) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // attach
    (req as any).collectoUser = {
      id: data.id,
      raw: data
    };

    next();
  } catch (err: any) {
    console.error("collectoAuth error", err?.response?.data || err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
