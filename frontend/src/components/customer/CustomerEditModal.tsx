import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  CircularProgress,
  MenuItem,
  Box,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeEditCustomerModal, showNotification } from '../../store/uiSlice';
import { customerService } from '../../services/customerService';
import { incomeLevelService } from '../../services/incomeLevelService';

const updateCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  age: z.number().min(0).max(120).optional().nullable(),
  gender: z.string().optional(),
  segment: z.string().optional(),
  churnScore: z.number().min(0).max(1).optional().nullable(),
  lifetimeValue: z.number().min(0).optional().nullable(),
  incomeLevel: z.string().optional(),
});

type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;

const CustomerEditModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isEditCustomerModalOpen, selectedCustomerId } = useAppSelector((state) => state.ui);

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => customerService.getById(selectedCustomerId!),
    enabled: !!selectedCustomerId && isEditCustomerModalOpen,
  });

  // Fetch income levels dynamically
  const { data: incomeLevels = [] } = useQuery({
    queryKey: ['incomeLevels'],
    queryFn: () => incomeLevelService.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateCustomerFormData>({
    resolver: zodResolver(updateCustomerSchema),
  });

  // Watch income level to update Select component
  const incomeLevelValue = watch('incomeLevel');

  // Reset form when customer data loads
  useEffect(() => {
    if (customer) {
      const incomeLevelValue = typeof customer.incomeLevel === 'string'
        ? customer.incomeLevel
        : customer.incomeLevel?.name || '';
      reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone || '',
        age: customer.age || null,
        gender: customer.gender || '',
        segment: customer.segment || '',
        churnScore: customer.churnScore || null,
        lifetimeValue: customer.lifetimeValue || null,
        incomeLevel: incomeLevelValue,
      });
    }
  }, [customer, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCustomerFormData) => {
      const { age, churnScore, lifetimeValue, ...rest } = data;
      return customerService.update(selectedCustomerId!, {
        ...rest,
        age: age === null ? undefined : age,
        churnScore: churnScore === null ? undefined : churnScore,
        lifetimeValue: lifetimeValue === null ? undefined : lifetimeValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      dispatch(showNotification({ message: 'Customer updated successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update customer',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    reset();
    dispatch(closeEditCustomerModal());
  };

  const onSubmit = (data: UpdateCustomerFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={isEditCustomerModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      {isLoadingCustomer ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('firstName')}
                  label="First Name"
                  fullWidth
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('lastName')}
                  label="Last Name"
                  fullWidth
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('email')}
                  label="Email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('phone')}
                  label="Phone"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('age', { valueAsNumber: true })}
                  label="Age"
                  type="number"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('gender')}
                  label="Gender"
                  select
                  fullWidth
                  defaultValue={customer?.gender || ''}
                >
                  <MenuItem value="">-</MenuItem>
                  <MenuItem value="M">Male</MenuItem>
                  <MenuItem value="F">Female</MenuItem>
                  <MenuItem value="O">Other</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('segment')}
                  label="Segment"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('churnScore', { valueAsNumber: true })}
                  label="Churn Score (0-1)"
                  type="number"
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('lifetimeValue', { valueAsNumber: true })}
                  label="Lifetime Value"
                  type="number"
                  inputProps={{ step: 0.01, min: 0 }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  {...register('incomeLevel')}
                  label="Income Level"
                  select
                  fullWidth
                  value={incomeLevelValue || ''}
                  onChange={(e) => setValue('incomeLevel', e.target.value as any)}
                >
                  <MenuItem value="">-</MenuItem>
                  {incomeLevels.map((level) => (
                    <MenuItem key={level.name} value={level.name}>
                      {level.displayName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
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
      )}
    </Dialog>
  );
};

export default CustomerEditModal;
