export class VaultPackage {
  constructor(
    public readonly id: number,
    public name: string,
    public pointsAmount: number,
    public price: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public readonly createdBy: string,
    public isActive: boolean,
    public isPopular: boolean
  ) {}

  activate() {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  deactivate() {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  markAsPopular() {
    this.isPopular = true;
    this.updatedAt = new Date();
  }

  unmarkAsPopular() {
    this.isPopular = false;
    this.updatedAt = new Date();
  }

  updatePrice(newPrice: number) {
    if (newPrice < 0) throw new Error("Price cannot be negative");
    this.price = newPrice;
    this.updatedAt = new Date();
  }

  updatePointsAmount(points: number) {
    if (points < 0) throw new Error("Points cannot be negative");
    this.pointsAmount = points;
    this.updatedAt = new Date();
  }

  updateName(newName: string) {
    if (!newName.trim()) throw new Error("Name cannot be empty");
    this.name = newName;
    this.updatedAt = new Date();
  }
}
