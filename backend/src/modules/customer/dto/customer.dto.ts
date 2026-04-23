import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IncomeLevelEnum } from '../../customer-segment/customer-segment.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'CUST001' })
  @IsString()
  @IsNotEmpty()
  customerNo: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 35 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: 'M' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiPropertyOptional({ example: 0.15 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  churnScore?: number;

  @ApiPropertyOptional({ example: 5000.00 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  lifetimeValue?: number;

  @ApiPropertyOptional({ example: 'High', enum: IncomeLevelEnum })
  @IsOptional()
  @IsEnum(IncomeLevelEnum)
  incomeLevel?: IncomeLevelEnum;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 35 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ example: 'M' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsString()
  @IsOptional()
  segment?: string;

  @ApiPropertyOptional({ example: 0.15 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  churnScore?: number;

  @ApiPropertyOptional({ example: 5000.00 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  lifetimeValue?: number;

  @ApiPropertyOptional({ example: 'High', enum: IncomeLevelEnum })
  @IsOptional()
  @IsEnum(IncomeLevelEnum)
  incomeLevel?: IncomeLevelEnum;
}

export class CustomerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerNo: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  age?: number;

  @ApiPropertyOptional()
  gender?: string;

  @ApiPropertyOptional()
  segment?: string;

  @ApiPropertyOptional()
  churnScore?: number;

  @ApiPropertyOptional()
  lifetimeValue?: number;

  @ApiPropertyOptional()
  incomeLevel?: {
    id: string;
    name: string;
    displayName: string;
    description?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
