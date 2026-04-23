import { IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateCampaignCustomerSegmentScoreDto {
  @IsString()
  campaignId: string;

  @IsString()
  customerSegmentId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  score: number; // Churn score (0-1)
}

export class UpdateCampaignCustomerSegmentScoreDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;
}

export class CampaignCustomerSegmentScoreResponseDto {
  id: string;
  campaignId: string;
  customerSegmentId: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}
