import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types';

const Results: React.FC = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  // Get all campaigns for selection
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignService.getAll(),
  });

  // Get optimization summary for selected campaign
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['optimizationSummary', selectedCampaignId],
    queryFn: () => campaignService.getOptimizationSummary(selectedCampaignId),
    enabled: !!selectedCampaignId,
  });

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
        Optimization Results
      </Typography>

      {/* Campaign Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          select
          label="Select Campaign"
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          fullWidth
        >
          <MenuItem value="">-- Select a Campaign --</MenuItem>
          {campaignsData?.map((campaign: Campaign) => (
            <MenuItem key={campaign.id} value={campaign.id}>
              {campaign.name}
            </MenuItem>
          ))}
        </TextField>
      </Paper>

      {selectedCampaignId && (
        <>
          {isLoadingSummary ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : summary ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Recommended Customers
                        </Typography>
                        <Typography variant="h4">
                          {summary.recommendedCustomerCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Approved
                        </Typography>
                        <Chip
                          label={summary.approved ? 'Yes' : 'No'}
                          color={summary.approved ? 'success' : 'default'}
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Estimates
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Participation
                        </Typography>
                        <Typography variant="h5">
                          {summary.estimatedParticipation.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Contribution
                        </Typography>
                        <Typography variant="h5">
                          {summary.estimatedContribution.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          Cost
                        </Typography>
                        <Typography variant="h5">
                          {summary.estimatedCost.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Calculation Info
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Started At
                        </Typography>
                        <Typography variant="body1">
                          {summary.calculationStartedAt
                            ? new Date(summary.calculationStartedAt).toLocaleString()
                            : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Finished At
                        </Typography>
                        <Typography variant="body1">
                          {summary.calculationFinishedAt
                            ? new Date(summary.calculationFinishedAt).toLocaleString()
                            : '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No optimization results available for this campaign.
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default Results;
