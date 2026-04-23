import api from './api';
import { CampaignCustomerSegmentScore, PaginatedResponse } from '../types';

export const campaignCustomerSegmentScoreService = {
  async getAll(): Promise<CampaignCustomerSegmentScore[]> {
    const { data } = await api.get<CampaignCustomerSegmentScore[]>('/campaign-segment-scores');
    return data;
  },

  async getById(id: string): Promise<CampaignCustomerSegmentScore> {
    const { data } = await api.get<CampaignCustomerSegmentScore>(`/campaign-segment-scores/${id}`);
    return data;
  },

  async getByCompositeKey(
    campaignId: string,
    customerSegmentId: string,
  ): Promise<CampaignCustomerSegmentScore[]> {
    const { data } = await api.get<CampaignCustomerSegmentScore[]>(
      `/campaign-segment-scores?campaignId=${campaignId}&segmentId=${customerSegmentId}`,
    );
    return data;
  },

  async getScoresForCampaign(
    campaignId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<CampaignCustomerSegmentScore>> {
    const { data } = await api.get<PaginatedResponse<CampaignCustomerSegmentScore>>(
      `/campaign-segment-scores/campaign/${campaignId}`,
      { params: { page, limit } },
    );
    return data;
  },

  async getScoresForSegment(customerSegmentId: string): Promise<CampaignCustomerSegmentScore[]> {
    const { data } = await api.get<CampaignCustomerSegmentScore[]>(
      `/campaign-segment-scores/segment/${customerSegmentId}`,
    );
    return data;
  },

  async create(data: {
    campaignId: string;
    customerSegmentId: string;
    score: number;
  }): Promise<CampaignCustomerSegmentScore> {
    const response = await api.post<CampaignCustomerSegmentScore>('/campaign-segment-scores', data);
    return response.data;
  },

  async update(id: string, data: { score: number }): Promise<CampaignCustomerSegmentScore> {
    const response = await api.put<CampaignCustomerSegmentScore>(
      `/campaign-segment-scores/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/campaign-segment-scores/${id}`);
  },

  async upsert(
    campaignId: string,
    customerSegmentId: string,
    score: number,
  ): Promise<CampaignCustomerSegmentScore> {
    const scores = await this.getAll();
    const existing = scores.find(
      (s) => s.campaignId === campaignId && s.customerSegmentId === customerSegmentId,
    );

    if (existing) {
      return this.update(existing.id, { score });
    } else {
      return this.create({ campaignId, customerSegmentId, score });
    }
  },
};
