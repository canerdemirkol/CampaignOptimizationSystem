import { IsString, IsNotEmpty, IsOptional, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── CREATE SCENARIO ──
export class CreateOptimizationScenarioDto {
  @ApiProperty({ example: 'Q1 2024 Scenario' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'First quarter scenario planning' })
  @IsString()
  @IsOptional()
  description?: string;

  // General parameters (optional, defaults will be used if not provided)
  @ApiPropertyOptional({ example: 1, description: 'Minimum campaign count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMin?: number;

  @ApiPropertyOptional({ example: 10, description: 'Maximum campaign count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMax?: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum order count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMin?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum order count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMax?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum budget' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMin?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Maximum budget' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMax?: number;

  @ApiPropertyOptional({ example: 0, description: 'Minimum messages' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum messages' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMax?: number;
}

// ── UPDATE SCENARIO (only name & description) ──
export class UpdateOptimizationScenarioDto {
  @ApiPropertyOptional({ example: 'Q1 2024 Updated' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}

// ── UPDATE DEFAULT PARAMETERS (Admin-only) ──
export class UpdateDefaultParametersDto {
  @ApiPropertyOptional({ example: 1, description: 'Minimum campaign count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMin?: number;

  @ApiPropertyOptional({ example: 10, description: 'Maximum campaign count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMax?: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum order count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMin?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum order count' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMax?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum budget' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMin?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Maximum budget' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMax?: number;

  @ApiPropertyOptional({ example: 0, description: 'Minimum messages' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum messages' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMax?: number;
}

// ── ADD CAMPAIGNS TO SCENARIO ──
export class AddCampaignsToScenarioDto {
  @ApiProperty({ example: ['camp-id-1', 'camp-id-2'] })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  campaignIds: string[];
}

// ── UPDATE CAMPAIGN IN SCENARIO (Scenario-specific snapshot) ──
export class UpdateCampaignInScenarioDto {
  @ApiPropertyOptional({ example: 'Updated Campaign Name' })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiPropertyOptional({ example: 'CRM', enum: ['CRM', 'MASS'] })
  @IsString()
  @IsOptional()
  campaignType?: string;

  @ApiPropertyOptional({ example: 90, description: 'Min recipients' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMin?: number;

  @ApiPropertyOptional({ example: 6000, description: 'Max recipients' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMax?: number;

  @ApiPropertyOptional({ example: 550, description: 'Campaign profit per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  zK?: number;

  @ApiPropertyOptional({ example: 45, description: 'Campaign cost per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cK?: number;
}

// ── REMOVE CAMPAIGN FROM SCENARIO ──
export class RemoveCampaignFromScenarioDto {
  @ApiProperty({ example: 'camp-id-1' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;
}

// ── SCENARIO CAMPAIGN DTO ──
export class OptimizationScenarioCampaignDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  rMin: number;

  @ApiProperty()
  rMax: number;

  @ApiProperty()
  zK: number;

  @ApiProperty()
  cK: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  campaignId: string;
}

// ── RESPONSE DTOs ──

export class OptimizationScenarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  campaignIds: string[];

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class OptimizationScenarioDetailResponseDto extends OptimizationScenarioResponseDto {
  @ApiProperty({ type: [OptimizationScenarioCampaignDto] })
  campaigns: OptimizationScenarioCampaignDto[];
}

// ── SCENARIO CAMPAIGN RESULTS DTOs ──

export class ScenarioCampaignResultDto {
  @ApiProperty({ example: 'camp-id-1' })
  campaignId: string;

  @ApiProperty({ example: 'Summer Campaign' })
  campaignName: string;

  @ApiProperty({ example: 'CRM', enum: ['CRM', 'MASS'] })
  campaignType: string;

  @ApiProperty({ example: 1500, description: 'Önerildiği Kişi Sayısı - customer_count toplam' })
  recommendedPersonCount: number;

  @ApiProperty({ example: 45.5, description: 'Tahmini Katılım - segment scores toplamı' })
  estimatedParticipation: number;

  @ApiProperty({ example: 22750, description: 'Tahmini Katkı = participation × campaign.z_k' })
  estimatedContribution: number;

  @ApiProperty({ example: 2275, description: 'Tahmini Maliyet = participation × campaign.c_k' })
  estimatedCost: number;

  @ApiProperty({ example: true })
  approved: boolean;
}

export class ScenarioCampaignResultsSummaryDto {
  @ApiProperty({ example: 5 })
  totalCampaigns: number;

  @ApiProperty({ example: 7500 })
  totalRecommendedPeople: number;

  @ApiProperty({ example: 227.5 })
  totalParticipation: number;

  @ApiProperty({ example: 113750 })
  totalContribution: number;

  @ApiProperty({ example: 11375 })
  totalCost: number;

  @ApiProperty({ example: 3 })
  approvedCount: number;
}

export class ScenarioCampaignResultsResponseDto {
  @ApiProperty({ example: 'scenario-id-1' })
  scenarioId: string;

  @ApiProperty({ example: 'Q1 2024 Optimization' })
  scenarioName: string;

  @ApiProperty({ type: [ScenarioCampaignResultDto] })
  campaignResults: ScenarioCampaignResultDto[];

  @ApiProperty({ type: ScenarioCampaignResultsSummaryDto })
  summary: ScenarioCampaignResultsSummaryDto;
}
