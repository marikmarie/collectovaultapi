import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { Customer } from "../models/Customer.model";
import { TransactionRepository } from "../repositories/transaction.repository"; 

export interface CreateCustomerDTO {
  collectoId: string;
  clientId: string;
  name: string;
}

export interface UpdateCustomerDTO {
  name?: string;
}

export interface InvoicePaymentData {
  amount: number;
  invoiceId?: string;
  ruleId?: number;
}



export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly tierRepository: TierRepository,
    private readonly earningRuleRepository: EarningRuleRepository,
    private readonly tranRepository: TransactionRepository
  ) {}

  async getAllCustomers(collectoId?: string): Promise<Customer[]> {
    return this.customerRepository.findAll(collectoId);
  }

  async getCustomerById(id: number): Promise<Customer> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with id ${id} not found`);
    }
    return customer;
  }

  async getCustomerByClientId(clientId: string, collectoId?: string): Promise<Customer> {
    const customer = await this.customerRepository.findByClientId(clientId, collectoId);
    if (!customer) {
      throw new Error(`Customer with clientId ${clientId} not found`);
    }
    return customer;
  }

  async getOrCreateCustomer(
    collectoId: string,
    clientId: string,
    name: string
  ): Promise<Customer> {
    // Try to find existing customer
    const existingCustomer = await this.customerRepository.findByClientId(clientId, collectoId);
    if (existingCustomer) {
      return existingCustomer;
    }

    // Create new customer
    return this.customerRepository.create(collectoId, clientId, name);
  }

  async createCustomer(dto: CreateCustomerDTO): Promise<Customer> {
    // Validate
    if (!dto.collectoId || !dto.clientId || !dto.name) {
      throw new Error("collectoId, clientId, and name are required");
    }

    // Check if customer already exists
    const existing = await this.customerRepository.findByClientId(dto.clientId, dto.collectoId);
    if (existing) {
      throw new Error(`Customer with clientId ${dto.clientId} already exists for this collectoId`);
    }

    return this.customerRepository.create(
      dto.collectoId,
      dto.clientId,
      dto.name
    );
  }

  async updateCustomer(id: number, dto: UpdateCustomerDTO): Promise<Customer> {
    const customer = await this.getCustomerById(id);

    return this.customerRepository.update(id, {
      name: dto.name ?? customer.name,
    }) as Promise<Customer>;
  }


  /**
   * Redeem points - when customer uses points
   */
  // async redeemPoints(customerId: number, pointsToRedeem: number): Promise<Customer> {
  //   if (pointsToRedeem <= 0) {
  //     throw new Error("Points to redeem must be greater than 0");
  //   }

  //   const customer = await this.getCustomerById(customerId);

  //   if (customer.currentPoints < pointsToRedeem) {
  //     throw new Error(
  //       `Insufficient points. Customer has ${customer.currentPoints}, trying to redeem ${pointsToRedeem}`
  //     );
  //   }

  //   const updated = (await this.customerRepository.redeemPoints(
  //     customerId,
  //     pointsToRedeem
  //   )) as Customer;

  //   // Check if tier should be downgraded
  //   const newTier = await this.determineTierForPoints(updated.collectoId, updated.currentPoints);
  //   if (newTier?.id !== updated.currentTierId) {
  //     return (await this.customerRepository.updateTier(customerId, newTier?.id ?? null)) as Customer;
  //   }

  //   return updated;
  // }


  async getCustomerStats(collectoId: string) {
    try {
      const customers = await this.customerRepository.findByCollectoId(collectoId);

      return {
        totalCustomers: customers.length,
        totalPoints: customers.reduce((sum, c) => sum + c.currentPoints, 0),
        totalPurchased: customers.reduce((sum, c) => sum + c.totalPurchased, 0),
        averagePointsPerCustomer:
          customers.length > 0
            ? Math.floor(customers.reduce((sum, c) => sum + c.currentPoints, 0) / customers.length)
            : 0,
      };
    } catch (error) {
      console.error("Error getting customer stats:", error);
      throw error;
    }
  }

  async deactivateCustomer(id: number): Promise<Customer> {
    const customer = await this.getCustomerById(id);
    const deactivated = await this.customerRepository.deactivate(id);

    if (!deactivated) {
      throw new Error(`Failed to deactivate customer ${id}`);
    }

    return deactivated;
  }



   /**
   * 
   AdminDashboardStats
  totalUsers: number;
  totalPointsIssued: number;
  topTierMembers: number;
  packageRevenue: string;
   */

  async getAllClientDetails(collectoId: string): Promise<any> {
    try {
      // Fetch all customers for the given collectoId
      const customers = await this.customerRepository.findByCollectoId(collectoId);
      const totalUsers = customers.length;
      const totalPointsIssued = customers.reduce((sum, c) => sum + c.earnedPoints, 0);

      // Calculate top tier members
      const tiers = await this.tierRepository.findAll(false);
      const topTier = tiers.reduce((prev, current) =>
        prev.pointsRequired > current.pointsRequired ? prev : current
      );
      const topTierMembers = customers.filter(c => c.currentTierId === topTier.id).length;
      // For package revenue, its the vault_transaction table from transaction_repository
      const transactions = await this.tranRepository.findByCollectoId(collectoId);
      const packageRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
     
      return {
        totalUsers,
        totalPointsIssued,
        topTierMembers,
        packageRevenue: `UGX ${packageRevenue.toLocaleString()}`,
      };
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      throw error;
    }
  }

  /**
   * Get tier information by tier ID
   */
  async getTierInfo(tierId: number | null) {
    if (!tierId) {
      return null;
    }
    const tier = await this.tierRepository.findById(tierId);
    if (!tier) {
      return null;
    }
    return {
      id: tier.id,
      name: tier.name,
      pointsRequired: tier.pointsRequired,
      earningMultiplier: tier.earningMultiplier,
      isActive: tier.isActive,
    };
  }

  /**
   * Get all active tiers
   */
  async getAllTiers() {
    const allTiers = await this.tierRepository.findAll(false);
    return allTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      pointsRequired: tier.pointsRequired,
      earningMultiplier: tier.earningMultiplier,
      isActive: tier.isActive,
    }));
  }
  
}
