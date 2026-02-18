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
router.post("/tier/create/:collectoId", tierController.createTier);

// Update tier by id - explicit route
router.put("/tier/update/:id", tierController.updateTier);

// Delete tier for a vendor - explicit route
router.delete("/tier/delete/:tierId", tierController.deleteTier);

// Get tier by id or tiers by collectoId
// The controller handles both cases: if numeric, fetch by ID; otherwise treat as collectoId
router.get("/tier/:id", tierController.getTierById);

export default router;
