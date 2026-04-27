"""
Optimization API Endpoints
Master Prompt Section 4.2 - FastAPI Endpoint
"""
import asyncio
import logging
import httpx
import json
import os
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.models.optimization import (
    OptimizationRequest,
    OptimizationResponse,
    CampaignParameterData,
)
from app.services.optimizer import CampaignOptimizer
from app.services.auth_service import get_auth_service


class ScenarioOptimizationRequest(BaseModel):
    """Request model for scenario optimization from Backend"""
    scenario_id: str
    global_customer_segments: list[Dict[str, Any]] = []  # NEW: Global segments for consistency
    optimization_scenario_campaigns: list[Dict[str, Any]]

router = APIRouter()
logger = logging.getLogger(__name__)

# Global optimizer instance.
# Time limit comes from the OPTIMIZATION_TIME_LIMIT env var (seconds). If unset
# or invalid, the solver runs without a wall-clock cap.
_time_limit_env = os.getenv("OPTIMIZATION_TIME_LIMIT")
try:
    _time_limit = int(_time_limit_env) if _time_limit_env else None
except ValueError:
    logger.warning(f"Invalid OPTIMIZATION_TIME_LIMIT={_time_limit_env!r}, ignoring")
    _time_limit = None
optimizer = CampaignOptimizer(time_limit=_time_limit)


@router.post("/campaign", response_model=OptimizationResponse)
async def optimize_campaign(
    request: Request,
    optimization_request: OptimizationRequest,
):
    """
    Run campaign optimization (segment-based)

    POST /optimize/campaign

    Input:
    - campaign_id
    - campaign_parameters (now includes both campaign-specific and general parameters)
      - Campaign-specific: r_min, r_max, z_k, c_k
      - General parameters: c_min, c_max, n_min, n_max, b_min, b_max, m_min, m_max
    - customer_segments (each with customer_count as weight)

    Output:
    - summary_result
    - detail_results (per segment)
    - execution_time
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")

    logger.info(
        f"Received optimization request for campaign {optimization_request.campaign_id}",
        extra={"trace.id": correlation_id}
    )

    try:
        # Run the blocking SCIPOpt solve in a worker thread so the asyncio
        # event loop stays responsive — otherwise /health stops answering and
        # the kubelet liveness probe kills the pod mid-solve.
        result = await asyncio.to_thread(optimizer.optimize, optimization_request)

        logger.info(
            f"Optimization completed: status={result.status}, "
            f"customers={result.summary_result.recommended_customer_count if result.summary_result else 0}",
            extra={"trace.id": correlation_id}
        )

        return result

    except Exception as e:
        logger.error(
            f"Optimization failed: {str(e)}",
            extra={"trace.id": correlation_id, "error.message": str(e)},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaign/async")
async def optimize_campaign_async(
    request: Request,
    optimization_request: OptimizationRequest,
    background_tasks: BackgroundTasks,
):
    """
    Start async campaign optimization

    For long-running optimizations, this endpoint starts the process
    in the background and returns immediately.
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")

    logger.info(
        f"Starting async optimization for campaign {optimization_request.campaign_id}",
        extra={"trace.id": correlation_id}
    )

    # In a real implementation, this would:
    # 1. Store the job in a queue (Redis/BullMQ)
    # 2. Return a job ID
    # 3. Process in background
    # 4. Allow status polling

    return {
        "message": "Optimization started",
        "campaign_id": optimization_request.campaign_id,
        "correlation_id": correlation_id,
        "status": "processing"
    }


@router.get("/status/{campaign_id}")
async def get_optimization_status(campaign_id: str):
    """
    Get optimization status for a campaign

    This would be used for async optimization tracking
    """
    # In a real implementation, this would check the job queue
    return {
        "campaign_id": campaign_id,
        "status": "not_implemented",
        "message": "Status tracking not yet implemented"
    }


@router.post("/scenario/{scenario_id}")
async def optimize_scenario(
    request: Request,
    scenario_id: str,
    scenario_request: ScenarioOptimizationRequest,
    background_tasks: BackgroundTasks,
):
    """
    Run scenario optimization for multiple campaigns

    POST /optimization/scenario/{scenario_id}

    Input:
    - scenario_id: Scenario identifier
    - campaigns: List of campaign objects with parameters and customer segments
    """
    correlation_id = getattr(request.state, "correlation_id", "unknown")

    logger.info(
        f"[SCENARIO {scenario_id}] Received scenario optimization request with {len(scenario_request.optimization_scenario_campaigns)} campaigns",
        extra={"trace.id": correlation_id, "scenario.id": scenario_id}
    )

    console_log = f"[SCENARIO {scenario_id}] FastAPI endpoint received request - {len(scenario_request.optimization_scenario_campaigns)} campaigns"
    print(console_log)

    if not scenario_request.optimization_scenario_campaigns:
        logger.warning(
            f"Scenario {scenario_id} has no campaigns",
            extra={"trace.id": correlation_id, "scenario.id": scenario_id}
        )
        raise HTTPException(status_code=400, detail="No campaigns provided for scenario optimization")

    # Start scenario optimization in background
    background_tasks.add_task(
        _process_scenario_optimization,
        scenario_id=scenario_id,
        global_segments=scenario_request.global_customer_segments,
        campaigns=scenario_request.optimization_scenario_campaigns,
        correlation_id=correlation_id,
    )

    return {
        "status": "processing",
        "scenario_id": scenario_id,
        "campaign_count": len(scenario_request.optimization_scenario_campaigns),
        "message": "Scenario optimization started",
        "correlation_id": correlation_id,
    }


async def _upload_decision_variables(
    *,
    client: "httpx.AsyncClient",
    url: str,
    decision_vars: Dict[str, Any],
    auth_service,
    auth_headers: Dict[str, str],
    write_log,
) -> Dict[str, str]:
    """
    Upload solver decision variables to the backend in a single POST.

    A previous version split x_ks_all into 5 K-entry chunks and had the
    backend merge each chunk into scenario.decisionVariables. That made
    each chunk's read-modify-write grow with the number of already-
    uploaded chunks (O(N²) total work) and started timing out / 500'ing
    around chunk 28-29 once the merged JSON crossed ~25 MB.

    The body-parser limit on the backend is 50 MB and decision_variables
    fits comfortably under that for any realistic scenario, so we send
    the whole payload at once and let the backend write it atomically.

    Same retry shape as the result-chunk loop: transport errors, 5xx,
    408 and 429 retry with 2/4/8 s backoff; 401 refreshes the token
    once. Returns the (possibly refreshed) auth headers.
    """
    body = {"decision_variables": decision_vars}
    payload_bytes = len(json.dumps(body))

    # Generous timeout: a single 30-50 MB POST plus a JSONB write of the
    # same size on the backend can take a while under load.
    timeout = 300.0
    max_attempts = 4

    write_log(
        f"Uploading decision_variables in a single POST "
        f"({len(decision_vars.get('x_ks_all') or [])} x_ks_all entries, "
        f"size: {payload_bytes} bytes)"
    )

    last_error: Optional[str] = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = await client.post(
                url,
                json=body,
                timeout=timeout,
                headers=auth_headers if auth_headers else None,
            )

            if response.status_code == 401:
                write_log(
                    f"decision_variables upload: HTTP 401, refreshing token",
                    level="WARNING",
                )
                try:
                    auth_headers = await auth_service.get_auth_headers(force_refresh=True)
                    response = await client.post(
                        url,
                        json=body,
                        timeout=timeout,
                        headers=auth_headers,
                    )
                except Exception as refresh_error:
                    last_error = f"auth refresh failed: {refresh_error}"
                    write_log(f"decision_variables: {last_error}", level="ERROR")
                    return auth_headers

            if response.status_code >= 500 or response.status_code in (408, 429):
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                if attempt < max_attempts:
                    backoff = 2 ** attempt
                    write_log(
                        f"decision_variables attempt {attempt}/{max_attempts} "
                        f"failed ({last_error}). Retrying in {backoff}s",
                        level="WARNING",
                    )
                    await asyncio.sleep(backoff)
                    continue
                break

            if response.status_code >= 400:
                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
                write_log(f"decision_variables upload failed: {last_error}", level="ERROR")
                return auth_headers

            write_log(
                f"decision_variables uploaded. HTTP Status: {response.status_code}"
            )
            return auth_headers

        except httpx.TransportError as e:
            last_error = f"{type(e).__name__}: {e}"
            if attempt < max_attempts:
                backoff = 2 ** attempt
                write_log(
                    f"decision_variables attempt {attempt}/{max_attempts} "
                    f"failed ({last_error}). Retrying in {backoff}s",
                    level="WARNING",
                )
                await asyncio.sleep(backoff)
                continue
            break
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            break

    write_log(
        f"decision_variables upload gave up after {max_attempts} attempt(s): {last_error}",
        level="ERROR",
    )
    return auth_headers


async def _process_scenario_optimization(
    scenario_id: str,
    global_segments: list[Dict[str, Any]],
    campaigns: list[Dict[str, Any]],
    correlation_id: str,
):
    """
    Background task to process scenario optimization
    - Groups all campaigns together for each segment
    - Calls optimizer once per segment (instead of once per campaign-segment pair)
    - Reduces API calls from N*M to M (N campaigns, M segments)
    - Processes results by segment and sends back to backend in chunks

    Args:
        scenario_id: Scenario identifier
        global_segments: Global customer segments from backend (for consistency)
        campaigns: Campaign data with customer segments and scores
        correlation_id: Request correlation ID for logging
    """
    # File logging only when FILE_LOG_ENABLED=true
    file_log_enabled = os.environ.get("FILE_LOG_ENABLED", "false").lower() == "true"
    log_file = None
    # Match the 50 MB rollover used by DailyRotatingFileHandler and the backend
    # FileLoggerService so scenario logs cannot grow past that limit either.
    MAX_LOG_FILE_BYTES = 50 * 1024 * 1024

    if file_log_enabled:
        logs_dir = Path("logs/scenario_optimization")
        logs_dir.mkdir(parents=True, exist_ok=True)
        log_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = logs_dir / f"scenario_{scenario_id}_{log_timestamp}.log"

    def _active_log_path(base: Path) -> Path:
        """Return base if it has room, otherwise base-2, base-3, ..."""
        if not base.exists() or base.stat().st_size < MAX_LOG_FILE_BYTES:
            return base
        stem, suffix = base.stem, base.suffix
        parent = base.parent
        n = 2
        while True:
            candidate = parent / f"{stem}-{n}{suffix}"
            if not candidate.exists() or candidate.stat().st_size < MAX_LOG_FILE_BYTES:
                return candidate
            n += 1

    def write_log(message: str, level: str = "INFO"):
        """Helper to write to console (ECS) and optionally to file"""
        prefixed_message = f"[SCENARIO {scenario_id}] {message}"
        log_extra = {"trace.id": correlation_id, "scenario.id": scenario_id}

        if level == "ERROR":
            logger.error(prefixed_message, extra=log_extra)
        elif level == "WARNING":
            logger.warning(prefixed_message, extra=log_extra)
        else:
            logger.info(prefixed_message, extra=log_extra)

        if file_log_enabled and log_file:
            timestamp = datetime.now().isoformat()
            log_entry = f"[{timestamp}] [{level}] {prefixed_message}\n"
            target = _active_log_path(log_file)
            with open(target, "a", encoding="utf-8") as f:
                f.write(log_entry)

    try:
        write_log(f"Starting scenario optimization for {len(campaigns)} campaigns")

        # Log backend request data
        write_log(f"[BACKEND DATA] Received {len(campaigns)} campaigns and {len(global_segments)} global segments")

        # Log campaign data structure for ALL campaigns
        for idx, campaign in enumerate(campaigns):
            campaign_summary = {
                "campaign_id": campaign.get("campaign_id"),
                "campaign_name": campaign.get("campaign_name"),
                "segment_count": len(campaign.get("customer_segments", [])),
                "parameters_keys": list(campaign.get("parameters", {}).keys()),
            }
            write_log(f"[CAMPAIGN {idx+1}] {json.dumps(campaign_summary)}")

        # ============================================================================
        # SEGMENT-BASED OPTIMIZATION WITH GLOBAL SEGMENT CONSOLIDATION
        # ============================================================================

        # Use global customer segments passed from backend
        # This ensures consistency: same segment data across all campaigns
        write_log(f"Received {len(global_segments)} global customer segments from backend")

        if not global_segments:
            write_log(
                f"WARNING: No global segments received from backend. "
                f"Falling back to extracting from campaigns.",
                level="WARNING"
            )
            # Fallback: extract unique segments from campaigns if global not provided
            segments_dict = {}
            for campaign_data in campaigns:
                campaign_segments = campaign_data.get("customer_segments", [])
                for seg in campaign_segments:
                    segment_id = seg.get("customer_segment_id")
                    if segment_id not in segments_dict:
                        segments_dict[segment_id] = {
                            "id": segment_id,
                            "name": seg.get("customer_segment_name"),
                            "customer_count": seg.get("customer_count", 0),
                            "lifetime_value": seg.get("lifetime_value", 0),
                            "income_level": seg.get("income_level"),
                        }
        else:
            # Use global segments (consistent across all campaigns)
            write_log(f"[OK] Using {len(global_segments)} global customer segments from backend")
            segments_dict = {
                seg.get("customer_segment_id"): {
                    "id": seg.get("customer_segment_id"),
                    "name": seg.get("customer_segment_name"),
                    "customer_count": seg.get("customer_count", 0),
                    "lifetime_value": seg.get("lifetime_value", 0),
                    "income_level": seg.get("income_level"),
                }
                for seg in global_segments
            }

        # Log incoming scenario data
        scenario_data_log = {
            "scenario_id": scenario_id,
            "correlation_id": correlation_id,
            "timestamp": datetime.now().isoformat(),
            "campaign_count": len(campaigns),
            "segment_count": len(segments_dict),
            "global_segments_provided": len(global_segments) > 0,
        }
        write_log(f"Scenario Input Data: {json.dumps(scenario_data_log, indent=2)}")

        # Step 1: Extract and validate all campaign parameters
        write_log(f"Step 1: Extracting campaign parameters...")

        campaign_params_list = []  # List of all campaign parameters

        for campaign_data in campaigns:
            campaign_id = campaign_data.get("campaign_id")
            parameters = campaign_data.get("parameters", {})
            # Get campaign_name from parameters or fallback to top-level field
            campaign_name = parameters.get("campaign_name") or campaign_data.get("campaign_name", campaign_id)

            # Store campaign parameters (include all params except campaign_name and campaign_type which we handle separately)
            campaign_params = {
                "campaign_id": campaign_id,
                "campaign_name": campaign_name,
                "campaign_type": parameters.get("campaign_type", "CRM"),
                **{k: v for k, v in parameters.items() if k not in ["campaign_type", "campaign_name"]},
            }
            campaign_params_list.append(campaign_params)

        write_log(f"[OK] Extracted {len(campaign_params_list)} campaigns and {len(segments_dict)} unique segments")

        # Step 2: Run optimization with ALL segments at once (not per-segment)
        # This is mathematically correct: global constraints (budget, r_min/r_max, campaign counts)
        # apply across ALL segments, not per-segment. Per-segment optimization caused INFEASIBLE
        # because single segments often exceed r_max and MASS costs exceed budget.
        write_log(f"Step 2: Building optimization request with ALL {len(segments_dict)} segments...")

        results = []

        try:
            # Build ALL segment objects with propensity scores
            all_customer_segments = []
            total_actual_scores = 0
            total_default_scores = 0
            total_segments = len(segments_dict)

            for idx, (segment_id, segment_base_info) in enumerate(segments_dict.items()):
                propensity_scores = {}
                campaigns_with_score = 0
                campaigns_with_default_score = 0

                for campaign_data in campaigns:
                    campaign_id = campaign_data.get("campaign_id")
                    campaign_segments = campaign_data.get("customer_segments", [])

                    score_found = False
                    for seg in campaign_segments:
                        if seg.get("customer_segment_id") == segment_id:
                            score = seg.get("score")
                            if score is not None:
                                propensity_scores[campaign_id] = score
                                campaigns_with_score += 1
                            else:
                                propensity_scores[campaign_id] = 0.5
                                campaigns_with_default_score += 1
                            score_found = True
                            break

                    if not score_found:
                        propensity_scores[campaign_id] = 0.5
                        campaigns_with_default_score += 1

                all_customer_segments.append({
                    "id": segment_id,
                    "name": segment_base_info["name"],
                    "customer_count": segment_base_info["customer_count"],
                    "lifetime_value": segment_base_info["lifetime_value"],
                    "income_level": segment_base_info.get("income_level"),
                    "propensity_scores": propensity_scores,
                })

                total_actual_scores += campaigns_with_score
                total_default_scores += campaigns_with_default_score

                if (idx + 1) % 10000 == 0:
                    write_log(f"Processed {idx + 1}/{total_segments} segments")

            write_log(
                f"Built {len(all_customer_segments)} segment objects: "
                f"{total_actual_scores} actual scores, {total_default_scores} default fallbacks"
            )
            if all_customer_segments:
                first_seg = all_customer_segments[0]
                last_seg = all_customer_segments[-1]
                write_log(
                    f"First segment '{first_seg['name']}' sample scores: "
                    f"{list(first_seg['propensity_scores'].values())[:3]}"
                )
                write_log(
                    f"Last segment '{last_seg['name']}' sample scores: "
                    f"{list(last_seg['propensity_scores'].values())[:3]}"
                )

            # Convert campaign params and run ONE optimization with all segments
            campaign_params_objs = [CampaignParameterData(**cp) for cp in campaign_params_list]

            from app.models.optimization import ScenarioOptimizationRequest
            optimization_request = ScenarioOptimizationRequest(
                campaign_parameters=campaign_params_objs,
                customer_segments=all_customer_segments,  # ALL segments at once!
            )

            write_log(
                f"Running optimization with {len(campaign_params_objs)} campaigns × "
                f"{len(all_customer_segments)} segments..."
            )
            # Offload the blocking SCIPOpt solve to a worker thread; otherwise
            # the C call freezes the asyncio loop, /health stops answering,
            # and the liveness probe kills the pod mid-calculation.
            result = await asyncio.to_thread(optimizer.optimize_scenario, optimization_request)
            write_log(f"Optimization completed. Status: {result.status}")

            # Log decision variables (x[k,s] and y[k]) from the optimizer
            decision_vars = getattr(optimizer, '_last_decision_vars', None)
            if decision_vars:
                summary = decision_vars.get('summary', {})
                write_log(f"=== Decision Variables Summary ===")
                write_log(f"Total campaigns: {summary.get('total_campaigns', 0)}, "
                          f"Selected: {summary.get('selected_campaigns', 0)} "
                          f"(CRM: {summary.get('selected_crm', 0)}, MASS: {summary.get('selected_mass', 0)})")
                write_log(f"Total CRM segment pairs: {summary.get('total_crm_segment_pairs', 0)}, "
                          f"Active assignments: {summary.get('total_crm_segment_assignments', 0)}")
                write_log(f"Note: {summary.get('note', '')}")
                write_log(f"=== y[k] Campaign Selection ===")
                write_log(json.dumps(decision_vars.get('y_k', []), indent=2, default=str, ensure_ascii=False))
                write_log(f"=== x[k,s] All CRM Assignments ===")
                write_log(json.dumps(decision_vars.get('x_ks_all', []), indent=2, default=str, ensure_ascii=False))
                write_log(f"=== x[k,s] Active CRM Assignments (value=1) ===")
                write_log(json.dumps(decision_vars.get('x_ks_active', []), indent=2, default=str, ensure_ascii=False))

            result_dict = result.dict() if hasattr(result, "dict") else result

            if result_dict.get("status") not in ("optimal", "success"):
                # Optimization failed — create error results for all campaign-segment pairs
                error_msg = result_dict.get("error_message", f"Solver returned status: {result_dict.get('status')}")
                write_log(f"Optimization returned non-optimal: {error_msg}", level="WARNING")

                for campaign_params in campaign_params_list:
                    campaign_id = campaign_params["campaign_id"]
                    for segment_id in segments_dict:
                        results.append({
                            "campaign_id": campaign_id,
                            "segment_id": segment_id,
                            "status": "error",
                            "error": error_msg,
                        })

                write_log(
                    f"Produced {len(results)} error results "
                    f"({len(campaign_params_list)} campaigns x {len(segments_dict)} segments) "
                    f"with error: {error_msg}",
                    level="WARNING",
                )
            else:
                # Optimization succeeded — extract per-campaign per-segment results
                # Build detail lookup by segment_id
                detail_by_segment = {}
                for detail in result_dict.get("detail_results", []):
                    detail_by_segment[detail.get("segment_id")] = detail

                # Build campaign params lookup
                campaign_params_lookup = {cp["campaign_id"]: cp for cp in campaign_params_list}

                # Create per-campaign × per-segment result entries (only for recommended ones)
                for campaign_params in campaign_params_list:
                    campaign_id = campaign_params["campaign_id"]
                    campaign_name = campaign_params.get("campaign_name", campaign_id)
                    c_k = campaign_params.get("c_k", 0)
                    z_k = campaign_params.get("z_k", 0)
                    campaign_result_count = 0

                    for segment_id, segment_base_info in segments_dict.items():
                        detail = detail_by_segment.get(segment_id)

                        # Find this campaign in recommended_campaigns for this segment
                        campaign_rec = None
                        if detail:
                            for rec in detail.get("recommended_campaigns", []):
                                if rec.get("campaign_id") == campaign_id:
                                    campaign_rec = rec
                                    break

                        if campaign_rec:
                            expected_contribution = campaign_rec.get("expected_contribution", 0)
                            score = campaign_rec.get("score", 0)

                            # Derive per-segment per-campaign metrics
                            participation = expected_contribution / z_k if z_k > 0 else 0
                            cost = participation * c_k
                            recommended_count = int(participation / score) if score > 0 else 0

                            segment_summary = {
                                "recommended_customer_count": recommended_count,
                                "total_recommendations": recommended_count,
                                "estimated_participation": round(participation, 4),
                                "estimated_contribution": round(expected_contribution, 4),
                                "estimated_cost": round(cost, 4),
                                "estimated_roi": round(
                                    ((expected_contribution - cost) / cost * 100) if cost > 0 else 0, 4
                                ),
                            }

                            # Build detail_results with correct customer_count for this campaign
                            campaign_detail = {
                                "segment_id": segment_id,
                                "segment_name": segment_base_info["name"],
                                "customer_count": recommended_count,
                                "recommended_campaigns": [campaign_rec],
                                "total_expected_contribution": expected_contribution,
                            }
                        else:
                            # Campaign not recommended for this segment - skip it
                            continue

                        results.append({
                            "campaign_id": campaign_id,
                            "segment_id": segment_id,
                            "status": "success",
                            "result": {
                                "campaign_id": campaign_id,
                                "status": "optimal",
                                "summary_result": segment_summary,
                                "detail_results": [campaign_detail],
                            },
                        })
                        campaign_result_count += 1

                    write_log(
                        f"Campaign {campaign_name}: {campaign_result_count} active results "
                        f"out of {len(segments_dict)} segments"
                        + (" (NOT SELECTED by optimizer)" if campaign_result_count == 0 else "")
                    )

                write_log(
                    f"Optimization Result Summary: "
                    f"Status={result_dict.get('status')}, "
                    f"Summary={result_dict.get('summary_result')}"
                )

        except Exception as opt_error:
            write_log(f"Optimization failed: {str(opt_error)}", level="ERROR")

            for campaign_params in campaign_params_list:
                campaign_id = campaign_params["campaign_id"]
                for segment_id in segments_dict:
                    results.append({
                        "campaign_id": campaign_id,
                        "segment_id": segment_id,
                        "status": "error",
                        "error": str(opt_error),
                    })

        # Log final results summary
        successful = len([r for r in results if r["status"] == "success"])
        failed = len([r for r in results if r["status"] == "error"])
        write_log(
            f"Scenario optimization completed. "
            f"{successful} successful, {failed} failed "
            f"({len(results)} total results)"
        )

        scenario_results_log = {
            "scenario_id": scenario_id,
            "timestamp": datetime.now().isoformat(),
            "results": results,
        }
        write_log(f"Scenario Final Results: {json.dumps(scenario_results_log, indent=2, default=str)}")

        # Send results back to backend in chunks to avoid HTTP 413 errors
        write_log(f"Sending results back to backend in chunks...")

        async with httpx.AsyncClient() as client:
            try:
                # Get auth service and obtain access token
                auth_service = get_auth_service()
                write_log(f"Authenticating with backend...")

                try:
                    auth_headers = await auth_service.get_auth_headers()
                    write_log(f"Successfully authenticated with backend")
                except Exception as auth_error:
                    write_log(f"Authentication failed: {str(auth_error)}", level="ERROR")
                    auth_headers = {}

                backend_url = os.getenv("BACKEND_URL", "http://localhost:3001")
                callback_url = f"{backend_url}/api/optimization-scenarios/{scenario_id}/complete"
                write_log(f"Sending results back to backend endpoint: {callback_url}")

                # Send results in chunks to avoid HTTP 413 "Request Entity Too Large" errors.
                # At ~810 bytes per result, chunk_size=50 keeps each payload around 40 KB,
                # comfortably under typical Express/NestJS body-parser defaults while cutting
                # the number of round-trips by 5x compared to chunk_size=10.
                chunk_size = 50
                total_chunks = (len(results) + chunk_size - 1) // chunk_size

                # Per-chunk timeout sized for the backend's worst observed case:
                # a single chunk's upserts plus any head-of-line blocking from
                # other NestJS work that delays picking up the request.
                per_chunk_timeout = 120.0
                max_attempts = 4  # 1 initial + 3 retries with 2s/4s/8s backoff
                failed_chunks: list[int] = []

                for chunk_num in range(total_chunks):
                    start_idx = chunk_num * chunk_size
                    end_idx = min(start_idx + chunk_size, len(results))
                    chunk_results = results[start_idx:end_idx]

                    request_body = {
                        "results": chunk_results,
                        "chunk_number": chunk_num + 1,
                        "total_chunks": total_chunks,
                        "scenario_id": scenario_id,
                    }

                    # Decision variables are sent separately via the dedicated
                    # /decision-variables endpoint after all result chunks
                    # succeed. They used to ride on the final result chunk, but
                    # for large scenarios x_ks_all (CRM × segment cartesian
                    # product) made the payload tens of MB and tripped the
                    # backend body-parser 413 limit.

                    write_log(
                        f"Sending chunk {chunk_num + 1}/{total_chunks} "
                        f"({len(chunk_results)} results, size: {len(json.dumps(request_body))} bytes)"
                    )

                    # Send one chunk with retries + per-chunk error isolation:
                    # transient failures (timeouts, network errors, 5xx, 408, 429)
                    # are retried with exponential backoff; permanent failures log
                    # and skip to the next chunk so one bad chunk cannot abort
                    # the entire scenario upload. Backend upserts are idempotent
                    # (keyed by scenarioId+campaignId+segmentId) so retrying a
                    # chunk that silently succeeded is safe.
                    chunk_error: Optional[str] = None
                    chunk_succeeded = False

                    for attempt in range(1, max_attempts + 1):
                        try:
                            response = await client.post(
                                callback_url,
                                json=request_body,
                                timeout=per_chunk_timeout,
                                headers=auth_headers if auth_headers else None,
                            )

                            # Token cached client-side for 14 minutes; long chunk runs
                            # can outlive it and start getting 401 mid-stream. Force a
                            # fresh token and retry the same chunk once before giving up.
                            if response.status_code == 401:
                                write_log(
                                    f"Chunk {chunk_num + 1} attempt {attempt}: got HTTP 401, "
                                    f"refreshing auth token and retrying",
                                    level="WARNING",
                                )
                                try:
                                    auth_headers = await auth_service.get_auth_headers(force_refresh=True)
                                    response = await client.post(
                                        callback_url,
                                        json=request_body,
                                        timeout=per_chunk_timeout,
                                        headers=auth_headers,
                                    )
                                except Exception as refresh_error:
                                    chunk_error = f"auth refresh failed: {refresh_error}"
                                    write_log(
                                        f"Chunk {chunk_num + 1}: {chunk_error}",
                                        level="ERROR",
                                    )
                                    break  # non-retryable: can't auth

                            # Retryable server-side failures: 5xx, plus 408 Request
                            # Timeout and 429 Too Many Requests. Other 4xx are
                            # client-side bugs (bad payload, etc.) and won't fix
                            # themselves on retry, so fail the chunk immediately.
                            if response.status_code >= 500 or response.status_code in (408, 429):
                                chunk_error = f"HTTP {response.status_code}: {response.text[:200]}"
                                if attempt < max_attempts:
                                    backoff = 2 ** attempt  # 2, 4, 8 seconds
                                    write_log(
                                        f"Chunk {chunk_num + 1} attempt {attempt}/{max_attempts} "
                                        f"failed ({chunk_error}). Retrying in {backoff}s",
                                        level="WARNING",
                                    )
                                    await asyncio.sleep(backoff)
                                    continue
                                break  # attempts exhausted

                            write_log(
                                f"Chunk {chunk_num + 1}/{total_chunks} sent to backend. "
                                f"HTTP Status: {response.status_code}"
                            )
                            if response.text:
                                write_log(f"Backend response for chunk {chunk_num + 1}: {response.text}")

                            if response.status_code >= 400:
                                chunk_error = f"HTTP {response.status_code}: {response.text[:200]}"
                                break  # non-retryable 4xx

                            chunk_succeeded = True
                            break

                        except httpx.TransportError as e:
                            # Network / timeout / protocol errors are retryable.
                            chunk_error = f"{type(e).__name__}: {e}"
                            if attempt < max_attempts:
                                backoff = 2 ** attempt  # 2, 4, 8 seconds
                                write_log(
                                    f"Chunk {chunk_num + 1} attempt {attempt}/{max_attempts} "
                                    f"failed ({chunk_error}). Retrying in {backoff}s",
                                    level="WARNING",
                                )
                                await asyncio.sleep(backoff)
                                continue
                            break  # attempts exhausted
                        except Exception as e:
                            # Unexpected error: don't retry blindly.
                            chunk_error = f"{type(e).__name__}: {e}"
                            break

                    if not chunk_succeeded:
                        failed_chunks.append(chunk_num + 1)
                        write_log(
                            f"Chunk {chunk_num + 1}/{total_chunks} gave up after "
                            f"{max_attempts} attempt(s): {chunk_error}",
                            level="ERROR",
                        )

                if failed_chunks:
                    preview = failed_chunks[:20]
                    suffix = f" (+{len(failed_chunks) - 20} more)" if len(failed_chunks) > 20 else ""
                    write_log(
                        f"{len(failed_chunks)}/{total_chunks} chunks failed after all retries: "
                        f"{preview}{suffix}",
                        level="ERROR",
                    )
                else:
                    write_log(f"All {total_chunks} chunks sent to backend successfully")

                # Upload decision variables in a single POST. Body-parser is
                # 50 MB; decision_variables fit under that for realistic
                # scenarios, and a single write avoids the O(N²) read-modify-
                # write that earlier per-chunk merging suffered from.
                if decision_vars:
                    dv_url = (
                        f"{backend_url}/api/optimization-scenarios/"
                        f"{scenario_id}/decision-variables"
                    )
                    auth_headers = await _upload_decision_variables(
                        client=client,
                        url=dv_url,
                        decision_vars=decision_vars,
                        auth_service=auth_service,
                        auth_headers=auth_headers,
                        write_log=write_log,
                    )
            except Exception as e:
                write_log(f"Failed to send results to backend: {str(e)}", level="ERROR")

    except Exception as e:
        write_log(f"Scenario optimization fatal error: {str(e)}", level="ERROR")
