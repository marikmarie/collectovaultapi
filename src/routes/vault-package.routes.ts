import { Router } from "express";
import { VaultPackageController } from "../contollers/vault-package.controller";
import { VaultPackageService } from "../services/vault-package.service";
import { VaultPackageRepository } from "../repositories/vault-package.repository";

const router = Router();

// Initialize dependencies
const vaultPackageRepository = new VaultPackageRepository();
const vaultPackageService = new VaultPackageService(vaultPackageRepository);
const vaultPackageController = new VaultPackageController(vaultPackageService);

// Query routes (GET with filters)
router.get("/set", vaultPackageController.getAllPackages);
router.get("/active", vaultPackageController.getActivePackages);
router.get("/popular", vaultPackageController.getPopularPackages);
router.get("/collecto/:collectoId", vaultPackageController.getPackagesByCollectoId);

// CRUD routes
router.get("/:id", vaultPackageController.getPackageById);
router.post("/", vaultPackageController.createPackage);
router.put("/:id", vaultPackageController.updatePackage);
router.delete("/:id", vaultPackageController.deletePackage);

// Specific update routes
router.patch("/:id/price", vaultPackageController.updatePrice);
router.patch("/:id/points", vaultPackageController.updatePointsAmount);
router.patch("/:id/name", vaultPackageController.updateName);

// Status management routes
router.patch("/:id/activate", vaultPackageController.activatePackage);
router.patch("/:id/deactivate", vaultPackageController.deactivatePackage);
router.patch("/:id/mark-popular", vaultPackageController.markAsPopular);
router.patch("/:id/unmark-popular", vaultPackageController.unmarkAsPopular);

export default router;
