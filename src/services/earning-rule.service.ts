import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { EarningRule } from "../models/EarningRules.model";

export interface CreateEarningRuleDTO {
  ruleTitle: string;
  description: string;
  points: number;
  createdBy: string;
}

export interface UpdateEarningRuleDTO {
  ruleTitle?: string;
  description?: string;
  points?: number;
  isActive?: boolean;
}

export class EarningRuleService {
  constructor(private readonly earningRuleRepository: EarningRuleRepository) {}

  async getAllRules(includeInactive = false): Promise<EarningRule[]> {
    return this.earningRuleRepository.findAll(includeInactive);
  }

  async getActiveRules(): Promise<EarningRule[]> {
    return this.earningRuleRepository.findActive();
  }

  async getRuleById(id: number): Promise<EarningRule> {
    const rule = await this.earningRuleRepository.findById(id);
    if (!rule) {
      throw new Error(`Earning rule with id ${id} not found`);
    }
    return rule;
  }

  async getRuleByTitle(ruleTitle: string): Promise<EarningRule> {
    const rule = await this.earningRuleRepository.findByTitle(ruleTitle);
    if (!rule) {
      throw new Error(`Earning rule with title ${ruleTitle} not found`);
    }
    return rule;
  }

  async getRulesByPointsRange(
    minPoints: number,
    maxPoints: number
  ): Promise<EarningRule[]> {
    if (minPoints < 0 || maxPoints < 0) {
      throw new Error("Points cannot be negative");
    }
    if (minPoints > maxPoints) {
      throw new Error("Minimum points cannot be greater than maximum points");
    }

    return this.earningRuleRepository.findByPointsRange(minPoints, maxPoints);
  }

  async createRule(dto: CreateEarningRuleDTO): Promise<EarningRule> {
    // Validate inputs
    this.validateRuleData(dto);

    // Check for duplicate title
    const existingRule = await this.earningRuleRepository.findByTitle(
      dto.ruleTitle
    );
    if (existingRule) {
      throw new Error(
        `Earning rule with title ${dto.ruleTitle} already exists`
      );
    }

    return this.earningRuleRepository.create(
      dto.ruleTitle,
      dto.description,
      dto.points,
      dto.createdBy
    );
  }

  async updateRule(
    id: number,
    dto: UpdateEarningRuleDTO
  ): Promise<EarningRule> {
    // Check if rule exists
    await this.getRuleById(id);

    // Validate updates
    if (dto.ruleTitle !== undefined) {
      const trimmedTitle = dto.ruleTitle.trim();
      if (!trimmedTitle) {
        throw new Error("Rule title cannot be empty");
      }
      if (trimmedTitle.length > 255) {
        throw new Error("Rule title must be 255 characters or less");
      }

      // Check for duplicate title
      const existingRule = await this.earningRuleRepository.findByTitle(
        trimmedTitle
      );
      if (existingRule && existingRule.id !== id) {
        throw new Error(
          `Earning rule with title ${trimmedTitle} already exists`
        );
      }
    }

    if (dto.description !== undefined) {
      const trimmedDescription = dto.description.trim();
      if (!trimmedDescription) {
        throw new Error("Description cannot be empty");
      }
    }

    if (dto.points !== undefined && dto.points < 0) {
      throw new Error("Points cannot be negative");
    }

    const updatedRule = await this.earningRuleRepository.update(id, dto);
    if (!updatedRule) {
      throw new Error(`Failed to update earning rule with id ${id}`);
    }

    return updatedRule;
  }

  async updatePoints(id: number, points: number): Promise<EarningRule> {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }

    return this.updateRule(id, { points });
  }

  async updateDetails(
    id: number,
    title: string,
    description: string
  ): Promise<EarningRule> {
    if (!title.trim()) {
      throw new Error("Rule title cannot be empty");
    }
    if (!description.trim()) {
      throw new Error("Description cannot be empty");
    }

    return this.updateRule(id, { ruleTitle: title, description });
  }

  async activateRule(id: number): Promise<EarningRule> {
    const rule = await this.getRuleById(id);

    if (rule.isActive) {
      throw new Error(`Earning rule with id ${id} is already active`);
    }

    const activatedRule = await this.earningRuleRepository.activate(id);
    if (!activatedRule) {
      throw new Error(`Failed to activate earning rule with id ${id}`);
    }

    return activatedRule;
  }

  async deactivateRule(id: number): Promise<EarningRule> {
    const rule = await this.getRuleById(id);

    if (!rule.isActive) {
      throw new Error(`Earning rule with id ${id} is already inactive`);
    }

    const deactivatedRule = await this.earningRuleRepository.softDelete(id);
    if (!deactivatedRule) {
      throw new Error(`Failed to deactivate earning rule with id ${id}`);
    }

    return deactivatedRule;
  }

  async deleteRule(id: number): Promise<void> {
    await this.getRuleById(id);

    const deleted = await this.earningRuleRepository.delete(id);
    if (!deleted) {
      throw new Error(`Failed to delete earning rule with id ${id}`);
    }
  }

  private validateRuleData(dto: CreateEarningRuleDTO): void {
    if (!dto.ruleTitle || dto.ruleTitle.trim().length === 0) {
      throw new Error("Rule title is required");
    }

    if (dto.ruleTitle.length > 255) {
      throw new Error("Rule title must be 255 characters or less");
    }

    if (!dto.description || dto.description.trim().length === 0) {
      throw new Error("Description is required");
    }

    if (dto.points < 0) {
      throw new Error("Points cannot be negative");
    }

    if (!dto.createdBy || dto.createdBy.trim().length === 0) {
      throw new Error("Created by is required");
    }
  }
}
