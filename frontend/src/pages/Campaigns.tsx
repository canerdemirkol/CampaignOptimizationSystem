import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
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
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../store/hooks';
import { openEditCampaignModal, openDeleteCampaignModal, openCreateCampaignModal } from '../store/uiSlice';
import { campaignService } from '../services/campaignService';
import { Campaign } from '../types';
import CampaignCreateModal from '../components/campaign/CampaignCreateModal';
import CampaignEditModal from '../components/campaign/CampaignEditModal';
import CampaignDeleteModal from '../components/campaign/CampaignDeleteModal';

const columnHelper = createColumnHelper<Campaign>();

// Section 7.3.1 - Campaign List Grid with TanStack Table
const Campaigns: React.FC = () => {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', page + 1, rowsPerPage, searchQuery, typeFilter],
    queryFn: () => campaignService.findAll(page + 1, rowsPerPage, searchQuery || undefined, typeFilter || undefined),
  });

  // Section 7.3.1 - Columns: Campaign Name, Type, Status, Created At, Updated At, Actions (LAST COLUMN - FIXED)
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Campaign name',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('type', {
        header: 'Campaign type',
        cell: (info) => {
          const type = info.getValue();
          return (
            <Box
              sx={{
                display: 'inline-block',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.85rem',
                fontWeight: 500,
                backgroundColor: type === 'CRM' ? '#e3f2fd' : '#fff3e0',
                color: type === 'CRM' ? '#1976d2' : '#f57c00',
              }}
            >
              {type}
            </Box>
          );
        },
      }),
      columnHelper.accessor('rMin', {
        header: 'Min. number of customers per CRM campaign',
        cell: (info) => info.getValue(),
        size: 150,
      }),
      columnHelper.accessor('rMax', {
        header: 'Max. number of customers per CRM campaign',
        cell: (info) => info.getValue(),
        size: 150,
      }),
      columnHelper.accessor('zK', {
        header: 'Unit contribution per campaign',
        cell: (info) => info.getValue().toFixed(2),
        size: 120,
      }),
      columnHelper.accessor('cK', {
        header: 'Unit cost per campaign',
        cell: (info) => info.getValue().toFixed(2),
        size: 120,
      }),
      // Section 7.3.1 - Actions Column (LAST COLUMN - FIXED) - Only Detail and Delete
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          return (
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              {/* Edit Button */}
              <Tooltip title="Düzenle">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => dispatch(openEditCampaignModal(row.original))}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>

              {/* Delete Button - always visible */}
              <Tooltip title="Sil">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => dispatch(openDeleteCampaignModal(row.original))}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      }),
    ],
    [dispatch]
  );

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
        <Typography variant="h4">Campaigns</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => dispatch(openCreateCampaignModal())}
        >
          New Campaign
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            label="Search by name"
            variant="outlined"
            size="small"
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);
              if (value.length >= 3 || value.length === 0) {
                setSearchQuery(value);
              }
              setPage(0);
            }}
            sx={{ flex: 1, maxWidth: 300 }}
            placeholder="Campaign name... (min 3 chars)"
          />
          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
              label="Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="CRM">CRM</MenuItem>
              <MenuItem value="MASS">MASS</MenuItem>
            </Select>
          </FormControl>
          {(searchQuery || typeFilter) && (
            <Button
              size="small"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setTypeFilter('');
                setPage(0);
              }}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} sx={{ verticalAlign: 'top' }}>
                  {headerGroup.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      sx={{
                        fontWeight: 'bold',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        padding: '12px 8px',
                        maxWidth: '140px',
                        overflow: 'hidden',
                      }}
                    >
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
                    <TableCell
                      key={cell.id}
                      sx={{
                        maxWidth: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    No campaigns found
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
      <CampaignCreateModal />
      <CampaignEditModal />
      <CampaignDeleteModal />
    </Box>
  );
};

export default Campaigns;
