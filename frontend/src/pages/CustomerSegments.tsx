import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/uiSlice';
import { customerSegmentService } from '../services/customerSegmentService';
import { incomeLevelService } from '../services/incomeLevelService';
import { CustomerSegment } from '../types';

const segmentSchema = z.object({
  name: z.string().min(1, 'Segment name is required'),
  description: z.string().optional(),
  customerCount: z.number().min(1, 'At least 1 customer is required'),
  lifetimeValue: z.number().min(0, 'Must be 0 or higher'),
  incomeLevel: z.string().optional(),
});

type SegmentFormData = z.infer<typeof segmentSchema>;

const CustomerSegments: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [editingSegment, setEditingSegment] = useState<CustomerSegment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: segmentsPage, isLoading } = useQuery({
    queryKey: ['customerSegments', page, rowsPerPage],
    queryFn: () => customerSegmentService.findAll(page + 1, rowsPerPage),
  });

  const segments = segmentsPage?.data ?? [];
  const totalSegments = segmentsPage?.total ?? 0;

  const { data: totalCustomers = 0 } = useQuery({
    queryKey: ['customerSegmentsTotalCount'],
    queryFn: () => customerSegmentService.getTotalCount(),
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Fetch income levels dynamically
  const { data: incomeLevels = [] } = useQuery({
    queryKey: ['incomeLevels'],
    queryFn: () => incomeLevelService.getAll(),
  });

  const form = useForm<SegmentFormData>({
    resolver: zodResolver(segmentSchema),
    defaultValues: {
      name: '', description: '', customerCount: 1000,
      lifetimeValue: 5000, incomeLevel: '',
    },
  });

  // Watch incomeLevel to update Select component
  const incomeLevelValue = form.watch('incomeLevel');

  const createMutation = useMutation({
    mutationFn: (data: SegmentFormData) => customerSegmentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegments'] });
      queryClient.invalidateQueries({ queryKey: ['customerSegmentsTotalCount'] });
      dispatch(showNotification({ message: 'Segment created', severity: 'success' }));
      handleCloseDialog();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to create',
        severity: 'error',
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SegmentFormData }) =>
      customerSegmentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegments'] });
      queryClient.invalidateQueries({ queryKey: ['customerSegmentsTotalCount'] });
      dispatch(showNotification({ message: 'Segment updated', severity: 'success' }));
      handleCloseDialog();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update',
        severity: 'error',
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerSegmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerSegments'] });
      queryClient.invalidateQueries({ queryKey: ['customerSegmentsTotalCount'] });
      dispatch(showNotification({ message: 'Segment deleted', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to delete',
        severity: 'error',
      }));
    },
  });

  const handleOpenCreate = () => {
    setEditingSegment(null);
    form.reset({
      name: '', description: '', customerCount: 1000,
      lifetimeValue: 5000, incomeLevel: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (segment: CustomerSegment) => {
    setEditingSegment(segment);
    const incomeLevelValue =
      typeof segment.incomeLevel === 'string'
        ? segment.incomeLevel
        : segment.incomeLevel?.name || '';
    form.reset({
      name: segment.name,
      description: segment.description || '',
      customerCount: segment.customerCount,
      lifetimeValue: segment.lifetimeValue,
      incomeLevel: incomeLevelValue,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSegment(null);
    form.reset();
  };

  const handleSubmit = (data: SegmentFormData) => {
    if (editingSegment) {
      updateMutation.mutate({ id: editingSegment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Customer Segments</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Segment
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Total Customer Count (M): <strong>{totalCustomers.toLocaleString()}</strong> — This value is used in the optimization calculation.
      </Alert>

      {/* Segments Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Segment Name</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell align="right"><strong>Customer Count</strong></TableCell>
              <TableCell align="right"><strong>LTV</strong></TableCell>
              <TableCell><strong>Income Level</strong></TableCell>
              <TableCell align="center"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {segments.length > 0 ? (
              segments.map((segment) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <Chip label={segment.name} color="primary" variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>{segment.description || '-'}</TableCell>
                  <TableCell align="right">{segment.customerCount.toLocaleString()}</TableCell>
                  <TableCell align="right">{segment.lifetimeValue.toLocaleString()}</TableCell>
                  <TableCell>
                    {typeof segment.incomeLevel === 'string'
                      ? segment.incomeLevel || '-'
                      : segment.incomeLevel?.displayName || '-'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenEdit(segment)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => deleteMutation.mutate(segment.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No segments defined yet. You can create a new segment using the "Add Segment" button.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalSegments}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSegment ? 'Edit Segment' : 'Add New Segment'}</DialogTitle>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  {...form.register('name')}
                  label="Segment Name"
                  fullWidth
                  error={!!form.formState.errors.name}
                  helperText={form.formState.errors.name?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  {...form.register('description')}
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  {...form.register('customerCount', { valueAsNumber: true })}
                  label="Customer Count"
                  type="number"
                  fullWidth
                  error={!!form.formState.errors.customerCount}
                  helperText={form.formState.errors.customerCount?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  {...form.register('lifetimeValue', { valueAsNumber: true })}
                  label="Lifetime Value (LTV)"
                  type="number"
                  fullWidth
                  error={!!form.formState.errors.lifetimeValue}
                  helperText={form.formState.errors.lifetimeValue?.message}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Income Level</InputLabel>
                  <Select
                    label="Income Level"
                    value={incomeLevelValue || ''}
                    onChange={(e) => form.setValue('incomeLevel', e.target.value as any)}
                  >
                    <MenuItem value="">
                      <em>Not selected</em>
                    </MenuItem>
                    {incomeLevels.map((level) => (
                      <MenuItem key={level.name} value={level.name}>
                        {level.displayName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? <CircularProgress size={24} />
                : editingSegment ? 'Update' : 'Create'
              }
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CustomerSegments;
