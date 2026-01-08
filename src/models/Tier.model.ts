export class Tier {
  constructor(
    public readonly id: number,
    public collectoId: string | null,
    public name: string,
    public pointsRequired: number,
    public earningMultiplier: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy: string,
    public isActive: boolean
  ) {}

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  updateMultiplier(multiplier: number) {
    if (multiplier <= 0) {
      throw new Error("Earning multiplier must be greater than zero");
    }
    this.earningMultiplier = multiplier;
    this.updatedAt = new Date();
  }
}
