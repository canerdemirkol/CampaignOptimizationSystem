import React, { useEffect } from 'react';
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
  Alert,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/uiSlice';
import { campaignService } from '../services/campaignService';

const generalParametersSchema = z.object({
  cMin: z.number().min(0, 'Must be >= 0'),
  cMax: z.number().min(0, 'Must be >= 0'),
  nMin: z.number().min(0, 'Must be >= 0'),
  nMax: z.number().min(0, 'Must be >= 0'),
  bMin: z.number().min(0, 'Must be >= 0'),
  bMax: z.number().min(0, 'Must be >= 0'),
  mMin: z.number().min(0, 'Must be >= 0'),
  mMax: z.number().min(0, 'Must be >= 0'),
});

type GeneralParametersFormData = z.infer<typeof generalParametersSchema>;

const DefaultParameters: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const { data: defaults, isLoading } = useQuery({
    queryKey: ['defaultGeneralParameters'],
    queryFn: () => campaignService.getDefaultGeneralParameters(),
  });

  const form = useForm<GeneralParametersFormData>({
    resolver: zodResolver(generalParametersSchema),
    defaultValues: { cMin: 1, cMax: 10, nMin: 1, nMax: 5, bMin: 100, bMax: 10000, mMin: 0, mMax: 3 },
  });

  useEffect(() => {
    if (defaults) {
      form.reset({
        cMin: defaults.cMin, cMax: defaults.cMax,
        nMin: defaults.nMin, nMax: defaults.nMax,
        bMin: defaults.bMin, bMax: defaults.bMax,
        mMin: defaults.mMin, mMax: defaults.mMax,
      });
    }
  }, [defaults, form]);

  const updateMutation = useMutation({
    mutationFn: (data: GeneralParametersFormData) => campaignService.updateDefaultGeneralParameters(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defaultGeneralParameters'] });
      dispatch(showNotification({ message: 'Default general parameters updated', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update',
        severity: 'error',
      }));
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Scenario Settings
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          These values are automatically copied when a new scenario is created. 
        </Alert>

        <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
          <Grid container spacing={2}>
            {/* Number of CRM Campaigns Group */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#666' }}>
                  Number of CRM Campaigns
                </Typography>
                <TextField
                  {...form.register('cMin', { valueAsNumber: true })}
                  label="Min (cMin)"
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  error={!!form.formState.errors.cMin}
                  helperText={form.formState.errors.cMin?.message}
                />
                <TextField
                  {...form.register('cMax', { valueAsNumber: true })}
                  label="Max (cMax)"
                  type="number"
                  fullWidth
                  size="small"
                  error={!!form.formState.errors.cMax}
                  helperText={form.formState.errors.cMax?.message}
                />
              </Box>
            </Grid>

            {/* Number of Mass Campaigns Group */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#666' }}>
                  Number of Mass Campaigns
                </Typography>
                <TextField
                  {...form.register('nMin', { valueAsNumber: true })}
                  label="Min (nMin)"
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  error={!!form.formState.errors.nMin}
                  helperText={form.formState.errors.nMin?.message}
                />
                <TextField
                  {...form.register('nMax', { valueAsNumber: true })}
                  label="Max (nMax)"
                  type="number"
                  fullWidth
                  size="small"
                  error={!!form.formState.errors.nMax}
                  helperText={form.formState.errors.nMax?.message}
                />
              </Box>
            </Grid>

            {/* Total Budget Group */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#666' }}>
                  Total Budget
                </Typography>
                <TextField
                  {...form.register('bMin', { valueAsNumber: true })}
                  label="Min (bMin)"
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  error={!!form.formState.errors.bMin}
                  helperText={form.formState.errors.bMin?.message}
                />
                <TextField
                  {...form.register('bMax', { valueAsNumber: true })}
                  label="Max (bMax)"
                  type="number"
                  fullWidth
                  size="small"
                  error={!!form.formState.errors.bMax}
                  helperText={form.formState.errors.bMax?.message}
                />
              </Box>
            </Grid>

            {/* Number of campaigns per customer Group */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: '#666' }}>
                  Number of campaigns per customer
                </Typography>
                <TextField
                  {...form.register('mMin', { valueAsNumber: true })}
                  label="Min (mMin)"
                  type="number"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  error={!!form.formState.errors.mMin}
                  helperText={form.formState.errors.mMin?.message}
                />
                <TextField
                  {...form.register('mMax', { valueAsNumber: true })}
                  label="Max (mMax)"
                  type="number"
                  fullWidth
                  size="small"
                  error={!!form.formState.errors.mMax}
                  helperText={form.formState.errors.mMax?.message}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <CircularProgress size={24} /> : 'Save Defaults'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default DefaultParameters;
