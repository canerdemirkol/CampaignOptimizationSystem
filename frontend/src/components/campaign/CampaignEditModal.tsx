import React, { useEffect } from 'react';
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
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeEditCampaignModal, showNotification } from '../../store/uiSlice';
import { campaignService } from '../../services/campaignService';

const editCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Name too long'),
  type: z.enum(['CRM', 'MASS']).optional(),
  rMin: z.number().min(0, 'Must be positive').optional(),
  rMax: z.number().min(0, 'Must be positive').optional(),
  zK: z.number().min(0, 'Must be positive').optional(),
  cK: z.number().min(0, 'Must be positive').optional(),
});

type EditCampaignFormData = z.infer<typeof editCampaignSchema>;

const CampaignEditModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isEditCampaignModalOpen, editingCampaign } = useAppSelector((state) => state.ui);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<EditCampaignFormData>({
    resolver: zodResolver(editCampaignSchema),
  });

  // Pre-fill form with existing campaign data
  useEffect(() => {
    if (editingCampaign && isEditCampaignModalOpen) {
      setValue('name', editingCampaign.name);
      setValue('type', editingCampaign.type);
      setValue('rMin', editingCampaign.rMin);
      setValue('rMax', editingCampaign.rMax);
      setValue('zK', editingCampaign.zK);
      setValue('cK', editingCampaign.cK);
    }
  }, [editingCampaign, isEditCampaignModalOpen, setValue]);

  const updateMutation = useMutation({
    mutationFn: (data: EditCampaignFormData) =>
      campaignService.update(editingCampaign!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      dispatch(showNotification({ message: 'Campaign updated successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update campaign',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    reset();
    dispatch(closeEditCampaignModal());
  };

  const onSubmit = (data: EditCampaignFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={isEditCampaignModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Edit Campaign</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              {...register('name')}
              label="Campaign Name"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              autoFocus
            />

            {/* Campaign Type Field */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>Campaign Type</InputLabel>
                  <Select
                    {...field}
                    label="Campaign Type"
                    value={field.value || ''}
                    error={!!errors.type}
                  >
                    <MenuItem value="CRM">CRM (Targeted)</MenuItem>
                    <MenuItem value="MASS">MASS (Broadcast)</MenuItem>
                  </Select>
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
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CampaignEditModal;
