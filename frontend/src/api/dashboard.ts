import api from './axios';

export async function getDashboardSummary() {
  const res = await api.get('/dashboard/status/');
  return res.data;
}
