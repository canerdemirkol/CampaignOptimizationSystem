"""
Optimization Request/Response Models
Master Prompt Section 4.2 - FastAPI Endpoint
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignType(str, Enum):
    """Campaign type enumeration"""
    CRM = "CRM"
    MASS = "MASS"


class RevenueLevelCategory(str, Enum):
    """Customer revenue level category"""
    LOW = "Low"
    MEDIUM = "Medium"
    MEDIUM_LOW = "Medium-Low"
    MEDIUM_HIGH = "Medium-High"
    HIGH = "High"


class OptimizationStatus(str, Enum):
    """Optimization solver status"""
    OPTIMAL = "optimal"
    INFEASIBLE = "infeasible"
    UNBOUNDED = "unbounded"
    ERROR = "error"


class CustomerSegmentData(BaseModel):
    """Customer segment data for optimization (replaces individual CustomerData)"""
    id: str
    name: str
    customer_count: int = Field(ge=1, description="Number of customers in this segment")
    lifetime_value: float = Field(ge=0)
    income_level: Optional[RevenueLevelCategory] = Field(None, description="Customer revenue level category (Low, Medium, Medium-Low, Medium-High, High)")
    propensity_scores: dict[str, float] = Field(
        description="Campaign ID -> Propensity score mapping"
    )


class CampaignParameterData(BaseModel):
    """Campaign parameters - now includes both campaign-specific and general parameters"""
    campaign_id: str
    campaign_name: str
    campaign_type: str = Field(default="CRM", description="Campaign type (CRM or MASS)")

    # Campaign-specific parameters
    r_min: int = Field(ge=0, description="Minimum recommendations")
    r_max: int = Field(ge=0, description="Maximum recommendations")
    z_k: float = Field(ge=0, description="Campaign profit")
    c_k: float = Field(ge=0, description="Campaign cost")

    # General parameters (merged from GeneralParameters)
    c_min: int = Field(ge=0, description="Minimum campaign count")
    c_max: int = Field(ge=0, description="Maximum campaign count")
    n_min: int = Field(ge=0, description="Min campaigns per segment")
    n_max: int = Field(ge=0, description="Max campaigns per segment")
    b_min: float = Field(ge=0, description="Minimum budget")
    b_max: float = Field(ge=0, description="Maximum budget")
    m_min: int = Field(ge=0, description="Minimum mass campaigns")
    m_max: int = Field(ge=0, description="Maximum mass campaigns")


class GeneralParameterData(BaseModel):
    """General optimization parameters"""
    c_min: int = Field(ge=0, description="Minimum campaign count")
    c_max: int = Field(ge=0, description="Maximum campaign count")
    n_min: int = Field(ge=0, description="Min campaigns per segment")
    n_max: int = Field(ge=0, description="Max campaigns per segment")
    b_min: float = Field(ge=0, description="Minimum budget")
    b_max: float = Field(ge=0, description="Maximum budget")
    m_min: int = Field(ge=0, description="Minimum mass campaigns")
    m_max: int = Field(ge=0, description="Maximum mass campaigns")


class OptimizationRequest(BaseModel):
    """
    Optimization request payload
    Master Prompt Section 4.2 - Input
    Note: Used for single-campaign optimization
    """
    campaign_id: str
    campaign_parameters: CampaignParameterData  # Now includes general parameters
    customer_segments: List[CustomerSegmentData]


class ScenarioOptimizationRequest(BaseModel):
    """
    Scenario optimization request - supports MULTIPLE campaigns per segment

    This model is used when optimizing across multiple campaigns for each segment.
    Each campaign brings its own parameters and propensity_scores for all segments.

    Key difference from OptimizationRequest:
    - campaign_parameters: List (multiple campaigns) vs single campaign
    - Used for segment-based optimization (1 call per segment with all campaigns)

    Reference: INFEASIBILITY_ANALYSIS.md - Fix for budget constraint issues
    """
    campaign_parameters: List[CampaignParameterData]  # ALL campaigns' parameters
    customer_segments: List[CustomerSegmentData]  # propensity_scores contains all campaigns


class RecommendedCampaignResult(BaseModel):
    """Individual campaign recommendation"""
    campaign_id: str
    campaign_name: str
    score: float
    expected_contribution: float


class OptimizationDetailResult(BaseModel):
    """Per-segment optimization result"""
    segment_id: str
    segment_name: str
    customer_count: int
    recommended_campaigns: List[RecommendedCampaignResult]
    total_expected_contribution: float


class OptimizationSummaryResult(BaseModel):
    """
    Summary of optimization results
    Master Prompt Section 4.2 - Output
    """
    recommended_customer_count: int
    total_recommendations: int
    estimated_participation: float
    estimated_contribution: float
    estimated_cost: float
    estimated_roi: float


class OptimizationResponse(BaseModel):
    """
    Optimization response payload
    Master Prompt Section 4.2 - Output
    """
    campaign_id: str
    status: OptimizationStatus = Field(description="Optimization status: optimal, infeasible, unbounded, or error")
    summary_result: Optional[OptimizationSummaryResult] = None
    detail_results: List[OptimizationDetailResult] = []
    execution_time: float = Field(description="Execution time in seconds")
    solver_status: str
    objective_value: Optional[float] = None
    error_message: Optional[str] = None
