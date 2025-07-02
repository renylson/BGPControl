import api from './axios';

export async function getDashboardSummary() {
  const res = await api.get('/peerings/dashboard/summary');
  return res.data;
}
