import { api } from './api';

export interface UsuarioBasicoDto {
  usuarioId: number;
  nome: string;
  username: string;
  email: string;
}

export interface UsuarioDto extends UsuarioBasicoDto {
  posicoesEmAberto?: number;
  posicoesRecuperadas?: number;
  recuperadoNoMes?: number;
}

export interface UsuarioResumoDto {
  posicoesEmAberto: number;
  posicoesRecuperadas: number;
  recuperadoNoMes: number;
}

export interface UsuariosResponseDto {
  total: number;
  itens: UsuarioDto[];
  resumo?: UsuarioResumoDto;
}

export async function listarUsuarios(
  busca = '',
): Promise<UsuariosResponseDto> {
  const params = new URLSearchParams({ busca });
  const { data } = await api.get<UsuariosResponseDto>(`/api/users?${params}`);
  return data;
}

export async function obterPerfilLogado(): Promise<UsuarioBasicoDto> {
  const { data } = await api.get<UsuarioBasicoDto>('/api/users/profile');
  return data;
}
