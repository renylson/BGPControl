// Sobrescreve o tamanho padrão das fontes do MUI para toda a aplicação
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontSize: 13, // base menor
    h1: { fontSize: '2.2rem' },
    h2: { fontSize: '1.8rem' },
    h3: { fontSize: '1.5rem' },
    h4: { fontSize: '1.2rem' },
    h5: { fontSize: '1.05rem' },
    h6: { fontSize: '1rem' },
    subtitle1: { fontSize: '0.95rem' },
    subtitle2: { fontSize: '0.85rem' },
    body1: { fontSize: '0.95rem' },
    body2: { fontSize: '0.85rem' },
    button: { fontSize: '0.9rem' },
    caption: { fontSize: '0.75rem' },
    overline: { fontSize: '0.7rem' },
  },
});

export default theme;
