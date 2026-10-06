import { api } from './api';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface EtapaDto {
  id: number;
  publicId: string;
  codigo: string;
  nome: string;
  classificacao: string;
  corHex: string | null;
}

export interface NegocioCriadoDto {
  publicId: string;
  nomeCliente: string;
  etapaNome: string;
  etapaCodigo: string;
  valor: number;
  competenciaMes: number;
  competenciaAno: number;
}

export interface CriarNegocioPayload {
  clientePublicId: string;
  valor: number;
  referencia?: string;
  dataVencimento: string; // ISO date format YYYY-MM-DD
  origem?: string;
  etapaPublicId: string;
  operadorId?: number;
  notas?: string;
}

export interface NegocioDto {
  publicId: string;
  valor: number;
  referencia?: string;
  competenciaMes: number;
  competenciaAno: number;
  origem?: string;
  dataVencimento?: string;
  etapaCodigo: string;
  nomeCliente: string;
  documento?: string;
  telefonePrincipal?: string;
}


// ─── API Calls ────────────────────────────────────────────────────────────────

export async function listarEtapas(): Promise<EtapaDto[]> {
  const { data } = await api.get<EtapaDto[]>('/api/negocios/etapas');
  return data;
}

export async function listarNegocios(): Promise<NegocioDto[]> {
  const { data } = await api.get<NegocioDto[]>('/api/negocios');
  return data;
}

export async function criarNegocio(
  payload: CriarNegocioPayload,
): Promise<NegocioCriadoDto> {
  const { data } = await api.post<NegocioCriadoDto>('/api/negocios', payload);
  return data;
}
