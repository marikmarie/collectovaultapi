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

// Get single tier by id
router.get("/:id", tierController.getTierById);

router.post("/:collectoId", tierController.createTier);

// Delete route matching frontend nested path
router.delete("/:collectoId/:tierId", tierController.deleteTier);

export default router;
