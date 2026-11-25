import { api } from './api';

export type StatusLogImportacao = 'sucesso' | 'vinculado' | 'nao_importado';

export interface ImportacaoNegociosLogDto {
  ordem: number;
  aba: string;
  linha: number;
  status: StatusLogImportacao;
  mensagem: string;
  nome?: string;
  cpf?: string;
  referencia?: string;
  valor?: number;
}

export interface ImportacaoNegociosResultadoDto {
  arquivo: string;
  mesCobranca: number;
  anoCobranca: number;
  abasLidas: string[];
  totalLinhas: number;
  inseridos: number;
  vinculados: number;
  naoImportados: number;
  valorImportado: number;
  logs: ImportacaoNegociosLogDto[];
}

export interface ImportacaoPlanilhaAnaliseDto {
  arquivo: string;
  competencias: { mes: number; ano: number }[];
  abasLidas: string[];
  totalLinhas: number;
  valorEncontrado: number;
  valorTotal: number;
  novos: number;
  existentes: number;
  rejeitados: number;
  semDistribuicao: number;
  vinculosEncerrados: number;
  logs: ImportacaoNegociosLogDto[];
  cobradoras: { id: number; nome: string }[];
  distribuicao: { cobradoraId: number | null; nome: string; clientes: number; negocios: number; valorTotal: number }[];
  revisao: string;
}

export type ModoImportacao = 'adicionar' | 'substituir' | 'limpar';

export interface ImportarNegociosParametros {
  arquivo: File;
  mesCobranca: number;
  anoCobranca: number;
  modo: ModoImportacao;
  participantes: number[];
  revisao?: string;
  onProgress?: (percentual: number) => void;
}

export type TipoOperacaoImportacao = 'IMPORTACAO' | 'EXCLUSAO_COMPETENCIA';
export type ResultadoOperacaoImportacao = 'SUCESSO' | 'ERRO';

export interface ImportacaoOperacaoDto {
  publicId: string;
  tipoOperacao: TipoOperacaoImportacao;
  mesCobranca: number | null;
  anoCobranca: number | null;
  competenciaLegadoMes: number | null;
  competenciaLegadoAno: number | null;
  nomeArquivo?: string;
  usuarioId?: number;
  usuarioNome?: string;
  dataHora: string;
  quantidadeRegistros: number;
  quantidadeInseridos: number;
  quantidadeVinculados: number;
  quantidadeAtualizados: number;
  quantidadeExcluidos: number;
  valorTotal: number;
  resultado: ResultadoOperacaoImportacao;
  mensagem?: string;
  dadosAdicionais?: string;
}

export interface MesCobrancaResumoDto {
  mesCobranca: number;
  anoCobranca: number;
  quantidade: number;
  valorTotal: number;
}

function criarFormulario(parametros: ImportarNegociosParametros) {
  const formData = new FormData();
  formData.append('arquivo', parametros.arquivo);
  formData.append('mesCobranca', String(parametros.mesCobranca));
  formData.append('anoCobranca', String(parametros.anoCobranca));
  formData.append('modo', parametros.modo);
  parametros.participantes.forEach((id) => formData.append('participantes', String(id)));
  if (parametros.revisao) formData.append('revisao', parametros.revisao);
  return formData;
}

export async function importarNegocios(
  parametros: ImportarNegociosParametros,
): Promise<ImportacaoNegociosResultadoDto> {
  const { data } = await api.post<ImportacaoNegociosResultadoDto>(
    '/api/importacoes/negocios',
    criarFormulario(parametros),
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!parametros.onProgress || !event.total) return;
        parametros.onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)));
      },
    },
  );

  parametros.onProgress?.(100);
  return data;
}

export async function analisarPlanilhaNegocios(
  parametros: ImportarNegociosParametros,
): Promise<ImportacaoPlanilhaAnaliseDto> {
  const { data } = await api.post<ImportacaoPlanilhaAnaliseDto>(
    '/api/importacoes/negocios/analisar',
    criarFormulario(parametros),
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!parametros.onProgress || !event.total) return;
        parametros.onProgress(Math.min(95, Math.round((event.loaded / event.total) * 100)));
      },
    },
  );

  parametros.onProgress?.(100);
  return data;
}

export async function listarHistoricoImportacoes(
  limite = 100,
): Promise<ImportacaoOperacaoDto[]> {
  const { data } = await api.get<ImportacaoOperacaoDto[]>('/api/importacoes/historico', {
    params: { limite },
  });
  return data;
}

export async function consultarResumoMesCobranca(
  ano: number,
  mes: number,
): Promise<MesCobrancaResumoDto> {
  const { data } = await api.get<MesCobrancaResumoDto>(
    `/api/importacoes/meses-cobranca/${ano}/${mes}/resumo`,
  );
  return data;
}
