import { api } from './api';

export interface ContatoDto {
  pessoaId: number;
  clientePublicId: string;
  nome: string;
  documento: string;
  tipoPessoa: number;     // 1 = Física, 2 = Jurídica
  telefonePrincipal: string;
  telefones: ContatoTelefoneDto[];
  origem: string;
  totalEmDebito: number;
  statusGeral: string;
  statusCodigo: string;
  statusCorHex?: string;
}

export type TipoTelefone = 'CELULAR' | 'TELEFONE';

export interface ContatoTelefoneDto {
  id: number;
  tipo: TipoTelefone;
  valor: string;
  principal: boolean;
}

export interface TelefoneInput {
  id?: number;
  tipo: TipoTelefone;
  valor: string;
  principal: boolean;
}

export interface ContatosPaginadosDto {
  total: number;
  pagina: number;
  tamanhoPagina: number;
  itens: ContatoDto[];
}

export async function listarContatos(
  busca        = '',
  pagina       = 1,
  tamanhoPagina = 50,
  signal?: AbortSignal,
): Promise<ContatosPaginadosDto> {
  const params = new URLSearchParams({
    busca,
    pagina:        String(pagina),
    tamanhoPagina: String(tamanhoPagina),
  });
  const { data } = await api.get<ContatosPaginadosDto>(`/api/contatos?${params}`, { signal });
  return data;
}

export async function atualizarTelefones(
  pessoaId: number,
  telefones: TelefoneInput[],
): Promise<void> {
  await api.put(`/api/contatos/${pessoaId}/telefones`, { telefones });
}

export async function buscarContatos(
  termo: string,
  limite = 8,
  signal?: AbortSignal,
): Promise<ContatoDto[]> {
  const params = new URLSearchParams({ termo, limite: String(limite) });
  const { data } = await api.get<ContatoDto[]>(`/api/contatos/busca?${params}`, { signal });
  return data;
}
