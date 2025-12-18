
import { Router } from "express";
import { TierController } from "../contollers/tiers.controller";
import { TierService } from "../services/tier.service";
import { TierRepository } from "../repositories/tier.repository";

const router = Router();

// Initialize dependencies
const tierRepository = new TierRepository();
const tierService = new TierService(tierRepository);
const tierController = new TierController(tierService);

// Routes
router.get("/", tierController.getAllTiers);
router.get("/:id", tierController.getTierById);
router.post("/", tierController.createTier);
router.put("/:id", tierController.updateTier);
router.patch("/:id/multiplier", tierController.updateMultiplier);
router.patch("/:id/deactivate", tierController.deactivateTier);
router.delete("/:id", tierController.deleteTier);

export default router;
