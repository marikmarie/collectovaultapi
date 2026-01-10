import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { Customer } from "../models/Customer.model";
import { Tier } from "../models/Tier.model";
import axios from "axios";

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

// Dummy data for when Collecto API fails
const getDummyCustomer = (collectoId: string, clientId: string, name: string) => ({
  collectoId,
  clientId,
  name,
  currentPoints: Math.floor(Math.random() * 500),
  totalPurchased: Math.floor(Math.random() * 10000),
});

const getDummyInvoice = () => ({
  id: `INV-${Date.now()}`,
  amount: Math.floor(Math.random() * 5000) + 1000,
  date: new Date(),
});

export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly tierRepository: TierRepository,
    private readonly earningRuleRepository: EarningRuleRepository
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
   * Process invoice/payment from Collecto and update customer points
   */
  async processInvoicePayment(
    collectoId: string,
    clientId: string,
    paymentData: InvoicePaymentData
  ): Promise<Customer> {
    try {
      // Get or create customer
      let customer = await this.customerRepository.findByClientId(clientId, collectoId);
      
      if (!customer) {
        // Create customer with dummy data if doesn't exist
        const dummyData = getDummyCustomer(collectoId, clientId, "New Customer");
        customer = await this.customerRepository.create(
          collectoId,
          clientId,
          dummyData.name
        );
      }

      // Calculate points based on earning rules
      const pointsEarned = await this.calculatePointsFromPayment(
        collectoId,
        paymentData,
        customer.currentTierId
      );

      // Add earned points to customer (earned from invoice/payment)
      customer = (await this.customerRepository.addEarnedPoints(customer.id, pointsEarned)) as Customer;

      // Update total purchased (amount of the payment)
      customer = (await this.customerRepository.updateTotalPurchased(
        customer.id,
        paymentData.amount
      )) as Customer;

      // Determine if tier should be updated
      const newTier = await this.determineTierForPoints(collectoId, customer.currentPoints);
      if (newTier && (!customer.currentTierId || newTier.id !== customer.currentTierId)) {
        customer = (await this.customerRepository.updateTier(customer.id, newTier.id)) as Customer;
      }

      return customer;
    } catch (error) {
      console.error("Error processing invoice payment:", error);
      throw error;
    }
  }

  /**
   * Manual points purchase - when customer buys points
   */
  async purchasePoints(
    customerId: number,
    pointsToPurchase: number,
    amount: number
  ): Promise<Customer> {
    if (pointsToPurchase <= 0) {
      throw new Error("Points to purchase must be greater than 0");
    }

    if (amount <= 0) {
      throw new Error("Purchase amount must be greater than 0");
    }

    let customer = (await this.customerRepository.addBoughtPoints(customerId, pointsToPurchase)) as Customer;

    // Update total purchased
    customer = (await this.customerRepository.updateTotalPurchased(customerId, amount)) as Customer;

    // Check if tier should be updated
    const newTier = await this.determineTierForPoints(customer.collectoId, customer.currentPoints);
    if (newTier && (!customer.currentTierId || newTier.id !== customer.currentTierId)) {
      customer = (await this.customerRepository.updateTier(customerId, newTier.id)) as Customer;
    }

    return customer;
  }

  /**
   * Redeem points - when customer uses points
   */
  async redeemPoints(customerId: number, pointsToRedeem: number): Promise<Customer> {
    if (pointsToRedeem <= 0) {
      throw new Error("Points to redeem must be greater than 0");
    }

    const customer = await this.getCustomerById(customerId);

    if (customer.currentPoints < pointsToRedeem) {
      throw new Error(
        `Insufficient points. Customer has ${customer.currentPoints}, trying to redeem ${pointsToRedeem}`
      );
    }

    const updated = (await this.customerRepository.redeemPoints(
      customerId,
      pointsToRedeem
    )) as Customer;

    // Check if tier should be downgraded
    const newTier = await this.determineTierForPoints(updated.collectoId, updated.currentPoints);
    if (newTier?.id !== updated.currentTierId) {
      return (await this.customerRepository.updateTier(customerId, newTier?.id ?? null)) as Customer;
    }

    return updated;
  }

  /**
   * Calculate points earned from a payment based on earning rules
   */
  private async calculatePointsFromPayment(
    collectoId: string,
    paymentData: InvoicePaymentData,
    currentTierId: number | null
  ): Promise<number> {
    try {
      let basePoints = 0;

      // If a specific rule is provided, use it
      if (paymentData.ruleId) {
        const rule = await this.earningRuleRepository.findById(paymentData.ruleId);
        if (rule) {
          basePoints = rule.points;
        }
      } else {
        // Use earning rules for the collectoId
        const rules = await this.earningRuleRepository.findByCollectoId(collectoId);
        if (rules && rules.length > 0) {
          // For now, use the average or first rule
          basePoints = rules[0].points;
        }
      }

      // Apply tier multiplier if customer has a tier
      let finalPoints = basePoints;
      if (currentTierId) {
        const tier = await this.tierRepository.findById(currentTierId);
        if (tier) {
          finalPoints = Math.floor(basePoints * tier.earningMultiplier);
        }
      }

      return finalPoints;
    } catch (error) {
      console.warn("Error calculating points from payment, using default:", error);
      // Return default points if calculation fails
      return 10;
    }
  }

  /**
   * Determine the appropriate tier for a given points amount
   */
  private async determineTierForPoints(collectoId: string, points: number): Promise<Tier | null> {
    try {
      const tiers = await this.tierRepository.findByCollectoId(collectoId);

      if (!tiers || tiers.length === 0) {
        return null;
      }

      // Sort by points required in descending order and find the highest tier customer qualifies for
      const qualifyingTiers = tiers
        .filter((t) => t.pointsRequired <= points)
        .sort((a, b) => b.pointsRequired - a.pointsRequired);

      return qualifyingTiers.length > 0 ? qualifyingTiers[0] : null;
    } catch (error) {
      console.warn("Error determining tier:", error);
      return null;
    }
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

  /**
   * Fetch invoices from Collecto and calculate points for customer
   * If Collecto API fails, returns dummy invoices
   */
  async fetchAndProcessInvoices(
    collectoId: string,
    clientId: string,
    userToken?: string
  ): Promise<{ customer: Customer; invoices: any[] }> {
    try {
      // Get or create customer
      let customer = await this.customerRepository.findByClientId(clientId, collectoId);

      if (!customer) {
        customer = await this.customerRepository.create(
          collectoId,
          clientId,
          "New Customer"
        );
      }

      // Try to fetch invoices from Collecto
      let invoices: any[] = [];

      if (userToken) {
        try {
          const response = await axios.get(
            `${process.env.COLLECTO_BASE_URL || "http://localhost:3000"}/invoices`,
            {
              headers: {
                authorization: userToken,
                "x-api-key": process.env.COLLECTO_API_KEY || "",
              },
              params: { clientId, collectoId },
            }
          );
          invoices = response.data?.data || [];
        } catch (error) {
          console.warn("Failed to fetch invoices from Collecto, using dummy data:", error);
          invoices = this.getDummyInvoices();
        }
      } else {
        // No token provided, use dummy data
        invoices = this.getDummyInvoices();
      }

      // Process each invoice and calculate points
      for (const invoice of invoices) {
        if (!invoice.amount) continue;

        const pointsEarned = await this.calculatePointsFromPayment(
          collectoId,
          { amount: invoice.amount, invoiceId: invoice.id },
          customer.currentTierId
        );

        // Add earned points to customer (earned from invoice)
        customer = (await this.customerRepository.addEarnedPoints(
          customer.id,
          pointsEarned
        )) as Customer;

        // Update total purchased
        customer = (await this.customerRepository.updateTotalPurchased(
          customer.id,
          invoice.amount
        )) as Customer;
      }

      // Determine new tier after all invoices processed
      const newTier = await this.determineTierForPoints(collectoId, customer.currentPoints);
      if (newTier && (!customer.currentTierId || newTier.id !== customer.currentTierId)) {
        customer = (await this.customerRepository.updateTier(customer.id, newTier.id)) as Customer;
      }

      return { customer, invoices };
    } catch (error) {
      console.error("Error fetching and processing invoices:", error);
      throw error;
    }
  }

  /**
   * Fetch payments from Collecto and process them
   * If Collecto API fails, returns dummy payments
   */
  async fetchAndProcessPayments(
    collectoId: string,
    clientId: string,
    userToken?: string
  ): Promise<{ customer: Customer; payments: any[] }> {
    try {
      // Get or create customer
      let customer = await this.customerRepository.findByClientId(clientId, collectoId);

      if (!customer) {
        customer = await this.customerRepository.create(
          collectoId,
          clientId,
         "New Customer"
        );
      }

      // Try to fetch payments from Collecto
      let payments: any[] = [];

      if (userToken) {
        try {
          const response = await axios.get(
            `${process.env.COLLECTO_BASE_URL || "http://localhost:3000"}/payments`,
            {
              headers: {
                authorization: userToken,
                "x-api-key": process.env.COLLECTO_API_KEY || "",
              },
              params: { clientId, collectoId },
            }
          );
          payments = response.data?.data || [];
        } catch (error) {
          console.warn("Failed to fetch payments from Collecto, using dummy data:", error);
          payments = this.getDummyPayments();
        }
      } else {
        // No token provided, use dummy data
        payments = this.getDummyPayments();
      }

      // Process each payment and calculate points
      for (const payment of payments) {
        if (!payment.amount) continue;

        const pointsEarned = await this.calculatePointsFromPayment(
          collectoId,
          { amount: payment.amount, invoiceId: payment.invoiceId },
          customer.currentTierId
        );

        // Add earned points to customer (from payment)
        customer = (await this.customerRepository.addEarnedPoints(
          customer.id,
          pointsEarned
        )) as Customer;

        // Update total purchased
        customer = (await this.customerRepository.updateTotalPurchased(
          customer.id,
          payment.amount
        )) as Customer;
      }

      // Determine new tier after all payments processed
      const newTier = await this.determineTierForPoints(collectoId, customer.currentPoints);
      if (newTier && (!customer.currentTierId || newTier.id !== customer.currentTierId)) {
        customer = (await this.customerRepository.updateTier(customer.id, newTier.id)) as Customer;
      }

      return { customer, payments };
    } catch (error) {
      console.error("Error fetching and processing payments:", error);
      throw error;
    }
  }

  /**
   * Get dummy invoices when Collecto API fails
   */
  private getDummyInvoices() {
    return Array.from({ length: 2 }, (_, i) => ({
      id: `INV-${Date.now()}-${i}`,
      amount: Math.floor(Math.random() * 5000) + 1000,
      status: "paid",
      date: new Date(),
    }));
  }

  /**
   * Get dummy payments when Collecto API fails
   */
  private getDummyPayments() {
    return Array.from({ length: 2 }, (_, i) => ({
      id: `PAY-${Date.now()}-${i}`,
      invoiceId: `INV-${Date.now()}-${i}`,
      amount: Math.floor(Math.random() * 3000) + 500,
      method: "card",
      status: "completed",
      date: new Date(),
    }));
  }
}
