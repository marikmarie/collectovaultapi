import { Router } from "express";
import { TierController } from "../contollers/tiers.controller";
import { TierService } from "../services/tier.service";
import { TierRepository } from "../repositories/tier.repository";

const router = Router();

// Initialize dependencies
const tierRepository = new TierRepository();
const tierService = new TierService(tierRepository);
const tierController = new TierController(tierService);

router.post("/create/:collectoId", tierController.createTier);

router.put("/update/:id", tierController.updateTier);

router.delete("/delete/:tierId", tierController.deleteTier);

// Get tier by id or tiers by collectoId
// The controller handles both cases: if numeric, fetch by ID; otherwise treat as collectoId
router.get("/:id", tierController.getTierById);

export default router;
