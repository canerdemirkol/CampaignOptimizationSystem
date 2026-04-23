import { Controller, Get, Post, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OptimizationService } from './optimization.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('optimization')
@Controller('optimization')
export class OptimizationController {
  constructor(private readonly optimizationService: OptimizationService) {}

  @Post(':campaignId/run')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Run optimization for a campaign' })
  async runOptimization(@Param('campaignId') campaignId: string) {
    return this.optimizationService.runOptimization(campaignId);
  }

  @Get(':campaignId/summary')
  @ApiOperation({ summary: 'Get optimization summary for a campaign' })
  async getSummary(@Param('campaignId') campaignId: string) {
    return this.optimizationService.getSummary(campaignId);
  }

  @Get(':campaignId/details/all')
  @ApiOperation({ summary: 'Get all optimization details without pagination' })
  async getAllDetails(@Param('campaignId') campaignId: string) {
    return this.optimizationService.getAllDetails(campaignId);
  }

  @Get(':campaignId/details')
  @ApiOperation({ summary: 'Get optimization details for a campaign with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDetails(
    @Param('campaignId') campaignId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.optimizationService.getDetails(campaignId, page, limit);
  }

  @Post(':campaignId/approve-summary')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Approve optimization summary' })
  async approveSummary(@Param('campaignId') campaignId: string) {
    return this.optimizationService.approveSummary(campaignId);
  }
}
