export class Customer {
  constructor(
    public readonly id: number,
    public userId: number,
    public clientId: string,
    public collectoId: string,
    public isActive: boolean,
    public recorddate: Date,
    public username: string
  ) {}
}
