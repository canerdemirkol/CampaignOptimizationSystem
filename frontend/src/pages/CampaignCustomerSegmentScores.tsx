import React, { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/uiSlice';
import { campaignCustomerSegmentScoreService } from '../services/campaignCustomerSegmentScoreService';
import { campaignService } from '../services/campaignService';
import { customerSegmentService } from '../services/customerSegmentService';
import { CampaignCustomerSegmentScore } from '../types';

const scoreSchema = z.object({
  campaignId: z.string().min(1, 'Campaign selection is required'),
  customerSegmentId: z.string().min(1, 'Segment selection is required'),
  score: z.number().min(0).max(1, 'Score must be between 0-1'),
});

type ScoreFormData = z.infer<typeof scoreSchema>;

const columnHelper = createColumnHelper<CampaignCustomerSegmentScore>();

const CampaignCustomerSegmentScores: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [editingScore, setEditingScore] = useState<CampaignCustomerSegmentScore | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCampaignId, setFilterCampaignId] = useState<string>('');
  const [showData, setShowData] = useState(false); // Grid is empty on initial load
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading, isError: campaignsError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.getAll(),
    retry: 1,
  });

  // Fetch segments
  const { data: segments = [], isLoading: segmentsLoading, isError: segmentsError } = useQuery({
    queryKey: ['customerSegments'],
    queryFn: () => customerSegmentService.getAll(),
    retry: 1,
  });

  // Fetch scores (server-side paginated)
  const { data: scoresPage, isLoading: scoresLoading, isError: scoresError } = useQuery({
    queryKey: ['campaignCustomerSegmentScores', filterCampaignId, page, rowsPerPage],
    queryFn: () =>
      campaignCustomerSegmentScoreService.getScoresForCampaign(
        filterCampaignId,
        page + 1,
        rowsPerPage,
      ),
    enabled: showData && !!filterCampaignId, // Query stops if "--" is selected
    retry: 1,
  });

  // Grid remains empty if "--" is selected, shows data if campaign is selected
  const scores = useMemo(() => {
    if (!showData) return [];
    return scoresPage?.data ?? [];
  }, [showData, scoresPage]);

  const totalScores = showData ? scoresPage?.total ?? 0 : 0;

  const form = useForm<ScoreFormData>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      campaignId: '',
      customerSegmentId: '',
      score: 0.5,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ScoreFormData) => campaignCustomerSegmentScoreService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignCustomerSegmentScores'] });
      dispatch(
        showNotification({ message: 'Score created', severity: 'success' }),
      );
      handleCloseDialog();
    },
    onError: (error: any) => {
      dispatch(
        showNotification({
          message: error.response?.data?.message || 'Failed to create',
          severity: 'error',
        }),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { score: number } }) =>
      campaignCustomerSegmentScoreService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignCustomerSegmentScores'] });
      dispatch(showNotification({ message: 'Score updated', severity: 'success' }));
      handleCloseDialog();
    },
    onError: (error: any) => {
      dispatch(
        showNotification({
          message: error.response?.data?.message || 'Failed to update',
          severity: 'error',
        }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignCustomerSegmentScoreService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignCustomerSegmentScores'] });
      dispatch(showNotification({ message: 'Score deleted', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(
        showNotification({
          message: error.response?.data?.message || 'Failed to delete',
          severity: 'error',
        }),
      );
    },
  });

  const handleOpenDialog = (score?: CampaignCustomerSegmentScore) => {
    if (score) {
      setEditingScore(score);
      form.reset({
        campaignId: score.campaignId,
        customerSegmentId: score.customerSegmentId,
        score: score.score,
      });
    } else {
      setEditingScore(null);
      form.reset({ campaignId: '', customerSegmentId: '', score: 0.5 });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingScore(null);
    form.reset();
  };

  const onSubmit = (data: ScoreFormData) => {
    if (editingScore) {
      updateMutation.mutate({ id: editingScore.id, data: { score: data.score } });
    } else {
      createMutation.mutate(data);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('campaignId', {
        header: 'Campaign',
        cell: (info) => campaigns.find((c) => c.id === info.getValue())?.name || info.getValue(),
        size: 150,
      }),
      columnHelper.accessor('customerSegmentId', {
        header: 'Segment',
        cell: (info) => segments.find((s) => s.id === info.getValue())?.name || info.getValue(),
        size: 150,
      }),
      columnHelper.accessor('score', {
        header: 'Score',
        cell: (info) => info.getValue().toFixed(2),
        size: 100,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        size: 80,
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                color="primary"
                onClick={() => handleOpenDialog(row.original)}
                sx={{ p: 0.5 }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => deleteMutation.mutate(row.original.id)}
                disabled={deleteMutation.isPending}
                sx={{ p: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }),
    ],
    [campaigns, segments, deleteMutation]
  );

  const table = useReactTable({
    data: scores,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalScores / rowsPerPage),
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isLoading = campaignsLoading || segmentsLoading || scoresLoading;

  React.useEffect(() => {
    if (campaignsError) {
      dispatch(
        showNotification({
          message: 'Error loading campaigns. Make sure the Backend API is running.',
          severity: 'error',
        }),
      );
    }
    if (segmentsError) {
      dispatch(
        showNotification({
          message: 'Error loading segments.',
          severity: 'error',
        }),
      );
    }
    if (scoresError) {
      dispatch(
        showNotification({
          message: 'Error loading scores.',
          severity: 'error',
        }),
      );
    }
  }, [campaignsError, segmentsError, scoresError, dispatch]);

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Campaign-Segment Score Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              New Score
            </Button>
          </Box>
        </Grid>

        {/* Filter Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            {campaignsError ? (
              <Alert severity="error">Error loading campaigns</Alert>
            ) : (
              <Autocomplete
                fullWidth
                size="small"
                disabled={campaignsLoading}
                options={campaigns}
                getOptionLabel={(option) => option.name}
                value={campaigns.find((c) => c.id === filterCampaignId) || null}
                onChange={(_, newValue) => {
                  const value = newValue?.id || '';
                  setFilterCampaignId(value);
                  setShowData(value !== '');
                  setPage(0);
                }}
                loading={campaignsLoading}
                clearOnEscape
                renderInput={(params) => (
                  <TextField {...params} label="Filter Campaign" placeholder="Search by campaign name..." />
                )}
                noOptionsText="No campaigns found"
              />
            )}
          </Paper>
        </Grid>

        {/* Table Section */}
        <Grid item xs={12}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableCell
                            key={header.id}
                            sx={{
                              fontWeight: 'bold',
                              backgroundColor: '#f5f5f5',
                              padding: '8px',
                              width: header.getSize(),
                            }}
                            align={header.id === 'actions' ? 'right' : 'left'}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableHead>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} hover>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            sx={{
                              padding: '8px',
                              width: cell.column.columnDef.size,
                            }}
                            align={cell.column.id === 'actions' ? 'right' : 'left'}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {table.getRowModel().rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={columns.length} align="center" sx={{ py: 2 }}>
                          <Typography color="textSecondary">No data found</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={totalScores}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{editingScore ? 'Edit Score' : 'New Score'}</span>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="campaignId"
              control={form.control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <Autocomplete
                    fullWidth
                    size="small"
                    disabled={!!editingScore || campaignsLoading || campaignsError}
                    options={campaigns}
                    getOptionLabel={(option) => option.name}
                    value={campaigns.find((c) => c.id === field.value) || null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id || '');
                    }}
                    loading={campaignsLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Campaign"
                        placeholder="Search by campaign name..."
                        error={!!error || !!campaignsError}
                        helperText={campaignsError ? 'Error loading campaigns' : error?.message}
                      />
                    )}
                    noOptionsText="No campaigns found"
                  />
                </div>
              )}
            />

            <Controller
              name="customerSegmentId"
              control={form.control}
              render={({ field, fieldState: { error } }) => (
                <div>
                  <Autocomplete
                    fullWidth
                    size="small"
                    disabled={!!editingScore || segmentsLoading || segmentsError}
                    options={segments}
                    getOptionLabel={(option) => option.name}
                    value={segments.find((s) => s.id === field.value) || null}
                    onChange={(_, newValue) => {
                      field.onChange(newValue?.id || '');
                    }}
                    loading={segmentsLoading}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Segment"
                        placeholder="Search by segment name..."
                        error={!!error || !!segmentsError}
                        helperText={segmentsError ? 'Error loading segments' : error?.message}
                      />
                    )}
                    noOptionsText="No segments found"
                  />
                </div>
              )}
            />

            <Controller
              name="score"
              control={form.control}
              render={({ field: { value, onChange }, fieldState: { error } }) => (
                <TextField
                  label="Score (0-1)"
                  type="number"
                  value={value}
                  onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  error={!!error}
                  helperText={error?.message}
                  fullWidth
                />
              )}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <CircularProgress size={24} />
              ) : editingScore ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CampaignCustomerSegmentScores;
