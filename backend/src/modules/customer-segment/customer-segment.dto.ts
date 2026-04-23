import { IsString, IsNumber, IsOptional, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IncomeLevelEnum {
  LOW = 'Low',
  MEDIUM = 'Medium',
  MEDIUM_LOW = 'Medium-Low',
  MEDIUM_HIGH = 'Medium-High',
  HIGH = 'High',
}

export class CreateCustomerSegmentDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  customerCount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  lifetimeValue: number;

  @ApiProperty({ required: false, enum: IncomeLevelEnum })
  @IsOptional()
  @IsEnum(IncomeLevelEnum)
  incomeLevel?: IncomeLevelEnum;
}

export class UpdateCustomerSegmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  customerCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lifetimeValue?: number;

  @ApiProperty({ required: false, enum: IncomeLevelEnum })
  @IsOptional()
  @IsEnum(IncomeLevelEnum)
  incomeLevel?: IncomeLevelEnum;
}
