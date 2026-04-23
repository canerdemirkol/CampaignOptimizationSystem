import React, { useState, useEffect } from 'react';
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
  MenuItem,
} from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/uiSlice';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types';

// Section 7.4 - General Parameters Form
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

const Parameters: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const { data: campaignsData, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.getAll(),
  });

  const { data: campaignDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['campaign', selectedCampaignId],
    queryFn: () => campaignService.getByIdWithDetails(selectedCampaignId),
    enabled: !!selectedCampaignId,
  });

  // General Parameters Form (campaign-specific)
  const generalForm = useForm<GeneralParametersFormData>({
    resolver: zodResolver(generalParametersSchema),
    defaultValues: { cMin: 1, cMax: 10, nMin: 1, nMax: 5, bMin: 100, bMax: 10000, mMin: 0, mMax: 3 },
  });

  useEffect(() => {
    if (campaignDetails?.generalParameters) {
      generalForm.reset({
        cMin: campaignDetails.generalParameters.cMin,
        cMax: campaignDetails.generalParameters.cMax,
        nMin: campaignDetails.generalParameters.nMin,
        nMax: campaignDetails.generalParameters.nMax,
        bMin: campaignDetails.generalParameters.bMin,
        bMax: campaignDetails.generalParameters.bMax,
        mMin: campaignDetails.generalParameters.mMin,
        mMax: campaignDetails.generalParameters.mMax,
      });
    }
  }, [campaignDetails, generalForm]);

  // Mutations
  const createGeneralParamsMutation = useMutation({
    mutationFn: (data: GeneralParametersFormData) =>
      campaignService.createGeneralParameters(selectedCampaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', selectedCampaignId] });
      dispatch(showNotification({ message: 'Genel parametreler kaydedildi', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Kaydetme başarısız',
        severity: 'error',
      }));
    },
  });

  const updateGeneralParamsMutation = useMutation({
    mutationFn: (data: GeneralParametersFormData) =>
      campaignService.updateGeneralParameters(selectedCampaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign', selectedCampaignId] });
      dispatch(showNotification({ message: 'Genel parametreler güncellendi', severity: 'success' }));
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Güncelleme başarısız',
        severity: 'error',
      }));
    },
  });

  const handleSaveGeneralParams = (data: GeneralParametersFormData) => {
    if (campaignDetails?.generalParameters) {
      updateGeneralParamsMutation.mutate(data);
    } else {
      createGeneralParamsMutation.mutate(data);
    }
  };

  if (isLoadingCampaigns) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Campaign Parameters
      </Typography>

      {/* Campaign Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          select
          label="Kampanya Seçin"
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">-- Kampanya Seçin --</MenuItem>
          {campaignsData?.map((campaign: Campaign) => (
            <MenuItem key={campaign.id} value={campaign.id}>
              {campaign.name} 
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {selectedCampaignId && (
        <>
          {isLoadingDetails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Campaign General Parameters (override per campaign) */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Genel Parametreler (Bu Kampanya)
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Bu değişiklikler sadece seçili kampanya için geçerlidir. Varsayılan değerleri etkilemez.
                </Alert>
                <form onSubmit={generalForm.handleSubmit(handleSaveGeneralParams)}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('cMin', { valueAsNumber: true })} label="cMin (Min Kampanya)" type="number" fullWidth error={!!generalForm.formState.errors.cMin} helperText={generalForm.formState.errors.cMin?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('cMax', { valueAsNumber: true })} label="cMax (Max Kampanya)" type="number" fullWidth error={!!generalForm.formState.errors.cMax} helperText={generalForm.formState.errors.cMax?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('nMin', { valueAsNumber: true })} label="nMin (Min Kampanya/Müşteri)" type="number" fullWidth error={!!generalForm.formState.errors.nMin} helperText={generalForm.formState.errors.nMin?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('nMax', { valueAsNumber: true })} label="nMax (Max Kampanya/Müşteri)" type="number" fullWidth error={!!generalForm.formState.errors.nMax} helperText={generalForm.formState.errors.nMax?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('bMin', { valueAsNumber: true })} label="bMin (Min Bütçe/Müşteri)" type="number" fullWidth error={!!generalForm.formState.errors.bMin} helperText={generalForm.formState.errors.bMin?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('bMax', { valueAsNumber: true })} label="bMax (Max Bütçe/Müşteri)" type="number" fullWidth error={!!generalForm.formState.errors.bMax} helperText={generalForm.formState.errors.bMax?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('mMin', { valueAsNumber: true })} label="mMin (Min Mass Kampanya)" type="number" fullWidth error={!!generalForm.formState.errors.mMin} helperText={generalForm.formState.errors.mMin?.message} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField {...generalForm.register('mMax', { valueAsNumber: true })} label="mMax (Max Mass Kampanya)" type="number" fullWidth error={!!generalForm.formState.errors.mMax} helperText={generalForm.formState.errors.mMax?.message} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={createGeneralParamsMutation.isPending || updateGeneralParamsMutation.isPending}
                      >
                        {(createGeneralParamsMutation.isPending || updateGeneralParamsMutation.isPending)
                          ? <CircularProgress size={24} />
                          : campaignDetails?.generalParameters ? 'Güncelle' : 'Kaydet'
                        }
                      </Button>
                    </Grid>
                  </Grid>
                </form>
              </Paper>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default Parameters;
