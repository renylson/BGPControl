import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const CadastroRouters = lazy(() => import('./pages/cadastro/Routers'));
const ListaRouters = lazy(() => import('./pages/cadastro/ListaRouters'));
const EditarRouter = lazy(() => import('./pages/cadastro/EditarRouter'));
const CadastroPeerings = lazy(() => import('./pages/cadastro/Peerings'));
const ListaPeerings = lazy(() => import('./pages/cadastro/ListaPeerings'));
const EditarPeering = lazy(() => import('./pages/cadastro/EditarPeering'));
const CadastroGrupos = lazy(() => import('./pages/cadastro/Grupos'));
const ListaGrupos = lazy(() => import('./pages/cadastro/ListaGrupos'));
const EditarGrupo = lazy(() => import('./pages/cadastro/EditarGrupo'));
const CadastroUsuarios = lazy(() => import('./pages/cadastro/Users'));
const ListaUsuarios = lazy(() => import('./pages/cadastro/ListaUsuarios'));
const EditarUsuario = lazy(() => import('./pages/cadastro/EditarUsuario'));
const Operacao = lazy(() => import('./pages/Operacao'));
const LookingGlass = lazy(() => import('./pages/LookingGlass'));
const LogsAuditoria = lazy(() => import('./pages/LogsAuditoria'));
// const ChangePassword = lazy(() => import('./pages/ChangePassword'));

export const routes = [
  { path: '/login', element: <Login /> },
  { path: '/', element: <Dashboard /> },
  { path: '/cadastro/routers', element: <ListaRouters /> },
  { path: '/cadastro/routers/novo', element: <CadastroRouters /> },
  { path: '/cadastro/routers/:id', element: <EditarRouter /> },
  { path: '/cadastro/peerings', element: <ListaPeerings /> },
  { path: '/cadastro/peerings/novo', element: <CadastroPeerings /> },
  { path: '/cadastro/peerings/:id', element: <EditarPeering /> },
  { path: '/cadastro/grupos', element: <ListaGrupos /> },
  { path: '/cadastro/grupos/novo', element: <CadastroGrupos /> },
  { path: '/cadastro/grupos/:id', element: <EditarGrupo /> },
  { path: '/cadastro/users', element: <ListaUsuarios /> },
  { path: '/cadastro/users/novo', element: <CadastroUsuarios /> },
  { path: '/cadastro/users/:id', element: <EditarUsuario /> },
  { path: '/operacao', element: <Operacao /> },
  { path: '/looking-glass', element: <LookingGlass /> },
  { path: '/auditoria', element: <LogsAuditoria /> },
  // { path: '/trocar-senha', element: <ChangePassword /> }, // Modal é aberto via header
  { path: '*', element: <Navigate to="/" /> },
];
