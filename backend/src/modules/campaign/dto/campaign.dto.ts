import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampaignTypeDto {
  CRM = 'CRM',
  MASS = 'MASS',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Summer Sale Campaign' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'CRM', enum: CampaignTypeDto, description: 'Campaign type: CRM (targeted) or MASS (broadcast)' })
  @IsEnum(CampaignTypeDto)
  @IsOptional()
  type?: CampaignTypeDto;

  @ApiPropertyOptional({ example: 100, description: 'Recommendation minimum' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMin?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Recommendation maximum' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMax?: number;

  @ApiPropertyOptional({ example: 500, description: 'Campaign profit per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  zK?: number;

  @ApiPropertyOptional({ example: 50, description: 'Campaign cost per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cK?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Updated Campaign Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CRM', enum: CampaignTypeDto, description: 'Campaign type: CRM (targeted) or MASS (broadcast)' })
  @IsEnum(CampaignTypeDto)
  @IsOptional()
  type?: CampaignTypeDto;

  @ApiPropertyOptional({ example: 100, description: 'Recommendation minimum' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMin?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Recommendation maximum' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMax?: number;

  @ApiPropertyOptional({ example: 500, description: 'Campaign profit per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  zK?: number;

  @ApiPropertyOptional({ example: 50, description: 'Campaign cost per customer' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cK?: number;
}

export class CreateGeneralParametersDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  cMin: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  cMax: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(0)
  nMin: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  nMax: number;

  @ApiProperty({ example: 100.00 })
  @IsNumber()
  @Min(0)
  bMin: number;

  @ApiProperty({ example: 10000.00 })
  @IsNumber()
  @Min(0)
  bMax: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  mMin: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(0)
  mMax: number;
}

export class UpdateGeneralParametersDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMax?: number;
}

export class CreateCampaignParametersDto {
  // Campaign-specific parameters (REQUIRED)
  @ApiProperty({ example: 1, description: 'Recommendation minimum - REQUIRED' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  rMin: number;

  @ApiProperty({ example: 100, description: 'Recommendation maximum - REQUIRED' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  rMax: number;

  @ApiProperty({ example: 500.00, description: 'Campaign profit per customer - REQUIRED' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  zK: number;

  @ApiProperty({ example: 50.00, description: 'Campaign cost per customer - REQUIRED' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  cK: number;

  // General parameters (OPTIONAL - will use defaults if not provided)
  @ApiPropertyOptional({ example: 1, description: 'Minimum campaigns - optional, uses default if not provided' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMin?: number;

  @ApiPropertyOptional({ example: 10, description: 'Maximum campaigns - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMax?: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum campaigns per segment - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMin?: number;

  @ApiPropertyOptional({ example: 5, description: 'Maximum campaigns per segment - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMax?: number;

  @ApiPropertyOptional({ example: 100.00, description: 'Minimum budget - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMin?: number;

  @ApiPropertyOptional({ example: 10000.00, description: 'Maximum budget - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMax?: number;

  @ApiPropertyOptional({ example: 0, description: 'Minimum mass campaigns - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMin?: number;

  @ApiPropertyOptional({ example: 3, description: 'Maximum mass campaigns - optional' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMax?: number;
}

export class UpdateCampaignParametersDto {
  // Campaign-specific parameters
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  rMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  zK?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  cK?: number;

  // General parameters (merged)
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  cMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  nMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  bMax?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMin?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  mMax?: number;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CampaignTypeDto, example: 'CRM' })
  type: CampaignTypeDto;

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
}

// Batch Save DTO - Yeni workflow için
export class BatchSaveCampaignParametersDto {
  @ApiProperty({ example: ['camp-id-1', 'camp-id-2'] })
  @IsNotEmpty()
  campaignIds: string[];

  @ApiProperty()
  @IsNotEmpty()
  generalParameters: CreateGeneralParametersDto;

  @ApiProperty()
  @IsNotEmpty()
  campaignParameters: CreateCampaignParametersDto;
}

// Campaign Parameters Form Response - Frontend'e dönenecek
export class CampaignParametersFormDto {
  @ApiProperty()
  generalParameters: CreateGeneralParametersDto;

  @ApiProperty()
  campaignParameters: CreateCampaignParametersDto;

  @ApiProperty()
  selectedCampaignIds: string[];
}
