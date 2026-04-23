import api from './api';
import { Customer, CreateCustomerDto, UpdateCustomerDto, PaginatedResponse } from '../types';

export interface BulkImportResult {
  total: number;
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>('/customers/all');
    return data;
  },

  async findAll(page = 1, limit = 10): Promise<PaginatedResponse<Customer>> {
    const { data } = await api.get<PaginatedResponse<Customer>>('/customers', {
      params: { page, limit },
    });
    return data;
  },

  async getById(id: string): Promise<Customer> {
    const { data } = await api.get<Customer>(`/customers/${id}`);
    return data;
  },

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const { data } = await api.post<Customer>('/customers', dto);
    return data;
  },

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const { data } = await api.put<Customer>(`/customers/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customers/${id}`);
  },

  async downloadTemplate(): Promise<void> {
    const response = await api.get('/customers/template', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'customer_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async bulkImport(file: File): Promise<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<BulkImportResult>('/customers/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
