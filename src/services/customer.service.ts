import { CustomerRepository } from "../repositories/customer.repository";
import { Customer } from "../models/Customer.model";
import { TransactionRepository } from "../repositories/transaction.repository"; 

export interface CreateCustomerDTO {
  collectoId: string;
  clientId: string;
  name: string;
}

export interface UpdateCustomerDTO {
  name?: string;
  username?: string;
}

export interface InvoicePaymentData {
  amount: number;
  invoiceId?: string;
  ruleId?: number;
}



export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
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

  async getCustomerByUsername(username: string): Promise<Customer> {
    const customer = await this.customerRepository.findByUsername(username);
    if (!customer) {
      throw new Error(`Customer with username ${username} not found`);
    }
    return customer;
  }

  async setUsername(clientId: string, username: string, collectoId?: string): Promise<Customer> {
    // Validate username format
    if (!username || username.trim().length === 0) {
      throw new Error("Username cannot be empty");
    }

    if (username.length < 3 || username.length > 100) {
      throw new Error("Username must be between 3 and 100 characters");
    }

    // Check if username already exists
    const existingWithUsername = await this.customerRepository.findByUsername(username);
    if (existingWithUsername) {
      throw new Error("Username already taken");
    }

    // Find customer by clientId
    const customer = await this.customerRepository.findByClientId(clientId, collectoId);
    if (!customer) {
      throw new Error(`Customer with clientId ${clientId} not found. Please login first.`);
    }

    // Update customer with username
    return this.customerRepository.update(customer.id, {
      username: username.trim(),
    }) as Promise<Customer>;
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

}


