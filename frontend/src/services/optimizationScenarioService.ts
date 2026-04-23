import api from './api';
import {
  OptimizationScenario,
  OptimizationScenarioDetail,
  CreateScenarioRequest,
  AddCampaignsToScenarioRequest,
} from '../types';

export const optimizationScenarioService = {
  async getAll(): Promise<OptimizationScenario[]> {
    const response = await api.get('/optimization-scenarios/all');
    return response.data;
  },

  async getScenarios(page = 1, limit = 10) {
    const response = await api.get(`/optimization-scenarios?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getScenarioDetail(scenarioId: string): Promise<OptimizationScenarioDetail> {
    const response = await api.get(`/optimization-scenarios/${scenarioId}`);
    return response.data;
  },

  async createScenario(data: CreateScenarioRequest): Promise<OptimizationScenario> {
    const response = await api.post('/optimization-scenarios', data);
    return response.data;
  },

  async updateScenario(
    scenarioId: string,
    data: { name?: string; description?: string },
  ): Promise<OptimizationScenarioDetail> {
    const response = await api.put(`/optimization-scenarios/${scenarioId}`, data);
    return response.data;
  },

  async addCampaignsToScenario(
    scenarioId: string,
    data: AddCampaignsToScenarioRequest,
  ): Promise<OptimizationScenarioDetail> {
    const response = await api.post(`/optimization-scenarios/${scenarioId}/campaigns`, data);
    return response.data;
  },

  async updateCampaignInScenario(
    scenarioId: string,
    campaignId: string,
    data: {
      campaignName?: string;
      campaignType?: string;
      rMin?: number;
      rMax?: number;
      zK?: number;
      cK?: number;
    },
  ): Promise<OptimizationScenarioDetail> {
    const response = await api.put(
      `/optimization-scenarios/${scenarioId}/campaigns/${campaignId}`,
      data,
    );
    return response.data;
  },

  async removeCampaignFromScenario(
    scenarioId: string,
    campaignId: string,
  ): Promise<OptimizationScenarioDetail> {
    const response = await api.delete(`/optimization-scenarios/${scenarioId}/campaigns/${campaignId}`);
    return response.data;
  },

  async activateScenario(scenarioId: string): Promise<OptimizationScenario> {
    const response = await api.post(`/optimization-scenarios/${scenarioId}/run`);
    return response.data;
  },

  async archiveScenario(scenarioId: string): Promise<OptimizationScenario> {
    const response = await api.post(`/optimization-scenarios/${scenarioId}/archive`);
    return response.data;
  },

  async deleteScenario(scenarioId: string): Promise<{ message: string }> {
    const response = await api.delete(`/optimization-scenarios/${scenarioId}`);
    return response.data;
  },

  async getCampaignResults(scenarioId: string) {
    const response = await api.get(`/optimization-scenarios/${scenarioId}/campaign-results`);
    return response.data;
  },

  async getCampaignSegmentDetails(scenarioId: string, campaignId: string) {
    const response = await api.get(
      `/optimization-scenarios/${scenarioId}/campaigns/${campaignId}/segment-details`,
    );
    return response.data;
  },

  async approveCampaigns(scenarioId: string, campaignIds: string[]) {
    const response = await api.post(
      `/optimization-scenarios/${scenarioId}/approve-campaigns`,
      { campaignIds },
    );
    return response.data;
  },

  async downloadDecisionVariables(scenarioId: string) {
    const response = await api.get(
      `/optimization-scenarios/${scenarioId}/export-decision-variables`,
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `decision_variables_${scenarioId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async updateDefaultParameters(
    scenarioId: string,
    data: {
      cMin?: number;
      cMax?: number;
      nMin?: number;
      nMax?: number;
      bMin?: number;
      bMax?: number;
      mMin?: number;
      mMax?: number;
    },
  ): Promise<OptimizationScenarioDetail> {
    const response = await api.put(`/optimization-scenarios/${scenarioId}/default-parameters`, data);
    return response.data;
  },
};
