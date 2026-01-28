import { Router } from "express";
import { VaultPackageController } from "../contollers/vault-package.controller";
import { VaultPackageService } from "../services/vault-package.service";
import { VaultPackageRepository } from "../repositories/vault-package.repository";

const router = Router();

// Initialize dependencies
const vaultPackageRepository = new VaultPackageRepository();
const vaultPackageService = new VaultPackageService(vaultPackageRepository);
const vaultPackageController = new VaultPackageController(vaultPackageService);


// Get packages for a specific collecto/vendor
router.get("/:collectoId", vaultPackageController.getPackagesByCollectoId);

// Create a package for a specific collecto/vendor - explicit route
router.post("/create/:collectoId", vaultPackageController.createPackage);

// Update package by id - explicit route
router.put("/update/:id", vaultPackageController.updatePackage);

// Delete package for a vendor - explicit route
router.delete("/delete/:collectoId/:id", vaultPackageController.deletePackage);

export default router;
