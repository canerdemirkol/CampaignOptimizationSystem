import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Paper,
  CircularProgress,
  Box,
  TextField,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeAddCampaignsToScenarioModal, showNotification } from '../../store/uiSlice';
import { campaignService } from '../../services/campaignService';
import { optimizationScenarioService } from '../../services/optimizationScenarioService';
import { Campaign } from '../../types';

const columnHelper = createColumnHelper<Campaign>();

// Valid fields for campaign update
const VALID_UPDATE_FIELDS = ['name', 'type', 'rMin', 'rMax', 'zK', 'cK'];

const AddCampaignsToScenarioModal: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isAddCampaignsToScenarioModalOpen, selectedScenario } = useAppSelector((state) => state.ui);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Fetch all campaigns
  const { data: campaignsData = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns-for-scenario'],
    queryFn: () => campaignService.getAll(),
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: (data: { campaignId: string; updates: any }) => {
      return campaignService.update(data.campaignId, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-for-scenario'] });
      dispatch(showNotification({ message: 'Campaign updated successfully', severity: 'success' }));
      setEditingCampaignId(null);
      setEditFormData({});
      setPage(0); // Reset to first page when order changes
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to update campaign',
        severity: 'error',
      }));
    },
  });

  // Filter out campaigns already in the scenario
  const availableCampaigns = useMemo(() => {
    if (!selectedScenario) return [];
    return campaignsData.filter(
      (campaign) => !selectedScenario.campaignIds.includes(campaign.id),
    );
  }, [campaignsData, selectedScenario]);

  // Handle Select All for ALL campaigns (across all pages)
  const handleSelectAllPage = useCallback((isSelected: boolean) => {
    setSelectedCampaignIds(prev => {
      const newSelection = new Set(prev);
      if (isSelected) {
        // Select ALL campaigns from all pages
        availableCampaigns.forEach(campaign => newSelection.add(campaign.id));
      } else {
        // Deselect ALL campaigns from all pages
        availableCampaigns.forEach(campaign => newSelection.delete(campaign.id));
      }
      return newSelection;
    });
  }, [availableCampaigns]);

  // Check if ALL campaigns (from all pages) are selected
  const allPageCampaignsSelected = availableCampaigns.length > 0 &&
    availableCampaigns.every(campaign => selectedCampaignIds.has(campaign.id));

  // Check if SOME campaigns (from all pages) are selected
  const somePageCampaignsSelected = availableCampaigns.some(campaign => selectedCampaignIds.has(campaign.id)) &&
    !allPageCampaignsSelected;

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: () => (
          <Checkbox
            checked={allPageCampaignsSelected}
            indeterminate={somePageCampaignsSelected}
            onChange={(e) => handleSelectAllPage(e.target.checked)}
            title={allPageCampaignsSelected ? "Deselect all campaigns" : "Select all campaigns"}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedCampaignIds.has(row.original.id)}
            onChange={(e) => {
              const newSelection = new Set(selectedCampaignIds);
              if (e.target.checked) {
                newSelection.add(row.original.id);
              } else {
                newSelection.delete(row.original.id);
              }
              setSelectedCampaignIds(newSelection);
            }}
          />
        ),
      }),
      columnHelper.accessor('name', {
        header: 'Campaign Name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('type', {
        header: 'Type',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('rMin', {
        header: 'rMin',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('rMax', {
        header: 'rMax',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('zK', {
        header: 'zK',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('cK', {
        header: 'cK',
        cell: (info) => info.getValue(),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          editingCampaignId === row.original.id ? (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={() => {
                  // Filter only valid fields
                  const filteredUpdates = Object.fromEntries(
                    Object.entries(editFormData).filter(([key]) =>
                      VALID_UPDATE_FIELDS.includes(key)
                    )
                  );
                  updateCampaignMutation.mutate({
                    campaignId: row.original.id,
                    updates: filteredUpdates,
                  });
                }}
                disabled={updateCampaignMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setEditingCampaignId(null);
                  setEditFormData({});
                }}
                disabled={updateCampaignMutation.isPending}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <Button
              size="small"
              variant="outlined"
              color="primary"
              onClick={() => {
                setEditingCampaignId(row.original.id);
                setEditFormData(row.original);
              }}
            >
              Edit
            </Button>
          )
        ),
      }),
    ],
    [selectedCampaignIds, allPageCampaignsSelected, somePageCampaignsSelected, handleSelectAllPage, editingCampaignId, editFormData, updateCampaignMutation],
  );

  const table = useReactTable({
    data: availableCampaigns,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination: { pageIndex: page, pageSize: rowsPerPage },
    },
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater({ pageIndex: page, pageSize: rowsPerPage }) : updater;
      setPage(newPagination.pageIndex);
      setRowsPerPage(newPagination.pageSize);
    },
  });

  const addCampaignsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScenario) throw new Error('No scenario selected');
      return optimizationScenarioService.addCampaignsToScenario(selectedScenario.id, {
        campaignIds: Array.from(selectedCampaignIds),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scenarios'] });
      queryClient.invalidateQueries({ queryKey: [`scenario-detail-${selectedScenario?.id}`] });
      dispatch(showNotification({ message: 'Campaigns added successfully', severity: 'success' }));
      handleClose();
    },
    onError: (error: any) => {
      dispatch(showNotification({
        message: error.response?.data?.message || 'Failed to add campaigns',
        severity: 'error',
      }));
    },
  });

  const handleClose = () => {
    setSelectedCampaignIds(new Set());
    setPage(0);
    dispatch(closeAddCampaignsToScenarioModal());
  };

  const handleAddCampaigns = () => {
    if (selectedCampaignIds.size === 0) {
      dispatch(showNotification({
        message: 'Please select at least one campaign',
        severity: 'warning',
      }));
      return;
    }
    addCampaignsMutation.mutate();
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Dialog
      open={isAddCampaignsToScenarioModalOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>Add Campaigns to Scenario</DialogTitle>
      <DialogContent>
        {campaignsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableCell key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableHead>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow key="empty-state">
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      No available campaigns to add
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      sx={{
                        backgroundColor: editingCampaignId === row.original.id ? '#f9f9f9' : 'inherit',
                        '&:hover': { backgroundColor: '#fafafa' }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isEditMode = editingCampaignId === row.original.id;
                        const columnId = cell.column.id;

                        // Render edit fields for specific columns
                        if (isEditMode && ['rMin', 'rMax', 'zK', 'cK'].includes(columnId)) {
                          return (
                            <TableCell key={cell.id} align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={editFormData[columnId] ?? (row.original as Record<string, any>)[columnId]}
                                onChange={(e) => setEditFormData({ ...editFormData, [columnId]: Number(e.target.value) })}
                                inputProps={{ step: columnId === 'zK' || columnId === 'cK' ? '0.1' : '1' }}
                                sx={{ width: '110px' }}
                              />
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {table.getRowModel().rows.length > 0 && (
              <TablePagination
                component="div"
                count={availableCampaigns.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            )}
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={addCampaignsMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleAddCampaigns}
          variant="contained"
          disabled={
            addCampaignsMutation.isPending ||
            campaignsLoading ||
            selectedCampaignIds.size === 0
          }
        >
          {addCampaignsMutation.isPending ? (
            <CircularProgress size={24} />
          ) : (
            `Add ${selectedCampaignIds.size} Campaign${selectedCampaignIds.size !== 1 ? 's' : ''}`
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCampaignsToScenarioModal;
