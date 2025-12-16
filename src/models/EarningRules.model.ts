export class EarningRule {
  constructor(
    public readonly id: number,
    public description: string,
    public ruleTitle: string,
    public points: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy: string,
    public isActive: boolean
  ) {}

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  updatePoints(points: number) {
    if (points < 0) {
      throw new Error("Points cannot be negative");
    }
    this.points = points;
    this.updatedAt = new Date();
  }

  updateDetails(title: string, description: string) {
    this.ruleTitle = title;
    this.description = description;
    this.updatedAt = new Date();
  }
}
