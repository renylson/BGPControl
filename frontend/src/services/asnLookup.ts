// Serviço para consulta de informações de ASN usando o backend
import api from '../api/axios';

interface ASNInfo {
  asn: number;
  name: string;
  description?: string;
  country?: string;
}

/**
 * Consulta informações de um ASN usando o endpoint do backend
 */
export async function lookupASN(asn: number | string): Promise<ASNInfo | null> {
  try {
    const asnNumber = typeof asn === 'string' ? parseInt(asn) : asn;
    
    if (isNaN(asnNumber) || asnNumber <= 0) {
      throw new Error('ASN inválido');
    }

    const response = await api.get(`/asn-lookup/asn/${asnNumber}`);
    
    if (response.data) {
      return {
        asn: response.data.asn,
        name: response.data.name || 'Nome não encontrado',
        description: response.data.description,
        country: response.data.country,
      };
    }

    return null;
  } catch (error: any) {
    console.error('Erro ao consultar ASN:', error);
    
    // Se for erro 404, significa que o ASN não foi encontrado
    if (error.response?.status === 404) {
      return null;
    }
    
    // Para outros erros, relançar
    throw error;
  }
}
