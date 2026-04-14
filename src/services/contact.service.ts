import { ChatMessageRepository } from "../repositories/chatMessage.repository";
import { ChatMessage } from "../models/ChatMessage.model";

export interface CreateChatMessageDTO {
  customerId: number;
  senderType: 'customer' | 'support';
  message: string;
  attachments?: string[];
}

export class ChatService {
  constructor(private readonly chatRepository: ChatMessageRepository) {}

  async sendMessage(dto: CreateChatMessageDTO): Promise<ChatMessage> {
    if (!dto.message || dto.message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (dto.message.length > 5000) {
      throw new Error("Message is too long (max 5000 characters)");
    }

    return await this.chatRepository.create(
      dto.customerId,
      dto.senderType,
      {
        message: dto.message.trim(),
        attachments: dto.attachments,
      }
    );
  }

  async getMessageById(id: number): Promise<ChatMessage> {
    const message = await this.chatRepository.findById(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    return message;
  }

  async getConversation(customerId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    return await this.chatRepository.findByCustomerId(customerId, limit, offset);
  }

  async markMessageAsRead(id: number): Promise<void> {
    const message = await this.chatRepository.findById(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    await this.chatRepository.markAsRead(id);
  }

  async markAllAsRead(customerId: number): Promise<void> {
    await this.chatRepository.markAllAsRead(customerId);
  }

  async getUnreadCount(customerId: number): Promise<number> {
    return await this.chatRepository.countUnread(customerId);
  }

  async deleteMessage(id: number): Promise<void> {
    const message = await this.chatRepository.findById(id);
    if (!message) {
      throw new Error(`Message with id ${id} not found`);
    }
    await this.chatRepository.delete(id);
  }

  async sendSupportReply(customerId: number, message: string, attachments?: string[]): Promise<ChatMessage> {
    return await this.sendMessage({
      customerId,
      senderType: 'support',
      message,
      attachments,
    });
  }
}
