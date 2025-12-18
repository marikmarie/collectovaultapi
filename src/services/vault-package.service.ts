// services/vault-package.service.ts
import { VaultPackageRepository } from "../repositories/vault-package.repository";
import { VaultPackage } from "../models/Package.model";

export interface CreateVaultPackageDTO {
  name: string;
  pointsAmount: number;
  price: number;
  createdBy: string;
  isPopular?: boolean;
}

export interface UpdateVaultPackageDTO {
  name?: string;
  pointsAmount?: number;
  price?: number;
  isActive?: boolean;
  isPopular?: boolean;
}

export class VaultPackageService {
  constructor(
    private readonly vaultPackageRepository: VaultPackageRepository
  ) {}

  async getAllPackages(includeInactive = false): Promise<VaultPackage[]> {
    return this.vaultPackageRepository.findAll(includeInactive);
  }

  async getActivePackages(): Promise<VaultPackage[]> {
    return this.vaultPackageRepository.findActive();
  }

  async getPopularPackages(): Promise<VaultPackage[]> {
    return this.vaultPackageRepository.findPopular();
  }

  async getPackageById(id: number): Promise<VaultPackage> {
    const vaultPackage = await this.vaultPackageRepository.findById(id);
    if (!vaultPackage) {
      throw new Error(`Vault package with id ${id} not found`);
    }
    return vaultPackage;
  }

  async getPackageByName(name: string): Promise<VaultPackage> {
    const vaultPackage = await this.vaultPackageRepository.findByName(name);
    if (!vaultPackage) {
      throw new Error(`Vault package with name ${name} not found`);
    }
    return vaultPackage;
  }

  async createPackage(dto: CreateVaultPackageDTO): Promise<VaultPackage> {
    // Validate inputs
    this.validatePackageData(dto);

    // Check for duplicate name
    const existingPackage = await this.vaultPackageRepository.findByName(
      dto.name
    );
    if (existingPackage) {
      throw new Error(`Vault package with name ${dto.name} already exists`);
    }

    return this.vaultPackageRepository.create(
      dto.name,
      dto.pointsAmount,
      dto.price,
      dto.createdBy,
      dto.isPopular || false
    );
  }

  async updatePackage(
    id: number,
    dto: UpdateVaultPackageDTO
  ): Promise<VaultPackage> {
    // Check if package exists
    await this.getPackageById(id);

    // Validate updates
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new Error("Name cannot be empty");
      }
      if (trimmedName.length > 100) {
        throw new Error("Name must be 100 characters or less");
      }

      // Check for duplicate name
      const existingPackage = await this.vaultPackageRepository.findByName(
        trimmedName
      );
      if (existingPackage && existingPackage.id !== id) {
        throw new Error(
          `Vault package with name ${trimmedName} already exists`
        );
      }
    }

    if (dto.price !== undefined && dto.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (dto.pointsAmount !== undefined && dto.pointsAmount < 0) {
      throw new Error("Points cannot be negative");
    }

    const updatedPackage = await this.vaultPackageRepository.update(id, dto);
    if (!updatedPackage) {
      throw new Error(`Failed to update vault package with id ${id}`);
    }

    return updatedPackage;
  }

  async updatePrice(id: number, newPrice: number): Promise<VaultPackage> {
    if (newPrice < 0) {
      throw new Error("Price cannot be negative");
    }

    return this.updatePackage(id, { price: newPrice });
  }

  async updatePointsAmount(id: number, points: number): Promise<VaultPackage> {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }

    return this.updatePackage(id, { pointsAmount: points });
  }

  async updateName(id: number, newName: string): Promise<VaultPackage> {
    if (!newName.trim()) {
      throw new Error("Name cannot be empty");
    }

    return this.updatePackage(id, { name: newName });
  }

  async activatePackage(id: number): Promise<VaultPackage> {
    const vaultPackage = await this.getPackageById(id);

    if (vaultPackage.isActive) {
      throw new Error(`Vault package with id ${id} is already active`);
    }

    const activatedPackage = await this.vaultPackageRepository.activate(id);
    if (!activatedPackage) {
      throw new Error(`Failed to activate vault package with id ${id}`);
    }

    return activatedPackage;
  }

  async deactivatePackage(id: number): Promise<VaultPackage> {
    const vaultPackage = await this.getPackageById(id);

    if (!vaultPackage.isActive) {
      throw new Error(`Vault package with id ${id} is already inactive`);
    }

    const deactivatedPackage = await this.vaultPackageRepository.softDelete(id);
    if (!deactivatedPackage) {
      throw new Error(`Failed to deactivate vault package with id ${id}`);
    }

    return deactivatedPackage;
  }

  async markAsPopular(id: number): Promise<VaultPackage> {
    const vaultPackage = await this.getPackageById(id);

    if (vaultPackage.isPopular) {
      throw new Error(
        `Vault package with id ${id} is already marked as popular`
      );
    }

    const markedPackage = await this.vaultPackageRepository.markAsPopular(id);
    if (!markedPackage) {
      throw new Error(`Failed to mark vault package with id ${id} as popular`);
    }

    return markedPackage;
  }

  async unmarkAsPopular(id: number): Promise<VaultPackage> {
    const vaultPackage = await this.getPackageById(id);

    if (!vaultPackage.isPopular) {
      throw new Error(`Vault package with id ${id} is not marked as popular`);
    }

    const unmarkedPackage = await this.vaultPackageRepository.unmarkAsPopular(
      id
    );
    if (!unmarkedPackage) {
      throw new Error(
        `Failed to unmark vault package with id ${id} as popular`
      );
    }

    return unmarkedPackage;
  }

  async deletePackage(id: number): Promise<void> {
    await this.getPackageById(id);

    const deleted = await this.vaultPackageRepository.delete(id);
    if (!deleted) {
      throw new Error(`Failed to delete vault package with id ${id}`);
    }
  }

  private validatePackageData(dto: CreateVaultPackageDTO): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error("Package name is required");
    }

    if (dto.name.length > 100) {
      throw new Error("Package name must be 100 characters or less");
    }

    if (dto.pointsAmount < 0) {
      throw new Error("Points cannot be negative");
    }

    if (dto.price < 0) {
      throw new Error("Price cannot be negative");
    }

    if (!dto.createdBy || dto.createdBy.trim().length === 0) {
      throw new Error("Created by is required");
    }
  }
}
