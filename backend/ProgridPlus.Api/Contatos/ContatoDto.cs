namespace ProgridPlus.Api.Contatos;

/// <summary>
/// Representa um cliente (cadastro.cliente → core.pessoa) retornado pelo autocomplete.
/// Os dados vêm exclusivamente dos schemas core e cadastro (somente leitura).
/// </summary>
public sealed record ContatoDto(
    Guid   ClientePublicId,    // cadastro.cliente.public_id — identificador preferencial
    long   PessoaId,           // core.pessoa.id — mantido para compatibilidade
    string Nome,
    string Documento,
    int    TipoPessoa,         // 1 = Física, 2 = Jurídica
    string TelefonePrincipal,
    string Origem,
    decimal TotalEmDebito,
    string StatusGeral,
    string StatusCodigo,
    string? StatusCorHex
);

/// <summary>
/// Envelope paginado de contatos.
/// </summary>
public sealed record ContatosPaginadosDto(
    int             Total,
    int             Pagina,
    int             TamanhoPagina,
    List<ContatoDto> Itens
);
