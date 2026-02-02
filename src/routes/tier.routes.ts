import { Router } from "express";
import { TierController } from "../contollers/tiers.controller";
import { TierService } from "../services/tier.service";
import { TierRepository } from "../repositories/tier.repository";

const router = Router();

// Initialize dependencies
const tierRepository = new TierRepository();
const tierService = new TierService(tierRepository);
const tierController = new TierController(tierService);

// Create a tier for a specific collecto/vendor - explicit route (MUST be before generic /:collectoId)
router.post("/create/:collectoId", tierController.createTier);

// Update tier by id - explicit route
router.put("/update/:id", tierController.updateTier);

// Delete tier for a vendor - explicit route
router.delete("/delete/:tierId", tierController.deleteTier);

// Get tier by id or tiers by collectoId (must be before generic /:collectoId for server mode)
router.get("/:id", tierController.getTierById);

// Get tiers for a specific collecto/vendor (MUST be last, matches any single param)
router.get("/:collectoId", tierController.getTiersByCollectoId);

export default router;
