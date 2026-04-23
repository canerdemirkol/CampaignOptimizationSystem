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
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeDeleteCustomerModal, showNotification } from '../../store/uiSlice';
import { customerService } from '../../services/customerService';

const CustomerDeleteModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isDeleteCustomerModalOpen, selectedCustomerId } = useAppSelector((state) => state.ui);

  const deleteMutation = useMutation({
    mutationFn: () => customerService.delete(selectedCustomerId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      dispatch(showNotification({ message: 'Customer deleted successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to delete customer',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    dispatch(closeDeleteCustomerModal());
  };

  const handleDelete = () => {
    if (selectedCustomerId) {
      deleteMutation.mutate();
    }
  };

  return (
    <Dialog open={isDeleteCustomerModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Customer</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete this customer? This action cannot be undone.
        </Typography>
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

export default CustomerDeleteModal;
