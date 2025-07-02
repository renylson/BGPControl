import { Navigate, Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos em ms

function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (e) {
    return true;
  }
}

export default function PrivateRoute() {
  const { token, logout } = useAuth();
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };
    const checkInactivity = () => {
      if (Date.now() - lastActivity.current > INACTIVITY_LIMIT) {
        logout();
        window.location.href = '/login';
      }
    };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    const interval = setInterval(checkInactivity, 60000); // checa a cada 1 min
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(interval);
    };
  }, [logout]);

  // Se não há token ou está expirado, faz logout e redireciona
  if (!token || isTokenExpired(token)) {
    logout();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
