namespace ProgridPlus.Api.Seguranca;

/// <summary>
/// Projeção mínima de seguranca.usuario para listagem no CRM.
/// Somente leitura — o CRM não gerencia usuários.
/// </summary>
public sealed record UsuarioListaDto(
    long    UsuarioId,
    Guid    UsuarioPublicId,
    string  Nome,
    string  Username,
    string  Email,
    long    PosicoesEmAberto,
    long    PosicoesRecuperadas,
    decimal RecuperadoNoMes
);

public sealed record UsuarioResumoDto(
    long    PosicoesEmAberto,
    long    PosicoesRecuperadas,
    decimal RecuperadoNoMes
);
