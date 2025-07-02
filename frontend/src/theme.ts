import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
      contrastText: '#fff',
    },
    secondary: {
      main: '#9c27b0',
      contrastText: '#fff',
    },
    background: {
      default: '#181c24',
      paper: '#232a36',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#b0b8c1',
      disabled: '#7a7a7a',
    },
    divider: '#232a36',
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ffa726',
    },
    info: {
      main: '#29b6f6',
    },
    success: {
      main: '#66bb6a',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    fontWeightBold: 800,
    fontWeightMedium: 600,
    fontWeightRegular: 400,
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    allVariants: {
      color: '#f5f5f5',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#181c24',
          color: '#f5f5f5',
          scrollbarColor: '#232a36 #181c24',
        },
        '*::-webkit-scrollbar': {
          background: '#232a36',
          width: 8,
        },
        '*::-webkit-scrollbar-thumb': {
          background: '#444',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 700,
          fontSize: 16,
          boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)',
          color: '#f5f5f5',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          background: '#232a36',
          color: '#f5f5f5',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          background: '#232a36',
          color: '#f5f5f5',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#232a36',
          color: '#f5f5f5',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: '#232a36 !important',
          color: '#f5f5f5 !important',
          boxShadow: '2px 0 16px 0 rgba(31,38,135,0.04)',
          borderRight: '1.5px solid #232a36',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          background: '#232a36',
          color: '#f5f5f5',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#b0b8c1',
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: '#f5f5f5',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#f5f5f5',
          '&.Mui-selected': {
            background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
            color: '#fff',
          },
          '&:hover': {
            background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
            color: '#fff',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#b0b8c1',
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: '#b0b8c1',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          background: '#232a36',
          color: '#f5f5f5',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          background: '#232a36',
        },
      },
    },
  },
});

export default theme;
