// Domain Entity - OptimizationResultDetail
// Section 3.7 of Master Prompt

export class OptimizationResultDetail {
  readonly id: string;
  readonly campaignId: string;
  readonly segmentId: string;
  readonly score?: number;
  readonly customerCount?: number;
  readonly expectedContribution?: number;
  readonly recommendedCampaigns?: Record<string, unknown>;
  readonly calculationStartedAt?: Date;
  readonly calculationFinishedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    campaignId: string;
    segmentId: string;
    score?: number;
    customerCount?: number;
    expectedContribution?: number;
    recommendedCampaigns?: Record<string, unknown>;
    calculationStartedAt?: Date;
    calculationFinishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.campaignId = props.campaignId;
    this.segmentId = props.segmentId;
    this.score = props.score;
    this.customerCount = props.customerCount;
    this.expectedContribution = props.expectedContribution;
    this.recommendedCampaigns = props.recommendedCampaigns;
    this.calculationStartedAt = props.calculationStartedAt;
    this.calculationFinishedAt = props.calculationFinishedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
