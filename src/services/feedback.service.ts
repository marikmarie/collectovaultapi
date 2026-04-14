import { FeedbackRepository } from "../repositories/feedback.repository";
import { Feedback } from "../models/Feedback.model";

export interface CreateFeedbackDTO {
  customerId: number;
  feedbackType: 'order' | 'service' | 'app' | 'general';
  title: string;
  message: string;
  attachments?: string[];
}

export interface UpdateFeedbackDTO {
  title?: string;
  message?: string;
  status?: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  attachments?: string[];
}

export class FeedbackService {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  async createFeedback(dto: CreateFeedbackDTO): Promise<Feedback> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error("Feedback title is required");
    }
    if (!dto.message || dto.message.trim().length === 0) {
      throw new Error("Feedback message is required");
    }
    if (dto.title.length > 255) {
      throw new Error("Title must be less than 255 characters");
    }

    return await this.feedbackRepository.create(dto.customerId, {
      feedbackType: dto.feedbackType,
      title: dto.title.trim(),
      message: dto.message.trim(),
      attachments: dto.attachments,
    });
  }

  async getFeedbackById(id: number): Promise<Feedback> {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) {
      throw new Error(`Feedback with id ${id} not found`);
    }
    return feedback;
  }

  async getCustomerFeedback(customerId: number, limit = 20, offset = 0): Promise<Feedback[]> {
    return await this.feedbackRepository.findByCustomerId(customerId, limit, offset);
  }

  async getFeedbackByStatus(status: string, limit = 20, offset = 0): Promise<Feedback[]> {
    return await this.feedbackRepository.findByStatus(status, limit, offset);
  }

  async updateFeedback(id: number, dto: UpdateFeedbackDTO): Promise<void> {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) {
      throw new Error(`Feedback with id ${id} not found`);
    }

    if (dto.title && dto.title.length > 255) {
      throw new Error("Title must be less than 255 characters");
    }

    await this.feedbackRepository.update(id, dto);
  }

  async deleteFeedback(id: number): Promise<void> {
    const feedback = await this.feedbackRepository.findById(id);
    if (!feedback) {
      throw new Error(`Feedback with id ${id} not found`);
    }
    await this.feedbackRepository.delete(id);
  }

  async countOpenFeedback(): Promise<number> {
    return await this.feedbackRepository.countByStatus('open');
  }

  async resolveFeedback(id: number): Promise<void> {
    await this.updateFeedback(id, { status: 'resolved' });
  }

  async closeFeedback(id: number): Promise<void> {
    await this.updateFeedback(id, { status: 'closed' });
  }
}
