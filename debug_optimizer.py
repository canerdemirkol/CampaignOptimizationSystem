#!/usr/bin/env python3
"""
Debug script to identify why all optimization results are INFEASIBLE

This script reproduces the issue with the data from the batch log.
"""

import sys
sys.path.insert(0, '/home/user/CampaignOptimizationSystem/python-service')

from app.models.optimization import (
    OptimizationRequest,
    CampaignParameterData,
    CustomerSegmentData,
)
from app.services.optimizer import CampaignOptimizer

def debug_single_campaign_single_segment():
    """
    Reproduce the issue: Single campaign with single segment
    This is how the batch optimizer calls the optimization service
    """
    print("=" * 80)
    print("DEBUGGING: Single Campaign-Segment Optimization")
    print("=" * 80)

    # Data from your batch log
    campaign_params = CampaignParameterData(
        campaign_id="campaign_1",
        campaign_name="Campaign 1",
        campaign_type="CRM",
        # Campaign-specific parameters
        r_min=100,
        r_max=5000,
        z_k=500,  # profit per unit
        c_k=50,   # cost per unit
        # General parameters
        c_min=1,
        c_max=10,
        n_min=1,
        n_max=5,  # Max 5 campaigns per segment
        b_min=100,  # Min budget: 100
        b_max=10000,  # Max budget: 10000
        m_min=0,
        m_max=3,
    )

    # Single segment (as the batch optimizer sends)
    segment = CustomerSegmentData(
        id="segment_bronze",
        name="Bronze",
        customer_count=1000,
        lifetime_value=5000,
        income_level="Low",
        propensity_scores={"campaign_1": 0.35},  # Score for this campaign
    )

    print("\n📋 Input Parameters:")
    print(f"  Campaign: {campaign_params.campaign_name}")
    print(f"  Segment: {segment.name}")
    print(f"  Campaign Type: {campaign_params.campaign_type}")
    print(f"  Cost per unit (c_k): {campaign_params.c_k}")
    print(f"  Profit per unit (z_k): {campaign_params.z_k}")
    print(f"  Budget constraints: {campaign_params.b_min} <= budget <= {campaign_params.b_max}")
    print(f"  Max campaigns per segment (n_max): {campaign_params.n_max}")
    print(f"  Propensity score: {segment.propensity_scores['campaign_1']}")

    print("\n🔍 Analyzing the constraint conflict:")
    print(f"  Budget constraint: sum(c_k * x) >= {campaign_params.b_min}")
    print(f"  With c_k={campaign_params.c_k}: {campaign_params.c_k} * x >= {campaign_params.b_min}")
    print(f"  Therefore: x >= {campaign_params.b_min / campaign_params.c_k}")
    print(f"  BUT x is BINARY (0 or 1)!")
    print(f"  🔴 CONFLICT: Need x >= 2, but x can only be 0 or 1 → INFEASIBLE")

    print("\n" + "=" * 80)
    print("RUNNING OPTIMIZATION...")
    print("=" * 80)

    optimization_request = OptimizationRequest(
        campaign_id=campaign_params.campaign_id,
        campaign_parameters=campaign_params,
        customer_segments=[segment],
    )

    optimizer = CampaignOptimizer(time_limit=60)
    result = optimizer.optimize(optimization_request)

    print(f"\n📊 Result:")
    print(f"  Status: {result.status}")
    print(f"  Solver Status: {result.solver_status}")
    if result.error_message:
        print(f"  Error: {result.error_message}")
    print(f"  Execution Time: {result.execution_time:.3f}s")

    return result.status == "infeasible"


def debug_with_multiple_campaigns():
    """
    What the optimization should work with: Multiple campaigns per segment
    This shows how the optimizer is DESIGNED to work
    """
    print("\n\n" + "=" * 80)
    print("CONTROL TEST: Multiple Campaigns-Single Segment")
    print("=" * 80)

    print("\n💡 The optimizer is designed for this scenario:")
    print("   - Multiple campaigns that can be selected")
    print("   - For one segment")
    print("   - Budget constraint becomes feasible when multiple campaigns exist")

    # Create 3 campaigns
    campaigns_data = []
    for i in range(1, 4):
        campaigns_data.append(CampaignParameterData(
            campaign_id=f"campaign_{i}",
            campaign_name=f"Campaign {i}",
            campaign_type="CRM",
            r_min=100,
            r_max=5000,
            z_k=500,
            c_k=50,
            c_min=1,
            c_max=10,
            n_min=1,
            n_max=5,
            b_min=100,  # Requires at least 2 campaigns (100/50 = 2)
            b_max=10000,
            m_min=0,
            m_max=3,
        ))

    segment = CustomerSegmentData(
        id="segment_bronze",
        name="Bronze",
        customer_count=1000,
        lifetime_value=5000,
        income_level="Low",
        propensity_scores={
            "campaign_1": 0.35,
            "campaign_2": 0.35,
            "campaign_3": 0.35,
        },
    )

    print("\n📋 Input Parameters:")
    print(f"  Campaigns: 3")
    print(f"  Segment: {segment.name}")
    print(f"  Cost per unit: 50")
    print(f"  Budget constraints: 100 <= budget <= 10000")
    print(f"  Max campaigns per segment: 5")

    print("\n🔍 With multiple campaigns:")
    print(f"  Now we can select 2-5 campaigns to satisfy budget constraint")
    print(f"  x[1] + x[2] + x[3] are binary variables")
    print(f"  50 * (x[1] + x[2] + x[3]) >= 100")
    print(f"  We can have x[1]=1, x[2]=1, x[3]=0 → cost = 100 ✓ FEASIBLE")

    print("\n" + "=" * 80)
    print("RUNNING OPTIMIZATION WITH MULTIPLE CAMPAIGNS...")
    print("=" * 80)

    # Use the first campaign as the "main" one for the request
    optimization_request = OptimizationRequest(
        campaign_id=campaigns_data[0].campaign_id,
        campaign_parameters=campaigns_data[0],
        customer_segments=[segment],
    )

    # The issue is that we're passing just ONE campaign parameter
    # But we need to update the model to handle this...
    # Actually, the current model expects ONE campaign in CampaignParameterData
    # Let me try it anyway to show the failure

    optimizer = CampaignOptimizer(time_limit=60)
    result = optimizer.optimize(optimization_request)

    print(f"\n📊 Result:")
    print(f"  Status: {result.status}")
    print(f"  Solver Status: {result.solver_status}")
    if result.error_message:
        print(f"  Error: {result.error_message}")
    print(f"  Execution Time: {result.execution_time:.3f}s")


def main():
    print("\n")
    print("█" * 80)
    print("  ROOT CAUSE ANALYSIS: Why All Optimizations Return INFEASIBLE")
    print("█" * 80)

    # Test 1: Single campaign (reproduces the issue)
    is_infeasible = debug_single_campaign_single_segment()

    if is_infeasible:
        print("\n✅ ROOT CAUSE CONFIRMED:")
        print("   The optimizer is being called with:")
        print("   - 1 single campaign (binary variable x can be 0 or 1)")
        print("   - Budget constraint requires: 50 * x >= 100")
        print("   - This means: x >= 2")
        print("   - But x can only be 0 or 1")
        print("   - RESULT: INFEASIBLE for ALL 100 campaign-segment combinations")

        print("\n🔧 THE SOLUTION:")
        print("   The backend is calling the optimizer INCORRECTLY.")
        print("   It's passing one campaign at a time for each segment.")
        print("   But the optimizer expects MULTIPLE campaigns for ONE segment.")
        print("   ")
        print("   Expected format:")
        print("   - batch_campaigns = [campaign_1, campaign_2, campaign_3, ...]")
        print("   - all_segments = [segment_1, segment_2, segment_3, ...]")
        print("   - Optimizer finds best campaign selection for each segment")
        print("   ")
        print("   Current (broken) format:")
        print("   - campaign = [campaign_1]")
        print("   - segment = [segment_1]")
        print("   - Budget requires 2 selections, but only 1 campaign exists")

    # Test 2: Multiple campaigns (shows how it should work)
    debug_with_multiple_campaigns()

    print("\n" * 2)
    print("█" * 80)
    print("  SUMMARY")
    print("█" * 80)
    print("""
The INFEASIBLE status occurs because of a fundamental mismatch between:

1. HOW THE BACKEND CALLS THE OPTIMIZER:
   For each campaign in the batch, for each segment:
     → Call optimizer(campaign, segment)
     → Passes 1 campaign + 1 segment

2. HOW THE OPTIMIZER MODEL IS DESIGNED:
   Given multiple campaigns and segments:
     → Recommend which campaigns to apply to which segments
     → Budget constraint: At least 2 campaigns must be selected
     → Conflicts when only 1 campaign is available

RESULT: 100% INFEASIBLE for all 100 campaign-segment combinations

THE FIX:
Option A: Change backend to pass all campaigns at once
   → Call optimizer(all_campaigns, segment)
   → Each segment gets optimized with all available campaigns

Option B: Remove or adjust the budget constraint for single-campaign scenarios
   → Or adjust b_min to be <= c_k (cost of 1 campaign)

Option C: Change the batch optimization logic to optimize all campaigns
   together, not individually
    """)


if __name__ == "__main__":
    main()
