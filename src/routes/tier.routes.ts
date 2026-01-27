import { Router } from "express";
import { TierController } from "../contollers/tiers.controller";
import { TierService } from "../services/tier.service";
import { TierRepository } from "../repositories/tier.repository";

const router = Router();

// Initialize dependencies
const tierRepository = new TierRepository();
const tierService = new TierService(tierRepository);
const tierController = new TierController(tierService);

/**
 * Routes matching the frontend:
 * GET  /tier/collecto/:collectoId           -> list tiers for vendor
 * GET  /tier/:id                             -> get tier by id
 * POST /tier/:collectoId                     -> create tier for vendor
 * DELETE /tier/:collectoId/tier/:tierId     -> delete tier
 */

// Get tiers for a specific collecto/vendor
router.get("/collecto/:collectoId", tierController.getTiersByCollectoId);

// Get single tier by id
router.get("/:id", tierController.getTierById);

// Create a tier for a specific collecto/vendor
router.post("/:collectoId", tierController.createTier);

// Delete route matching frontend nested path
router.delete("/:collectoId/tier/:tierId", tierController.deleteTier);

export default router;
