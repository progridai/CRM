import { isAxiosError } from 'axios';
import { api } from './api';

export interface AssertivaConfiguracao {
  clientId: string;
  secretConfigurado: boolean;
  ativa: boolean;
  finalidade: number | null;
  prazoDias: number;
  retencaoDias: number;
  revisao: string | null;
}

export interface AssertivaConfiguracaoPayload extends Omit<AssertivaConfiguracao, 'secretConfigurado'> {
  clientSecret?: string;
}

export interface AssertivaTelefone {
  numero: string;
  tipo: string;
  noCadastro: boolean;
}

export interface AssertivaHistorico {
  id: string;
  data: string;
  usuario: string;
  status: 'sucesso' | 'sem_resultado' | 'erro' | 'pendente';
  erro: string | null;
  protocolo: string | null;
  dentroDoPrazo: boolean;
  antecipacaoConfirmada: boolean;
  operacao: string;
}

export interface AssertivaResultado {
  id: string;
  data: string;
  usuario: string;
  diasDecorridos: number;
  recente: boolean;
  resultadoExpirado: boolean;
  telefones: AssertivaTelefone[];
  emails: string[];
}

export interface AssertivaFicha {
  configurada: boolean;
  temCpf: boolean;
  prazoDias: number;
  ultimaTentativaId: string | null;
  ultimaConsulta: AssertivaResultado | null;
  ultimaTentativa: AssertivaHistorico | null;
}

const configuracaoUrl = '/api/integracoes/assertiva';
const fichaUrl = (clienteId: string) => `/api/assertiva/clientes/${clienteId}`;

export async function obterConfiguracaoAssertiva(signal?: AbortSignal) {
  const { data } = await api.get<AssertivaConfiguracao>(configuracaoUrl, { signal });
  return data;
}

export async function salvarConfiguracaoAssertiva(payload: AssertivaConfiguracaoPayload) {
  const { data } = await api.put<AssertivaConfiguracao>(configuracaoUrl, payload);
  return data;
}

export async function testarAutenticacaoAssertiva() {
  await api.post(`${configuracaoUrl}/testar`);
}

export async function obterFichaAssertiva(clienteId: string, signal?: AbortSignal) {
  const { data } = await api.get<AssertivaFicha>(fichaUrl(clienteId), { signal });
  return data;
}

export async function consultarAssertiva(clienteId: string, ultimaTentativaId: string | null, confirmouAntecipacao: boolean) {
  const { data } = await api.post<AssertivaFicha>(`${fichaUrl(clienteId)}/consultas`, {
    operacaoId: crypto.randomUUID(),
    ultimaTentativaId,
    confirmouAntecipacao,
  });
  return data;
}

export async function obterHistoricoAssertiva(clienteId: string, pagina: number, signal: AbortSignal) {
  const { data } = await api.get<AssertivaHistorico[]>(`${fichaUrl(clienteId)}/historico`, { params: { pagina }, signal });
  return data;
}

export async function adicionarTelefoneAssertiva(clienteId: string, consultaId: string, numero: string) {
  await api.post(`/api/contatos/${clienteId}/telefones/assertiva`, { consultaId, numero });
}

export function erroAssertiva(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 403) return 'Seu perfil não tem acesso à Assertiva neste ambiente.';
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}
