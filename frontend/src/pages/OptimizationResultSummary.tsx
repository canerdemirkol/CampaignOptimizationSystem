import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  Box,
  TextField,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { optimizationService } from '../services/optimizationService';

export interface OptimizationResultSummaryData {
  id: number;
  campaignId: number;
  campaignName: string;
  recommendedAudienceCount: number;
  estimatedContribution: number;
  estimatedCost: number;
  contributionType: string; // ROI, REVENUE, CONVERSION, ENGAGEMENT
  isApproved: boolean;
}

export const OptimizationResultSummary: React.FC = () => {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch results
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['optimization-results', scenarioId],
    queryFn: () => optimizationService.getResultSummary(Number(scenarioId)),
    enabled: !!scenarioId,
  });

  // Apply approved campaigns
  const applyMutation = useMutation({
    mutationFn: (campaignIds: number[]) =>
      optimizationService.approveCampaigns(Number(scenarioId), campaignIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-results', scenarioId] });
      setSelectedIds(new Set());
    },
  });

  // Filter results
  const filteredResults = results.filter(
    (r) => r.campaignName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check/uncheck handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.id)));
    }
  };

  const handleToggle = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleApply = () => {
    if (selectedIds.size === 0) {
      alert('Lütfen en az bir kampanya seçiniz.');
      return;
    }
    applyMutation.mutate(Array.from(selectedIds));
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  const allSelected = selectedIds.size === filteredResults.length && filteredResults.length > 0;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredResults.length;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        Optimizasyon Sonuç Özeti
      </Typography>

      {/* Search and Select All */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          placeholder="Kampanya adı ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
        />
        <Button
          variant={allSelected ? 'contained' : 'outlined'}
          size="small"
          onClick={handleSelectAll}
        >
          {allSelected ? 'Tümü Kaldır' : 'Tümünü Seç'}
        </Button>
      </Stack>

      {/* Results Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Kampanya</TableCell>
              <TableCell align="right">Önerilen Kişi Sayısı</TableCell>
              <TableCell align="right">Tahmini Katkı</TableCell>
              <TableCell align="right">Tahmini Maliyet</TableCell>
              <TableCell align="center">Durumu</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredResults.map((result) => (
              <TableRow key={result.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.has(result.id)}
                    onChange={() => handleToggle(result.id)}
                  />
                </TableCell>
                <TableCell>{result.campaignName}</TableCell>
                <TableCell align="right">
                  {result.recommendedAudienceCount.toLocaleString('tr-TR')}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {result.contributionType === 'ROI'
                      ? `%${result.estimatedContribution.toFixed(2)}`
                      : `₺${result.estimatedContribution.toLocaleString('tr-TR', {
                          maximumFractionDigits: 0,
                        })}`}
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    ({result.contributionType})
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  ₺{result.estimatedCost.toLocaleString('tr-TR', {
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="caption"
                    sx={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: result.isApproved ? '#c8e6c9' : '#fff3cd',
                      color: result.isApproved ? '#2e7d32' : '#856404',
                    }}
                  >
                    {result.isApproved ? 'Onaylandı' : 'Bekleme'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredResults.length === 0 && (
        <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
          Sonuç bulunamadı
        </Typography>
      )}

      {/* Apply Button */}
      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          color="success"
          onClick={handleApply}
          disabled={selectedIds.size === 0 || applyMutation.isPending}
          sx={{ minWidth: 200 }}
        >
          {applyMutation.isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Gönderiliyor...
            </>
          ) : (
            `Seçili Kampanyaları Onayla (${selectedIds.size})`
          )}
        </Button>
      </Stack>

      {applyMutation.isError && (
        <Typography color="error" sx={{ mt: 2 }}>
          Hata: {(applyMutation.error as any)?.message || 'Bilinmeyen hata'}
        </Typography>
      )}
    </Box>
  );
};
