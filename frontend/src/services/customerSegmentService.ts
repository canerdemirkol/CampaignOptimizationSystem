import api from './api';
import {
  CustomerSegment,
  CreateCustomerSegmentDto,
  UpdateCustomerSegmentDto,
  PaginatedResponse,
} from '../types';

export const customerSegmentService = {
  async getAll(): Promise<CustomerSegment[]> {
    const { data } = await api.get<CustomerSegment[]>('/customer-segments/all');
    return data;
  },

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<PaginatedResponse<CustomerSegment>> {
    const { data } = await api.get<PaginatedResponse<CustomerSegment>>(
      '/customer-segments',
      { params: { page, limit, ...(search && { search }) } },
    );
    return data;
  },

  async getById(id: string): Promise<CustomerSegment> {
    const { data } = await api.get<CustomerSegment>(`/customer-segments/${id}`);
    return data;
  },

  async getTotalCount(): Promise<number> {
    const { data } = await api.get<{ totalCustomerCount: number }>('/customer-segments/total-count');
    return data.totalCustomerCount;
  },

  async create(dto: CreateCustomerSegmentDto): Promise<CustomerSegment> {
    const { data } = await api.post<CustomerSegment>('/customer-segments', dto);
    return data;
  },

  async update(id: string, dto: UpdateCustomerSegmentDto): Promise<CustomerSegment> {
    const { data } = await api.put<CustomerSegment>(`/customer-segments/${id}`, dto);
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customer-segments/${id}`);
  },
};
