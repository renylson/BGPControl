import api from './axios';
import type { QueryRequest, QueryResponse, Router, LookingGlassQuery } from '../types/lookingGlass';

export const lookingGlassAPI = {
  // Listar roteadores disponíveis (usando a API do Looking Glass)
  async getRouters(): Promise<Router[]> {
    try {
      const response = await api.get('/looking-glass/routers');
      
      // Verificar se response.data é um array
      if (!Array.isArray(response.data)) {
        console.error('API response is not an array:', response.data);
        return [];
      }
      
      // Os dados já vêm no formato correto do backend
      return response.data;
    } catch (error: any) {
      console.error('Error fetching routers:', error);
      
      // Se for erro de autenticação, mostrar uma mensagem mais clara
      if (error.response?.status === 401) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      throw new Error('Erro ao carregar lista de roteadores');
    }
  },

  // Executar query
  async executeQuery(request: QueryRequest): Promise<QueryResponse> {
    const response = await api.post('/looking-glass/query', request);
    return response.data;
  },

  // Buscar query específica
  async getQuery(id: string): Promise<LookingGlassQuery> {
    const response = await api.get(`/looking-glass/query/${id}`);
    return response.data;
  },

  // Stream de resultado em tempo real
  createQueryStream(queryId: string): EventSource {
    return new EventSource(`${api.defaults.baseURL}/looking-glass/stream/${queryId}`);
  }
};