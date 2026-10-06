import { api } from './api';

export interface UsuarioDto {
  usuarioId: number;
  nome: string;
  username: string;
  email: string;
}

export interface UsuariosResponseDto {
  total: number;
  itens: UsuarioDto[];
}

export async function listarUsuarios(
  busca = '',
): Promise<UsuariosResponseDto> {
  const params = new URLSearchParams({ busca });
  const { data } = await api.get<UsuariosResponseDto>(`/api/users?${params}`);
  return data;
}

export async function obterPerfilLogado(): Promise<UsuarioDto> {
  const { data } = await api.get<UsuarioDto>('/api/users/profile');
  return data;
}
