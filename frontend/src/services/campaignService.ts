import api from './api';
import {
  Campaign,
  CampaignWithDetails,
  CreateCampaignDto,
  UpdateCampaignDto,
  DefaultGeneralParameters,
  GeneralParameters,
  CreateGeneralParametersDto,
  OptimizationResultSummary,
  PaginatedResponse,
} from '../types';

export const campaignService = {
  // Default General Parameters (global)
  async getDefaultGeneralParameters(): Promise<DefaultGeneralParameters> {
    const { data } = await api.get<DefaultGeneralParameters>('/default-general-parameters');
    return data;
  },

  async updateDefaultGeneralParameters(dto: CreateGeneralParametersDto): Promise<DefaultGeneralParameters> {
    const { data } = await api.put<DefaultGeneralParameters>('/default-general-parameters', dto);
    return data;
  },

  // Campaign CRUD
  async getAll(): Promise<Campaign[]> {
    const { data } = await api.get<Campaign[]>('/campaigns/all');
    return data;
  },

  async findAll(page: number = 1, limit: number = 10, search?: string, type?: string): Promise<PaginatedResponse<Campaign>> {
    const { data } = await api.get<PaginatedResponse<Campaign>>('/campaigns', {
      params: { page, limit, ...(search && { search }), ...(type && { type }) },
    });
    return data;
  },

  async getById(id: string): Promise<Campaign> {
    const { data } = await api.get<Campaign>(`/campaigns/${id}`);
    return data;
  },

  async getByIdWithDetails(id: string): Promise<CampaignWithDetails> {
    const { data } = await api.get<CampaignWithDetails>(`/campaigns/${id}/details`);
    return data;
  },

  async create(dto: CreateCampaignDto): Promise<Campaign> {
    const { data } = await api.post<Campaign>('/campaigns', dto);
    return data;
  },

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    const { data } = await api.put<Campaign>(`/campaigns/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  async triggerCalculation(id: string): Promise<{ message: string }> {
    const { data } = await api.post<{ message: string }>(`/tasks/trigger-calculation/${id}`);
    return data;
  },

  // General Parameters - Section 7.4
  async getGeneralParameters(campaignId: string): Promise<GeneralParameters | null> {
    const { data } = await api.get<GeneralParameters | null>(`/campaigns/${campaignId}/general-parameters`);
    return data;
  },

  async createGeneralParameters(campaignId: string, dto: CreateGeneralParametersDto): Promise<GeneralParameters> {
    const { data } = await api.post<GeneralParameters>(`/campaigns/${campaignId}/general-parameters`, dto);
    return data;
  },

  async updateGeneralParameters(campaignId: string, dto: Partial<CreateGeneralParametersDto>): Promise<GeneralParameters> {
    const { data } = await api.put<GeneralParameters>(`/campaigns/${campaignId}/general-parameters`, dto);
    return data;
  },

  // Optimization
  async getOptimizationSummary(campaignId: string): Promise<OptimizationResultSummary | null> {
    const { data } = await api.get<OptimizationResultSummary | null>(`/optimization/${campaignId}/summary`);
    return data;
  },

  async approveOptimizationSummary(campaignId: string): Promise<OptimizationResultSummary> {
    const { data } = await api.post<OptimizationResultSummary>(`/optimization/${campaignId}/approve-summary`);
    return data;
  },
};
