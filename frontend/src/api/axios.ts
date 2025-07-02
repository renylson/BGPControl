import axios from 'axios';


function getBaseURL() {
  if (typeof process !== 'undefined' && process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }
  try {
    // Usando Function para evitar análise estática do TypeScript
    // eslint-disable-next-line no-new-func
    const viteEnv = new Function('try { return typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : undefined; } catch (e) { return undefined; }');
    const val = viteEnv();
    return val || '/api';
  } catch (e) {
    return '/api';
  }
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

export default api;
