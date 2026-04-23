import React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box,
  Grid,
  Typography,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeCreateCampaignModal, showNotification } from '../../store/uiSlice';
import { campaignService } from '../../services/campaignService';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  type: z.enum(['CRM', 'MASS']).optional().default('CRM'),
  rMin: z.number().min(0, 'Must be positive').optional().default(100),
  rMax: z.number().min(0, 'Must be positive').optional().default(5000),
  zK: z.number().min(0, 'Must be positive').optional().default(500),
  cK: z.number().min(0, 'Must be positive').optional().default(50),
});

type CreateCampaignFormData = z.infer<typeof createCampaignSchema>;

const CampaignCreateModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isCreateCampaignModalOpen } = useAppSelector((state) => state.ui);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      type: 'CRM',
      rMin: 100,
      rMax: 5000,
      zK: 500,
      cK: 50,
    },
  });

  const createMutation = useMutation({
    mutationFn: campaignService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      dispatch(showNotification({ message: 'Campaign created successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to create campaign',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    reset();
    dispatch(closeCreateCampaignModal());
  };

  const onSubmit = (data: CreateCampaignFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isCreateCampaignModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Basic Info */}
            <TextField
              {...register('name')}
              label="Campaign Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
            />
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.type}>
                  <InputLabel>Campaign Type</InputLabel>
                  <Select
                    {...field}
                    label="Campaign Type"
                  >
                    <MenuItem value="CRM">
                      CRM (Targeted to specific segments)
                    </MenuItem>
                    <MenuItem value="MASS">
                      MASS (Broadcast to all segments)
                    </MenuItem>
                  </Select>
                  {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                </FormControl>
              )}
            />

            {/* Campaign Parameters */}
            <Card sx={{ backgroundColor: '#f5f5f5' }}>
              <CardHeader
                title="Campaign Parameters"
                subheader="Per-campaign settings"
                sx={{ pb: 1 }}
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Group 1: Number of Customers per CRM Campaign */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#333' }}>
                      Number of customers per CRM campaign
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <TextField
                          {...register('rMin', { valueAsNumber: true })}
                          label="Recommendation Min"
                          type="number"
                          fullWidth
                          size="small"
                          error={!!errors.rMin}
                          helperText={errors.rMin?.message}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          {...register('rMax', { valueAsNumber: true })}
                          label="Recommendation Max"
                          type="number"
                          fullWidth
                          size="small"
                          error={!!errors.rMax}
                          helperText={errors.rMax?.message}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Group 2: Unit Contribution */}
                  <Box>
                    <TextField
                      {...register('zK', { valueAsNumber: true })}
                      label="Unit contribution per campaign (float)"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ step: '0.01' }}
                      error={!!errors.zK}
                      helperText={errors.zK?.message}
                    />
                  </Box>

                  {/* Group 3: Unit Cost */}
                  <Box>
                    <TextField
                      {...register('cK', { valueAsNumber: true })}
                      label="Unit cost per campaign (float)"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ step: '0.01' }}
                      error={!!errors.cK}
                      helperText={errors.cK?.message}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CampaignCreateModal;
