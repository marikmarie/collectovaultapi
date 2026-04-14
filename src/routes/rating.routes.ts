import { Router, Request, Response } from "express";
import { RatingService } from "../services/rating.service";
import { RatingRepository } from "../repositories/rating.repository";

export const RatingRoutes = (): Router => {
  const router = Router();

  const ratingRepository = new RatingRepository();
  const ratingService = new RatingService(ratingRepository);

  // Create a new rating
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { customerId, transactionId, orderRating, paymentRating, serviceRating, overallRating, comment } = req.body;

      if (!customerId || !transactionId) {
        return res.status(400).json({ error: "customerId and transactionId are required" });
      }

      const rating = await ratingService.createRating({
        customerId,
        transactionId,
        orderRating,
        paymentRating,
        serviceRating,
        overallRating,
        comment,
      });

      res.status(201).json(rating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get rating by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const rating = await ratingService.getRatingById(Number(req.params.id));
      res.json(rating);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // Get rating for a transaction
  router.get("/transaction/:transactionId", async (req: Request, res: Response) => {
    try {
      const rating = await ratingService.getRatingByTransactionId(Number(req.params.transactionId));
      if (!rating) {
        return res.status(404).json({ error: "No rating found for this transaction" });
      }
      res.json(rating);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all ratings for a customer
  router.get("/customer/:customerId", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const ratings = await ratingService.getCustomerRatings(Number(req.params.customerId), limit, offset);
      res.json(ratings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get average ratings for a customer
  router.get("/customer/:customerId/average", async (req: Request, res: Response) => {
    try {
      const averages = await ratingService.getCustomerAverageRatings(Number(req.params.customerId));
      res.json(averages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a rating
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { orderRating, paymentRating, serviceRating, overallRating, comment } = req.body;

      await ratingService.updateRating(Number(req.params.id), {
        orderRating,
        paymentRating,
        serviceRating,
        overallRating,
        comment,
      });

      res.json({ message: "Rating updated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete a rating
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await ratingService.deleteRating(Number(req.params.id));
      res.json({ message: "Rating deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
};
