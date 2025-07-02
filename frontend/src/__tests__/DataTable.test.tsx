import { render, screen } from '@testing-library/react';
import DataTable from '../components/DataTable';

describe('DataTable', () => {
  const columns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Nome' },
  ];
  const rows = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  it('renderiza colunas e linhas', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
