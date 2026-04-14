export class Rating {
  constructor(
    public readonly id: number,
    public customerId: number,
    public transactionId: number,
    public orderRating: number,
    public paymentRating: number,
    public serviceRating: number,
    public overallRating: number,
    public comment: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
