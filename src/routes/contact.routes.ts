import { Router, Request, Response } from "express";
import { ContactService } from "../services/whatsapp.service";
import { ContactRepository } from "../repositories/contact.repository";

export const ContactRoutes = (): Router => {
  const router = Router();

  const contactRepository = new ContactRepository();
  const contactService = new ContactService(contactRepository);

  // --- User WhatsApp Contact Routes ---

  // Set user WhatsApp contact
  router.post("/whatsapp/user", async (req: Request, res: Response) => {
    try {
      const { customerId, whatsappNumber } = req.body;

      if (!customerId || !whatsappNumber) {
        return res.status(400).json({ error: "customerId and whatsappNumber are required" });
      }

      const contact = await contactService.setUserWhatsAppContact(customerId, whatsappNumber);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get user WhatsApp contact
  router.get("/whatsapp/user/:customerId", async (req: Request, res: Response) => {
    try {
      const contact = await contactService.getUserWhatsAppContact(Number(req.params.customerId));

      if (!contact) {
        return res.status(404).json({ error: "No WhatsApp contact found" });
      }

      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get WhatsApp URL for user
  router.get("/whatsapp/user/:customerId/url", async (req: Request, res: Response) => {
    try {
      const url = await contactService.getWhatsAppContactUrl(Number(req.params.customerId));

      if (!url) {
        return res.status(404).json({ error: "No WhatsApp contact found" });
      }

      res.json({ whatsappUrl: url });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete user WhatsApp contact
  router.delete("/whatsapp/user/:customerId", async (req: Request, res: Response) => {
    try {
      await contactService.deleteUserWhatsAppContact(Number(req.params.customerId));
      res.json({ message: "WhatsApp contact deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- Business Contact Routes ---

  // Set business WhatsApp contact
  router.post("/whatsapp/business", async (req: Request, res: Response) => {
    try {
      const { whatsappNumber } = req.body;

      if (!whatsappNumber) {
        return res.status(400).json({ error: "whatsappNumber is required" });
      }

      const contact = await contactService.setBusinessWhatsAppContact(whatsappNumber);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get business WhatsApp contact
  router.get("/whatsapp/business", async (req: Request, res: Response) => {
    try {
      const contact = await contactService.getBusinessWhatsAppContact();

      if (!contact) {
        return res.status(404).json({ error: "No business WhatsApp contact configured" });
      }

      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get business WhatsApp URL
  router.get("/whatsapp/business/url", async (req: Request, res: Response) => {
    try {
      const url = await contactService.getBusinessWhatsAppUrl();

      if (!url) {
        return res.status(404).json({ error: "No business WhatsApp contact configured" });
      }

      res.json({ whatsappUrl: url });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Set business email contact
  router.post("/email/business", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }

      const contact = await contactService.setBusinessEmailContact(email);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get business email contact
  router.get("/email/business", async (req: Request, res: Response) => {
    try {
      const contact = await contactService.getBusinessEmailContact();

      if (!contact) {
        return res.status(404).json({ error: "No business email configured" });
      }

      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Set business phone contact
  router.post("/phone/business", async (req: Request, res: Response) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: "phone is required" });
      }

      const contact = await contactService.setBusinessPhoneContact(phone);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get business phone contact
  router.get("/phone/business", async (req: Request, res: Response) => {
    try {
      const contact = await contactService.getBusinessPhoneContact();

      if (!contact) {
        return res.status(404).json({ error: "No business phone configured" });
      }

      res.json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all business contacts
  router.get("/business/all", async (req: Request, res: Response) => {
    try {
      const contacts = await contactService.getAllBusinessContacts();
      res.json(contacts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};
