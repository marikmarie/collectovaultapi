
import { Request, Response, NextFunction } from "express";
import { VaultPackageService } from "../services/vault-package.service";

export class VaultPackageController {
  constructor(private readonly vaultPackageService: VaultPackageService) {}

  getAllPackages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      console.log('Fetching all vault packages');
      const includeInactive = req.query.includeInactive === "true";
      const packages = await this.vaultPackageService.getAllPackages(
        includeInactive
      );

      console.log(`Retrieved ${packages} packages`);
      res.status(200).json({
        success: true,
        data: packages,
        count: packages.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getActivePackages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log('Fetching active vault packages');
    try {
      const packages = await this.vaultPackageService.getActivePackages();

      res.status(200).json({
        success: true,
        data: packages,
        count: packages.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getPopularPackages = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const packages = await this.vaultPackageService.getPopularPackages();

      res.status(200).json({
        success: true,
        data: packages,
        count: packages.length,
      });
    } catch (err) {
      next(err);
    }
  };

  getPackageById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.getPackageById(id);

      res.status(200).json({
        success: true,
        data: vaultPackage,
      });
    } catch (err) {
      next(err);
    }
  };

  createPackage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { name, pointsAmount, price, isPopular } = req.body;

     
      const createdBy = (req as any).user?.id || "system";

      const vaultPackage = await this.vaultPackageService.createPackage({
        name,
        pointsAmount,
        price,
        createdBy,
        isPopular,
      });

      res.status(201).json({
        success: true,
        data: vaultPackage,
        message: "Vault package created successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updatePackage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const { name, pointsAmount, price, isActive, isPopular } = req.body;

      const vaultPackage = await this.vaultPackageService.updatePackage(id, {
        name,
        pointsAmount,
        price,
        isActive,
        isPopular,
      });

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Vault package updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updatePrice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { price } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      if (price === undefined || typeof price !== "number") {
        res.status(400).json({
          success: false,
          error: "Valid price is required",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.updatePrice(
        id,
        price
      );

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Package price updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updatePointsAmount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { pointsAmount } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      if (pointsAmount === undefined || typeof pointsAmount !== "number") {
        res.status(400).json({
          success: false,
          error: "Valid points amount is required",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.updatePointsAmount(
        id,
        pointsAmount
      );

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Package points amount updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  updateName = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      if (!name || typeof name !== "string") {
        res.status(400).json({
          success: false,
          error: "Valid name is required",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.updateName(id, name);

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Package name updated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  activatePackage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.activatePackage(id);

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Vault package activated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deactivatePackage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.deactivatePackage(id);

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Vault package deactivated successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  markAsPopular = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.markAsPopular(id);

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Vault package marked as popular successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  unmarkAsPopular = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      const vaultPackage = await this.vaultPackageService.unmarkAsPopular(id);

      res.status(200).json({
        success: true,
        data: vaultPackage,
        message: "Vault package unmarked as popular successfully",
      });
    } catch (err) {
      next(err);
    }
  };

  deletePackage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid package ID",
        });
        return;
      }

      await this.vaultPackageService.deletePackage(id);

      res.status(200).json({
        success: true,
        message: "Vault package deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  };
}
