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

// Create a tier for a specific collecto/vendor - explicit route
router.post("/create/:collectoId", tierController.createTier);

// Update tier by id - explicit route
router.put("/update/:id", tierController.updateTier);

// Delete tier for a vendor - explicit route
router.delete("/delete/:collectoId/:tierId", tierController.deleteTier);

export default router;
