"""
Campaign Optimization Service using PySCIPOpt
Segment-based: uses customer segments instead of individual customers.
Each segment represents a group of customers with aggregated values.
"""
import logging
import time
import json
from typing import Dict, List, Tuple

from pyscipopt import Model, quicksum

from app.models.optimization import (
    OptimizationRequest,
    OptimizationResponse,
    OptimizationSummaryResult,
    OptimizationDetailResult,
    RecommendedCampaignResult,
    CampaignParameterData,
    CustomerSegmentData,
    ScenarioOptimizationRequest,
)

logger = logging.getLogger(__name__)
opt_logger = logging.getLogger("optimization")


def _normalize_failure_status(solver_status: str) -> str:
    """Map a SCIP solver status to a value accepted by OptimizationStatus.

    OptimizationStatus only permits optimal/infeasible/unbounded/error, but
    SCIP can return timelimit, gaplimit, userinterrupt, nodelimit, etc.
    Anything that is not a recognised enum value collapses to "error";
    the raw SCIP status is kept separately in solver_status for diagnostics.
    """
    if solver_status == "infeasible":
        return "infeasible"
    if solver_status == "unbounded":
        return "unbounded"
    return "error"


class CampaignOptimizer:
    """
    Campaign Optimization Engine using PySCIPOpt
    Segment-based: each segment represents a group of customers with aggregated values.
    customer_count is used as weight in the optimization model.
    """

    def __init__(self, time_limit: int = 14400):
        self.time_limit = time_limit

    def optimize(self, request: OptimizationRequest) -> OptimizationResponse:
        start_time = time.time()

        try:
            total_customers = sum(s.customer_count for s in request.customer_segments)
            logger.info(f"Starting optimization for campaign {request.campaign_id}")
            logger.info(f"Segments: {len(request.customer_segments)}, Total customers: {total_customers}")

            # Campaign parameters now includes general parameters
            cp = request.campaign_parameters

            # FIXED: Extract campaigns from segment propensity_scores
            # This allows processing multiple campaigns that are referenced in the segments
            segment_campaign_ids = set()
            for segment in request.customer_segments:
                segment_campaign_ids.update(segment.propensity_scores.keys())

            logger.info(f"Campaigns found in segments: {segment_campaign_ids}")

            opt_logger.info(
                f"Campaign {request.campaign_id} - optimization started",
                extra={
                    "campaign_id": request.campaign_id,
                    "segment_count": len(request.customer_segments),
                    "total_customer_count": total_customers,
                    "campaign_type": cp.campaign_type,
                    "campaigns_in_segments": list(segment_campaign_ids),
                    "general_parameters": {
                        "c_min": cp.c_min, "c_max": cp.c_max,
                        "n_min": cp.n_min, "n_max": cp.n_max,
                        "b_min": cp.b_min, "b_max": cp.b_max,
                        "m_min": cp.m_min, "m_max": cp.m_max,
                    },
                }
            )

            # Build list of all campaigns (from propensity_scores + provided campaign_parameters)
            # Use the provided cp as template for general parameters
            all_campaigns = []

            # Add the provided campaign parameter first
            all_campaigns.append(cp)

            # Create parameters for other campaigns found in propensity_scores
            for campaign_id in segment_campaign_ids:
                if campaign_id != cp.campaign_id:
                    # Create campaign params based on the template (cp)
                    # This ensures all campaigns have the same general parameters
                    other_campaign = CampaignParameterData(
                        campaign_id=campaign_id,
                        campaign_name=f"Campaign {campaign_id}",
                        campaign_type=cp.campaign_type,  # Same type
                        r_min=cp.r_min,
                        r_max=cp.r_max,
                        z_k=cp.z_k,
                        c_k=cp.c_k,
                        c_min=cp.c_min,
                        c_max=cp.c_max,
                        n_min=cp.n_min,
                        n_max=cp.n_max,
                        b_min=cp.b_min,
                        b_max=cp.b_max,
                        m_min=cp.m_min,
                        m_max=cp.m_max,
                    )
                    all_campaigns.append(other_campaign)

            logger.info(f"Total campaigns for optimization: {len(all_campaigns)}")

            # Classify campaigns by type
            crm_campaigns = [c for c in all_campaigns if c.campaign_type == "CRM"]
            mass_campaigns = [c for c in all_campaigns if c.campaign_type == "MASS"]

            logger.info(f"CRM campaigns: {len(crm_campaigns)}, MASS campaigns: {len(mass_campaigns)}")

            model, x_vars, y_vars = self._build_model(
                request.customer_segments,
                crm_campaigns,
                mass_campaigns,
                cp,  # Pass campaign parameters which now includes general parameters
            )

            model.setParam("limits/time", self.time_limit)
            model.setParam("limits/gap", 0.0)
            model.setParam("parallel/maxnthreads", 8)
            model.optimize()

            execution_time = time.time() - start_time
            status = model.getStatus()

            logger.info(f"Optimization completed with status: {status}")

            has_feasible_solution = model.getNSols() > 0
            is_usable = status == "optimal" or (
                status in ("gaplimit", "timelimit") and has_feasible_solution
            )

            if is_usable:
                self._log_decision_variables(
                    model, x_vars, y_vars,
                    crm_campaigns, mass_campaigns, request.customer_segments,
                )

                summary, details = self._extract_results(
                    model, x_vars, y_vars,
                    request.customer_segments, crm_campaigns, mass_campaigns,
                )

                opt_logger.info(
                    f"Campaign {request.campaign_id} - optimization SUCCESS",
                    extra={
                        "campaign_id": request.campaign_id,
                        "solver_status": status,
                        "objective_value": model.getObjVal(),
                        "execution_time_sec": round(execution_time, 3),
                        "result": {
                            "recommended_customer_count": summary.recommended_customer_count,
                            "total_recommendations": summary.total_recommendations,
                            "estimated_participation": round(summary.estimated_participation, 4),
                            "estimated_contribution": round(summary.estimated_contribution, 4),
                            "estimated_cost": round(summary.estimated_cost, 4),
                            "estimated_roi": round(summary.estimated_roi, 4),
                        },
                    }
                )

                return OptimizationResponse(
                    campaign_id=request.campaign_id,
                    status="optimal",
                    summary_result=summary,
                    detail_results=details,
                    execution_time=execution_time,
                    solver_status=status,
                    objective_value=model.getObjVal(),
                )
            else:
                opt_logger.warning(
                    f"Campaign {request.campaign_id} - solver returned non-optimal: {status}",
                    extra={
                        "campaign_id": request.campaign_id,
                        "solver_status": status,
                        "execution_time_sec": round(execution_time, 3),
                    }
                )

                return OptimizationResponse(
                    campaign_id=request.campaign_id,
                    status=_normalize_failure_status(status),
                    execution_time=execution_time,
                    solver_status=status,
                    error_message=f"Solver returned status: {status}",
                )

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Optimization failed: {str(e)}", exc_info=True)

            opt_logger.error(
                f"Campaign {request.campaign_id} - optimization FAILED: {str(e)}",
                extra={
                    "campaign_id": request.campaign_id,
                    "error": str(e),
                    "execution_time_sec": round(execution_time, 3),
                },
                exc_info=True,
            )

            return OptimizationResponse(
                campaign_id=request.campaign_id,
                status="error",
                execution_time=execution_time,
                solver_status="error",
                error_message=str(e),
            )

    def _extract_decision_variables(
        self, model: Model, x_vars: Dict, y_vars: Dict,
        crm_campaigns: List[CampaignParameterData],
        mass_campaigns: List[CampaignParameterData],
        segments: List[CustomerSegmentData],
    ) -> Dict:
        """Extract x[k,s] and y[k] decision variable values from solved model with names."""
        # Campaign name lookup
        campaign_names = {}
        for c in crm_campaigns + mass_campaigns:
            campaign_names[c.campaign_id] = c.campaign_name

        # Segment name lookup
        segment_names = {}
        for s in segments:
            segment_names[s.id] = s.name

        # y[k] - campaign selection (all campaigns: CRM + MASS)
        y_results = []
        for k, var in y_vars.items():
            val = int(round(model.getVal(var)))
            campaign_type = "CRM" if k in [c.campaign_id for c in crm_campaigns] else "MASS"
            y_results.append({
                "campaign_id": k,
                "campaign_name": campaign_names.get(k, k),
                "campaign_type": campaign_type,
                "y_k": val,
                "selected": val == 1,
            })

        # x[k,s] - CRM campaign-segment assignments (only CRM campaigns have x variables)
        x_all = []
        x_active = []
        for (k, s), var in x_vars.items():
            val = int(round(model.getVal(var)))
            entry = {
                "campaign_id": k,
                "campaign_name": campaign_names.get(k, k),
                "segment_id": s,
                "segment_name": segment_names.get(s, s),
                "x_ks": val,
            }
            x_all.append(entry)
            if val == 1:
                x_active.append(entry)

        # Summary
        active_campaigns = [y for y in y_results if y["selected"]]
        active_mass = [y for y in active_campaigns if y["campaign_type"] == "MASS"]
        active_crm = [y for y in active_campaigns if y["campaign_type"] == "CRM"]

        return {
            "y_k": y_results,
            "x_ks_all": x_all,
            "x_ks_active": x_active,
            "summary": {
                "total_campaigns": len(y_results),
                "selected_campaigns": len(active_campaigns),
                "selected_mass": len(active_mass),
                "selected_crm": len(active_crm),
                "total_crm_segment_assignments": len(x_active),
                "total_crm_segment_pairs": len(x_all),
                "note": "MASS campaigns (y[k]=1) apply to ALL segments automatically. "
                        "x[k,s] only exists for CRM campaigns.",
            },
        }

    def _log_decision_variables(
        self, model: Model, x_vars: Dict, y_vars: Dict,
        crm_campaigns: List[CampaignParameterData],
        mass_campaigns: List[CampaignParameterData],
        segments: List[CustomerSegmentData],
    ):
        """Log x[k,s] and y[k] decision variable values to optimization log file."""
        decision_vars = self._extract_decision_variables(
            model, x_vars, y_vars, crm_campaigns, mass_campaigns, segments
        )
        self._last_decision_vars = decision_vars

        opt_logger.info(
            "Decision Variables",
            extra=decision_vars,
        )

    def _build_model(
        self,
        segments: List[CustomerSegmentData],
        crm_campaigns: List[CampaignParameterData],
        mass_campaigns: List[CampaignParameterData],
        campaign_params_with_general,  # Now includes both specific and general parameters
    ) -> Tuple[Model, Dict, Dict]:
        """
        Build optimization model matching documentation exactly.
        Using segments instead of individual customers (weighted by customer_count).

        Objective & Constraints mapping:
        - M (customers) → S (segments)
        - p_km[k,m] → propensity_scores[k,s]
        - Each constraint applied per segment
        - Weighted by customer_count for scaled recommendations
        """
        model = Model("Campaign_Optimization")

        K_crm = [c.campaign_id for c in crm_campaigns]
        K_mass = [c.campaign_id for c in mass_campaigns]
        S = [s.id for s in segments]

        campaign_params = {c.campaign_id: c for c in crm_campaigns + mass_campaigns}
        seg_data = {s.id: s for s in segments}

        # Propensity score lookup: p_ks[k, s]
        p_ks: Dict[Tuple[str, str], float] = {}
        for seg in segments:
            for campaign_id, score in seg.propensity_scores.items():
                p_ks[(campaign_id, seg.id)] = score

        # Decision variables
        # x[k, s] = 1 means CRM campaign k is recommended to segment s
        x: Dict[Tuple[str, str], object] = {}
        for k in K_crm:
            for s in S:
                x[k, s] = model.addVar(vtype="BINARY", name=f"x_{k}_{s}")

        # y[k] = 1 means campaign k is selected (CRM or Mass)
        y: Dict[str, object] = {}
        for k in K_crm + K_mass:
            y[k] = model.addVar(vtype="BINARY", name=f"y_{k}")

        # ═══════════════════════════════════════════════════════════
        # OBJECTIVE FUNCTION (Matching Documentation)
        # Maximize: CRM profit + Mass profit (weighted by customer_count)
        # ═══════════════════════════════════════════════════════════
        model.setObjective(
            quicksum(
                seg_data[s].customer_count * p_ks.get((k, s), 0) * campaign_params[k].z_k * x[k, s]
                for k in K_crm
                for s in S
            )
            + quicksum(
                y[k] * campaign_params[k].z_k * quicksum(
                    seg_data[s].customer_count * p_ks.get((k, s), 0) for s in S
                )
                for k in K_mass
            ),
            "maximize",
        )

        # ═══════════════════════════════════════════════════════════
        # CONSTRAINTS (Matching Documentation)
        # ═══════════════════════════════════════════════════════════

        # 1. CRM Campaign Capacity: "En az r_min, en fazla r_max kadar müşteriye recommend edilebilir"
        #    r_min * y[k] <= recommended_customer_count <= r_max
        #    Conditional on y[k]: only enforce r_min when campaign is selected
        #    If y[k]=0: all x=0 (from link), recommended=0 >= 0 ✓
        #    If y[k]=1: recommended >= r_min, recommended <= r_max ✓
        for k in K_crm:
            params = campaign_params[k]
            recommended_customer_count = quicksum(seg_data[s].customer_count * x[k, s] for s in S)
            model.addCons(
                recommended_customer_count >= params.r_min * y[k],
                name=f"crm_min_{k}",
            )
            model.addCons(
                recommended_customer_count <= params.r_max * y[k],
                name=f"crm_max_{k}",
            )

        # 1.2 CRM Campaign Selection Link
        #    x[k,s] <= y[k]: kampanya seçilmediyse hiçbir segmente atanamaz
        for k in K_crm:
            for s in S:
                model.addCons(
                    x[k, s] <= y[k],
                    name=f"crm_link_{k}_{s}",
                )

        # 1.5 CRM Campaign Count Constraints (MIN/MAX)
        #    Doc: c_min ≤ Number of selected CRM campaigns ≤ c_max
        #    Constraint: c_min ≤ Σ y[k] ≤ c_max  ∀k ∈ CRM
        model.addCons(
            quicksum(y[k] for k in K_crm) >= campaign_params_with_general.c_min,
            name="crm_count_min",
        )
        model.addCons(
            quicksum(y[k] for k in K_crm) <= campaign_params_with_general.c_max,
            name="crm_count_max",
        )

        # 2. Mass Campaign Count Constraints
        #    Doc: "en az 1 mass kampanya" & "en fazla 2 mass kampanya"
        if K_mass:
            model.addCons(
                quicksum(y[k] for k in K_mass) >= campaign_params_with_general.m_min,
                name="mass_min",
            )
            model.addCons(
                quicksum(y[k] for k in K_mass) <= campaign_params_with_general.m_max,
                name="mass_max",
            )

        # 3. Campaigns Per Segment Limit: "En fazla 2 kampanya"
        #    Doc: sum(x[k, m] for k in K_crm) + sum(y[k] for k in K_mass) <= 2
        #    Our: same, per segment
        for s in S:
            total_campaigns = quicksum(x[k, s] for k in K_crm)
            if K_mass:
                total_campaigns += quicksum(y[k] for k in K_mass)
            model.addCons(
                total_campaigns <= campaign_params_with_general.n_max,
                name=f"segment_campaign_limit_{s}"
            )

        # 4. Global Budget Constraint (Participation-based cost)
        #    c_k = unit cost per participating customer (katılım bazlı birim maliyet)
        #    CRM: cost = c_k × customer_count[s] × p_ks[k,s] × x[k,s]
        #    Mass: cost = c_k × Σ(customer_count[s] × p_ks[k,s]) × y[k]

        global_cost = quicksum(
            campaign_params[k].c_k * seg_data[s].customer_count * p_ks.get((k, s), 0) * x[k, s]
            for k in K_crm
            for s in S
        )
        if K_mass:
            global_cost += quicksum(
                campaign_params[k].c_k * quicksum(
                    seg_data[s].customer_count * p_ks.get((k, s), 0) for s in S
                ) * y[k]
                for k in K_mass
            )

        model.addCons(
            global_cost >= campaign_params_with_general.b_min,
            name="budget_min",
        )
        model.addCons(
            global_cost <= campaign_params_with_general.b_max,
            name="budget_max",
        )

        return model, x, y

    def _extract_results(
        self,
        model: Model,
        x_vars: Dict,
        y_vars: Dict,
        segments: List[CustomerSegmentData],
        crm_campaigns: List[CampaignParameterData],
        mass_campaigns: List[CampaignParameterData],
    ) -> Tuple[OptimizationSummaryResult, List[OptimizationDetailResult]]:
        """Extract results from solved model"""
        campaign_params = {c.campaign_id: c for c in crm_campaigns + mass_campaigns}
        crm_ids = [c.campaign_id for c in crm_campaigns]
        mass_ids = [c.campaign_id for c in mass_campaigns]

        active_mass = [k for k in mass_ids if model.getVal(y_vars[k]) > 0.5]

        details: List[OptimizationDetailResult] = []
        total_recommendations = 0
        total_estimated_participation = 0.0
        total_estimated_contribution = 0.0
        total_estimated_cost = 0.0
        total_recommended_customers = 0

        for seg in segments:
            recommended: List[RecommendedCampaignResult] = []

            for k in crm_ids:
                if model.getVal(x_vars[k, seg.id]) > 0.5:
                    params = campaign_params[k]
                    score = seg.propensity_scores.get(k, 0)
                    expected_contribution = seg.customer_count * score * params.z_k

                    recommended.append(
                        RecommendedCampaignResult(
                            campaign_id=k,
                            campaign_name=params.campaign_name,
                            score=score,
                            expected_contribution=expected_contribution,
                        )
                    )

                    total_estimated_participation += seg.customer_count * score
                    total_estimated_contribution += expected_contribution
                    total_estimated_cost += seg.customer_count * score * params.c_k
                    total_recommendations += seg.customer_count

            for k in active_mass:
                params = campaign_params[k]
                score = seg.propensity_scores.get(k, 0)
                expected_contribution = seg.customer_count * score * params.z_k

                recommended.append(
                    RecommendedCampaignResult(
                        campaign_id=k,
                        campaign_name=params.campaign_name,
                        score=score,
                        expected_contribution=expected_contribution,
                    )
                )

                total_estimated_participation += seg.customer_count * score
                total_estimated_contribution += expected_contribution
                total_estimated_cost += seg.customer_count * score * params.c_k
                total_recommendations += seg.customer_count

            if recommended:
                total_expected_contribution = sum(r.expected_contribution for r in recommended)
                total_recommended_customers += seg.customer_count
                details.append(
                    OptimizationDetailResult(
                        segment_id=seg.id,
                        segment_name=seg.name,
                        customer_count=seg.customer_count,
                        recommended_campaigns=recommended,
                        total_expected_contribution=total_expected_contribution,
                    )
                )

        estimated_roi = 0.0
        if total_estimated_cost > 0:
            estimated_roi = ((total_estimated_contribution - total_estimated_cost) / total_estimated_cost) * 100

        summary = OptimizationSummaryResult(
            recommended_customer_count=total_recommended_customers,
            total_recommendations=total_recommendations,
            estimated_participation=total_estimated_participation,
            estimated_contribution=total_estimated_contribution,
            estimated_cost=total_estimated_cost,
            estimated_roi=estimated_roi,
        )

        return summary, details

    def optimize_scenario(self, request: ScenarioOptimizationRequest) -> OptimizationResponse:
        """
        Optimize multiple campaigns for a scenario (per-segment optimization)

        Args:
            request: ScenarioOptimizationRequest containing:
                - campaign_parameters: List of ALL campaign parameters
                - customer_segments: List of segments with propensity_scores for all campaigns

        Returns:
            OptimizationResponse with results

        Note:
            This method handles multi-campaign per-segment optimization.
            It uses the first campaign as the primary one for response, but optimizes with all campaigns.
            Reference: INFEASIBILITY_ANALYSIS.md - Batch fix for INFEASIBLE results
        """
        start_time = time.time()

        try:
            if not request.campaign_parameters:
                raise ValueError("No campaign parameters provided")

            total_customers = sum(s.customer_count for s in request.customer_segments)
            logger.info(f"Starting scenario optimization for {len(request.campaign_parameters)} campaigns")
            logger.info(f"Segments: {len(request.customer_segments)}, Total customers: {total_customers}")

            # Use first campaign as primary (for logging and response)
            primary_campaign = request.campaign_parameters[0]

            # Classify campaigns by type
            crm_campaigns = [c for c in request.campaign_parameters if c.campaign_type == "CRM"]
            mass_campaigns = [c for c in request.campaign_parameters if c.campaign_type == "MASS"]

            logger.info(
                f"Scenario optimization: {len(crm_campaigns)} CRM + {len(mass_campaigns)} MASS campaigns"
            )

            # Build model with all campaigns
            model, x_vars, y_vars = self._build_model(
                request.customer_segments,
                crm_campaigns,
                mass_campaigns,
                primary_campaign,
            )

            model.hideOutput()
            model.setRealParam("limits/time", self.time_limit)
            model.setRealParam("limits/gap", 0.0)
            model.setParam("parallel/maxnthreads", 8)
            model.optimize()

            status = model.getStatus()

            execution_time = time.time() - start_time

            has_feasible_solution = model.getNSols() > 0
            is_usable = status == "optimal" or (
                status in ("gaplimit", "timelimit") and has_feasible_solution
            )

            if is_usable:
                if status != "optimal":
                    logger.warning(
                        f"Scenario solver stopped early with status '{status}' "
                        f"but a feasible solution is available; returning best-found solution."
                    )

                self._log_decision_variables(
                    model, x_vars, y_vars,
                    crm_campaigns, mass_campaigns, request.customer_segments,
                )

                # Process results
                summary, details = self._extract_results(
                    model,
                    x_vars,
                    y_vars,
                    request.customer_segments,
                    crm_campaigns,
                    mass_campaigns,
                )

                logger.info(f"Scenario optimization completed successfully: {summary.estimated_contribution}")

                return OptimizationResponse(
                    campaign_id=primary_campaign.campaign_id,
                    status="optimal",
                    summary_result=summary,
                    detail_results=details,
                    execution_time=execution_time,
                    solver_status=status,
                    objective_value=model.getObjVal(),
                )
            else:
                # Non-optimal (INFEASIBLE, UNBOUNDED, etc.)
                logger.warning(f"Scenario optimization returned non-optimal status: {status}")

                # DEBUG: Log optimization inputs for troubleshooting
                debug_info = {
                    "status": status,
                    "segment_count": len(request.customer_segments),
                    "crm_campaigns": len(crm_campaigns),
                    "mass_campaigns": len(mass_campaigns),
                    "campaign_details": [
                        {
                            "campaign_id": c.campaign_id,
                            "campaign_type": c.campaign_type,
                            "c_k": c.c_k,
                            "r_max": getattr(c, 'r_max', None)
                        }
                        for c in crm_campaigns + mass_campaigns
                    ],
                    "general_parameters": {
                        "b_min": primary_campaign.b_min,
                        "b_max": primary_campaign.b_max,
                        "n_max": primary_campaign.n_max,
                        "m_min": primary_campaign.m_min,
                        "m_max": primary_campaign.m_max,
                    },
                    "total_cost_if_all_campaigns_selected": sum(c.c_k for c in crm_campaigns + mass_campaigns),
                }

                if status == "infeasible":
                    logger.warning(
                        f"INFEASIBLE Analysis - Checking constraints:\n"
                        f"  - Budget constraint: sum(c_k * x) >= {primary_campaign.b_min}\n"
                        f"  - Available campaigns: {len(crm_campaigns)} CRM + {len(mass_campaigns)} MASS\n"
                        f"  - Total possible cost: {debug_info['total_cost_if_all_campaigns_selected']}\n"
                        f"  - Max campaigns per segment: {primary_campaign.n_max}\n"
                        f"  - Debug details: {json.dumps(debug_info, indent=2, default=str)}"
                    )

                return OptimizationResponse(
                    campaign_id=primary_campaign.campaign_id,
                    status=_normalize_failure_status(status),
                    execution_time=execution_time,
                    solver_status=status,
                    error_message=f"Solver returned status: {status}",
                )

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Scenario optimization failed: {str(e)}", exc_info=True)

            return OptimizationResponse(
                campaign_id="unknown",
                status="error",
                execution_time=execution_time,
                solver_status="error",
                error_message=str(e),
            )
