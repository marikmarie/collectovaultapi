export class WhatsAppContact {
  constructor(
    public readonly id: number,
    public customerId: number,
    public whatsappNumber: string,
    public isPreferred: boolean,
    public verifiedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

export class BusinessContact {
  constructor(
    public readonly id: number,
    public contactType: 'whatsapp' | 'email' | 'phone',
    public value: string,
    public isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
