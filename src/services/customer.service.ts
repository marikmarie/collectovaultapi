import { CustomerRepository } from "../repositories/customer.repository";
import { Customer } from "../models/Customer.model";
import { TransactionRepository } from "../repositories/transaction.repository"; 

export interface CreateCustomerDTO {
  collectoId: string;
  clientId: string;
  username: string;
}

export interface UpdateCustomerDTO {
  username?: string;
  isActive?: boolean;
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

  async getCustomerByUsername(username: string, collectoId?: string): Promise<Customer> {
    const customers = await this.customerRepository.findByUsername(username, collectoId);
    if (customers.length === 0) {
      throw new Error(`Customer with username ${username} not found`);
    }
    return customers[0];
  }

  async setUsername(clientId: string, username: string, collectoId?: string): Promise<Customer> {
    if (!username || username.trim().length === 0) {
      throw new Error("Username cannot be empty");
    }
    if (username.length < 3 || username.length > 100) {
      throw new Error("Username must be between 3 and 100 characters");
    }
    const customer = await this.customerRepository.findByClientId(clientId, collectoId);
    if (!customer) {
      throw new Error(`Customer with clientId ${clientId} not found. Please login first.`);
    }
    try {
      return await this.customerRepository.update(customer.id, {
        username: username.trim(),
      }) as Customer;
    } catch (error: any) {
      if (error.message === "Username already taken") {
        throw new Error("Username already taken by another account");
      }
      throw error;
    }
  }

  async getOrCreateCustomer(
    collectoId: string,
    clientId: string,
    username: string
  ): Promise<Customer> {
    const existingCustomer = await this.customerRepository.findByClientId(clientId, collectoId);
    if (existingCustomer) {
      return existingCustomer;
    }
    return await this.customerRepository.create(collectoId, clientId, username);
  }

  async createCustomer(dto: CreateCustomerDTO): Promise<Customer> {
    if (!dto.collectoId || !dto.clientId || !dto.username) {
      throw new Error("collectoId, clientId, and username are required");
    }
    const existing = await this.customerRepository.findByClientId(dto.clientId, dto.collectoId);
    if (existing) {
      throw new Error(`Customer with clientId ${dto.clientId} already exists for this collectoId`);
    }
    return this.customerRepository.create(
      dto.collectoId,
      dto.clientId,
      dto.username
    );
  }

  async updateCustomer(id: number, dto: UpdateCustomerDTO): Promise<Customer> {
    const customer = await this.getCustomerById(id);
    return this.customerRepository.update(id, {
      username: dto.username ?? customer.username,
      isActive: dto.isActive ?? customer.isActive,
    }) as Promise<Customer>;
  }


  

  async getCustomerStats(collectoId: string) {
    try {
      const customers = await this.customerRepository.findByCollectoId(collectoId);
      return {
        totalCustomers: customers.length,
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


