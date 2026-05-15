export class Feedback {
  constructor(
    public readonly id: number,
    public clientId: number,
    public feedbackType: 'order' | 'service' | 'app' | 'general',
    public title: string,
    public message: string,
    public attachments: string[] | null,
    public status: 'open' | 'in-progress' | 'resolved' | 'closed',
    public priority: 'low' | 'medium' | 'high' | 'critical',
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
