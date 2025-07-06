import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  user: string | null;
  profile: string | null;
  token: string | null;
  login: (token: string, userProfile?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<string | null>(localStorage.getItem('user'));
  const [profile, setProfile] = useState<string | null>(localStorage.getItem('profile'));

  useEffect(() => {
    if (token && !user) {
      // Decodificar JWT para obter usuário se não estiver no localStorage
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload.sub || null;
        setUser(username);
        if (username) {
          localStorage.setItem('user', username);
        }
      } catch {
        logout();
      }
    }
  }, [token]);

  const login = (newToken: string, userProfile?: string) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    
    // Decodificar token para obter username
    try {
      const payload = JSON.parse(atob(newToken.split('.')[1]));
      const username = payload.sub || null;
      setUser(username);
      localStorage.setItem('user', username);
      
      // Se o perfil foi fornecido, usá-lo
      if (userProfile) {
        setProfile(userProfile);
        localStorage.setItem('profile', userProfile);
      }
    } catch {
      console.error('Erro ao decodificar token');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
  };

  return (
    <AuthContext.Provider value={{ user, profile, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
