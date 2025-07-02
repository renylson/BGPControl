import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination, TextField, InputAdornment, Box, Button } from '@mui/material';
import { useState, useMemo } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import type { TableProps } from '@mui/material';
import type { ReactNode } from 'react';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any, row?: any) => ReactNode;
  filterable?: boolean;
  sortable?: boolean;
  renderCell?: (row: any) => ReactNode;
}

interface DataTableProps extends TableProps {
  columns: Column[];
  rows: any[];
  rowsPerPageOptions?: number[];
  filterPlaceholder?: string;
}


export default function DataTable({ columns, rows, rowsPerPageOptions = [5, 10, 25], filterPlaceholder = 'Buscar...', ...props }: DataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Garante que rows sempre é array
  const safeRows = Array.isArray(rows) ? rows : [];

  // Filtro global
  const filteredRows = useMemo(() => {
    let filtered = safeRows;
    if (search) {
      const lower = search.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(
          v => typeof v === 'string' && v.toLowerCase().includes(lower)
        )
      );
    }
    // Filtros por coluna
    Object.entries(columnFilters).forEach(([col, val]) => {
      if (val) {
        filtered = filtered.filter(row =>
          row[col] && String(row[col]).toLowerCase().includes(val.toLowerCase())
        );
      }
    });
    // Ordenação
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const va = a[sortBy];
        const vb = b[sortBy];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') {
          return sortDir === 'asc' ? va - vb : vb - va;
        }
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }
    return filtered;
  }, [rows, search, columnFilters, sortBy, sortDir]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSort = (colId: string) => {
    if (sortBy === colId) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(colId);
      setSortDir('asc');
    }
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)', borderRadius: 3 }}>
      <Box sx={{ p: 2, pb: 0 }}>
        <TextField
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder={filterPlaceholder}
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { bgcolor: 'background.paper', borderRadius: 2 }
          }}
          sx={{ mb: '15px', bgcolor: '#232a36', borderRadius: 2 }}
        />
      </Box>
      <TableContainer sx={{ maxHeight: { xs: 340, sm: 600 } }}>
        <Table stickyHeader size="small" {...props}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={sortBy === column.id ? sortDir : false}
                  sx={{ fontWeight: 700, bgcolor: '#232a36', color: '#fff', borderBottom: '2px solid #1976d2', fontSize: { xs: 13, sm: 15 }, px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.5 } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {column.sortable ? (
                      <Button
                        size="small"
                        onClick={() => handleSort(column.id)}
                        sx={{ minWidth: 0, p: 0, color: 'inherit', fontSize: { xs: 12, sm: 14 }, height: 28 }}
                        endIcon={sortBy === column.id ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      >
                        {column.label}
                      </Button>
                    ) : (
                      column.label
                    )}
                    {column.filterable && (
                      <TextField
                        value={columnFilters[column.id] || ''}
                        onChange={e => { setColumnFilters(f => ({ ...f, [column.id]: e.target.value })); setPage(0); }}
                        placeholder="Filtrar"
                        size="small"
                        variant="standard"
                        sx={{ width: 70, fontSize: { xs: 12, sm: 14 } }}
                        InputProps={{ disableUnderline: true }}
                      />
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, idx) => (
              <TableRow hover tabIndex={-1} key={idx} sx={{ '&:last-child td, &:last-child th': { border: 0 }, fontSize: { xs: 13, sm: 15 } }}>
                {columns.map((column) => {
                  if (column.renderCell) {
                    return (
                      <TableCell key={column.id} align={column.align || 'left'} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 } }}>
                        {column.renderCell(row)}
                      </TableCell>
                    );
                  }
                  const value = row[column.id];
                  return (
                    <TableCell key={column.id} align={column.align || 'left'} sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.5, sm: 1 }, fontSize: { xs: 13, sm: 15 } }}>
                      {column.format ? column.format(value, row) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ fontSize: { xs: 12, sm: 14 }, '.MuiTablePagination-toolbar': { minHeight: 36, px: { xs: 1, sm: 2 } }, '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': { fontSize: { xs: 12, sm: 14 } } }}
      />
    </Paper>
  );
}
