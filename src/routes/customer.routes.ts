import { Router } from "express";
import { CustomerController } from "../contollers/customer.controller";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";

export const CustomerRoutes = (): Router => {
  const router = Router();

  // Initialize repositories and services
  const customerRepository = new CustomerRepository();
  const tierRepository = new TierRepository();
  const earningRuleRepository = new EarningRuleRepository();
  const customerService = new CustomerService(
    customerRepository,
    tierRepository,
    earningRuleRepository
  );

  const customerController = new CustomerController(customerService);

  router.get("/", customerController.getAllCustomers);
  router.get("/stats", customerController.getCustomerStats);

  router.get("/info/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { collectoId } = req.query;

      if (!clientId) {
        return res.status(400).json({
          message: "clientId is required",
        });
      }

      

      console.log("Fetching customer info for clientId:", clientId, "collectoId:", collectoId);
      
      // Get customer by clientId 
      const customer = await customerRepository.findByClientId(
        clientId,
        collectoId ? String(collectoId) : undefined
      );

      console.log("Customer fetched:", customer);
      if (!customer) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }

      // Get current tier information
      let currentTier = null;
      if (customer.currentTierId) {
        currentTier = await tierRepository.findById(customer.currentTierId);
      }

      // Get all tiers for threshold information
      const allTiers = await tierRepository.findAll(false);

      return res.json({
        success: true,
        customer: {
          id: customer.id,
          collectoId: customer.collectoId,
          clientId: customer.clientId,
          name: customer.name,
          currentPoints: customer.currentPoints,
          earnedPoints: customer.earnedPoints,
          boughtPoints: customer.boughtPoints,
          totalPurchased: customer.totalPurchased,
          isActive: customer.isActive,
        },
        currentTier: currentTier
          ? {
              id: currentTier.id,
              name: currentTier.name,
              pointsRequired: currentTier.pointsRequired,
              earningMultiplier: currentTier.earningMultiplier,
              isActive: currentTier.isActive,
            }
          : null,
        tiers: allTiers.map((tier) => ({
          id: tier.id,
          name: tier.name,
          pointsRequired: tier.pointsRequired,
          earningMultiplier: tier.earningMultiplier,
          isActive: tier.isActive,
        })),
      });
    } catch (error: any) {
      console.error("Error fetching customer info:", error);
      console.error("Error type:", typeof error);
      console.error("Error toString:", error?.toString?.());
      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer information",
        error: error?.message || error?.toString?.() || JSON.stringify(error) || "Unknown error",
        errorType: typeof error
      });
    }
  });
  router.get("/client/:clientId", customerController.getCustomerByClientId);
  router.get("/:id", customerController.getCustomerById);

  // POST endpoints
  router.post("/", customerController.createCustomer);
  router.post("/invoice-payment", customerController.processInvoicePayment);
  router.post("/:customerId/purchase-points", customerController.purchasePoints);
 // router.post("/:customerId/redeem-points", customerController.redeemPoints);

  // PUT/PATCH endpoints
  router.patch("/:id", customerController.updateCustomer);

  // DELETE endpoints
  router.delete("/:id", customerController.deactivateCustomer);

  return router;
};
