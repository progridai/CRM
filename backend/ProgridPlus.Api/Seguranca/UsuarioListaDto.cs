namespace ProgridPlus.Api.Seguranca;

/// <summary>
/// Projeção mínima de seguranca.usuario para listagem no CRM.
/// Somente leitura — o CRM não gerencia usuários.
/// </summary>
public sealed record UsuarioListaDto(
    long   UsuarioId,
    string Nome,
    string Username,
    string Email
);
