import { api } from './api';

export interface ContatoDto {
  pessoaId: number;
  clientePublicId: string;
  nome: string;
  documento: string;
  tipoPessoa: number;     // 1 = Física, 2 = Jurídica
  telefonePrincipal: string;
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
): Promise<ContatosPaginadosDto> {
  const params = new URLSearchParams({
    busca,
    pagina:        String(pagina),
    tamanhoPagina: String(tamanhoPagina),
  });
  const { data } = await api.get<ContatosPaginadosDto>(`/api/contatos?${params}`);
  return data;
}
