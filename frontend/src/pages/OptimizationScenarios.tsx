import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { openCreateScenarioModal, showNotification, openAddCampaignsToScenarioModal } from '../store/uiSlice';
import { optimizationScenarioService } from '../services/optimizationScenarioService';
import { OptimizationScenario } from '../types';
import CreateOptimizationScenarioModal from '../components/optimization-scenario/CreateOptimizationScenarioModal';
import AddCampaignsToScenarioModal from '../components/optimization-scenario/AddCampaignsToScenarioModal';

const columnHelper = createColumnHelper<OptimizationScenario>();

const OptimizationScenarios: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [scenarioCampaignsPage, setScenarioCampaignsPage] = useState(0);
  const scenarioCampaignsPageSize = 5;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editingDefaultParameters, setEditingDefaultParameters] = useState(false);
  const [editDefaultParametersData, setEditDefaultParametersData] = useState<any>({});

  // Queries
  const { data: scenariosData, isLoading: isLoadingScenarios } = useQuery({
    queryKey: ['optimization-scenarios', page + 1, rowsPerPage],
    queryFn: () => optimizationScenarioService.getScenarios(page + 1, rowsPerPage),
  });

  const { data: selectedScenario, isLoading: isLoadingScenario } = useQuery({
    queryKey: [`scenario-detail-${selectedScenarioId}`],
    queryFn: () => (selectedScenarioId ? optimizationScenarioService.getScenarioDetail(selectedScenarioId) : null),
    enabled: !!selectedScenarioId,
  });

  // Auto-poll scenarios list while any is RUNNING
  React.useEffect(() => {
    if (!scenariosData?.data?.some((s: OptimizationScenario) => s.status === 'RUNNING')) {
      return; // Stop polling when no RUNNING scenarios
    }

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
    }, 3000);

    return () => clearInterval(interval);
  }, [scenariosData?.data, queryClient]);

  // Auto-poll selected scenario while RUNNING
  React.useEffect(() => {
    if (selectedScenario?.status !== 'RUNNING') {
      return; // Stop polling when scenario is not RUNNING
    }

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenarioId}`] });
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedScenario?.status, selectedScenarioId, queryClient]);

  // Debug: Log scenario data
  React.useEffect(() => {
    if (selectedScenario) {
      console.log('=== Selected Scenario ===');
      if (selectedScenario.campaigns && selectedScenario.campaigns.length > 0) {
        console.log('Raw Campaign from API:', selectedScenario.campaigns[0]);
        console.log('Normalized Campaign:', normalizeCampaign(selectedScenario.campaigns[0]));
      }
    }
  }, [selectedScenario]);


  // Mutations
  const updateCampaignInScenarioMutation = useMutation({
    mutationFn: (data: { scenarioId: string; campaignId: string; updates: any }) => {
      return optimizationScenarioService.updateCampaignInScenario(
        data.scenarioId,
        data.campaignId,
        data.updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-for-scenario'] });
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenarioId}`] });
      dispatch(showNotification({ message: 'Campaign updated successfully in scenario', severity: 'success' }));
      setEditingCampaignId(null);
      setEditFormData({});
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update campaign in scenario',
        severity: 'error',
      }));
    },
  });

  const removeCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => {
      if (!selectedScenarioId) throw new Error('No scenario selected');
      return optimizationScenarioService.removeCampaignFromScenario(selectedScenarioId, campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenarioId}`] });
      dispatch(showNotification({ message: 'Campaign removed successfully', severity: 'success' }));
      setDeleteConfirmOpen(false);
      setCampaignToDelete(null);
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to remove campaign',
        severity: 'error',
      }));
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: optimizationScenarioService.deleteScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
      dispatch(showNotification({ message: 'Scenario deleted successfully', severity: 'success' }));
      setSelectedScenarioId(null);
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to delete scenario',
        severity: 'error',
      }));
    },
  });

  const activateScenarioMutation = useMutation({
    mutationFn: optimizationScenarioService.activateScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenarioId}`] });
      dispatch(showNotification({ message: 'Scenario activated successfully', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to activate scenario',
        severity: 'error',
      }));
    },
  });

  const updateDefaultParametersMutation = useMutation({
    mutationFn: (data: { scenarioId: string; updates: any }) => {
      return optimizationScenarioService.updateDefaultParameters(data.scenarioId, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenarioId}`] });
      dispatch(showNotification({ message: 'Default parameters updated successfully', severity: 'success' }));
      setEditingDefaultParameters(false);
      setEditDefaultParametersData({});
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update default parameters',
        severity: 'error',
      }));
    },
  });

  // Columns for scenarios list
  const scenarioColumns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Scenario Name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const status = info.getValue();
          const colorMap = { READY: 'default', RUNNING: 'info', COMPLETED_SUCCESSFULLY: 'success', FAILED: 'error' };
          const shortLabelMap: Record<string, string> = { COMPLETED_SUCCESSFULLY: 'COMPLETED', RUNNING: 'RUNNING', READY: 'READY', FAILED: 'FAILED' };
          return (
            <Tooltip title={status} arrow>
              <Chip label={shortLabelMap[status] || status} color={colorMap[status as keyof typeof colorMap] as any} size="small" />
            </Tooltip>
          );
        },
      }),
      columnHelper.accessor('campaignIds', {
        header: 'Campaigns',
        cell: (info) => `${info.getValue().length}`,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Created',
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: scenariosData?.data || [],
    columns: scenarioColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleChangePageSize = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleChangePageIndex = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleScenarioSelect = useCallback((scenario: OptimizationScenario) => {
    setSelectedScenarioId(scenario.id);
    setScenarioCampaignsPage(0);
  }, []);

  const handleAddCampaigns = useCallback(() => {
    if (selectedScenario) {
      dispatch(openAddCampaignsToScenarioModal(selectedScenario));
    }
  }, [selectedScenario, dispatch]);

  const handleViewCampaignResults = useCallback(() => {
    if (selectedScenarioId) {
      navigate(`/optimization-scenarios/${selectedScenarioId}/campaign-results`);
    }
  }, [selectedScenarioId, navigate]);

  const handleDeleteScenario = () => {
    if (selectedScenarioId) {
      deleteScenarioMutation.mutate(selectedScenarioId);
    }
  };

  const handleActivateScenario = () => {
    if (selectedScenarioId) {
      activateScenarioMutation.mutate(selectedScenarioId);
    }
  };

  const handleEditDefaultParameters = () => {
    if (selectedScenario) {
      setEditDefaultParametersData({
        cMin: selectedScenario.cMin,
        cMax: selectedScenario.cMax,
        nMin: selectedScenario.nMin,
        nMax: selectedScenario.nMax,
        bMin: selectedScenario.bMin,
        bMax: selectedScenario.bMax,
        mMin: selectedScenario.mMin,
        mMax: selectedScenario.mMax,
      });
      setEditingDefaultParameters(true);
    }
  };

  const handleSaveDefaultParameters = () => {
    if (selectedScenarioId) {
      updateDefaultParametersMutation.mutate({
        scenarioId: selectedScenarioId,
        updates: editDefaultParametersData,
      });
    }
  };

  const handleCancelEditDefaultParameters = () => {
    setEditingDefaultParameters(false);
    setEditDefaultParametersData({});
  };

  const handleRemoveCampaign = (campaignId: string, campaignName: string) => {
    setCampaignToDelete({ id: campaignId, name: campaignName });
    setDeleteConfirmOpen(true);
  };

  const confirmRemoveCampaign = () => {
    if (campaignToDelete) {
      removeCampaignMutation.mutate(campaignToDelete.id);
    }
  };

  // Normalize campaign data from API response (handles both old and new formats)
  const normalizeCampaign = (campaign: any) => ({
    id: campaign.id || campaign.campaignId,
    name: campaign.name || campaign.campaignName,
    type: campaign.type || campaign.campaignType,
    rMin: campaign.rMin ?? 0,
    rMax: campaign.rMax ?? 0,
    zK: campaign.zK ?? 0,
    cK: campaign.cK ?? 0,
    campaignId: campaign.campaignId || campaign.id,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  });

  // Paginated campaigns for scenario details
  const paginatedScenarioCampaigns = useMemo(() => {
    if (!selectedScenario?.campaigns) return [];
    const normalized = selectedScenario.campaigns.map(normalizeCampaign);
    const start = scenarioCampaignsPage * scenarioCampaignsPageSize;
    const end = start + scenarioCampaignsPageSize;
    return normalized.slice(start, end);
  }, [selectedScenario, scenarioCampaignsPage]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Left Column - Scenarios List */}
        <Grid item xs={12} md={5}>
          <Card sx={{ display: 'flex', flexDirection: 'column' }}>
            <CardHeader
              title="Optimization Scenarios"
              action={
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => dispatch(openCreateScenarioModal())}
                  size="small"
                  sx={{ whiteSpace: 'nowrap', fontSize: { xs: '0.7rem', sm: '0.8125rem' } }}
                >
                  CREATE SCENARIO
                </Button>
              }
              sx={{
                flexWrap: 'wrap',
                '& .MuiCardHeader-action': { mt: { xs: 1, sm: 0 }, alignSelf: 'center' },
                '& .MuiCardHeader-content': { minWidth: 0 },
                '& .MuiCardHeader-title': { fontSize: { xs: '1.1rem', md: '1.25rem', lg: '1.5rem' } },
              }}
            />
            <CardContent sx={{ flex: 1, overflow: 'auto' }}>
              {isLoadingScenarios ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 300 }}>
                      <TableHead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableCell key={header.id}>
                                {header.isPlaceholder
                                  ? null
                                  : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableHead>
                      <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                          <TableRow key="empty-state">
                            <TableCell colSpan={scenarioColumns.length} align="center" sx={{ py: 4 }}>
                              No scenarios found
                            </TableCell>
                          </TableRow>
                        ) : (
                          table.getRowModel().rows.map((row) => (
                            <TableRow
                              key={row.id}
                              onClick={() => handleScenarioSelect(row.original)}
                              sx={{
                                cursor: 'pointer',
                                backgroundColor:
                                  selectedScenarioId === row.original.id ? 'action.selected' : 'inherit',
                                '&:hover': { backgroundColor: 'action.hover' },
                              }}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={scenariosData?.pagination.total || 0}
                    page={page}
                    onPageChange={handleChangePageIndex}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangePageSize}
                    rowsPerPageOptions={[10, 25, 50]}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Scenario Details */}
        <Grid item xs={12} md={7}>
          {selectedScenarioId && selectedScenario ? (
            <Card sx={{ display: 'flex', flexDirection: 'column' }}>
              <CardHeader title={selectedScenario.name} />
              <CardContent sx={{ flex: 1, overflow: 'auto' }}>
                {isLoadingScenario ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Scenario Info */}
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>
                        Status
                      </Typography>
                      <Chip
                        label={selectedScenario.status}
                        color={
                          selectedScenario.status === 'RUNNING'
                            ? 'info'
                            : selectedScenario.status === 'READY'
                            ? 'default'
                            : selectedScenario.status === 'COMPLETED_SUCCESSFULLY'
                            ? 'success'
                            : 'error'
                        }
                      />
                      {selectedScenario.description && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">
                            Description
                          </Typography>
                          <Typography variant="body2">{selectedScenario.description}</Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Scenario Parameters */}
                    {selectedScenario && (
                      <Card>
                        <CardHeader
                          title="Scenario Parameters"
                          action={
                            selectedScenario.status === 'READY' && (
                              !editingDefaultParameters ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                  startIcon={<EditIcon />}
                                  onClick={handleEditDefaultParameters}
                                >
                                  Edit
                                </Button>
                              ) : null
                            )
                          }
                          sx={{
                            backgroundColor: '#e8f5e9',
                            pb: 1,
                            '& .MuiCardHeader-title': { fontSize: { xs: '1rem', sm: '1.25rem' } },
                          }}
                        />
                        <CardContent sx={{ overflowX: 'auto' }}>
                          {editingDefaultParameters ? (
                            <Grid container spacing={2}>
                              {/* C Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Number of CRM Campaigns
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      label="Min(cMin)"
                                      type="number"
                                      value={editDefaultParametersData.cMin ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          cMin: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Max(cMax)"
                                      type="number"
                                      value={editDefaultParametersData.cMax ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          cMax: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>

                              {/* N Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Number of Mass Campaigns
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      label="Min(nMin)"
                                      type="number"
                                      value={editDefaultParametersData.nMin ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          nMin: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Max(nMax)"
                                      type="number"
                                      value={editDefaultParametersData.nMax ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          nMax: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>

                              {/* B Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    Total Budget
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      label="Min(bMin)"
                                      type="number"
                                      value={editDefaultParametersData.bMin ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          bMin: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Max(bMax)"
                                      type="number"
                                      value={editDefaultParametersData.bMax ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          bMax: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>

                              {/* M Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, minHeight: 40 }}>
                                    Number of campaigns per customer
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <TextField
                                      size="small"
                                      label="Min(mMin)"
                                      type="number"
                                      value={editDefaultParametersData.mMin ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          mMin: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                    <TextField
                                      size="small"
                                      label="Max(mMax)"
                                      type="number"
                                      value={editDefaultParametersData.mMax ?? ''}
                                      onChange={(e) =>
                                        setEditDefaultParametersData({
                                          ...editDefaultParametersData,
                                          mMax: Number(e.target.value) || 0,
                                        })
                                      }
                                      fullWidth
                                      inputProps={{ min: 0 }}
                                    />
                                  </Box>
                                </Box>
                              </Grid>

                              {/* Action Buttons */}
                              <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={handleSaveDefaultParameters}
                                    disabled={updateDefaultParametersMutation.isPending}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleCancelEditDefaultParameters}
                                    disabled={updateDefaultParametersMutation.isPending}
                                  >
                                    Cancel
                                  </Button>
                                </Box>
                              </Grid>
                            </Grid>
                          ) : (
                            <Grid container spacing={2}>
                              {/* C Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Number of CRM Campaigns
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Min(cMin)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.cMin}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Max(cMax)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.cMax}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* N Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Number of Mass Campaigns
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Min(nMin)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.nMin}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Max(nMax)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.nMax}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* B Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Total Budget
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Min(bMin)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.bMin}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Max(bMax)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.bMax}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* M Parameter */}
                              <Grid item xs={6} sm={6} md={6} lg={3}>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, minHeight: 40, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                                    Number of campaigns per customer
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Min(mMin)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.mMin}</Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="textSecondary">
                                        Max(mMax)
                                      </Typography>
                                      <Typography variant="body2">{selectedScenario.mMax}</Typography>
                                    </Box>
                                  </Box>
                                </Box>
                              </Grid>
                            </Grid>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Add Campaigns Button */}
                    {selectedScenario.status === 'READY' && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddCampaigns}
                        fullWidth
                      >
                        ADD CAMPAIGNS
                      </Button>
                    )}

                    {/* View Scenario Results Button */}
                    {(selectedScenario.status === 'COMPLETED_SUCCESSFULLY' ||
                      selectedScenario.status === 'RUNNING') && (
                      <Button
                        variant="contained"
                        color="success"
                        onClick={handleViewCampaignResults}
                        fullWidth
                        disabled={selectedScenario.status === 'RUNNING'}
                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                      >
                        {selectedScenario.status === 'RUNNING'
                          ? 'CALCULATING RESULTS...'
                          : 'VIEW SCENARIO RESULTS'}
                      </Button>
                    )}

                    {/* Campaigns in Scenario */}
                    <Box>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Campaigns ({selectedScenario.campaigns.length})
                      </Typography>
                      {selectedScenario.campaigns.length === 0 ? (
                        <Alert severity="info">No campaigns added to this scenario yet</Alert>
                      ) : (
                        <>
                          <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 500, '& .MuiTableCell-root': { fontSize: { xs: '0.75rem', sm: '0.8125rem', md: '0.875rem' }, px: { xs: 1, sm: 1.5, md: 2 }, whiteSpace: 'nowrap' } }}>
                              <TableHead>
                                <TableRow key="header" sx={{ backgroundColor: '#f5f5f5' }}>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Type</TableCell>
                                  <TableCell align="right">rMin</TableCell>
                                  <TableCell align="right">rMax</TableCell>
                                  <TableCell align="right">zK</TableCell>
                                  <TableCell align="right">cK</TableCell>
                                  {selectedScenario.status === 'READY' && <TableCell align="right">Actions</TableCell>}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {paginatedScenarioCampaigns.map((campaign: any) => (
                                  <TableRow
                                    key={campaign.id}
                                    sx={{
                                      backgroundColor: editingCampaignId === campaign.id ? '#f9f9f9' : 'inherit',
                                      '&:hover': { backgroundColor: '#fafafa' }
                                    }}
                                  >
                                    {editingCampaignId === campaign.id ? (
                                      <>
                                        <TableCell>
                                          <TextField
                                            size="small"
                                            value={editFormData.name || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                            fullWidth
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Select
                                            size="small"
                                            value={editFormData.type || 'CRM'}
                                            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                                            fullWidth
                                          >
                                            <MenuItem value="CRM">CRM</MenuItem>
                                            <MenuItem value="MASS">MASS</MenuItem>
                                          </Select>
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editFormData.rMin || 0}
                                            onChange={(e) => setEditFormData({ ...editFormData, rMin: Number(e.target.value) })}
                                            inputProps={{ step: '0.1' }}
                                            sx={{ width: '110px' }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editFormData.rMax || 0}
                                            onChange={(e) => setEditFormData({ ...editFormData, rMax: Number(e.target.value) })}
                                            inputProps={{ step: '0.1' }}
                                            sx={{ width: '110px' }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editFormData.zK || 0}
                                            onChange={(e) => setEditFormData({ ...editFormData, zK: Number(e.target.value) })}
                                            inputProps={{ step: '0.1' }}
                                            sx={{ width: '110px' }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={editFormData.cK || 0}
                                            onChange={(e) => setEditFormData({ ...editFormData, cK: Number(e.target.value) })}
                                            inputProps={{ step: '0.1' }}
                                            sx={{ width: '110px' }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Button
                                            size="small"
                                            variant="contained"
                                            color="success"
                                            onClick={() => {
                                              // Map form fields to scenario-specific snapshot field names
                                              const snapshotUpdates = {
                                                campaignName: editFormData.name,
                                                campaignType: editFormData.type,
                                                rMin: editFormData.rMin,
                                                rMax: editFormData.rMax,
                                                zK: editFormData.zK,
                                                cK: editFormData.cK,
                                              };
                                              updateCampaignInScenarioMutation.mutate({
                                                scenarioId: selectedScenarioId!,
                                                campaignId: campaign.campaignId || campaign.id,
                                                updates: snapshotUpdates
                                              });
                                            }}
                                            disabled={updateCampaignInScenarioMutation.isPending}
                                            sx={{ mr: 1 }}
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => {
                                              setEditingCampaignId(null);
                                              setEditFormData({});
                                            }}
                                            disabled={updateCampaignInScenarioMutation.isPending}
                                          >
                                            Cancel
                                          </Button>
                                        </TableCell>
                                      </>
                                    ) : (
                                      <>
                                        <TableCell>{campaign.name}</TableCell>
                                        <TableCell>
                                          <Chip label={campaign.type} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{campaign.rMin}</TableCell>
                                        <TableCell align="right">{campaign.rMax}</TableCell>
                                        <TableCell align="right">
                                          <Tooltip title={String(campaign.zK)} arrow>
                                            <span>{typeof campaign.zK === 'number' && String(campaign.zK).length > 5 ? String(campaign.zK).slice(0, 5) + '...' : campaign.zK}</span>
                                          </Tooltip>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Tooltip title={String(campaign.cK)} arrow>
                                            <span>{typeof campaign.cK === 'number' && String(campaign.cK).length > 5 ? String(campaign.cK).slice(0, 5) + '...' : campaign.cK}</span>
                                          </Tooltip>
                                        </TableCell>
                                        {selectedScenario.status === 'READY' && (
                                          <TableCell align="right">
                                            <Tooltip title="Edit Campaign">
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => {
                                                  setEditingCampaignId(campaign.id);
                                                  setEditFormData(campaign);
                                                }}
                                              >
                                                <EditIcon />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove Campaign">
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() =>
                                                  handleRemoveCampaign(campaign.campaignId || campaign.id, campaign.name)
                                                }
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Tooltip>
                                          </TableCell>
                                        )}
                                      </>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          {selectedScenario.campaigns.length > scenarioCampaignsPageSize && (
                            <TablePagination
                              component="div"
                              count={selectedScenario.campaigns.length}
                              page={scenarioCampaignsPage}
                              onPageChange={(_e, newPage) => setScenarioCampaignsPage(newPage)}
                              rowsPerPage={scenarioCampaignsPageSize}
                              onRowsPerPageChange={() => {}}
                            />
                          )}
                        </>
                      )}
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                      {selectedScenario.status === 'READY' && (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={handleActivateScenario}
                            disabled={
                              activateScenarioMutation.isPending ||
                              selectedScenario.campaigns.length === 0
                            }
                            title={
                              selectedScenario.campaigns.length === 0
                                ? 'Add campaigns to run optimization'
                                : ''
                            }
                          >
                            Run Optimization
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDeleteScenario}
                            disabled={deleteScenarioMutation.isPending}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                      {selectedScenario.status === 'RUNNING' && (
                        <Button variant="contained" disabled>
                          Optimizing...
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="textSecondary">
                  Select a scenario to view details
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Modals */}
      <CreateOptimizationScenarioModal />
      <AddCampaignsToScenarioModal />

      {/* Delete Campaign Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Remove Campaign</DialogTitle>
        <DialogContent>
          Are you sure you want to remove <strong>{campaignToDelete?.name}</strong> from this scenario?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmRemoveCampaign}
            color="error"
            variant="contained"
            disabled={removeCampaignMutation.isPending}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OptimizationScenarios;
