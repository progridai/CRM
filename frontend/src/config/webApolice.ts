const WEBAPOLICE_BASE_URL = (
  import.meta.env.VITE_WEBAPOLICE_URL?.trim() || 'https://webapolice.bravida.com.br'
).replace(/\/+$/, '');

function buildWebApoliceUrl(route: string): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${WEBAPOLICE_BASE_URL}/#${normalizedRoute}`;
}

export function getWebApoliceClienteUrl(clientePublicId: string): string {
  return buildWebApoliceUrl(`/clientes/${encodeURIComponent(clientePublicId)}`);
}

export function getWebApoliceUsuarioUrl(usuarioPublicId: string): string {
  return buildWebApoliceUrl(`/seguranca/usuarios/${encodeURIComponent(usuarioPublicId)}`);
}

export function getWebApoliceNovoUsuarioUrl(): string {
  return buildWebApoliceUrl('/seguranca/usuarios/novo');
}
