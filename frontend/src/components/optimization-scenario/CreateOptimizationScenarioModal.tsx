import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Box,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeCreateScenarioModal, showNotification } from '../../store/uiSlice';
import { optimizationScenarioService } from '../../services/optimizationScenarioService';

const createScenarioSchema = z.object({
  name: z.string().min(1, 'Scenario name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

type CreateScenarioFormData = z.infer<typeof createScenarioSchema>;

const CreateOptimizationScenarioModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isCreateScenarioModalOpen } = useAppSelector((state) => state.ui);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateScenarioFormData>({
    resolver: zodResolver(createScenarioSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: optimizationScenarioService.createScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
      dispatch(showNotification({ message: 'Scenario created successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to create scenario',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    reset();
    dispatch(closeCreateScenarioModal());
  };

  const onSubmit = (data: CreateScenarioFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isCreateScenarioModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Optimization Scenario</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              {...register('name')}
              label="Scenario Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
              placeholder="e.g., Q1 2024 Campaign Scenario"
            />
            <TextField
              {...register('description')}
              label="Description"
              fullWidth
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message}
              placeholder="Optional: Add details about this scenario"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create Scenario'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateOptimizationScenarioModal;
