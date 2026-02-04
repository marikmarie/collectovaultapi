import { Request, Response, NextFunction } from "express";
import { CustomerService } from "../services/customer.service";

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Get all customers for a collectoId
   */
  getAllCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const collectoId = req.query.collectoId as string | undefined;

      if (!collectoId) {
        res.status(400).json({
          success: false,
          error: "collectoId query parameter is required",
        });
        return;
      }

      const customers = await this.customerService.getAllCustomers(collectoId);

      res.status(200).json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get customer by ID
   */
  getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid customer ID",
        });
        return;
      }

      const customer = await this.customerService.getCustomerById(id);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Get customer by clientId
   */
  getCustomerByClientId = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const clientId = req.params.clientId;
      const collectoId = req.query.collectoId as string | undefined;

      if (!clientId) {
        res.status(400).json({
          success: false,
          error: "clientId parameter is required",
        });
        return;
      }

      const customer = await this.customerService.getCustomerByClientId(clientId, collectoId);

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * 
   AdminDashboardStats
  totalUsers: number;
  totalPointsIssued: number;
  topTierMembers: number;
  packageRevenue: string;
   */

  AdminDashboardStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const stats = await this.customerService.getAllClientDetails("all");
      console.log("Admin Dashboard Stats fetched:", stats);
      res.status(200).json({
        success: true,
        data: stats,
      });
    }
    catch (err) {
      next(err);
    }
  };
  /**
   * Create a new customer
   */


  createCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { collectoId, clientId, name } = req.body;

      if (!collectoId || !clientId || !name) {
        res.status(400).json({
          success: false,
          error: "collectoId, clientId, and name are required",
        });
        return;
      }

      const customer = await this.customerService.createCustomer({
        collectoId,
        clientId,
        name,
      });

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Update customer details
   */
  updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name } = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid customer ID",
        });
        return;
      }

      const customer = await this.customerService.updateCustomer(id, {
        name,
      });

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  };




  getCustomerStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const collectoId = req.query.collectoId as string | undefined;

      if (!collectoId) {
        res.status(400).json({
          success: false,
          error: "collectoId query parameter is required",
        });
        return;
      }

      const stats = await this.customerService.getCustomerStats(collectoId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Deactivate customer
   */
  deactivateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: "Invalid customer ID",
        });
        return;
      }

      const customer = await this.customerService.deactivateCustomer(id);

      res.status(200).json({
        success: true,
        message: "Customer deactivated successfully",
        data: customer,
      });
    } catch (err) {
      next(err);
    }
  };
}
