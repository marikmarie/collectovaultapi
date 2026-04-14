import { ContactRepository } from "../repositories/contact.repository";
import { WhatsAppContact, BusinessContact } from "../models/Contact.model";

export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  // WhatsApp Contact Methods
  async setUserWhatsAppContact(customerId: number, whatsappNumber: string): Promise<WhatsAppContact> {
    // Validate WhatsApp number format (simple validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(whatsappNumber)) {
      throw new Error("Invalid WhatsApp number format. Use international format (e.g., +254712345678)");
    }

    return await this.contactRepository.createWhatsAppContact(customerId, whatsappNumber);
  }

  async getUserWhatsAppContact(customerId: number): Promise<WhatsAppContact | null> {
    return await this.contactRepository.getWhatsAppContact(customerId);
  }

  async verifyUserWhatsAppContact(whatsappContactId: number): Promise<void> {
    await this.contactRepository.verifyWhatsAppContact(whatsappContactId);
  }

  async deleteUserWhatsAppContact(customerId: number): Promise<void> {
    await this.contactRepository.deleteWhatsAppContact(customerId);
  }

  async getWhatsAppContactUrl(customerId: number): Promise<string | null> {
    const contact = await this.contactRepository.getWhatsAppContact(customerId);
    if (!contact) {
      return null;
    }
    // Format WhatsApp URL
    const number = contact.whatsappNumber.replace(/\D/g, ''); // Remove non-digits
    return `https://wa.me/${number}`;
  }

  // Business Contact Methods
  async getBusinessWhatsAppContact(): Promise<BusinessContact | null> {
    return await this.contactRepository.getBusinessContact('whatsapp');
  }

  async setBusinessWhatsAppContact(whatsappNumber: string): Promise<BusinessContact> {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(whatsappNumber)) {
      throw new Error("Invalid WhatsApp number format. Use international format (e.g., +254712345678)");
    }

    return await this.contactRepository.setBusinessContact('whatsapp', whatsappNumber);
  }

  async getBusinessWhatsAppUrl(): Promise<string | null> {
    const contact = await this.getBusinessWhatsAppContact();
    if (!contact) {
      return null;
    }
    const number = contact.value.replace(/\D/g, '');
    return `https://wa.me/${number}`;
  }

  async setBusinessEmailContact(email: string): Promise<BusinessContact> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Invalid email format");
    }

    return await this.contactRepository.setBusinessContact('email', email);
  }

  async getBusinessEmailContact(): Promise<BusinessContact | null> {
    return await this.contactRepository.getBusinessContact('email');
  }

  async setBusinessPhoneContact(phone: string): Promise<BusinessContact> {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error("Invalid phone number format");
    }

    return await this.contactRepository.setBusinessContact('phone', phone);
  }

  async getBusinessPhoneContact(): Promise<BusinessContact | null> {
    return await this.contactRepository.getBusinessContact('phone');
  }

  async getAllBusinessContacts(): Promise<{
    whatsapp?: BusinessContact;
    email?: BusinessContact;
    phone?: BusinessContact;
  }> {
    const contacts = await this.contactRepository.getAllBusinessContacts();
    const result: any = {};

    for (const contact of contacts) {
      result[contact.contactType] = contact;
    }

    return result;
  }
}
