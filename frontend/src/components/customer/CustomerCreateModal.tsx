import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeCreateCustomerModal, showNotification } from '../../store/uiSlice';
import { customerService } from '../../services/customerService';
import { incomeLevelService } from '../../services/incomeLevelService';

// Dynamic schema that will be created based on loaded income levels
const createCustomerSchemaBase = {
  customerNo: z.string().min(1, 'Customer number is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  age: z.number().min(0).max(120).optional(),
  gender: z.string().optional(),
  segment: z.string().optional(),
  churnScore: z.number().min(0).max(1).optional(),
  lifetimeValue: z.number().min(0).optional(),
  incomeLevel: z.string().optional(),
};

const createCustomerSchema = z.object(createCustomerSchemaBase);

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

const CustomerCreateModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isCreateCustomerModalOpen } = useAppSelector((state) => state.ui);

  // Fetch income levels dynamically
  const { data: incomeLevels = [] } = useQuery({
    queryKey: ['incomeLevels'],
    queryFn: () => incomeLevelService.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerSchema),
  });

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      dispatch(showNotification({ message: 'Customer created successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to create customer',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    reset();
    dispatch(closeCreateCustomerModal());
  };

  const onSubmit = (data: CreateCustomerFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isCreateCustomerModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Create New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('customerNo')}
                label="Customer No"
                fullWidth
                error={!!errors.customerNo}
                helperText={errors.customerNo?.message}
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
                {...register('phone')}
                label="Phone"
                fullWidth
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('age', { valueAsNumber: true })}
                label="Age"
                type="number"
                fullWidth
                error={!!errors.age}
                helperText={errors.age?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('gender')}
                label="Gender"
                select
                fullWidth
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
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerCreateModal;
