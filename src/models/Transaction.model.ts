export class Transaction {
  constructor(
    public readonly id: number,
    public customerId: number,
    public collectoId: string,
    public clientId: string,
    public transactionId: string,
    public reference: string | null,
    public amount: number,
    public points: number,
    public paymentMethod: string | null,
    public paymentStatus: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public confirmedAt: Date | null
  ) {}
}
