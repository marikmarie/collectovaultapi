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

// Get package by id
router.get("/:id", vaultPackageController.getPackageById);

// Create a package for a specific collecto/vendor
router.post("/:collectoId", vaultPackageController.createPackage);

// Delete package for a vendor (matches frontend path)
router.delete("/:collectoId/:id", vaultPackageController.deletePackage);

export default router;
