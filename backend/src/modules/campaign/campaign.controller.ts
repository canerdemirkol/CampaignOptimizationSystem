import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateGeneralParametersDto,
  UpdateGeneralParametersDto,
  CampaignResponseDto,
} from './dto/campaign.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all campaigns without pagination' })
  async getAll() {
    return this.campaignService.getAll();
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns with pagination and search/filter' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String, enum: ['CRM', 'MASS'] })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10000), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.campaignService.findAll(page, limit, search, type);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Get campaign with all details' })
  async findByIdWithDetails(@Param('id') id: string) {
    return this.campaignService.findByIdWithDetails(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by id' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async findById(@Param('id') id: string) {
    return this.campaignService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, type: CampaignResponseDto })
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a campaign (Admin only)' })
  async delete(@Param('id') id: string) {
    await this.campaignService.delete(id);
    return { message: 'Campaign deleted successfully' };
  }

  // ── DEFAULT GENERAL PARAMETERS ──
  @Get('parameters/defaults')
  @ApiOperation({ summary: 'Get default general parameters' })
  async getDefaultGeneralParameters() {
    return this.campaignService.getDefaultGeneralParameters();
  }
}
