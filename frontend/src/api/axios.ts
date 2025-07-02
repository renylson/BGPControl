import axios from 'axios';


function getBaseURL() {
  // Em produção, sempre use /api
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_URL || '/api';
  }
  return '/api';
}

const baseURL = getBaseURL();
const api = axios.create({
  baseURL,
  timeout: 30000, // 30 segundos para testes SSH mais demorados
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT automaticamente, se existir
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (!config.headers) config.headers = {} as any;
  // Garante que o header Authorization seja sempre definido corretamente
  if (token) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  // Garante que o Content-Type esteja presente em todas as requisições
  if (!(config.headers as any)['Content-Type']) {
    (config.headers as any)['Content-Type'] = 'application/json';
  }
  return config;
});

// Interceptor para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Remove o token inválido e redireciona para login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
