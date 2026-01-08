import { Request, Response, NextFunction } from "express";
import { TierService } from "../services/tier.service";

export class TierController {
  constructor(private readonly tierService: TierService) {}

  getAllTiers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const collectoId = req.query.collectoId as string | undefined;
      const tiers = await this.tierService.getAllTiers(includeInactive, collectoId);

      res.status(200).json({
        success: true,
        data: tiers,
        count: tiers.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getTierById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const idParam = req.params.id;
      const id = parseInt(idParam, 10);

      if (!isNaN(id)) {
        const tier = await this.tierService.getTierById(id);
        res.status(200).json({ success: true, data: tier });
        return;
      }

      // treat as collectoId -> may return multiple tiers
      const tiers = await this.tierService.getTiersByCollectoId(idParam);
      res.status(200).json({ success: true, data: tiers, count: tiers.length });
    } catch (err) {
      next(err);
    }
  };

  getTiersByCollectoId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const collectoId = req.params.collectoId;
      if (!collectoId || typeof collectoId !== "string") {
        res.status(400).json({ success: false, error: "Invalid collectoId" });
        return;
      }

      const tiers = await this.tierService.getTiersByCollectoId(collectoId);
      res.status(200).json({ success: true, data: tiers, count: tiers.length });
    } catch (err) {
      next(err);
    }
  };

  createTier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { collectoId, name, pointsRequired, earningMultiplier } = req.body;

      if (!collectoId || typeof collectoId !== 'string') {
        res.status(400).json({ success: false, error: 'collectoId is required' });
        return;
      }

      // Get createdBy from authenticated user (adjust based on your auth setup)
      const createdBy = (req as any).user?.id || "system";

      const tier = await this.tierService.createTier({
        collectoId,
        name,
        pointsRequired,
        earningMultiplier,
        createdBy,
      });

      res.status(201).json({
        success: true,
        data: tier,
        message: "Tier created successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updateTier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid tier ID",
        });
        return;
      }

      const { name, pointsRequired, earningMultiplier, isActive } = req.body;

      const tier = await this.tierService.updateTier(id, {
        name,
        pointsRequired,
        earningMultiplier,
        isActive,
      });

      res.status(200).json({
        success: true,
        data: tier,
        message: "Tier updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updateMultiplier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { multiplier } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid tier ID",
        });
        return;
      }

      if (!multiplier || typeof multiplier !== "number") {
        res.status(400).json({
          success: false,
          error: "Valid multiplier is required",
        });
        return;
      }

      const tier = await this.tierService.updateMultiplier(id, multiplier);

      res.status(200).json({
        success: true,
        data: tier,
        message: "Tier multiplier updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deactivateTier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid tier ID",
        });
        return;
      }

      const tier = await this.tierService.deactivateTier(id);

      res.status(200).json({
        success: true,
        data: tier,
        message: "Tier deactivated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deleteTier = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid tier ID",
        });
        return;
      }

      await this.tierService.deleteTier(id);

      res.status(200).json({
        success: true,
        message: "Tier deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  };
}
