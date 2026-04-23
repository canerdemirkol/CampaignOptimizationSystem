import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OptimizationResultSummary } from '../../domain/entities/optimization-result-summary.entity';
import { OptimizationResultDetail } from '../../domain/entities/optimization-result-detail.entity';

@Injectable()
export class OptimizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Summary ──

  /** @deprecated Use findSummaryByScenarioAndCampaign for scenario-scoped queries */
  async findSummaryByCampaignId(campaignId: string): Promise<OptimizationResultSummary | null> {
    const summary = await this.prisma.optimizationResultSummary.findFirst({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' },
    });
    return summary ? this.toSummaryDomain(summary) : null;
  }

  async findSummaryByScenarioAndCampaign(scenarioId: string, campaignId: string): Promise<OptimizationResultSummary | null> {
    const summary = await this.prisma.optimizationResultSummary.findUnique({
      where: { scenarioId_campaignId: { scenarioId, campaignId } },
    });
    return summary ? this.toSummaryDomain(summary) : null;
  }

  /** @deprecated Use upsertSummaryForScenario for scenario-scoped operations */
  async upsertSummary(
    campaignId: string,
    data: {
      recommendedCustomerCount: number;
      estimatedParticipation: number;
      estimatedContribution: number;
      estimatedCost: number;
      calculationStartedAt: Date;
      calculationFinishedAt: Date;
    },
  ): Promise<OptimizationResultSummary> {
    // Legacy: find existing or create with empty scenarioId lookup
    const existing = await this.prisma.optimizationResultSummary.findFirst({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      const summary = await this.prisma.optimizationResultSummary.update({
        where: { id: existing.id },
        data: { ...data, approved: false },
      });
      return this.toSummaryDomain(summary);
    }
    // Cannot create without scenarioId - throw
    throw new Error('Cannot create OptimizationResultSummary without scenarioId. Use upsertSummaryForScenario instead.');
  }

  async upsertSummaryForScenario(
    scenarioId: string,
    campaignId: string,
    data: {
      recommendedCustomerCount: number;
      estimatedParticipation: number;
      estimatedContribution: number;
      estimatedCost: number;
      calculationStartedAt: Date;
      calculationFinishedAt: Date;
    },
  ): Promise<OptimizationResultSummary> {
    const summary = await this.prisma.optimizationResultSummary.upsert({
      where: { scenarioId_campaignId: { scenarioId, campaignId } },
      create: { scenarioId, campaignId, ...data, approved: false },
      update: data,
    });
    return this.toSummaryDomain(summary);
  }

  async approveSummary(scenarioId: string, campaignId: string): Promise<OptimizationResultSummary> {
    const summary = await this.prisma.optimizationResultSummary.update({
      where: { scenarioId_campaignId: { scenarioId, campaignId } },
      data: { approved: true },
    });
    return this.toSummaryDomain(summary);
  }

  /** @deprecated Use approveSummary(scenarioId, campaignId) for scenario-scoped operations */
  async approveSummaryByCampaignId(campaignId: string): Promise<OptimizationResultSummary | null> {
    const existing = await this.prisma.optimizationResultSummary.findFirst({
      where: { campaignId },
      orderBy: { updatedAt: 'desc' },
    });
    if (!existing) return null;
    const summary = await this.prisma.optimizationResultSummary.update({
      where: { id: existing.id },
      data: { approved: true },
    });
    return this.toSummaryDomain(summary);
  }

  // ── Details ──

  async upsertDetail(
    summaryId: string,
    campaignId: string,
    segmentId: string,
    data: {
      score?: number;
      customerCount?: number;
      expectedContribution?: number;
      recommendedCampaigns?: Record<string, unknown>;
      calculationStartedAt: Date;
      calculationFinishedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.optimizationResultDetail.upsert({
      where: { summaryId_segmentId: { summaryId, segmentId } },
      create: {
        summaryId,
        campaignId,
        segmentId,
        score: data.score,
        customerCount: data.customerCount,
        expectedContribution: data.expectedContribution,
        recommendedCampaigns: data.recommendedCampaigns
          ? (data.recommendedCampaigns as Prisma.InputJsonValue)
          : undefined,
        calculationStartedAt: data.calculationStartedAt,
        calculationFinishedAt: data.calculationFinishedAt,
      },
      update: {
        score: data.score,
        customerCount: data.customerCount,
        expectedContribution: data.expectedContribution,
        recommendedCampaigns: data.recommendedCampaigns
          ? (data.recommendedCampaigns as Prisma.InputJsonValue)
          : undefined,
        calculationStartedAt: data.calculationStartedAt,
        calculationFinishedAt: data.calculationFinishedAt,
      },
    });
  }

  async findDetails(
    campaignId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: OptimizationResultDetail[]; total: number }> {
    const skip = (page - 1) * limit;

    const [details, total] = await Promise.all([
      this.prisma.optimizationResultDetail.findMany({
        where: { campaignId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.optimizationResultDetail.count({
        where: { campaignId },
      }),
    ]);

    return {
      data: details.map(d => this.toDetailDomain(d)),
      total,
    };
  }

  // ── Domain Mappers ──

  private toSummaryDomain(data: any): OptimizationResultSummary {
    return new OptimizationResultSummary({
      id: data.id,
      campaignId: data.campaignId,
      recommendedCustomerCount: data.recommendedCustomerCount,
      estimatedParticipation: data.estimatedParticipation,
      estimatedContribution: data.estimatedContribution,
      estimatedCost: data.estimatedCost,
      approved: data.approved,
      calculationStartedAt: data.calculationStartedAt ?? undefined,
      calculationFinishedAt: data.calculationFinishedAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toDetailDomain(data: any): OptimizationResultDetail {
    return new OptimizationResultDetail({
      id: data.id,
      campaignId: data.campaignId,
      segmentId: data.segmentId,
      score: data.score ?? undefined,
      customerCount: data.customerCount ?? undefined,
      expectedContribution: data.expectedContribution ?? undefined,
      recommendedCampaigns: data.recommendedCampaigns
        ? (data.recommendedCampaigns as Record<string, unknown>)
        : undefined,
      calculationStartedAt: data.calculationStartedAt ?? undefined,
      calculationFinishedAt: data.calculationFinishedAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
