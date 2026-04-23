// Domain Entity - OptimizationResultSummary (Campaign Child Entity)
// Section 3.6 of Master Prompt

export class OptimizationResultSummary {
  readonly id: string;
  readonly campaignId: string;
  readonly recommendedCustomerCount: number;
  readonly estimatedParticipation: number;
  readonly estimatedContribution: number;
  readonly estimatedCost: number;
  readonly approved: boolean;
  readonly calculationStartedAt?: Date;
  readonly calculationFinishedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    campaignId: string;
    recommendedCustomerCount: number;
    estimatedParticipation: number;
    estimatedContribution: number;
    estimatedCost: number;
    approved: boolean;
    calculationStartedAt?: Date;
    calculationFinishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.recommendedCustomerCount = props.recommendedCustomerCount;
    this.estimatedParticipation = props.estimatedParticipation;
    this.estimatedContribution = props.estimatedContribution;
    this.estimatedCost = props.estimatedCost;
    this.approved = props.approved;
    this.calculationStartedAt = props.calculationStartedAt;
    this.calculationFinishedAt = props.calculationFinishedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  getROI(): number {
    if (this.estimatedCost === 0) return 0;
    return (this.estimatedContribution - this.estimatedCost) / this.estimatedCost;
  }
}
