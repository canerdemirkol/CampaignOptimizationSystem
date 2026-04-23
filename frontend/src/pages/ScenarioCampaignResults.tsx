import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { optimizationScenarioService } from '../services/optimizationScenarioService';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/uiSlice';

interface ScenarioCampaignResult {
  campaignId: string;
  campaignName: string;
  campaignType: string;
  recommendedPersonCount: number;
  estimatedParticipation: number;
  estimatedContribution: number;
  estimatedCost: number;
  estimatedRoi: number;
  approved: boolean;
}

interface ScenarioCampaignResultsResponse {
  scenarioId: string;
  scenarioName: string;
  campaignResults: ScenarioCampaignResult[];
  summary: {
    totalCampaigns: number;
    totalRecommendedPeople: number;
    totalParticipation: number;
    totalContribution: number;
    totalCost: number;
    totalRoi: number;
    approvedCount: number;
  };
}

interface SegmentDetail {
  segmentId: string;
  segmentName: string;
  score: number;
  customerCount: number;
  expectedContribution: number;
  estimatedParticipation: number;
  estimatedCost: number;
}

interface CampaignSegmentDetailsResponse {
  scenarioId: string;
  campaignId: string;
  segmentDetails: SegmentDetail[];
}

const ScenarioCampaignResults: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<ScenarioCampaignResult | null>(null);

  if (!scenarioId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Scenario ID not provided</Alert>
      </Box>
    );
  }

  // Fetch campaign results
  const { data, isLoading, error } = useQuery({
    queryKey: ['scenario-campaign-results', scenarioId],
    queryFn: () =>
      optimizationScenarioService.getCampaignResults(scenarioId) as Promise<ScenarioCampaignResultsResponse>,
  });

  // Fetch segment details for selected campaign
  const {
    data: segmentData,
    isLoading: segmentLoading,
  } = useQuery({
    queryKey: ['campaign-segment-details', scenarioId, selectedCampaign?.campaignId],
    queryFn: () =>
      optimizationScenarioService.getCampaignSegmentDetails(
        scenarioId,
        selectedCampaign!.campaignId,
      ) as Promise<CampaignSegmentDetailsResponse>,
    enabled: !!selectedCampaign && detailModalOpen,
  });

  const handleBack = () => {
    navigate('/optimization-scenarios');
  };

  const handleApprovalToggle = (campaignId: string) => {
    const newApprovals = new Set(selectedApprovals);
    if (newApprovals.has(campaignId)) {
      newApprovals.delete(campaignId);
    } else {
      newApprovals.add(campaignId);
    }
    setSelectedApprovals(newApprovals);
  };

  const handleApproveSelected = () => {
    if (selectedApprovals.size === 0) {
      dispatch(showNotification({ message: 'Please select campaigns to approve', severity: 'warning' }));
      return;
    }
    setApproveDialogOpen(true);
  };

  const approveMutation = useMutation({
    mutationFn: (campaignIds: string[]) =>
      optimizationScenarioService.approveCampaigns(scenarioId, campaignIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario-campaign-results', scenarioId] });
      setSelectedApprovals(new Set());
      setApproveDialogOpen(false);
      dispatch(showNotification({ message: 'Campaigns approved successfully', severity: 'success' }));
    },
    onError: () => {
      dispatch(showNotification({ message: 'Failed to approve campaigns', severity: 'error' }));
    },
  });

  const confirmApproval = async () => {
    approveMutation.mutate(Array.from(selectedApprovals));
  };

  const handleOpenDetail = (campaign: ScenarioCampaignResult) => {
    setSelectedCampaign(campaign);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedCampaign(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('tr-TR').format(Math.round(value));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load campaign results</Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No data available</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          {data.scenarioName} - Scenario Results
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: 'Total Campaigns', value: data.summary.totalCampaigns },
          { label: 'Total Recommended People', value: formatNumber(data.summary.totalRecommendedPeople) },
          { label: 'Total Participation', value: formatNumber(data.summary.totalParticipation) },
          { label: 'Total Contribution', value: formatCurrency(data.summary.totalContribution) },
          { label: 'Total Cost', value: formatCurrency(data.summary.totalCost) },
        ].map((card) => (
          <Paper
            key={card.label}
            sx={{
              p: 2,
              textAlign: 'center',
              flex: '1 1 150px',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <Typography color="textSecondary" gutterBottom noWrap>
              {card.label}
            </Typography>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontSize: { xs: '0.95rem', sm: '1.05rem', md: '1.15rem', lg: '1.25rem' },
              }}
            >
              {card.value}
            </Typography>
          </Paper>
        ))}
        <Paper
          sx={{
            p: 2,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            flex: '1 1 150px',
            minWidth: 0,
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={async () => {
            try {
              await optimizationScenarioService.downloadDecisionVariables(scenarioId!);
              dispatch(showNotification({ message: 'Decision variables exported successfully', severity: 'success' }));
            } catch {
              dispatch(showNotification({ message: 'Failed to export decision variables', severity: 'error' }));
            }
          }}
        >
          <DownloadIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
          <Typography color="primary" variant="body2" fontWeight="bold" noWrap>
            Export Variables
          </Typography>
        </Paper>
      </Box>

      {/* Campaign Results Grid */}
      <Card>
        <CardHeader
          title="Scenario Results"
          action={
            selectedApprovals.size > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleApproveSelected}
              >
                Approve ({selectedApprovals.size})
              </Button>
            )
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell width="50">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Apply
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Campaign
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Recommended People
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Est. Participation
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Est. Contribution
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Est. Cost
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Status
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" fontWeight="bold">
                      Detail
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.campaignResults.map((result) => (
                  <TableRow key={result.campaignId} hover>
                    <TableCell>
                      <Checkbox
                        checked={selectedApprovals.has(result.campaignId)}
                        onChange={() => handleApprovalToggle(result.campaignId)}
                        disabled={result.approved}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {result.campaignName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {result.campaignType}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatNumber(result.recommendedPersonCount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {result.estimatedParticipation.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        {formatCurrency(result.estimatedContribution)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="error.main" fontWeight="bold">
                        {formatCurrency(result.estimatedCost)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {result.approved ? (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Approved"
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      ) : (
                        <Chip
                          icon={<CancelIcon />}
                          label="Pending"
                          variant="outlined"
                          size="small"
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Segment Details">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleOpenDetail(result)}
                        >
                          <InfoIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onClose={() => setApproveDialogOpen(false)}>
        <DialogTitle>Confirm Campaign Approval</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to approve {selectedApprovals.size} campaign(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmApproval} variant="contained" color="primary">
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Campaign Segment Detail Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">
                {selectedCampaign?.campaignName} - Segment Details
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {selectedCampaign?.campaignType}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseDetail} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {segmentLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : segmentData && segmentData.segmentDetails.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        Segment Name
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Propensity Score
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Customer Count
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Participation
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Expected Contribution
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" fontWeight="bold">
                        Cost
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {segmentData.segmentDetails.map((segment) => (
                    <TableRow key={segment.segmentId} hover>
                      <TableCell>
                        <Typography variant="body2">{segment.segmentName}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={segment.score >= 0.5 ? 'success.main' : 'error.main'}
                        >
                          {segment.score.toFixed(4)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatNumber(segment.customerCount)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatNumber(segment.estimatedParticipation)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          {formatCurrency(segment.expectedContribution)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                          {segment.estimatedCost > 0 ? formatCurrency(segment.estimatedCost) : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No segment details available for this campaign.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScenarioCampaignResults;
