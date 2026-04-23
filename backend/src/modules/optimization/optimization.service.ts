import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CampaignRepository } from '../campaign/campaign.repository';
import { CustomerSegmentService } from '../customer-segment/customer-segment.service';
import { OptimizationRepository } from './optimization.repository';
import { AppLoggerService } from '../../infrastructure/logger/app-logger.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OptimizationResultSummary } from '../../domain/entities/optimization-result-summary.entity';
import { OptimizationResultDetail } from '../../domain/entities/optimization-result-detail.entity';

// Python FastAPI expected format (snake_case)
interface PythonOptimizationRequest {
  campaign_id: string;
  general_parameters: {
    c_min: number;
    c_max: number;
    n_min: number;
    n_max: number;
    b_min: number;
    b_max: number;
    m_min: number;
    m_max: number;
  };
  campaign_parameters: {
    campaign_id: string;
    campaign_name: string;
    campaign_type: string;
    r_min: number;
    r_max: number;
    z_k: number;
    c_k: number;
  };
  customer_segments: Array<{
    id: string;
    name: string;
    customer_count: number;
    lifetime_value: number;
    propensity_scores: Record<string, number>;
  }>;
}

// Python FastAPI response format (snake_case)
interface PythonOptimizationResponse {
  campaign_id: string;
  status: string;
  summary_result: {
    recommended_customer_count: number;
    total_recommendations: number;
    estimated_participation: number;
    estimated_contribution: number;
    estimated_cost: number;
    estimated_roi: number;
  } | null;
  detail_results: Array<{
    segment_id: string;
    segment_name: string;
    customer_count: number;
    recommended_campaigns: Array<{
      campaign_id: string;
      campaign_name: string;
      score: number;
      expected_contribution: number;
    }>;
    total_expected_contribution: number;
  }>;
  execution_time: number;
  solver_status: string;
  objective_value: number | null;
  error_message: string | null;
}

@Injectable()
export class OptimizationService {
  private readonly fastapiUrl: string;

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly customerSegmentService: CustomerSegmentService,
    private readonly optimizationRepo: OptimizationRepository,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly prisma: PrismaService,
  ) {
    this.fastapiUrl =
      this.configService.get<string>('FASTAPI_URL') ||
      'http://localhost:8000';
    this.logger.setContext(OptimizationService.name);
  }

  async runOptimization(
    campaignId: string,
  ): Promise<OptimizationResultSummary> {
    const startTime = new Date();

    const campaign = await this.campaignRepo.findByIdWithParameters(campaignId);

    if (!campaign) {
      throw new NotFoundException(
        `Campaign with id ${campaignId} not found`,
      );
    }

    if (!campaign.generalParameters) {
      throw new Error('General parameters not found for campaign');
    }

    // Use customer segments instead of individual customers
    const segments = await this.customerSegmentService.findAll();
    if (!segments || segments.length === 0) {
      throw new Error('No customer segments defined. Please create customer segments before running optimization.');
    }

    // Build campaign parameter for propensity score generation
    if (!campaign.campaignParameters) {
      throw new Error('Campaign parameters not defined. Please define campaign parameters before running optimization.');
    }

    const campaignParam = {
      campaign_id: campaign.campaignParameters.id,
      campaign_name: campaign.name,
      campaign_type: 'CRM' as string,
      r_min: campaign.campaignParameters.rMin,
      r_max: campaign.campaignParameters.rMax,
      z_k: campaign.campaignParameters.zK,
      c_k: campaign.campaignParameters.cK,
    };

    // Fetch campaign-specific segment scores
    const segmentScores = await (this.prisma as any).campaignCustomerSegmentScore.findMany({
      where: { campaignId: campaign.id },
    });

    const scoreMap = new Map(
      segmentScores.map((s: any) => [s.customerSegmentId, s.score]),
    );

    // Build request with segments
    const request: PythonOptimizationRequest = {
      campaign_id: campaign.id,
      general_parameters: {
        c_min: campaign.generalParameters.cMin,
        c_max: campaign.generalParameters.cMax,
        n_min: campaign.generalParameters.nMin,
        n_max: campaign.generalParameters.nMax,
        b_min: campaign.generalParameters.bMin,
        b_max: campaign.generalParameters.bMax,
        m_min: campaign.generalParameters.mMin,
        m_max: campaign.generalParameters.mMax,
      },
      campaign_parameters: campaignParam,
      customer_segments: segments.map((s: any) => {
        // Get campaign propensity score from scoreMap, or use default
        const propensityScore = (scoreMap.get(s.id) ?? 0.5) as number;
        const propensityScores: Record<string, number> = {
          [campaignParam.campaign_id]: propensityScore,
        };

        return {
          id: s.id,
          name: s.name,
          customer_count: s.customerCount,
          lifetime_value: s.lifetimeValue,
          propensity_scores: propensityScores,
        };
      }),
    };

    const url = `${this.fastapiUrl}/optimize/campaign`;
    this.logger.log(`Calling Python optimization service: POST ${url}`);
    this.logger.logHttpRequest({
      method: 'POST',
      url,
      requestBody: {
        campaign_id: request.campaign_id,
        generalParameters: request.general_parameters,
        campaignParameters: request.campaign_parameters.campaign_name,
        segmentsCount: request.customer_segments.length,
        totalCustomers: request.customer_segments.reduce((sum, s) => sum + s.customer_count, 0),
      },
    });

    const httpStartTime = Date.now();
    let response;
    try {
      response = await axios.post<PythonOptimizationResponse>(
        url,
        request,
        { timeout: 300000 },
      );

      const httpDuration = Date.now() - httpStartTime;
      this.logger.logHttpRequest({
        method: 'POST',
        url,
        responseStatus: response.status,
        responseBody: {
          status: response.data.status,
          executionTime: response.data.execution_time,
          recommendedCustomerCount: response.data.summary_result?.recommended_customer_count,
          detailResultsCount: response.data.detail_results?.length,
        },
        duration: httpDuration,
      });
    } catch (httpError: any) {
      const httpDuration = Date.now() - httpStartTime;
      this.logger.logHttpError({
        method: 'POST',
        url,
        requestBody: {
          campaign_id: request.campaign_id,
          general_parameters: request.general_parameters,
        },
        error: httpError.response?.data
          ? JSON.stringify(httpError.response.data)
          : (httpError.message || String(httpError)),
        duration: httpDuration,
      });
      throw httpError;
    }

    const endTime = new Date();
    const result = response.data;

    if (result.status !== 'optimal' || !result.summary_result) {
      throw new Error(
        `Optimization failed: status=${result.status}, solver=${result.solver_status}, error=${result.error_message || 'unknown'}`,
      );
    }

    const summary = await this.optimizationRepo.upsertSummary(campaignId, {
      recommendedCustomerCount: result.summary_result.recommended_customer_count,
      estimatedParticipation: result.summary_result.estimated_participation,
      estimatedContribution: result.summary_result.estimated_contribution,
      estimatedCost: result.summary_result.estimated_cost,
      calculationStartedAt: startTime,
      calculationFinishedAt: endTime,
    });

    // Store segment-level detail results
    for (const detail of result.detail_results) {
      // Extract score and expected_contribution from the first recommended campaign
      const firstCampaign = detail.recommended_campaigns?.[0];
      await this.optimizationRepo.upsertDetail(summary.id, campaignId, detail.segment_id, {
        score: firstCampaign?.score,
        customerCount: detail.customer_count,
        expectedContribution: firstCampaign?.expected_contribution,
        recommendedCampaigns: detail.recommended_campaigns as any,
        calculationStartedAt: startTime,
        calculationFinishedAt: endTime,
      });
    }

    return summary;
  }

  async getSummary(
    campaignId: string,
  ): Promise<OptimizationResultSummary | null> {
    return this.optimizationRepo.findSummaryByCampaignId(campaignId); // deprecated: no scenario scope
  }

  async getAllDetails(
    campaignId: string,
  ): Promise<OptimizationResultDetail[]> {
    const result = await this.optimizationRepo.findDetails(campaignId, 1, 100000);
    return result.data;
  }

  async getDetails(
    campaignId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: OptimizationResultDetail[]; total: number }> {
    return this.optimizationRepo.findDetails(campaignId, page, limit);
  }

  async approveSummary(
    campaignId: string,
  ): Promise<OptimizationResultSummary | null> {
    return this.optimizationRepo.approveSummaryByCampaignId(campaignId);
  }
}
