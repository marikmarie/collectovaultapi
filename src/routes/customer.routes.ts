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

  // GET endpoints
  router.get("/", customerController.getAllCustomers);
  router.get("/stats", customerController.getCustomerStats);
  router.get("/:id", customerController.getCustomerById);
  router.get("/client/:clientId", customerController.getCustomerByClientId);

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
