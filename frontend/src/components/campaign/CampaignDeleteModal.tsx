import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeDeleteCampaignModal, showNotification } from '../../store/uiSlice';
import { campaignService } from '../../services/campaignService';

const CampaignDeleteModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isDeleteCampaignModalOpen, selectedCampaign } = useAppSelector((state) => state.ui);

  const deleteMutation = useMutation({
    mutationFn: () => campaignService.delete(selectedCampaign!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      dispatch(showNotification({ message: 'Campaign deleted successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to delete campaign',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    dispatch(closeDeleteCampaignModal());
  };

  const handleDelete = () => {
    if (selectedCampaign) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={isDeleteCampaignModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Campaign</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography>
            Are you sure you want to delete the campaign "{selectedCampaign?.name}"?
            This action cannot be undone.
          </Typography>
          <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Campaign Information:
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body2">{selectedCampaign?.name}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Chip
                  label={selectedCampaign?.type || 'N/A'}
                  color={selectedCampaign?.type === 'CRM' ? 'primary' : 'warning'}
                  size="small"
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? <CircularProgress size={24} /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignDeleteModal;
