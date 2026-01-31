import { Router } from "express";
import { EarningRuleController } from "../contollers/earning-rule.controller";
import { EarningRuleService } from "../services/earning-rule.service";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

const router = Router();

// Initialize dependencies
const earningRuleRepository = new EarningRuleRepository();
const earningRuleService = new EarningRuleService(earningRuleRepository);
const earningRuleController = new EarningRuleController(earningRuleService);

// Create a rule for a specific collecto/vendor - explicit route (MUST be before generic /:collectoId)
router.post("/create/:collectoId", earningRuleController.createRule);

// Update rule by id - explicit route
router.put("/update/:id", earningRuleController.updateRule);

// Delete route - explicit route
router.delete("/delete/:collectoId/:ruleId", earningRuleController.deleteRule);

// Get rules for a specific collecto/vendor (MUST be last, matches any single param)
router.get("/:collectoId", earningRuleController.getRulesByCollectoId);

export default router;
