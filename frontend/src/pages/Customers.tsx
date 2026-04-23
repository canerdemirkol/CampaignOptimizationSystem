import React, { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import {
  openCreateCustomerModal,
  openEditCustomerModal,
  openDeleteCustomerModal,
  showNotification,
} from '../store/uiSlice';
import { customerService, BulkImportResult } from '../services/customerService';
import { Customer } from '../types';
import CustomerCreateModal from '../components/customer/CustomerCreateModal';
import CustomerEditModal from '../components/customer/CustomerEditModal';
import CustomerDeleteModal from '../components/customer/CustomerDeleteModal';

const columnHelper = createColumnHelper<Customer>();

// Section 7.2 - Customer Management Screens
const Customers: React.FC = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page + 1, rowsPerPage],
    queryFn: () => customerService.findAll(page + 1, rowsPerPage),
  });

  const bulkImportMutation = useMutation({
    mutationFn: (file: File) => customerService.bulkImport(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setImportResult(result);
      setImportDialogOpen(true);
      dispatch(showNotification({
        message: `Import complete: ${result.inserted} inserted, ${result.skipped} skipped`,
        severity: result.errors.length > 0 ? 'warning' : 'success',
      }));
    },
    onError: () => {
      dispatch(showNotification({ message: 'Failed to import customers', severity: 'error' }));
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      bulkImportMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await customerService.downloadTemplate();
    } catch {
      dispatch(showNotification({ message: 'Failed to download template', severity: 'error' }));
    }
  };

  // Section 7.2 - Columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('customerNo', {
        header: 'Customer No',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('firstName', {
        header: 'First Name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('lastName', {
        header: 'Last Name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('segment', {
        header: 'Segment',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor('churnScore', {
        header: 'Churn Score',
        cell: (info) => info.getValue()?.toFixed(2) || '-',
      }),
      columnHelper.accessor('lifetimeValue', {
        header: 'LTV',
        cell: (info) => info.getValue()?.toFixed(2) || '-',
      }),
      columnHelper.accessor('incomeLevel', {
        header: 'Income Level',
        cell: (info) => {
          const incomeLevel = info.getValue();
          return typeof incomeLevel === 'string'
            ? incomeLevel || '-'
            : incomeLevel?.displayName || '-';
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                color="primary"
                onClick={() => dispatch(openEditCustomerModal(row.original.id))}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => dispatch(openDeleteCustomerModal(row.original.id))}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      }),
    ],
    [dispatch]
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / rowsPerPage),
  });

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Customers</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkImportMutation.isPending}
          >
            {bulkImportMutation.isPending ? 'Importing...' : 'Upload Excel'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => dispatch(openCreateCustomerModal())}
          >
            New Customer
          </Button>
        </Box>
      </Box>

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableCell key={header.id} sx={{ fontWeight: 'bold' }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} hover>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    No customers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={data?.total || 0}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Modals */}
      <CustomerCreateModal />
      <CustomerEditModal />
      <CustomerDeleteModal />

      {/* Import Result Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Result</DialogTitle>
        <DialogContent>
          {importResult && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Typography>Total rows: <strong>{importResult.total}</strong></Typography>
              <Typography>Inserted: <strong>{importResult.inserted}</strong></Typography>
              <Typography>Skipped (duplicate): <strong>{importResult.skipped}</strong></Typography>
              {importResult.errors.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>Errors ({importResult.errors.length}):</Typography>
                  {importResult.errors.map((err, i) => (
                    <Typography key={i} variant="body2">
                      Row {err.row}: {err.reason}
                    </Typography>
                  ))}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Customers;
