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

// Create a rule for a specific collecto/vendor - explicit route
router.post("/create/:collectoId", earningRuleController.createRule);

// Update rule by id - explicit route
router.put("/update/:id", earningRuleController.updateRule);

// Delete route - explicit route
router.delete("/delete/:collectoId/:ruleId", earningRuleController.deleteRule);

export default router;
