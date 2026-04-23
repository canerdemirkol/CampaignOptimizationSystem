// Domain Entity - Customer (Aggregate Root)
// Section 3.2 of Master Prompt

export class Customer {
  readonly id: string;
  readonly customerNo: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly age?: number;
  readonly gender?: string;
  readonly segment?: string;
  readonly churnScore?: number;
  readonly lifetimeValue?: number;
  readonly incomeLevelId?: string;
  readonly incomeLevel?: { id: string; name: string; displayName: string; description?: string };
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    customerNo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    age?: number;
    gender?: string;
    segment?: string;
    churnScore?: number;
    lifetimeValue?: number;
    incomeLevelId?: string;
    incomeLevel?: { id: string; name: string; displayName: string; description?: string };
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.customerNo = props.customerNo;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.phone = props.phone;
    this.age = props.age;
    this.gender = props.gender;
    this.segment = props.segment;
    this.churnScore = props.churnScore;
    this.lifetimeValue = props.lifetimeValue;
    this.incomeLevelId = props.incomeLevelId;
    this.incomeLevel = props.incomeLevel;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
