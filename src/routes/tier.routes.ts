import { Router } from "express";
import { TierController } from "../contollers/tiers.controller";
import { TierService } from "../services/tier.service";
import { TierRepository } from "../repositories/tier.repository";

const router = Router();

// Initialize dependencies
const tierRepository = new TierRepository();
const tierService = new TierService(tierRepository);
const tierController = new TierController(tierService);

// Get tiers for a specific collecto/vendor
router.get("/:collectoId", tierController.getTiersByCollectoId);

// Create a tier for a specific collecto/vendor
router.post("/:collectoId", tierController.createTier);

// Update tier by id
router.put("/:id", tierController.updateTier);

// Delete tier for a vendor (nested path)
router.delete("/:collectoId/:tierId", tierController.deleteTier);

export default router;
