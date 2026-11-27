import { isAxiosError } from 'axios';
import { api } from './api';

export const URL_VOIP_PADRAO = 'https://bravida.sisnetsul.com.br/api/click2call';

export interface VoipConfiguracao {
  urlApi: string;
  ativo: boolean;
  tokenConfigurado: boolean;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
}

export interface SalvarVoipPayload {
  urlApi: string;
  ativo: boolean;
  token?: string;
}

export async function obterConfiguracaoVoip(signal?: AbortSignal) {
  const { data } = await api.get<VoipConfiguracao>('/api/voip/configuracao', { signal });
  return data;
}

export async function salvarConfiguracaoVoip(payload: SalvarVoipPayload) {
  const { data } = await api.put<VoipConfiguracao>('/api/voip/configuracao', payload);
  return data;
}

export async function ligarVoip(ramal: string, destino: string) {
  const { data } = await api.post<{ mensagem: string }>('/api/voip/ligar', { ramal, destino });
  return data;
}

export function erroVoip(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) return 'Seu perfil não tem acesso ao Discador VoIP neste ambiente.';
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
