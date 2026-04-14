import { Router, Request, Response } from "express";
import { FeedbackService } from "../services/feedback.service";
import { FeedbackRepository } from "../repositories/feedback.repository";

export const FeedbackRoutes = (): Router => {
  const router = Router();

  const feedbackRepository = new FeedbackRepository();
  const feedbackService = new FeedbackService(feedbackRepository);

  // Create new feedback
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { customerId, feedbackType, title, message, attachments } = req.body;

      if (!customerId || !feedbackType || !title || !message) {
        return res.status(400).json({ error: "customerId, feedbackType, title, and message are required" });
      }

      const feedback = await feedbackService.createFeedback({
        customerId,
        feedbackType,
        title,
        message,
        attachments,
      });

      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get feedback by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const feedback = await feedbackService.getFeedbackById(Number(req.params.id));
      res.json(feedback);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // Get all feedback for a customer
  router.get("/customer/:customerId", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const feedback = await feedbackService.getCustomerFeedback(
        Number(req.params.customerId),
        limit,
        offset
      );

      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get feedback by status
  router.get("/status/:status", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const feedback = await feedbackService.getFeedbackByStatus(
        req.params.status,
        limit,
        offset
      );

      res.json(feedback);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get count of open feedback
  router.get("/stats/open-count", async (req: Request, res: Response) => {
    try {
      const count = await feedbackService.countOpenFeedback();
      res.json({ openCount: count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update feedback
  router.patch("/:id", async (req: Request, res: Response) => {
    try {
      const { title, message, status, priority, attachments } = req.body;

      await feedbackService.updateFeedback(Number(req.params.id), {
        title,
        message,
        status,
        priority,
        attachments,
      });

      res.json({ message: "Feedback updated successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Resolve feedback
  router.patch("/:id/resolve", async (req: Request, res: Response) => {
    try {
      await feedbackService.resolveFeedback(Number(req.params.id));
      res.json({ message: "Feedback resolved" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Close feedback
  router.patch("/:id/close", async (req: Request, res: Response) => {
    try {
      await feedbackService.closeFeedback(Number(req.params.id));
      res.json({ message: "Feedback closed" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete feedback
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await feedbackService.deleteFeedback(Number(req.params.id));
      res.json({ message: "Feedback deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
};
