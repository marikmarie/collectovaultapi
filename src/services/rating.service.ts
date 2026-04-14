import { RatingRepository } from "../repositories/rating.repository";
import { Rating } from "../models/Rating.model";

export interface CreateRatingDTO {
  customerId: number;
  transactionId: number;
  orderRating: number;
  paymentRating: number;
  serviceRating: number;
  overallRating: number;
  comment?: string;
}

export interface UpdateRatingDTO {
  orderRating?: number;
  paymentRating?: number;
  serviceRating?: number;
  overallRating?: number;
  comment?: string;
}

export class RatingService {
  constructor(private readonly ratingRepository: RatingRepository) {}

  async createRating(dto: CreateRatingDTO): Promise<Rating> {
    // Validate ratings are between 1 and 5
    const ratings = [dto.orderRating, dto.paymentRating, dto.serviceRating, dto.overallRating];
    
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        throw new Error("All ratings must be between 1 and 5 stars");
      }
    }

    // Check if customer already rated this transaction
    const existingRating = await this.ratingRepository.findByTransactionId(dto.transactionId);
    if (existingRating) {
      throw new Error("This transaction has already been rated");
    }

    return await this.ratingRepository.create(
      dto.customerId,
      dto.transactionId,
      {
        orderRating: dto.orderRating,
        paymentRating: dto.paymentRating,
        serviceRating: dto.serviceRating,
        overallRating: dto.overallRating,
        comment: dto.comment,
      }
    );
  }

  async getRatingById(id: number): Promise<Rating> {
    const rating = await this.ratingRepository.findById(id);
    if (!rating) {
      throw new Error(`Rating with id ${id} not found`);
    }
    return rating;
  }

  async getRatingByTransactionId(transactionId: number): Promise<Rating | null> {
    return await this.ratingRepository.findByTransactionId(transactionId);
  }

  async getCustomerRatings(customerId: number, limit = 10, offset = 0): Promise<Rating[]> {
    return await this.ratingRepository.findByCustomerId(customerId, limit, offset);
  }

  async updateRating(id: number, dto: UpdateRatingDTO): Promise<void> {
    const rating = await this.ratingRepository.findById(id);
    if (!rating) {
      throw new Error(`Rating with id ${id} not found`);
    }

    // Validate ratings if provided
    const ratings = [dto.orderRating, dto.paymentRating, dto.serviceRating, dto.overallRating].filter(
      (r) => r !== undefined
    );
    
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        throw new Error("All ratings must be between 1 and 5 stars");
      }
    }

    await this.ratingRepository.update(id, dto);
  }

  async deleteRating(id: number): Promise<void> {
    const rating = await this.ratingRepository.findById(id);
    if (!rating) {
      throw new Error(`Rating with id ${id} not found`);
    }
    await this.ratingRepository.delete(id);
  }

  async getCustomerAverageRatings(customerId: number) {
    return await this.ratingRepository.getAverageRatings(customerId);
  }
}
