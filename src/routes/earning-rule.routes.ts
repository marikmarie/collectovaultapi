// routes/earning-rule.routes.ts
import { Router } from "express";
import { EarningRuleController } from "../contollers/earning-rule.controller";
import { EarningRuleService } from "../services/earning-rule.service";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

const router = Router();

// Initialize dependencies
const earningRuleRepository = new EarningRuleRepository();
const earningRuleService = new EarningRuleService(earningRuleRepository);
const earningRuleController = new EarningRuleController(earningRuleService);

// Query routes (GET with filters)
router.get("/", earningRuleController.getAllRules);
router.get("/active", earningRuleController.getActiveRules);
router.get("/by-points", earningRuleController.getRulesByPointsRange);
router.get("/collecto/:collectoId", earningRuleController.getRulesByCollectoId);

// CRUD routes
router.get("/:id", earningRuleController.getRuleById);
router.post("/", earningRuleController.createRule);
router.put("/:id", earningRuleController.updateRule);
router.delete("/:id", earningRuleController.deleteRule);

// Specific update routes
router.patch("/:id/points", earningRuleController.updatePoints);
router.patch("/:id/details", earningRuleController.updateDetails);

// Status management routes
router.patch("/:id/activate", earningRuleController.activateRule);
router.patch("/:id/deactivate", earningRuleController.deactivateRule);

export default router;
