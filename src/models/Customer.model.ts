export class Customer {
  constructor(
    public readonly id: number,
    public collectoId: string,
    public clientId: string,
    public email: string,
    public name: string,
    public currentPoints: number,
    public currentTierId: number | null,
    public totalPurchased: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public isActive: boolean
  ) {}

  addPoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }
    this.currentPoints += points;
    this.updatedAt = new Date();
  }

  deductPoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }
    if (this.currentPoints < points) {
      throw new Error("Insufficient points");
    }
    this.currentPoints -= points;
    this.updatedAt = new Date();
  }

  setTier(tierId: number | null) {
    this.currentTierId = tierId;
    this.updatedAt = new Date();
  }

  updateTotalPurchased(amount: number) {
    if (amount < 0) {
      throw new Error("Purchase amount cannot be negative");
    }
    this.totalPurchased += amount;
    this.updatedAt = new Date();
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }
}
