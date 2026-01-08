import { TierRepository } from "../repositories/tier.repository";
import { Tier } from "../models/Tier.model";

export interface CreateTierDTO {
  collectoId: string;
  name: string;
  pointsRequired: number;
  earningMultiplier: number;
  createdBy: string;
}

export interface UpdateTierDTO {
  name?: string;
  pointsRequired?: number;
  earningMultiplier?: number;
  isActive?: boolean;
}

export class TierService {
  constructor(private readonly tierRepository: TierRepository) {}

  async getAllTiers(includeInactive = false, collectoId?: string): Promise<Tier[]> {
    return this.tierRepository.findAll(includeInactive, collectoId);
  }

  async getTierById(id: number): Promise<Tier> {
    const tier = await this.tierRepository.findById(id);
    if (!tier) {
      throw new Error(`Tier with id ${id} not found`);
    }
    return tier;
  }

  async getTierByName(name: string): Promise<Tier> {
    const tier = await this.tierRepository.findByName(name);
    if (!tier) {
      throw new Error(`Tier with name ${name} not found`);
    }
    return tier;
  }

  async createTier(dto: CreateTierDTO): Promise<Tier> {
    // Validate inputs
    this.validateTierData(dto);

    if (!dto.collectoId || typeof dto.collectoId !== 'string') {
      throw new Error('collectoId is required');
    }

    // Check for duplicate name
    const existingTier = await this.tierRepository.findByName(dto.name);
    if (existingTier) {
      throw new Error(`Tier with name ${dto.name} already exists`);
    }

    return this.tierRepository.create(
      dto.collectoId,
      dto.name,
      dto.pointsRequired,
      dto.earningMultiplier,
      dto.createdBy
    );
  }

  async updateTier(id: number, dto: UpdateTierDTO): Promise<Tier> {
    // Check if tier exists
    await this.getTierById(id);

    // Validate updates
    if (dto.earningMultiplier !== undefined && dto.earningMultiplier <= 0) {
      throw new Error("Earning multiplier must be greater than zero");
    }

    if (dto.pointsRequired !== undefined && dto.pointsRequired < 0) {
      throw new Error("Points required cannot be negative");
    }

    // Check for duplicate name if name is being updated
    if (dto.name) {
      const existingTier = await this.tierRepository.findByName(dto.name);
      if (existingTier && existingTier.id !== id) {
        throw new Error(`Tier with name ${dto.name} already exists`);
      }
    }

    const updatedTier = await this.tierRepository.update(id, dto);
    if (!updatedTier) {
      throw new Error(`Failed to update tier with id ${id}`);
    }

    return updatedTier;
  }

  async deactivateTier(id: number): Promise<Tier> {
    const tier = await this.getTierById(id);

    if (!tier.isActive) {
      throw new Error(`Tier with id ${id} is already inactive`);
    }

    const deactivatedTier = await this.tierRepository.softDelete(id);
    if (!deactivatedTier) {
      throw new Error(`Failed to deactivate tier with id ${id}`);
    }

    return deactivatedTier;
  }

  async deleteTier(id: number): Promise<void> {
    const tier = await this.getTierById(id);

    const deleted = await this.tierRepository.delete(id);
    if (!deleted) {
      throw new Error(`Failed to delete tier with id ${id}`);
    }
  }

  async updateMultiplier(id: number, multiplier: number): Promise<Tier> {
    if (multiplier <= 0) {
      throw new Error("Earning multiplier must be greater than zero");
    }

    return this.updateTier(id, { earningMultiplier: multiplier });
  }

  private validateTierData(dto: CreateTierDTO): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new Error("Tier name is required");
    }

    if (dto.name.length > 100) {
      throw new Error("Tier name must be 100 characters or less");
    }

    if (dto.pointsRequired < 0) {
      throw new Error("Points required cannot be negative");
    }

    if (dto.earningMultiplier <= 0) {
      throw new Error("Earning multiplier must be greater than zero");
    }

    if (!dto.createdBy || dto.createdBy.trim().length === 0) {
      throw new Error("Created by is required");
    }
  }
}
