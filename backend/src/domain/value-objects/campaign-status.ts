// Value Object - CampaignStatus with State Machine
// Section 3.3 of Master Prompt

export enum CampaignStatusEnum {
  DRAFT = 'DRAFT',
  READY_FOR_CALCULATION = 'READY_FOR_CALCULATION',
  CALCULATING = 'CALCULATING',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  OPTIMIZING = 'OPTIMIZING',
  OPTIMIZED = 'OPTIMIZED',
}

// State Machine Transitions (MANDATORY)
// DRAFT → READY_FOR_CALCULATION → CALCULATING → CALCULATED → APPROVED → OPTIMIZING → OPTIMIZED
const validTransitions: Map<CampaignStatusEnum, CampaignStatusEnum[]> = new Map([
  [CampaignStatusEnum.DRAFT, [CampaignStatusEnum.READY_FOR_CALCULATION]],
  [CampaignStatusEnum.READY_FOR_CALCULATION, [CampaignStatusEnum.CALCULATING, CampaignStatusEnum.DRAFT]],
  [CampaignStatusEnum.CALCULATING, [CampaignStatusEnum.CALCULATED, CampaignStatusEnum.READY_FOR_CALCULATION]],
  [CampaignStatusEnum.CALCULATED, [CampaignStatusEnum.APPROVED, CampaignStatusEnum.READY_FOR_CALCULATION]],
  [CampaignStatusEnum.APPROVED, [CampaignStatusEnum.OPTIMIZING, CampaignStatusEnum.CALCULATED]],
  [CampaignStatusEnum.OPTIMIZING, [CampaignStatusEnum.OPTIMIZED, CampaignStatusEnum.APPROVED]],
  [CampaignStatusEnum.OPTIMIZED, [CampaignStatusEnum.DRAFT]],
]);

export class CampaignStatus {
  private readonly value: CampaignStatusEnum;

  constructor(value: CampaignStatusEnum) {
    this.value = value;
  }

  getValue(): CampaignStatusEnum {
    return this.value;
  }

  canTransitionTo(newStatus: CampaignStatusEnum): boolean {
    const allowedTransitions = validTransitions.get(this.value);
    return allowedTransitions?.includes(newStatus) ?? false;
  }

  transitionTo(newStatus: CampaignStatusEnum): CampaignStatus {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Invalid state transition from ${this.value} to ${newStatus}`,
      );
    }
    return new CampaignStatus(newStatus);
  }

  equals(other: CampaignStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  static fromString(value: string): CampaignStatus {
    if (!Object.values(CampaignStatusEnum).includes(value as CampaignStatusEnum)) {
      throw new Error(`Invalid campaign status: ${value}`);
    }
    return new CampaignStatus(value as CampaignStatusEnum);
  }

  static draft(): CampaignStatus {
    return new CampaignStatus(CampaignStatusEnum.DRAFT);
  }
}
