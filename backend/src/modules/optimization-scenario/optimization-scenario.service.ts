import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CampaignRepository } from '../campaign/campaign.repository';
import { AppLoggerService } from '../../infrastructure/logger/app-logger.service';
import {
  CreateOptimizationScenarioDto,
  UpdateOptimizationScenarioDto,
  AddCampaignsToScenarioDto,
  UpdateDefaultParametersDto,
} from './dto/optimization-scenario.dto';
import { Prisma, ScenarioStatus } from '@prisma/client';

@Injectable()
export class OptimizationScenarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignRepo: CampaignRepository,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(OptimizationScenarioService.name);
  }

  // ── CREATE SCENARIO ──
  async createScenario(dto: CreateOptimizationScenarioDto) {
    // Get default general parameters if scenario-specific ones not provided
    let defaults = null;
    if (!dto.cMin || !dto.cMax || !dto.nMin || !dto.nMax || !dto.bMin || !dto.bMax || !dto.mMin || dto.mMax === undefined) {
      defaults = await this.prisma.defaultGeneralParameters.findFirst();
    }

    const scenario = await this.prisma.optimizationScenario.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        status: ScenarioStatus.READY,
        cMin: dto.cMin ?? defaults?.cMin ?? 0,
        cMax: dto.cMax ?? defaults?.cMax ?? 20,
        nMin: dto.nMin ?? defaults?.nMin ?? 1,
        nMax: dto.nMax ?? defaults?.nMax ?? 20,
        bMin: dto.bMin ?? defaults?.bMin ?? 100,
        bMax: dto.bMax ?? defaults?.bMax ?? 10000,
        mMin: dto.mMin ?? defaults?.mMin ?? 0,
        mMax: dto.mMax ?? defaults?.mMax ?? 10,
      },
      include: {
        campaigns: {
          select: { campaignId: true },
        },
      },
    });

    console.log(`[SCENARIO ${scenario.id}] Created with parameters:`, {
      cMin: scenario.cMin,
      cMax: scenario.cMax,
      nMin: scenario.nMin,
      nMax: scenario.nMax,
      bMin: scenario.bMin,
      bMax: scenario.bMax,
      mMin: scenario.mMin,
      mMax: scenario.mMax,
    });

    return this.formatScenarioResponse(scenario);
  }

  // ── GET ALL SCENARIOS WITHOUT PAGINATION ──
  async getAll() {
    const data = await this.prisma.optimizationScenario.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        campaigns: {
          select: { campaignId: true },
        },
      },
    });

    return data.map((scenario: any) => ({
      ...scenario,
      campaignIds: scenario.campaigns.map((c: any) => c.campaignId),
      campaigns: undefined,
    }));
  }

  // ── GET ALL SCENARIOS WITH PAGINATION ──
  async getScenarios(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.optimizationScenario.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaigns: {
            select: { campaignId: true },
          },
        },
      }),
      this.prisma.optimizationScenario.count(),
    ]);

    const formatted = data.map((scenario: any) => ({
      ...scenario,
      campaignIds: scenario.campaigns.map((c: any) => c.campaignId),
      campaigns: undefined,
    }));

    return {
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ── GET SCENARIO DETAIL ──
  async getScenarioDetail(scenarioId: string) {
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
      include: {
        campaigns: true,
      },
    });

    if (!scenario) {
      throw new NotFoundException(`Scenario with id ${scenarioId} not found`);
    }

    // Use snapshot values from OptimizationScenarioCampaign (not from Campaign table)
    // This ensures campaign values remain consistent with when they were added to the scenario
    const scenarioWithDetails = {
      ...scenario,
      campaigns: scenario.campaigns.map(sc => ({
        id: sc.campaignId,
        campaignId: sc.campaignId,
        // Use snapshot values (name, type, parameters at time of adding)
        name: sc.campaignName,
        type: sc.campaignType,
        rMin: sc.rMin,
        rMax: sc.rMax,
        zK: sc.zK,
        cK: sc.cK,
        createdAt: sc.createdAt,
        updatedAt: sc.updatedAt,
      })),
    };

    return this.formatScenarioDetailResponse(scenarioWithDetails);
  }

  // ── UPDATE SCENARIO ──
  async updateScenario(scenarioId: string, dto: UpdateOptimizationScenarioDto) {
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow updates if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot update scenario in ${scenario.status} status. Only READY scenarios can be updated.`,
      );
    }

    await this.prisma.optimizationScenario.update({
      where: { id: scenarioId },
      data: {
        name: dto.name || scenario.name,
        description: dto.description !== undefined ? dto.description : scenario.description,
      },
    });

    // Return updated scenario detail with snapshot campaign data
    return this.getScenarioDetail(scenarioId);
  }

  // ── UPDATE DEFAULT PARAMETERS (Admin-only) ──
  async updateDefaultParameters(scenarioId: string, dto: UpdateDefaultParametersDto) {
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow updates if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot update parameters in ${scenario.status} status. Only READY scenarios can be modified.`,
      );
    }

    const updateData: any = {};
    if (dto.cMin !== undefined) updateData.cMin = dto.cMin;
    if (dto.cMax !== undefined) updateData.cMax = dto.cMax;
    if (dto.nMin !== undefined) updateData.nMin = dto.nMin;
    if (dto.nMax !== undefined) updateData.nMax = dto.nMax;
    if (dto.bMin !== undefined) updateData.bMin = dto.bMin;
    if (dto.bMax !== undefined) updateData.bMax = dto.bMax;
    if (dto.mMin !== undefined) updateData.mMin = dto.mMin;
    if (dto.mMax !== undefined) updateData.mMax = dto.mMax;

    await this.prisma.optimizationScenario.update({
      where: { id: scenarioId },
      data: updateData,
    });

    this.logger.log(`Scenario ${scenarioId} default parameters updated:`, 'UpdateDefaultParameters');

    // Return updated scenario detail with snapshot campaign data
    return this.getScenarioDetail(scenarioId);
  }

  // ── ADD CAMPAIGNS TO SCENARIO ──
  async addCampaignsToScenario(
    scenarioId: string,
    dto: AddCampaignsToScenarioDto,
  ) {
    // Check scenario exists
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow add campaigns if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot add campaigns to scenario in ${scenario.status} status. Only READY scenarios can be modified.`,
      );
    }

    // Fetch campaign details for snapshot
    const campaigns = await this.prisma.campaign.findMany({
      where: { id: { in: dto.campaignIds } },
    });

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));

    // Validate all campaign IDs exist
    for (const campaignId of dto.campaignIds) {
      if (!campaignMap.has(campaignId)) {
        throw new NotFoundException(`Campaign with id ${campaignId} not found`);
      }
    }

    // Get current campaign IDs in scenario
    const currentCampaignIds = new Set<string>(scenario.campaignIds);

    // Find only campaigns to add (not already in scenario)
    // This is an ADD operation, not a REPLACE operation
    const campaignsToAdd: string[] = dto.campaignIds.filter(
      id => !currentCampaignIds.has(id),
    );

    // If there are campaigns to add, create them with snapshot values
    if (campaignsToAdd.length > 0) {
      await this.prisma.optimizationScenarioCampaign.createMany({
        data: campaignsToAdd.map(campaignId => {
          const campaign = campaignMap.get(campaignId)!;
          return {
            scenarioId,
            campaignId,
            // Campaign snapshot - values at time of adding to scenario
            campaignName: campaign.name,
            campaignType: campaign.type,
            rMin: campaign.rMin,
            rMax: campaign.rMax,
            zK: campaign.zK,
            cK: campaign.cK,
          };
        }),
        skipDuplicates: true,
      });
    }

    return this.getScenarioDetail(scenarioId);
  }

  // ── UPDATE CAMPAIGN IN SCENARIO (Scenario-specific snapshot) ──
  async updateCampaignInScenario(
    scenarioId: string,
    campaignId: string,
    updateData: any,
  ) {
    // Check scenario exists
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow updates if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot update campaigns in scenario in ${scenario.status} status. Only READY scenarios can be modified.`,
      );
    }

    // Check campaign exists in scenario
    const scenarioCampaign = await this.prisma.optimizationScenarioCampaign.findUnique({
      where: {
        scenarioId_campaignId: {
          scenarioId,
          campaignId,
        },
      },
    });

    if (!scenarioCampaign) {
      throw new NotFoundException(
        `Campaign ${campaignId} not found in scenario ${scenarioId}`,
      );
    }

    // Build update object for scenario-specific campaign snapshot
    const snapshotUpdate: any = {};
    if (updateData.campaignName !== undefined) snapshotUpdate.campaignName = updateData.campaignName;
    if (updateData.campaignType !== undefined) snapshotUpdate.campaignType = updateData.campaignType;
    if (updateData.rMin !== undefined) snapshotUpdate.rMin = updateData.rMin;
    if (updateData.rMax !== undefined) snapshotUpdate.rMax = updateData.rMax;
    if (updateData.zK !== undefined) snapshotUpdate.zK = updateData.zK;
    if (updateData.cK !== undefined) snapshotUpdate.cK = updateData.cK;

    // Update the scenario-specific campaign snapshot (NOT the main campaign table)
    await this.prisma.optimizationScenarioCampaign.update({
      where: {
        scenarioId_campaignId: {
          scenarioId,
          campaignId,
        },
      },
      data: snapshotUpdate,
    });

    this.logger.log(
      `Campaign ${campaignId} in scenario ${scenarioId} updated with snapshot values`,
      'UpdateScenarioCampaign',
    );

    return this.getScenarioDetail(scenarioId);
  }

  // ── REMOVE CAMPAIGN FROM SCENARIO ──
  async removeCampaignFromScenario(scenarioId: string, campaignId: string) {
    // Check scenario exists
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow removal if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot remove campaigns from scenario in ${scenario.status} status. Only READY scenarios can be modified.`,
      );
    }

    await this.prisma.optimizationScenarioCampaign.delete({
      where: {
        scenarioId_campaignId: {
          scenarioId,
          campaignId,
        },
      },
    });

    return this.getScenarioDetail(scenarioId);
  }

  // ── RUN OPTIMIZATION ──
  async runOptimization(scenarioId: string) {
    const scenario = await this.getScenarioDetail(scenarioId);

    if (scenario.campaignIds.length === 0) {
      throw new BadRequestException('Scenario has no campaigns');
    }

    console.log(`[SCENARIO ${scenarioId}] Starting optimization run - Updating status to RUNNING`);

    // Update scenario status to RUNNING
    await this.prisma.optimizationScenario.update({
      where: { id: scenarioId },
      data: { status: ScenarioStatus.RUNNING },
    });

    console.log(`[SCENARIO ${scenarioId}] Scenario status updated to RUNNING`);

    // Call FastAPI asynchronously (don't wait for response)
    // FastAPI will call back with results
    this.callFastApiAsync(scenarioId, scenario).catch((error) => {
      console.error(`Async FastAPI call failed for scenario ${scenarioId}:`, error);
    });

    return this.getScenarioDetail(scenarioId);
  }

  // ── ASYNC FastAPI Call ──
  private async callFastApiAsync(scenarioId: string, scenario: any): Promise<void> {
    try {
      const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

      console.log(`[SCENARIO ${scenarioId}] Preparing FastAPI request payload...`);

      // Log scenario parameters for debugging
      console.log(`[SCENARIO ${scenarioId}] Scenario parameters:`, {
        cMin: scenario.cMin,
        cMax: scenario.cMax,
        nMin: scenario.nMin,
        nMax: scenario.nMax,
        bMin: scenario.bMin,
        bMax: scenario.bMax,
        mMin: scenario.mMin,
        mMax: scenario.mMax,
      });

      // Get customer segments for the scenario
      const customerSegments = await this.prisma.customerSegment.findMany();
      console.log(`[SCENARIO ${scenarioId}] Fetched ${customerSegments.length} customer segments`);

      // Fetch campaign-segment scores from database
      const allScores = await this.prisma.campaignCustomerSegmentScore.findMany({
        where: { campaignId: { in: scenario.campaigns.map((c: any) => c.id) } },
      });

      // Build a map of campaign-segment combination to score
      const scoreMap: Record<string, number> = {};
      allScores.forEach((scoreRecord: any) => {
        scoreMap[`${scoreRecord.campaignId}|${scoreRecord.customerSegmentId}`] = scoreRecord.score;
      });

      // SEGMENT-BASED OPTIMIZATION (like batch fix)
      // Instead of: for campaign → for segment → optimize(1 campaign, 1 segment)
      // We now do:  for segment → optimize(all campaigns, 1 segment)

      const optimizationPayload = {
        scenario_id: scenarioId,
        global_customer_segments: customerSegments.map((seg: any) => ({
          customer_segment_id: seg.id,
          customer_segment_name: seg.name,
          customer_count: seg.customerCount,
          lifetime_value: seg.lifetimeValue,
          income_level: seg.incomeLevel,
        })),
        optimization_scenario_campaigns: scenario.campaigns.map((campaign: any) => {
          // Merge campaign-specific parameters with scenario general parameters
          const mergedParameters = {
            // Campaign identification
            campaign_name: campaign.name,
            // Campaign-specific parameters from Campaign table
            campaign_type: campaign.type || 'CRM',
            r_min: campaign.rMin ?? 0,
            r_max: campaign.rMax ?? 0,
            z_k: campaign.zK ?? 0,
            c_k: campaign.cK ?? 0,
            // General parameters from Scenario (these are required)
            c_min: scenario.cMin ?? 0,
            c_max: scenario.cMax ?? 20,
            n_min: scenario.nMin ?? 1,
            n_max: scenario.nMax ?? 20,
            b_min: scenario.bMin ?? 100,
            b_max: scenario.bMax ?? 10000,
            m_min: scenario.mMin ?? 0,
            m_max: scenario.mMax ?? 10,
          };

          console.log(`[SCENARIO ${scenarioId}] Campaign ${campaign.id} merged parameters:`, mergedParameters);

          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            parameters: mergedParameters,
            customer_segments: customerSegments.map((seg: any) => ({
              customer_segment_id: seg.id,
              customer_segment_name: seg.name,
              customer_count: seg.customerCount,
              lifetime_value: seg.lifetimeValue,
              income_level: seg.incomeLevel,
              // Use score for this campaign-segment pair
              score: scoreMap[`${campaign.id}|${seg.id}`] || 0.5,
            })),
          };
        }),
      };

      console.log(`[SCENARIO ${scenarioId}] Payload preview (first campaign):`,
        JSON.stringify(optimizationPayload.optimization_scenario_campaigns[0], null, 2));

      console.log(`[SCENARIO ${scenarioId}] Calling FastAPI endpoint: ${fastApiUrl}/optimization/scenario/${scenarioId}`);

      // Make HTTP call to Python service
      const response = await fetch(`${fastApiUrl}/optimization/scenario/${scenarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(optimizationPayload),
      });

      if (!response.ok) {
        const errorMsg = `FastAPI returned error: ${response.status} ${response.statusText}`;
        console.error(`[SCENARIO ${scenarioId}] ${errorMsg}`);

        // Update scenario status to FAILED and log error to DB
        await this.prisma.optimizationScenario.update({
          where: { id: scenarioId },
          data: { status: ScenarioStatus.FAILED },
        });

        this.logger.error(`FastAPI Error: ${response.status} ${response.statusText}`, undefined, 'FastAPI');
      } else {
        console.log(`[SCENARIO ${scenarioId}] FastAPI request sent successfully`);
        this.logger.warn(`FastAPI request sent for scenario ${scenarioId}`, 'FastAPI');
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      console.error(`[SCENARIO ${scenarioId}] Error calling FastAPI:`, error);

      // Update scenario status to FAILED and log error to DB
      await this.prisma.optimizationScenario.update({
        where: { id: scenarioId },
        data: { status: ScenarioStatus.FAILED },
      });

      this.logger.error(`FastAPI Exception: ${errorMsg}`, error?.stack, 'FastAPI');
    }
  }

  // ── HANDLE SCENARIO COMPLETE (Callback from Python) ──
  async handleScenarioComplete(
    scenarioId: string,
    results: any[],
    chunkNumber?: number,
    totalChunks?: number,
    decisionVariables?: any,
  ) {
    console.log(
      `[SCENARIO ${scenarioId}] Received completion callback - Chunk ${chunkNumber}/${totalChunks} with ${results.length} results`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Fetch scenario with all campaigns to ensure we save records for all
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
      include: {
        campaigns: {
          select: { campaignId: true },
        },
      },
    });

    // Group results by campaign for summary table
    const summaryByCampaign: Record<string, any> = {};

    // Build all upsert operations first, then execute as a single batch
    // transaction. Sequentially awaiting 50 upserts per chunk meant 50 DB
    // round-trips per request, which left each chunk call occupying a Prisma
    // connection for ~2s and amplified head-of-line blocking under load
    // (observed symptom: a chunk request sitting in the server for 2+ min
    // while other work held the pool, exceeding the client's read timeout).
    // A batched $transaction ships all 50 statements in one round-trip and
    // releases the connection sooner.
    const upserts: Prisma.PrismaPromise<any>[] = [];

    for (const result of results) {
      if (result.status === 'success') {
        successCount++;
        upserts.push(
          this.prisma.optimizationScenarioResult.upsert({
            where: {
              scenarioId_campaignId_segmentId: {
                scenarioId,
                campaignId: result.campaign_id,
                segmentId: result.segment_id,
              },
            },
            create: {
              scenarioId,
              campaignId: result.campaign_id,
              segmentId: result.segment_id,
              recommendations: result.result?.detail_results || [],
              totalRecommendations: result.result?.summary_result?.recommended_customer_count || 0,
              totalContribution: result.result?.summary_result?.estimated_contribution || 0,
              estimatedCost: result.result?.summary_result?.estimated_cost || 0,
              resultStatus: 'SUCCESS',
              executedAt: new Date(),
            },
            update: {
              recommendations: result.result?.detail_results || [],
              totalRecommendations: result.result?.summary_result?.recommended_customer_count || 0,
              totalContribution: result.result?.summary_result?.estimated_contribution || 0,
              estimatedCost: result.result?.summary_result?.estimated_cost || 0,
              resultStatus: 'SUCCESS',
              executedAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        );

        // Collect data for summary and details tables
        const campaignId = result.campaign_id;
        const segmentId = result.segment_id;

        if (!summaryByCampaign[campaignId]) {
          summaryByCampaign[campaignId] = {
            campaignId,
            totalRecommendedCustomers: 0,
            totalContribution: 0,
            segments: [],
          };
        }

        summaryByCampaign[campaignId].totalRecommendedCustomers +=
          result.result?.summary_result?.recommended_customer_count || 0;
        summaryByCampaign[campaignId].totalContribution +=
          result.result?.summary_result?.estimated_contribution || 0;
        summaryByCampaign[campaignId].segments.push({
          segmentId,
          recommendedCampaigns: result.result?.detail_results || {},
        });
      } else {
        failureCount++;
        upserts.push(
          this.prisma.optimizationScenarioResult.upsert({
            where: {
              scenarioId_campaignId_segmentId: {
                scenarioId,
                campaignId: result.campaign_id,
                segmentId: result.segment_id,
              },
            },
            create: {
              scenarioId,
              campaignId: result.campaign_id,
              segmentId: result.segment_id,
              resultStatus: 'FAILED',
              errorMessage: result.error,
              executedAt: new Date(),
            },
            update: {
              resultStatus: 'FAILED',
              errorMessage: result.error,
              executedAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        );
      }
    }

    if (upserts.length > 0) {
      await this.prisma.$transaction(upserts);
    }

    // Aggregate metrics and save summaries ONLY on the final chunk.
    // This ensures all results from all chunks are available in the database before aggregating.
    // Previously, aggregation ran per-chunk causing two bugs:
    //   Bug 1: Each segment result was duplicated N times (once per campaign_id at outer level),
    //          but each contained ALL campaigns in recommended_campaigns, causing N× overcounting.
    //   Bug 2: Each chunk's upsert overwrote previous chunk's summary values instead of accumulating.
    if (chunkNumber === totalChunks) {
      // Idempotency guard: if Stage B already completed for this scenario, skip.
      // Protects against retry storms when the HTTP client resends the final
      // chunk after a timeout while backend is still processing the first call.
      const existingScenario = await this.prisma.optimizationScenario.findUnique({
        where: { id: scenarioId },
        select: { status: true },
      });
      if (
        existingScenario?.status === ScenarioStatus.COMPLETED_SUCCESSFULLY ||
        existingScenario?.status === ScenarioStatus.FAILED
      ) {
        console.log(
          `[SCENARIO ${scenarioId}] Final chunk received again but aggregation already completed (status=${existingScenario.status}). Skipping Stage B.`,
        );
        return {
          message: 'Final chunk retried; aggregation already completed',
          successCount,
          failureCount,
          chunk: `${chunkNumber}/${totalChunks}`,
        };
      }

      console.log(
        `[SCENARIO ${scenarioId}] All chunks received (${successCount} success, ${failureCount} failed). Aggregating final results...`,
      );

      // Persist decision variables immediately so the export endpoint works
      // even if Stage B aggregation below fails partway through.
      if (decisionVariables) {
        await this.prisma.optimizationScenario.update({
          where: { id: scenarioId },
          data: { decisionVariables },
        });
      }

      // Fetch ALL successful results for this scenario from database (across all chunks)
      const allResults = await this.prisma.optimizationScenarioResult.findMany({
        where: { scenarioId, resultStatus: 'SUCCESS' },
        select: {
          campaignId: true,
          segmentId: true,
          recommendations: true,
          estimatedCost: true,
          totalRecommendations: true,
          totalContribution: true,
        },
      });

      // Aggregate metrics by campaign with deduplication.
      // Python sends N×M results (N campaigns × M segments), each with segment-level cost.
      // We aggregate by campaign, summing up segment-level costs.
      const campaignMetrics: Record<string, any> = {};
      const processedPairs = new Set<string>();

      // Initialize metrics for ALL scenario campaigns (even if not recommended)
      if (scenario?.campaigns) {
        for (const scenarioCampaign of scenario.campaigns) {
          const campaignId = scenarioCampaign.campaignId;
          if (!campaignMetrics[campaignId]) {
            campaignMetrics[campaignId] = {
              totalRecommendedCustomers: 0,
              totalParticipation: 0,
              totalContribution: 0,
              totalCost: 0,
              segments: [],
            };
          }
        }
      }

      for (const dbResult of allResults) {
        const resultCampaignId = dbResult.campaignId;
        const segmentLevelCost = dbResult.estimatedCost || 0;
        const recommendations = dbResult.recommendations as any[];

        console.log(`[DEBUG] Processing dbResult: campaignId=${resultCampaignId}, segmentId=${dbResult.segmentId}, cost=${segmentLevelCost}`);

        // CRITICAL FIX: Directly add cost to the campaign whose result this is
        // Python sends separate result entries for each campaign-segment pair, but
        // recommended_campaigns array may be incomplete (only includes "active" campaigns from solver)
        // So we add cost directly from dbResult without checking recommended_campaigns
        if (!campaignMetrics[resultCampaignId]) {
          campaignMetrics[resultCampaignId] = {
            totalRecommendedCustomers: 0,
            totalParticipation: 0,
            totalContribution: 0,
            totalCost: 0,
            segments: [],
          };
        }

        // CRITICAL: Add segment-level cost directly to this campaign
        // Each campaign-segment pair has its own cost calculated by Python
        campaignMetrics[resultCampaignId].totalCost += segmentLevelCost;
        console.log(`[DEBUG] Added cost ${segmentLevelCost} to campaign ${resultCampaignId}`);

        // Extract contribution and participation metrics from recommendations
        if (recommendations && Array.isArray(recommendations)) {
          for (const detail of recommendations) {
            const segmentId = detail.segment_id;
            const segmentCustomerCount = detail.customer_count;

            for (const recommendedCampaign of detail.recommended_campaigns || []) {
              const campaignId = recommendedCampaign.campaign_id;
              const pairKey = `${campaignId}_${segmentId}`;

              // Skip if this campaign-segment pair has already been processed
              if (processedPairs.has(pairKey)) continue;
              processedPairs.add(pairKey);

              if (!campaignMetrics[campaignId]) {
                campaignMetrics[campaignId] = {
                  totalRecommendedCustomers: 0,
                  totalParticipation: 0,
                  totalContribution: 0,
                  totalCost: 0,
                  segments: [],
                };
              }

              // Add customer count for this campaign in this segment
              campaignMetrics[campaignId].totalRecommendedCustomers += segmentCustomerCount;

              // Formula: estimated_participation = customer_count × campaign_score
              campaignMetrics[campaignId].totalParticipation += (recommendedCampaign.score || 0) * segmentCustomerCount;

              // Add expected contribution
              campaignMetrics[campaignId].totalContribution += recommendedCampaign.expected_contribution || 0;

              // Calculate segment-level participation
              const segmentParticipation = (recommendedCampaign.score || 0) * segmentCustomerCount;

              // Store segment detail
              campaignMetrics[campaignId].segments.push({
                segmentId,
                customerCount: segmentCustomerCount,
                score: recommendedCampaign.score,
                expectedContribution: recommendedCampaign.expected_contribution,
                estimatedParticipation: segmentParticipation,
                estimatedCost: segmentLevelCost,
              });
            }
          }
        }
      }

      // Save to OptimizationResultSummary and OptimizationResultDetail tables
      for (const [campaignId, metrics] of Object.entries(campaignMetrics)) {
        // Use aggregated segment-level cost (already calculated in campaignMetrics)
        const estimatedCost = (metrics as any).totalCost;
        const estimatedContribution = (metrics as any).totalContribution;

        // Calculate ROI: ((contribution - cost) / cost) * 100
        const estimatedRoi = estimatedCost > 0
          ? ((estimatedContribution - estimatedCost) / estimatedCost) * 100
          : 0;

        const resultSummary = await this.prisma.optimizationResultSummary.upsert({
          where: {
            scenarioId_campaignId: {
              scenarioId,
              campaignId,
            },
          },
          create: {
            scenarioId,
            campaignId,
            recommendedCustomerCount: (metrics as any).totalRecommendedCustomers,
            estimatedParticipation: (metrics as any).totalParticipation,
            estimatedContribution,
            estimatedCost,
            estimatedRoi,
            approved: false,
            calculationStartedAt: new Date(),
            calculationFinishedAt: new Date(),
          },
          update: {
            recommendedCustomerCount: (metrics as any).totalRecommendedCustomers,
            estimatedParticipation: (metrics as any).totalParticipation,
            estimatedContribution,
            estimatedCost,
            estimatedRoi,
            calculationFinishedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Save segment details in a single batched transaction.
        // Sequential upserts across ~10K segments × many campaigns previously
        // saturated the DB connection and caused "Server has closed the
        // connection" errors, which in turn triggered client-side retry storms.
        const segments = (metrics as any).segments as Array<any>;
        if (segments.length > 0) {
          const now = new Date();
          await this.prisma.$transaction([
            this.prisma.optimizationResultDetail.deleteMany({
              where: { summaryId: resultSummary.id },
            }),
            this.prisma.optimizationResultDetail.createMany({
              data: segments.map((s) => ({
                summaryId: resultSummary.id,
                campaignId,
                segmentId: s.segmentId,
                score: s.score,
                customerCount: s.customerCount,
                expectedContribution: s.expectedContribution,
                estimatedParticipation: s.estimatedParticipation,
                estimatedCost: s.estimatedCost,
                calculationStartedAt: now,
                calculationFinishedAt: now,
              })),
              skipDuplicates: true,
            }),
          ]);
        }

        console.log(
          `[CAMPAIGN ${campaignId}] Metrics saved - Recommended: ${(metrics as any).totalRecommendedCustomers} customers, Participation: ${(metrics as any).totalParticipation}, Contribution: ${estimatedContribution}, Cost: ${estimatedCost}, ROI: ${estimatedRoi.toFixed(2)}%`,
        );
      }

      // Determine final scenario status based on result statuses
      const totalResults = await this.prisma.optimizationScenarioResult.count({
        where: { scenarioId },
      });
      const failedResults = await this.prisma.optimizationScenarioResult.count({
        where: {
          scenarioId,
          resultStatus: 'FAILED',
        },
      });

      let finalStatus: ScenarioStatus;
      if (failedResults === 0) {
        finalStatus = ScenarioStatus.COMPLETED_SUCCESSFULLY;
        console.log(
          `[SCENARIO ${scenarioId}] All ${totalResults} results successful. Status: COMPLETED_SUCCESSFULLY`,
        );
        this.logger.warn(`Scenario completed successfully: ${totalResults} results`, 'Scenario');
      } else if (failedResults === totalResults) {
        finalStatus = ScenarioStatus.FAILED;
        console.log(
          `[SCENARIO ${scenarioId}] All ${totalResults} results failed. Status: FAILED`,
        );
        this.logger.warn(`Scenario failed completely: ${totalResults} results failed`, 'Scenario');
      } else {
        finalStatus = ScenarioStatus.FAILED;
        console.log(
          `[SCENARIO ${scenarioId}] Partial completion: ${successCount} success, ${failureCount} failed. Status: FAILED`,
        );
        this.logger.warn(`Scenario completed with partial failures: ${successCount} success, ${failureCount} failed`, 'Scenario');
      }

      // decisionVariables was persisted earlier (right after the idempotency
      // guard) so it survives even if Stage B fails partway through.
      await this.prisma.optimizationScenario.update({
        where: { id: scenarioId },
        data: { status: finalStatus },
      });
    }

    return {
      message: 'Results received and saved',
      successCount,
      failureCount,
      chunk: `${chunkNumber}/${totalChunks}`,
    };
  }

  // ── HANDLE DECISION VARIABLES CHUNK (Callback from Python) ──
  // Decision variables (solver y[k] / x[k,s]) are uploaded separately from
  // result chunks because x_ks_all (CRM × segment cartesian product) can be
  // tens of MB for large scenarios — well over the body-parser 1 MB default
  // that the regular /complete chunks fit under.
  //
  // Each call carries:
  //   chunk_number, total_chunks
  //   partial: { x_ks_all_partial: [...], (chunk 1 only) y_k, x_ks_active, summary }
  //
  // We accumulate x_ks_all slices in scenario.decisionVariables._x_ks_all_chunks
  // keyed by chunk_number. Re-receiving the same chunk overwrites the same key
  // so retries are idempotent. On the final chunk we sort the keys, flatten
  // into a single x_ks_all array, drop the temporary map, and persist the
  // assembled decisionVariables.
  async handleDecisionVariablesChunk(
    scenarioId: string,
    chunkNumber: number,
    totalChunks: number,
    partial: any,
  ) {
    if (!partial || typeof chunkNumber !== 'number' || typeof totalChunks !== 'number') {
      return { error: 'Missing chunk_number, total_chunks or partial' };
    }

    console.log(
      `[SCENARIO ${scenarioId}] DV chunk ${chunkNumber}/${totalChunks} received`,
    );

    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
      select: { decisionVariables: true },
    });
    const existing: any = (scenario?.decisionVariables as any) ?? {};

    if (partial.y_k !== undefined) existing.y_k = partial.y_k;
    if (partial.x_ks_active !== undefined) existing.x_ks_active = partial.x_ks_active;
    if (partial.summary !== undefined) existing.summary = partial.summary;

    const chunks: Record<string, any[]> = existing._x_ks_all_chunks ?? {};
    if (Array.isArray(partial.x_ks_all_partial)) {
      chunks[String(chunkNumber)] = partial.x_ks_all_partial;
    }
    existing._x_ks_all_chunks = chunks;

    if (chunkNumber === totalChunks) {
      const sortedKeys = Object.keys(chunks)
        .map(Number)
        .sort((a, b) => a - b);
      const assembled: any[] = [];
      for (const k of sortedKeys) {
        const slice = chunks[String(k)];
        if (Array.isArray(slice)) assembled.push(...slice);
      }
      existing.x_ks_all = assembled;
      delete existing._x_ks_all_chunks;

      console.log(
        `[SCENARIO ${scenarioId}] DV final chunk: assembled ${assembled.length} x_ks_all entries from ${sortedKeys.length} pieces`,
      );
    }

    await this.prisma.optimizationScenario.update({
      where: { id: scenarioId },
      data: { decisionVariables: existing },
    });

    return {
      message: 'ok',
      chunk: `${chunkNumber}/${totalChunks}`,
      assembled: chunkNumber === totalChunks,
    };
  }

  // ── GET CAMPAIGN RESULTS ──
  async getCampaignResults(scenarioId: string) {
    // Fetch scenario with campaigns
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
      include: {
        campaigns: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!scenario) {
      throw new NotFoundException(`Optimization scenario ${scenarioId} not found`);
    }

    const campaignResults = [];
    let totalParticipation = 0;
    let totalContribution = 0;
    let totalCost = 0;
    let approvedCount = 0;
    let totalRecommendedPeople = 0;

    // For each campaign in scenario, fetch calculated results from OptimizationResultSummary
    for (const scenarioCampaign of scenario.campaigns) {
      const campaign = scenarioCampaign.campaign;
      const campaignId = campaign.id;

      // Get metrics from OptimizationResultSummary (calculated when scenario completed)
      const summary = await this.prisma.optimizationResultSummary.findUnique({
        where: {
          scenarioId_campaignId: {
            scenarioId,
            campaignId,
          },
        },
      });

      // Skip campaigns not selected by optimizer (no results or all metrics zero)
      if (!summary || (summary.recommendedCustomerCount === 0 &&
          summary.estimatedParticipation === 0 &&
          summary.estimatedContribution === 0 &&
          summary.estimatedCost === 0)) {
        continue;
      }

      const recommendedPersonCount = summary.recommendedCustomerCount ?? 0;
      const estimatedParticipation = summary.estimatedParticipation ?? 0;
      const estimatedContribution = summary.estimatedContribution ?? 0;
      const estimatedCost = summary.estimatedCost ?? 0;
      const estimatedRoi = summary.estimatedRoi ?? 0;
      const approved = summary.approved ?? false;

      // Aggregate summary stats — sum across all campaigns
      totalRecommendedPeople += recommendedPersonCount;
      totalParticipation += estimatedParticipation;
      totalContribution += estimatedContribution;
      totalCost += estimatedCost;
      if (approved) approvedCount++;

      campaignResults.push({
        campaignId,
        campaignName: campaign.name,
        campaignType: campaign.type,
        recommendedPersonCount,
        estimatedParticipation,
        estimatedContribution,
        estimatedCost,
        estimatedRoi,
        approved,
      });
    }

    // Calculate overall scenario ROI
    const totalRoi = totalCost > 0
      ? ((totalContribution - totalCost) / totalCost) * 100
      : 0;

    return {
      scenarioId,
      scenarioName: scenario.name,
      campaignResults,
      summary: {
        totalCampaigns: campaignResults.length,
        totalRecommendedPeople,
        totalParticipation,
        totalContribution,
        totalCost,
        totalRoi,
        approvedCount,
      },
    };
  }

  // ── APPROVE CAMPAIGNS ──
  async approveCampaigns(scenarioId: string, campaignIds: string[]) {
    // Verify scenario exists
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
    });
    if (!scenario) {
      throw new NotFoundException(`Optimization scenario ${scenarioId} not found`);
    }

    // Update approved flag for each campaign's result summary (scoped to this scenario)
    const updateResults = await this.prisma.optimizationResultSummary.updateMany({
      where: {
        scenarioId,
        campaignId: { in: campaignIds },
      },
      data: {
        approved: true,
      },
    });

    return {
      message: `${updateResults.count} campaign(s) approved successfully`,
      approvedCount: updateResults.count,
    };
  }

  // ── GET CAMPAIGN SEGMENT DETAILS ──
  async getCampaignSegmentDetails(scenarioId: string, campaignId: string) {
    // Verify scenario exists
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
    });
    if (!scenario) {
      throw new NotFoundException(`Optimization scenario ${scenarioId} not found`);
    }

    // Fetch segment-level details from OptimizationResultDetail (scoped to this scenario)
    const summary = await this.prisma.optimizationResultSummary.findUnique({
      where: {
        scenarioId_campaignId: {
          scenarioId,
          campaignId,
        },
      },
    });

    if (!summary) {
      return { scenarioId, campaignId, segmentDetails: [] };
    }

    const details = await this.prisma.optimizationResultDetail.findMany({
      where: { summaryId: summary.id },
      include: {
        segment: {
          select: {
            id: true,
            name: true,
            customerCount: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    });

    return {
      scenarioId,
      campaignId,
      segmentDetails: details.map((d) => ({
        segmentId: d.segmentId,
        segmentName: d.segment?.name ?? 'Unknown',
        score: d.score ?? 0,
        customerCount: d.customerCount ?? d.segment?.customerCount ?? 0,
        expectedContribution: d.expectedContribution ?? 0,
        estimatedParticipation: d.estimatedParticipation ?? 0,
        estimatedCost: d.estimatedCost ?? 0,
      })),
    };
  }

  // ── DELETE SCENARIO ──
  async deleteScenario(scenarioId: string) {
    const scenario = await this.getScenarioDetail(scenarioId);

    // Only allow deletion if READY status
    if (scenario.status !== ScenarioStatus.READY) {
      throw new ForbiddenException(
        `Cannot delete scenario in ${scenario.status} status. Only READY scenarios can be deleted.`,
      );
    }

    await this.prisma.optimizationScenario.delete({
      where: { id: scenarioId },
    });

    return { message: 'Scenario deleted successfully' };
  }

  // ── HELPER: Format scenario response ──
  private formatScenarioResponse(scenario: any) {
    return {
      ...scenario,
      campaignIds: scenario.campaigns?.map((c: any) => c.campaignId) || [],
      campaigns: undefined,
    };
  }

  // ── HELPER: Format scenario detail response ──
  private formatScenarioDetailResponse(scenario: any) {

    const campaigns = scenario.campaigns.map((sc: any) => ({
      id: sc.id,
      name: sc.name,
      type: sc.type,
      rMin: sc.rMin,
      rMax: sc.rMax,
      zK: sc.zK,
      cK: sc.cK,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
      campaignId: sc.campaignId,
    }));

    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      status: scenario.status,
      // Include general parameters for optimization
      cMin: scenario.cMin,
      cMax: scenario.cMax,
      nMin: scenario.nMin,
      nMax: scenario.nMax,
      bMin: scenario.bMin,
      bMax: scenario.bMax,
      mMin: scenario.mMin,
      mMax: scenario.mMax,
      campaignIds: campaigns.map((c: any) => c.id),
      campaigns,
      createdAt: scenario.createdAt,
      updatedAt: scenario.updatedAt,
    };
  }

  // ── EXPORT DECISION VARIABLES AS EXCEL ──
  async exportDecisionVariablesExcel(scenarioId: string): Promise<Buffer> {
    const scenario = await this.prisma.optimizationScenario.findUnique({
      where: { id: scenarioId },
      select: { id: true, name: true, decisionVariables: true },
    });

    if (!scenario) {
      throw new NotFoundException(`Optimization scenario ${scenarioId} not found`);
    }

    if (!scenario.decisionVariables) {
      throw new BadRequestException('Decision variables not available for this scenario. Please run the optimization first.');
    }

    const dv = scenario.decisionVariables as any;
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: y_k (Campaign Selection)
    const ykSheet = workbook.addWorksheet('y_k');
    ykSheet.columns = [
      { header: 'Campaign ID', key: 'campaign_id', width: 40 },
      { header: 'Campaign Name', key: 'campaign_name', width: 25 },
      { header: 'Campaign Type', key: 'campaign_type', width: 15 },
      { header: 'y[k]', key: 'y_k', width: 10 },
      { header: 'Selected', key: 'selected', width: 10 },
    ];
    ykSheet.getRow(1).font = { bold: true };
    for (const row of (dv.y_k || [])) {
      ykSheet.addRow(row);
    }

    // Sheet 2: x_ks_all (All CRM Segment Assignments)
    const xAllSheet = workbook.addWorksheet('x_ks_all');
    xAllSheet.columns = [
      { header: 'Campaign ID', key: 'campaign_id', width: 40 },
      { header: 'Campaign Name', key: 'campaign_name', width: 25 },
      { header: 'Segment ID', key: 'segment_id', width: 40 },
      { header: 'Segment Name', key: 'segment_name', width: 25 },
      { header: 'x[k,s]', key: 'x_ks', width: 10 },
    ];
    xAllSheet.getRow(1).font = { bold: true };
    for (const row of (dv.x_ks_all || [])) {
      xAllSheet.addRow(row);
    }

    // Sheet 3: x_ks_active (Active CRM Assignments only)
    const xActiveSheet = workbook.addWorksheet('x_ks_active');
    xActiveSheet.columns = [
      { header: 'Campaign ID', key: 'campaign_id', width: 40 },
      { header: 'Campaign Name', key: 'campaign_name', width: 25 },
      { header: 'Segment ID', key: 'segment_id', width: 40 },
      { header: 'Segment Name', key: 'segment_name', width: 25 },
      { header: 'x[k,s]', key: 'x_ks', width: 10 },
    ];
    xActiveSheet.getRow(1).font = { bold: true };
    for (const row of (dv.x_ks_active || [])) {
      xActiveSheet.addRow(row);
    }

    // Sheet 4: Summary
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 35 },
      { header: 'Value', key: 'value', width: 50 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    const summary = dv.summary || {};
    for (const [key, value] of Object.entries(summary)) {
      summarySheet.addRow({ metric: key, value: String(value) });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
