import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Welcome to the Campaign Optimization System
      </Typography>
    </Box>
  );
};

export default Dashboard;
