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
  competenciaMes: number;
  competenciaAno: number;
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
  recuperadoEm?: string;
  etapaCodigo: string;
  nomeCliente: string;
  documento?: string;
  telefonePrincipal?: string;
  operadorId?: number;
  nomeOperador?: string;
  atividadesCount: number;
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

export async function moverEtapa(negocioPublicId: string, novaEtapaPublicId: string): Promise<void> {
  await api.patch(`/api/negocios/${negocioPublicId}/etapa`, { novaEtapaPublicId });
}

export interface AtividadeDto {
  publicId: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  ocorridoEm: string;
  nomeUsuario: string;
  negocioPublicId: string;
}

export interface RegistrarAtividadePayload {
  tipo: string;
  titulo: string;
  descricao?: string;
}

export async function listarAtividades(negocioIds: string[]): Promise<AtividadeDto[]> {
  const { data } = await api.get<AtividadeDto[]>('/api/negocios/atividades', {
    params: { negocioIds: negocioIds.join(',') }
  });
  return data;
}

export async function registrarAtividade(negocioPublicId: string, payload: RegistrarAtividadePayload): Promise<AtividadeDto> {
  const { data } = await api.post<AtividadeDto>(`/api/negocios/${negocioPublicId}/atividades`, payload);
  return data;
}

export interface HistoricoDto {
  id: number;
  tipoEvento: string;
  descricao?: string;
  ocorridoEm: string;
  nomeUsuario: string;
  etapaAnteriorNome?: string;
  etapaNovaNome?: string;
}

export async function listarHistorico(negocioPublicId: string): Promise<HistoricoDto[]> {
  const { data } = await api.get<HistoricoDto[]>(`/api/negocios/${negocioPublicId}/historico`);
  return data;
}

export interface AtividadeAtalhoDto {
  publicId: string;
  nome: string;
  tipo: string;
  tituloPadrao: string;
  descricaoPadrao?: string;
  ordem: number;
  ativo: boolean;
}

export interface SalvarAtividadeAtalhoCommand {
  nome: string;
  tipo: string;
  tituloPadrao: string;
  descricaoPadrao?: string;
  ordem: number;
  ativo: boolean;
}

export async function listarAtalhos(somenteAtivos = false): Promise<AtividadeAtalhoDto[]> {
  const { data } = await api.get<AtividadeAtalhoDto[]>(`/api/atividadesrapidas?somenteAtivos=${somenteAtivos}`);
  return data;
}

export async function criarAtalho(cmd: SalvarAtividadeAtalhoCommand): Promise<{ publicId: string }> {
  const { data } = await api.post<{ publicId: string }>('/api/atividadesrapidas', cmd);
  return data;
}

export async function atualizarAtalho(publicId: string, cmd: SalvarAtividadeAtalhoCommand): Promise<void> {
  await api.put(`/api/atividadesrapidas/${publicId}`, cmd);
}

export async function excluirAtalho(publicId: string): Promise<void> {
  await api.delete(`/api/atividadesrapidas/${publicId}`);
}
