import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OptimizationScenarioService } from './optimization-scenario.service';
import {
  CreateOptimizationScenarioDto,
  UpdateOptimizationScenarioDto,
  AddCampaignsToScenarioDto,
  UpdateDefaultParametersDto,
  UpdateCampaignInScenarioDto,
  OptimizationScenarioResponseDto,
  OptimizationScenarioDetailResponseDto,
} from './dto/optimization-scenario.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('optimization-scenarios')
@Controller('optimization-scenarios')
export class OptimizationScenarioController {
  constructor(
    private readonly optimizationScenarioService: OptimizationScenarioService,
  ) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all optimization scenarios without pagination' })
  async getAll() {
    return this.optimizationScenarioService.getAll();
  }

  @Get()
  @ApiOperation({ summary: 'Get all optimization scenarios with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getScenarios(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.optimizationScenarioService.getScenarios(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get scenario details with campaigns' })
  @ApiResponse({ status: 200, type: OptimizationScenarioDetailResponseDto })
  async getScenarioDetail(@Param('id') id: string) {
    return this.optimizationScenarioService.getScenarioDetail(id);
  }

  @Get(':id/campaign-results')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get calculated campaign results for optimization scenario' })
  @ApiResponse({ status: 200, description: 'Campaign results with grid data' })
  async getCampaignResults(@Param('id') id: string) {
    return this.optimizationScenarioService.getCampaignResults(id);
  }

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Create a new optimization scenario' })
  @ApiResponse({ status: 201, type: OptimizationScenarioResponseDto })
  async createScenario(@Body() dto: CreateOptimizationScenarioDto) {
    return this.optimizationScenarioService.createScenario(dto);
  }

  @Put(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary:
      'Update scenario (name, description only). Only possible in DRAFT status',
  })
  @ApiResponse({ status: 200, type: OptimizationScenarioDetailResponseDto })
  async updateScenario(
    @Param('id') id: string,
    @Body() dto: UpdateOptimizationScenarioDto,
  ) {
    return this.optimizationScenarioService.updateScenario(id, dto);
  }

  @Put(':id/default-parameters')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Update scenario default parameters. Only possible in READY status',
  })
  @ApiResponse({ status: 200, type: OptimizationScenarioDetailResponseDto })
  async updateDefaultParameters(
    @Param('id') id: string,
    @Body() dto: UpdateDefaultParametersDto,
  ) {
    return this.optimizationScenarioService.updateDefaultParameters(id, dto);
  }

  @Get(':id/campaigns/:campaignId/segment-details')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Get segment-level details for a campaign in a scenario' })
  @ApiResponse({ status: 200, description: 'Segment details with score, customerCount, expectedContribution' })
  async getCampaignSegmentDetails(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.optimizationScenarioService.getCampaignSegmentDetails(id, campaignId);
  }

  @Post(':id/approve-campaigns')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Approve selected campaigns in a scenario' })
  @ApiResponse({ status: 200, description: 'Campaigns approved successfully' })
  async approveCampaigns(
    @Param('id') id: string,
    @Body() body: { campaignIds: string[] },
  ) {
    return this.optimizationScenarioService.approveCampaigns(id, body.campaignIds);
  }

  @Post(':id/campaigns')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Add campaigns to scenario. Only possible in DRAFT status',
  })
  @ApiResponse({ status: 200, type: OptimizationScenarioDetailResponseDto })
  async addCampaignsToScenario(
    @Param('id') id: string,
    @Body() dto: AddCampaignsToScenarioDto,
  ) {
    return this.optimizationScenarioService.addCampaignsToScenario(id, dto);
  }

  @Put(':id/campaigns/:campaignId')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Update campaign parameters in scenario (scenario-specific snapshot). Only possible in READY status',
  })
  @ApiResponse({ status: 200, type: OptimizationScenarioDetailResponseDto })
  async updateCampaignInScenario(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
    @Body() dto: UpdateCampaignInScenarioDto,
  ) {
    return this.optimizationScenarioService.updateCampaignInScenario(
      id,
      campaignId,
      dto,
    );
  }

  @Delete(':id/campaigns/:campaignId')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Remove campaign from scenario. Only possible in DRAFT status',
  })
  async removeCampaignFromScenario(
    @Param('id') id: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.optimizationScenarioService.removeCampaignFromScenario(
      id,
      campaignId,
    );
  }

  @Post(':id/run')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Run optimization for scenario' })
  async runOptimization(@Param('id') id: string) {
    return this.optimizationScenarioService.runOptimization(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Callback endpoint for FastAPI to submit scenario results (supports chunked delivery)' })
  async completeScenarioOptimization(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // Handle both chunked and non-chunked result submissions
    const results = body.results;
    const chunkNumber = body.chunk_number;
    const totalChunks = body.total_chunks;
    const decisionVariables = body.decision_variables;

    return this.optimizationScenarioService.handleScenarioComplete(
      id,
      results,
      chunkNumber,
      totalChunks,
      decisionVariables,
    );
  }

  @Get(':id/export-decision-variables')
  @Roles('ADMIN', 'USER')
  @ApiOperation({ summary: 'Export decision variables as Excel file with multiple sheets' })
  async exportDecisionVariables(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const buffer = await this.optimizationScenarioService.exportDecisionVariablesExcel(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="decision_variables_${id}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete optimization scenario (Admin only)' })
  async deleteScenario(@Param('id') id: string) {
    return this.optimizationScenarioService.deleteScenario(id);
  }
}
