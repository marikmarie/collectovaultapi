import { Request, Response, NextFunction } from "express";
import { EarningRuleService } from "../services/earning-rule.service";

export class EarningRuleController {
  constructor(private readonly earningRuleService: EarningRuleService) {}

  getAllRules = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const rules = await this.earningRuleService.getAllRules(includeInactive);
      console.log('Fetched all earning rules');
      res.status(200).json({
        success: true,
        data: rules,
        count: rules.length,
      });

      console.log(`Retrieved ${rules.length} earning rules`);
    } catch (err) {
      next(err);
    }
  };

  getActiveRules = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const rules = await this.earningRuleService.getActiveRules();

      res.status(200).json({
        success: true,
        data: rules,
        count: rules.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getRulesByPointsRange = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const minPoints = parseInt(req.query.min as string, 10);
      const maxPoints = parseInt(req.query.max as string, 10);

      if (isNaN(minPoints) || isNaN(maxPoints)) {
        res.status(400).json({
          success: false,
          error: "Valid min and max points are required",
        });
        return;
      }

      const rules = await this.earningRuleService.getRulesByPointsRange(
        minPoints,
        maxPoints
      );

      res.status(200).json({
        success: true,
        data: rules,
        count: rules.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getRuleById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      const rule = await this.earningRuleService.getRuleById(id);

      res.status(200).json({
        success: true,
        data: rule,
      });
    } catch (err) {
      next(err);
    }
  };

  createRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { collectoId, ruleTitle, description, points } = req.body;

      if (!collectoId || typeof collectoId !== 'string') {
        res.status(400).json({ success: false, error: 'collectoId is required' });
        return;
      }

      const createdBy = (req as any).user?.id || "system";

      const rule = await this.earningRuleService.createRule({
        collectoId,
        ruleTitle,
        description,
        points,
        createdBy,
      });

      res.status(201).json({
        success: true,
        data: rule,
        message: "Earning rule created successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updateRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      const { ruleTitle, description, points, isActive } = req.body;

      const rule = await this.earningRuleService.updateRule(id, {
        ruleTitle,
        description,
        points,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: rule,
        message: "Earning rule updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updatePoints = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { points } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      if (points === undefined || typeof points !== "number") {
        res.status(400).json({
          success: false,
          error: "Valid points value is required",
        });
        return;
      }

      const rule = await this.earningRuleService.updatePoints(id, points);

      res.status(200).json({
        success: true,
        data: rule,
        message: "Rule points updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updateDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { title, description } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      if (!title || typeof title !== "string") {
        res.status(400).json({
          success: false,
          error: "Valid title is required",
        });
        return;
      }

      if (!description || typeof description !== "string") {
        res.status(400).json({
          success: false,
          error: "Valid description is required",
        });
        return;
      }

      const rule = await this.earningRuleService.updateDetails(
        id,
        title,
        description
      );

      res.status(200).json({
        success: true,
        data: rule,
        message: "Rule details updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  activateRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      const rule = await this.earningRuleService.activateRule(id);

      res.status(200).json({
        success: true,
        data: rule,
        message: "Earning rule activated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deactivateRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      const rule = await this.earningRuleService.deactivateRule(id);

      res.status(200).json({
        success: true,
        data: rule,
        message: "Earning rule deactivated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deleteRule = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid rule ID",
        });
        return;
      }

      await this.earningRuleService.deleteRule(id);

      res.status(200).json({
        success: true,
        message: "Earning rule deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  };
}
