import { Router } from "express";
import { EarningRuleController } from "../contollers/earning-rule.controller";
import { EarningRuleService } from "../services/earning-rule.service";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

const router = Router();

// Initialize dependencies
const earningRuleRepository = new EarningRuleRepository();
const earningRuleService = new EarningRuleService(earningRuleRepository);
const earningRuleController = new EarningRuleController(earningRuleService);


// Get rules for a specific collecto/vendor
router.get("/:collectoId", earningRuleController.getRulesByCollectoId);

// Create a rule for a specific collecto/vendor (frontend posts to /pointRules/:vendorId)
router.post("/:collectoId", earningRuleController.createRule);

// Update rule by id
router.put("/:id", earningRuleController.updateRule);

// Delete route matching frontend's nested path
router.delete("/:collectoId/:ruleId", earningRuleController.deleteRule);

export default router;
