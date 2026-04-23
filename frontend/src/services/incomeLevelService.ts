import api from './api';
import { IncomeLevel } from '../types';

export const incomeLevelService = {
  async getAll(): Promise<IncomeLevel[]> {
    const response = await api.get('/income-levels');
    return response.data;
  },
};
