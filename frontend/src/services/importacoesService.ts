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
