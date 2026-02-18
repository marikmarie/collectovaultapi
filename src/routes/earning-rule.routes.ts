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
router.post("/pointRules/create/:collectoId", earningRuleController.createRule);

// Update rule by id - explicit route
router.put("/pointRules/update/:id", earningRuleController.updateRule);

// Delete route - explicit route
router.delete("/pointRules/delete/:collectoId/:ruleId", earningRuleController.deleteRule);

// Get rule by id or rules by collectoId
// The controller handles both cases: if numeric, fetch by ID; otherwise treat as collectoId
router.get("/pointRules/:id", earningRuleController.getRuleById);

export default router;
