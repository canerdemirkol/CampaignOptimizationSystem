import React from 'react';
import { Chip, ChipProps } from '@mui/material';
type CampaignStatus = 'DRAFT' | 'READY_FOR_CALCULATION' | 'CALCULATING' | 'CALCULATED' | 'APPROVED' | 'OPTIMIZING' | 'OPTIMIZED';

interface StatusChipProps {
  status: CampaignStatus;
}

const statusColors: Record<CampaignStatus, ChipProps['color']> = {
  DRAFT: 'default',
  READY_FOR_CALCULATION: 'warning',
  CALCULATING: 'info',
  CALCULATED: 'primary',
  APPROVED: 'success',
  OPTIMIZING: 'info',
  OPTIMIZED: 'success',
};

const statusLabels: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  READY_FOR_CALCULATION: 'Ready',
  CALCULATING: 'Calculating...',
  CALCULATED: 'Calculated',
  APPROVED: 'Approved',
  OPTIMIZING: 'Optimizing...',
  OPTIMIZED: 'Optimized',
};

const StatusChip: React.FC<StatusChipProps> = ({ status }) => {
  return (
    <Chip
      label={statusLabels[status] || status}
      color={statusColors[status] || 'default'}
      variant="filled"
      size="small"
      sx={{ minWidth: 100, fontWeight: 600 }}
    />
  );
};

export default StatusChip;
