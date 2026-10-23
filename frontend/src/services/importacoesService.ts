import { api } from './api';

export type ModoImportacao = 'adicionar' | 'substituir';
export type StatusLogImportacao = 'sucesso' | 'nao_importado';

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
  competenciaMes: number;
  competenciaAno: number;
  modo: ModoImportacao;
  abasLidas: string[];
  totalLinhas: number;
  importados: number;
  naoImportados: number;
  substituidos: number;
  valorImportado: number;
  logs: ImportacaoNegociosLogDto[];
}

export interface ImportarNegociosParametros {
  arquivo: File;
  competenciaMes: number;
  competenciaAno: number;
  modo: ModoImportacao;
  onProgress?: (percentual: number) => void;
}

export type TipoOperacaoImportacao = 'IMPORTACAO' | 'EXCLUSAO_COMPETENCIA';
export type ResultadoOperacaoImportacao = 'SUCESSO' | 'ERRO';

export interface ImportacaoOperacaoDto {
  publicId: string;
  tipoOperacao: TipoOperacaoImportacao;
  competenciaMes: number;
  competenciaAno: number;
  nomeArquivo?: string;
  usuarioId?: number;
  usuarioNome?: string;
  dataHora: string;
  quantidadeRegistros: number;
  quantidadeInseridos: number;
  quantidadeAtualizados: number;
  quantidadeExcluidos: number;
  valorTotal: number;
  resultado: ResultadoOperacaoImportacao;
  mensagem?: string;
  dadosAdicionais?: string;
}

export interface CompetenciaResumoDto {
  competenciaMes: number;
  competenciaAno: number;
  quantidade: number;
  valorTotal: number;
}

export interface ExclusaoCompetenciaResultadoDto {
  competencia: string;
  quantidadeExcluida: number;
  valorTotal: number;
  sucesso: boolean;
}

export async function importarNegocios(
  parametros: ImportarNegociosParametros,
): Promise<ImportacaoNegociosResultadoDto> {
  const formData = new FormData();
  formData.append('arquivo', parametros.arquivo);
  formData.append('competenciaMes', String(parametros.competenciaMes));
  formData.append('competenciaAno', String(parametros.competenciaAno));
  formData.append('modo', parametros.modo);

  const { data } = await api.post<ImportacaoNegociosResultadoDto>(
    '/api/importacoes/negocios',
    formData,
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

export async function consultarResumoCompetencia(
  competenciaAno: number,
  competenciaMes: number,
): Promise<CompetenciaResumoDto> {
  const { data } = await api.get<CompetenciaResumoDto>(
    `/api/importacoes/competencias/${competenciaAno}/${competenciaMes}/resumo`,
  );
  return data;
}

export async function excluirCompetencia(
  competenciaAno: number,
  competenciaMes: number,
): Promise<ExclusaoCompetenciaResultadoDto> {
  const { data } = await api.delete<ExclusaoCompetenciaResultadoDto>(
    `/api/importacoes/competencias/${competenciaAno}/${competenciaMes}`,
  );
  return data;
}
