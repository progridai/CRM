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

export interface VoipErroExtraido {
  mensagem: string;
  logTecnico: string;
}

export interface VoipErroContexto {
  ramal?: string;
  destino?: string;
}

interface VoipErroDetalheApi {
  horarioUtc?: string | null;
  endpoint?: string | null;
  statusHttpProvedor?: number | null;
  duracaoMs?: number | null;
  respostaProvedor?: string | null;
  tipoExcecao?: string | null;
  detalheTecnico?: string | null;
}

const LIMITE_BRUTO = 1000;

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

export function extrairErroVoip(error: unknown, fallback: string, contexto?: VoipErroContexto): VoipErroExtraido {
  return {
    mensagem: erroVoip(error, fallback),
    logTecnico: montarLogTecnico(error, contexto),
  };
}

function montarLogTecnico(error: unknown, contexto?: VoipErroContexto): string {
  const linhas = [
    `Data/hora local: ${new Date().toLocaleString('pt-BR')}`,
    `Ramal: ${texto(contexto?.ramal)}`,
    `Destino: ${texto(contexto?.destino)}`,
  ];

  if (!isAxiosError(error)) {
    linhas.push(`Falha local: ${descreverLocal(error)}`);
    return linhas.join('\n');
  }

  if (!error.response) {
    linhas.push('API CRM: sem resposta (rede/CORS)');
    linhas.push(`Código do cliente: ${texto(error.code)}`);
    linhas.push(`Mensagem do cliente: ${texto(error.message)}`);
    return linhas.join('\n');
  }

  const { status, statusText, data } = error.response;
  linhas.push(`API CRM: HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
  const codigo = codigoDe(data);
  const mensagem = mensagemDe(data);
  if (codigo) linhas.push(`Código: ${codigo}`);
  if (mensagem) linhas.push(`Mensagem: ${mensagem}`);

  const detalhe = detalheDe(data);
  if (detalhe) {
    linhas.push(`Endpoint Sisnetsul: ${texto(detalhe.endpoint)}`);
    linhas.push(`Status HTTP Sisnetsul: ${texto(detalhe.statusHttpProvedor)}`);
    linhas.push(`Duração (ms): ${texto(detalhe.duracaoMs)}`);
    linhas.push(`Tipo de exceção: ${texto(detalhe.tipoExcecao)}`);
    linhas.push(`Detalhe técnico: ${texto(detalhe.detalheTecnico)}`);
    if (detalhe.horarioUtc) linhas.push(`Horário UTC do servidor: ${detalhe.horarioUtc}`);
    linhas.push('Resposta Sisnetsul:');
    linhas.push(texto(detalhe.respostaProvedor));
    return linhas.join('\n');
  }

  linhas.push(`Status: ${status}`);
  linhas.push(`Status text: ${texto(statusText)}`);
  linhas.push('Resposta bruta:');
  linhas.push(trechoBruto(data));
  return linhas.join('\n');
}

function detalheDe(data: unknown): VoipErroDetalheApi | null {
  if (!data || typeof data !== 'object') return null;
  const detalhe = (data as { detalhe?: unknown }).detalhe;
  if (!detalhe || typeof detalhe !== 'object') return null;
  return detalhe as VoipErroDetalheApi;
}

function codigoDe(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const codigo = (data as { codigo?: unknown }).codigo;
  return typeof codigo === 'string' && codigo.trim() ? codigo : null;
}

function mensagemDe(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : null;
}

function trechoBruto(data: unknown): string {
  if (typeof data === 'string') return truncar(data.trim() || '(vazio)', LIMITE_BRUTO);
  if (data == null || data === '') return '(vazio)';
  if (typeof data === 'object') {
    const registro = data as Record<string, unknown>;
    const title = typeof registro.title === 'string' ? registro.title : '';
    const detail = typeof registro.detail === 'string' ? registro.detail : '';
    if (title || detail) {
      const partes = [title ? `title: ${title}` : '', detail ? `detail: ${detail}` : ''].filter(Boolean);
      return truncar(partes.join('\n'), LIMITE_BRUTO);
    }
    try {
      return truncar(JSON.stringify(data), LIMITE_BRUTO);
    } catch {
      return truncar(String(data), LIMITE_BRUTO);
    }
  }
  return truncar(String(data), LIMITE_BRUTO);
}

function descreverLocal(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

function texto(valor: unknown): string {
  if (valor == null || valor === '') return '—';
  return String(valor);
}

function truncar(valor: string, limite: number): string {
  if (valor.length <= limite) return valor;
  return `${valor.slice(0, limite)}…`;
}
