import api from './axios';

export async function getRouters() {
  const res = await api.get('/routers/');
  // Garante que sempre retorna array
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.items)) return res.data.items;
  return [];
}
