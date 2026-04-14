export class ChatMessage {
  constructor(
    public readonly id: number,
    public customerId: number,
    public senderType: 'customer' | 'support',
    public message: string,
    public attachments: string[] | null,
    public isRead: boolean,
    public readAt: Date | null,
    public readonly createdAt: Date
  ) {}
}
