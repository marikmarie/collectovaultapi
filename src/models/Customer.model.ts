export class Customer {
  constructor(
    public readonly id: number,
    public collectoId: string,
    public clientId: string,
    public username: string | null,
    public name: string,
    // currentPoints remains total points (earned + bought)
    public currentPoints: number,
    public earnedPoints: number,
    public boughtPoints: number,
    public currentTierId: number | null,
    public totalPurchased: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public isActive: boolean
  ) {}

  // Add earned points (non-purchased)
  addEarnedPoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }
    this.earnedPoints += points;
    this.currentPoints += points;
    this.updatedAt = new Date();
  }

  // Add bought points (purchased)
  addBoughtPoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }
    this.boughtPoints += points;
    this.currentPoints += points;
    this.updatedAt = new Date();
  }

  // Redeem points - consumes earned points first, then bought points
  redeemPoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }

    if (this.currentPoints < points) {
      throw new Error("Insufficient points");
    }

    const fromEarned = Math.min(this.earnedPoints, points);
    this.earnedPoints -= fromEarned;

    const remaining = points - fromEarned;
    if (remaining > 0) {
      this.boughtPoints = Math.max(0, this.boughtPoints - remaining);
    }

    this.currentPoints -= points;
    this.updatedAt = new Date();
  }

  // Backwards-compatible: treat addPoints as earned points
  addPoints(points: number) {
    this.addEarnedPoints(points);
  }

  // Backwards-compatible: legacy deductPoints just calls redeemPoints
  deductPoints(points: number) {
    this.redeemPoints(points);
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
