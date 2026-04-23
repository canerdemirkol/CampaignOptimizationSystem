import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeCampaignDetailModal } from '../../store/uiSlice';
import { campaignService } from '../../services/campaignService';

// Section 7.3.3 - Campaign Detail Modal (READ-ONLY)
const CampaignDetailModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isCampaignDetailModalOpen, selectedCampaign } = useAppSelector((state) => state.ui);

  const { data: campaignDetails, isLoading } = useQuery({
    queryKey: ['campaign', selectedCampaign?.id],
    queryFn: () => campaignService.getByIdWithDetails(selectedCampaign!.id),
    enabled: !!selectedCampaign?.id && isCampaignDetailModalOpen,
    staleTime: 1000 * 60 * 5, // 5 minutes - prevents refetch immediately
    gcTime: 1000 * 60 * 10, // 10 minutes - keep data in cache longer
  });

  const handleClose = () => {
    // Cancel any pending queries when closing modal
    if (selectedCampaign?.id) {
      queryClient.cancelQueries({
        queryKey: ['campaign', selectedCampaign.id]
      });
    }
    dispatch(closeCampaignDetailModal());
  };

  return (
    <Dialog open={isCampaignDetailModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Campaign Details</DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : campaignDetails ? (
          <Box>
            {/* Campaign Basic Info */}
            <Typography variant="h6" gutterBottom>
              Campaign Information
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1">{campaignDetails.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Type
                </Typography>
                <Chip
                  label={campaignDetails.type || 'N/A'}
                  color={campaignDetails.type === 'CRM' ? 'primary' : 'warning'}
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Typography>No campaign selected</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignDetailModal;
