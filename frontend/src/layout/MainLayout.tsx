import { AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItemIcon, ListItemText, Toolbar, ListItemButton, Button, Menu, MenuItem, Avatar, ListItemIcon as MuiListItemIcon } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import RouterIcon from '@mui/icons-material/Router';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import NetworkPingIcon from '@mui/icons-material/NetworkPing';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChangePasswordModal from '../components/ChangePasswordModal';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';

const drawerWidth = 230;

const menu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Operação', icon: <SwapHorizIcon />, path: '/operacao' },
  { text: 'Looking Glass', icon: <NetworkPingIcon />, path: '/looking-glass' },
  {
    text: 'Cadastros',
    children: [
      { text: 'Roteadores', icon: <RouterIcon />, path: '/cadastro/routers' },
      { text: 'Peerings', icon: <SettingsIcon />, path: '/cadastro/peerings' },
      { text: 'Grupo de Peerings', icon: <GroupIcon />, path: '/cadastro/grupos', sx: { whiteSpace: 'nowrap' } },
      { text: 'Usuários', icon: <PersonIcon />, path: '/cadastro/users' },
    ]
  }
];


export default function MainLayoutWithFooter() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openChangePassword, setOpenChangePassword] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  const handleChangePassword = () => {
    setOpenChangePassword(true);
    handleCloseMenu();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, minHeight: '100vh', background: 'linear-gradient(135deg, #181c24 0%, #232a36 100%)' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: 1201, background: 'rgba(35,42,54,0.98)', color: '#f5f5f5', boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)', borderRadius: 0, backdropFilter: 'blur(6px)' }} color="default" elevation={2}>
        <Toolbar sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: { xs: 64, sm: 88 }, width: '100%', px: { xs: 1, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: 120 }}>
            <IconButton color="inherit" edge="start" aria-label="Abrir menu" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' } }}>
              <MenuIcon />
            </IconButton>
            <img
              src={logo}
              alt="BGPView Logo"
              style={{
                height: '48px',
                borderRadius: 8,
                boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.10)',
                border: 'none',
                marginRight: 0,
                cursor: 'pointer',
                transition: 'filter 0.2s',
                filter: 'brightness(1) drop-shadow(0 0 8px #1976d2aa)',
              }}
              onClick={() => navigate('/')}
            />
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 120, minHeight: 40 }}>
            {user ? (
              <>
                <Button
                  color="inherit"
                  onClick={handleUserMenu}
                  sx={{ fontWeight: 600, textTransform: 'none', mr: 2, display: 'flex', alignItems: 'center', gap: 1, fontSize: 14, minHeight: 36, px: 2, py: 0.5, borderRadius: 3, background: 'rgba(25,118,210,0.10)', transition: 'background 0.2s', '&:hover': { background: 'rgba(25,118,210,0.18)' } }}
                  startIcon={<Avatar sx={{ width: 28, height: 28, bgcolor: '#1976d2' }}><PersonIcon /></Avatar>}
                >
                  {user}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem onClick={handleChangePassword}>
                    <MuiListItemIcon><LockResetIcon fontSize="small" /></MuiListItemIcon>
                    Trocar senha
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <MuiListItemIcon><LogoutIcon fontSize="small" /></MuiListItemIcon>
                    Sair
                  </MenuItem>
                </Menu>
                <ChangePasswordModal open={openChangePassword} onClose={() => setOpenChangePassword(false)} />
              </>
            ) : null}
          </Box>
        </Toolbar>
      </AppBar>
      {/* Drawer temporário para mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        container={window.document.body}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#232a36',
            color: '#f5f5f5',
            borderRight: '1.5px solid #232a36',
            boxShadow: '2px 0 16px 0 rgba(31,38,135,0.04)',
            pt: 1
          }
        }}
      >
        <Toolbar />
        <List sx={{ mt: 2 }}>
          {menu.map(item =>
            item.children ? (
              <>
                {item.children.map(child => (
                  <ListItemButton
                    key={child.text}
                    component={Link}
                    to={child.path}
                    selected={location.pathname === child.path}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      mx: 1,
                      background: location.pathname === child.path ? 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)' : 'none',
                      color: location.pathname === child.path ? 'white' : 'inherit',
                      boxShadow: location.pathname === child.path ? '0 2px 8px 0 rgba(31,38,135,0.10)' : 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
                        color: 'white',
                        boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: location.pathname === child.path ? 'white' : 'primary.main' }}>{child.icon}</ListItemIcon>
                    <ListItemText primary={child.text} sx={child.sx} />
                  </ListItemButton>
                ))}
              </>
            ) : (
              <ListItemButton
                key={item.text}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                onClick={() => setMobileOpen(false)}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  mx: 1,
                  background: location.pathname === item.path ? 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)' : 'none',
                  color: location.pathname === item.path ? 'white' : 'inherit',
                  boxShadow: location.pathname === item.path ? '0 2px 8px 0 rgba(31,38,135,0.10)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)'
                  }
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'primary.main' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            )
          )}
        </List>
      </Drawer>
      {/* Drawer permanente para desktop */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'rgba(35,42,54,0.98)',
            color: '#f5f5f5',
            borderRight: '1.5px solid #232a36',
            boxShadow: '2px 0 16px 0 rgba(31,38,135,0.08)',
            pt: 1,
            backdropFilter: 'blur(6px)',
            transition: 'width 0.2s',
          },
          display: { xs: 'none', sm: 'block' },
        }}
        open
      >
        <Toolbar />
        <List sx={{ mt: 2 }}>
          {menu.map(item =>
            item.children ? (
              <>
                {/* Divider para separar grupos */}
                <Box sx={{ px: 2, py: 1, color: '#b0b8c1', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.7 }}>Cadastros</Box>
                {item.children.map(child => (
                  <ListItemButton
                    key={child.text}
                    component={Link}
                    to={child.path}
                    selected={location.pathname === child.path}
                    sx={{
                      borderRadius: 2,
                      mb: 1,
                      mx: 1,
                      background: location.pathname === child.path ? 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)' : 'none',
                      color: location.pathname === child.path ? 'white' : 'inherit',
                      boxShadow: location.pathname === child.path ? '0 2px 8px 0 rgba(31,38,135,0.10)' : 'none',
                      transition: 'all 0.2s',
                      '&:hover': {
                        background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
                        color: 'white',
                        boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: location.pathname === child.path ? 'white' : 'primary.main' }}>{child.icon}</ListItemIcon>
                    <ListItemText primary={child.text} sx={child.sx} />
                  </ListItemButton>
                ))}
              </>
            ) : (
              <ListItemButton
                key={item.text}
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  mx: 1,
                  background: location.pathname === item.path ? 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)' : 'none',
                  color: location.pathname === item.path ? 'white' : 'inherit',
                  boxShadow: location.pathname === item.path ? '0 2px 8px 0 rgba(31,38,135,0.10)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1976d2 0%, #9c27b0 100%)',
                    color: 'white',
                    boxShadow: '0 2px 8px 0 rgba(31,38,135,0.10)'
                  }
                }}
                aria-label={item.text}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'primary.main' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            )
          )}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          background: 'none',
          display: 'flex',
          flexDirection: 'column',
          pt: { xs: '100px', sm: '100px' }, // Garante espaço igual à altura do AppBar
          ml: 0,
          mt: 0,
          width: '100%'
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch', width: '100%' }}>
          <Outlet />
        </Box>
        {/* Rodapé fixo */}
        <Box component="footer" sx={{ width: '100%', py: 2, px: 2, bgcolor: 'rgba(35,42,54,0.98)', color: '#b0b8c1', textAlign: 'center', fontSize: 14, letterSpacing: 1, borderTop: '1px solid #232a36', mt: 2 }}>
          &copy; {new Date().getFullYear()} BGPView - Todos os direitos reservados
        </Box>
      </Box>
    </Box>
  );
}
