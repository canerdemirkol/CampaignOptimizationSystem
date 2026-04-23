// User Types - Section 3.1
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
}

// Customer Types - Section 3.2
export interface Customer {
  id: string;
  customerNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  segment?: string;
  churnScore?: number;
  lifetimeValue?: number;
  incomeLevelId?: string;
  incomeLevel?: IncomeLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  customerNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: number;
  gender?: string;
  segment?: string;
  churnScore?: number;
  lifetimeValue?: number;
  incomeLevel?: string; // Income level name (Low, Medium, etc.)
}

export interface UpdateCustomerDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  segment?: string;
  churnScore?: number;
  lifetimeValue?: number;
  incomeLevel?: string; // Income level name
}

// Campaign Types - Section 3.3
export type CampaignType = 'CRM' | 'MASS';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  rMin: number;
  rMax: number;
  zK: number;
  cK: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignDto {
  name: string;
  type?: CampaignType;
  rMin?: number;
  rMax?: number;
  zK?: number;
  cK?: number;
}

export interface UpdateCampaignDto {
  name?: string;
  type?: CampaignType;
  rMin?: number;
  rMax?: number;
  zK?: number;
  cK?: number;
}

// Default General Parameters (global defaults)
export interface DefaultGeneralParameters {
  id: string;
  cMin: number;
  cMax: number;
  nMin: number;
  nMax: number;
  bMin: number;
  bMax: number;
  mMin: number;
  mMax: number;
  createdAt: string;
  updatedAt: string;
}

// General Parameters - Section 3.4
export interface GeneralParameters {
  id: string;
  campaignId: string;
  cMin: number;
  cMax: number;
  nMin: number;
  nMax: number;
  bMin: number;
  bMax: number;
  mMin: number;
  mMax: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGeneralParametersDto {
  cMin: number;
  cMax: number;
  nMin: number;
  nMax: number;
  bMin: number;
  bMax: number;
  mMin: number;
  mMax: number;
}

// Optimization Result Summary - Section 3.6
export interface OptimizationResultSummary {
  id: string;
  campaignId: string;
  recommendedCustomerCount: number;
  estimatedParticipation: number;
  estimatedContribution: number;
  estimatedCost: number;
  approved: boolean;
  calculationStartedAt?: string;
  calculationFinishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Campaign with details
export interface CampaignWithDetails extends Campaign {
  generalParameters?: GeneralParameters;
  optimizationSummary?: OptimizationResultSummary;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Auth
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

// Income Level Type
export interface IncomeLevel {
  id: string;
  name: string;
  displayName: string;
  description?: string;
}

// Customer Segment Types
export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  customerCount: number;
  lifetimeValue: number;
  incomeLevel?: IncomeLevel;
  incomeLevelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerSegmentDto {
  name: string;
  description?: string;
  customerCount: number;
  lifetimeValue: number;
  incomeLevel?: string; // Income level name (Low, Medium, etc.)
}

export interface UpdateCustomerSegmentDto {
  name?: string;
  description?: string;
  customerCount?: number;
  lifetimeValue?: number;
  incomeLevel?: string; // Income level name
}

// Campaign Customer Segment Score Types
export interface CampaignCustomerSegmentScore {
  id: string;
  campaignId: string;
  customerSegmentId: string;
  score: number; // Churn score (0-1)
  campaign?: Campaign;
  customerSegment?: CustomerSegment;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignCustomerSegmentScoreDto {
  campaignId: string;
  customerSegmentId: string;
  score: number;
}

export interface UpdateCampaignCustomerSegmentScoreDto {
  score: number;
}

// Optimization Scenario Types
export type ScenarioStatus = 'READY' | 'RUNNING' | 'COMPLETED_SUCCESSFULLY' | 'FAILED';

export interface OptimizationScenario {
  id: string;
  name: string;
  description?: string;
  campaignIds: string[];
  status: ScenarioStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ScenarioCampaign extends Campaign {
  campaignId: string;
  // Snapshot fields - campaign values at time of adding to scenario
  campaignName?: string;
  campaignType?: CampaignType;
}

export interface OptimizationScenarioDetail extends OptimizationScenario {
  campaigns: ScenarioCampaign[];
  cMin?: number;
  cMax?: number;
  nMin?: number;
  nMax?: number;
  bMin?: number;
  bMax?: number;
  mMin?: number;
  mMax?: number;
}

export interface CreateScenarioRequest {
  name: string;
  description?: string;
}

export interface AddCampaignsToScenarioRequest {
  campaignIds: string[];
}
