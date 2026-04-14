import { Router, Request, Response } from "express";
import { ChatService } from "../services/contact.service";
import { ChatMessageRepository } from "../repositories/chatMessage.repository";

export const ChatRoutes = (): Router => {
  const router = Router();

  const chatRepository = new ChatMessageRepository();
  const chatService = new ChatService(chatRepository);

  // Send a message
  router.post("/", async (req: Request, res: Response) => {
    try {
      const { customerId, senderType, message, attachments } = req.body;

      if (!customerId || !message) {
        return res.status(400).json({ error: "customerId and message are required" });
      }

      const chatMessage = await chatService.sendMessage({
        customerId,
        senderType: senderType || 'customer',
        message,
        attachments,
      });

      res.status(201).json(chatMessage);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get message by ID
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const message = await chatService.getMessageById(Number(req.params.id));
      res.json(message);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  // Get conversation for a customer
  router.get("/customer/:customerId", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const messages = await chatService.getConversation(
        Number(req.params.customerId),
        limit,
        offset
      );

      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get unread count for a customer
  router.get("/customer/:customerId/unread", async (req: Request, res: Response) => {
    try {
      const count = await chatService.getUnreadCount(Number(req.params.customerId));
      res.json({ unreadCount: count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark message as read
  router.patch("/:id/read", async (req: Request, res: Response) => {
    try {
      await chatService.markMessageAsRead(Number(req.params.id));
      res.json({ message: "Message marked as read" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mark all messages as read for a customer
  router.patch("/customer/:customerId/read-all", async (req: Request, res: Response) => {
    try {
      await chatService.markAllAsRead(Number(req.params.customerId));
      res.json({ message: "All messages marked as read" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Send support reply
  router.post("/:customerId/support-reply", async (req: Request, res: Response) => {
    try {
      const { message, attachments } = req.body;

      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const reply = await chatService.sendSupportReply(
        Number(req.params.customerId),
        message,
        attachments
      );

      res.status(201).json(reply);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete message
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      await chatService.deleteMessage(Number(req.params.id));
      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
};
