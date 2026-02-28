import { Router } from "express";
import { CustomerController } from "../contollers/customer.controller";
import { CustomerService } from "../services/customer.service";
import { CustomerRepository } from "../repositories/customer.repository";
import { TierRepository } from "../repositories/tier.repository";
import { EarningRuleRepository } from "../repositories/earning-rule.repository";
import { TransactionRepository } from "../repositories/transaction.repository";

export const CustomerRoutes = (): Router => {
  const router = Router();

  // Initialize repositories and services
  const customerRepository = new CustomerRepository();
  const tierRepository = new TierRepository();
  const earningRuleRepository = new EarningRuleRepository();
  const tranRepo = new TransactionRepository();
  const customerService = new CustomerService(
    customerRepository,
    tierRepository,
    earningRuleRepository,
    tranRepo
  );

  const customerController = new CustomerController(customerService);

  router.get("/all", customerController.getAllCustomers);

  router.get("/dashboard", customerController.AdminDashboardStats);
  
  router.get("/", customerController.getAllCustomers);

  router.get("/client/:clientId", customerController.getCustomerByClientId);
  
  router.get("/:id", customerController.getCustomerById);

  router.patch("/:id", customerController.updateCustomer);

  router.delete("/:id", customerController.deactivateCustomer);

  return router;
};
