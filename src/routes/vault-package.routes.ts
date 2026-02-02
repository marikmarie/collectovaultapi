import { Router } from "express";
import { VaultPackageController } from "../contollers/vault-package.controller";
import { VaultPackageService } from "../services/vault-package.service";
import { VaultPackageRepository } from "../repositories/vault-package.repository";

const router = Router();

// Initialize dependencies
const vaultPackageRepository = new VaultPackageRepository();
const vaultPackageService = new VaultPackageService(vaultPackageRepository);
const vaultPackageController = new VaultPackageController(vaultPackageService);

// Create a package for a specific collecto/vendor - explicit route (MUST be before generic /:collectoId)
router.post("/create/:collectoId", vaultPackageController.createPackage);

// Update package by id - explicit route
router.put("/update/:id", vaultPackageController.updatePackage);

// Delete package for a vendor - explicit route
router.delete("/delete/:collectoId/:id", vaultPackageController.deletePackage);

// Get package by id or packages by collectoId (must be before generic /:collectoId for server mode)
router.get("/:id", vaultPackageController.getPackageById);

// Get packages for a specific collecto/vendor (MUST be last, matches any single param)
router.get("/:collectoId", vaultPackageController.getPackagesByCollectoId);

export default router;
