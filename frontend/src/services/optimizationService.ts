import api from './api';

export interface OptimizationResultSummary {
  id: number;
  campaignId: number;
  campaignName: string;
  recommendedAudienceCount: number;
  estimatedContribution: number;
  estimatedCost: number;
  contributionType: string;
  isApproved: boolean;
}

export const optimizationService = {
  /**
   * Senaryo için sonuç özetini getirir
   */
  async getResultSummary(scenarioId: number): Promise<OptimizationResultSummary[]> {
    const response = await api.get<OptimizationResultSummary[]>(
      `/optimization-results/scenario/${scenarioId}`
    );
    return response.data;
  },

  /**
   * Seçilen kampanyaları onayla
   */
  async approveCampaigns(scenarioId: number, resultSummaryIds: number[]): Promise<void> {
    await api.post(`/optimization-results/scenario/${scenarioId}/approve`, resultSummaryIds);
  },

  /**
   * Senaryo için onaylanan kampanyaları getirir
   */
  async getApprovedCampaigns(scenarioId: number): Promise<OptimizationResultSummary[]> {
    const response = await api.get<OptimizationResultSummary[]>(
      `/optimization-results/scenario/${scenarioId}/approved`
    );
    return response.data;
  },
};
