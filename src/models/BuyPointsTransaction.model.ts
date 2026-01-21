export class BuyPointsTransaction {
  constructor(
    public readonly id: number,
    public customerId: number,
    public collectoId: string,
    public clientId: string,
    public transactionId: string,
    public referenceId: string,
    public points: number,
    public amount: number,
    public paymentMethod: string,
    public status: "pending" | "confirmed" | "failed",
    public staffId?: string,
    public staffName?: string,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  markAsConfirmed() {
    this.status = "confirmed";
    this.updatedAt = new Date();
  }

  markAsFailed() {
    this.status = "failed";
    this.updatedAt = new Date();
  }

  isSuccessful(): boolean {
    return this.status === "confirmed";
  }
}
