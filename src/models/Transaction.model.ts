export type TransactionType = 'BUYPOINTS' | 'EARNED' | 'REDEEMED';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

export class Transaction {
  constructor(
    public readonly id: number,
    public customerId: number,
    public collectoId: string,
    public clientId: string,
    public transactionId: string,
    public reference: string | null,
    public type: TransactionType,
    public amount: number,
    public points: number,
    public paymentMethod: string | null,
    public status: TransactionStatus,
    public paymentStatus: string | null,
    public staffId: number | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public confirmedAt: Date | null
  ) {}
}
