using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Contatos;

/// <summary>
/// Consulta somente-leitura aos schemas cadastro e core (administrados pelo WebApólice).
/// O CRM nunca insere, altera ou exclui dados nestes schemas.
/// </summary>
public sealed class ContatosConsulta
{
    private readonly string _connectionString;

    public ContatosConsulta(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
    }

    // ─── Query principal ────────────────────────────────────────────────────────

    private const string QueryContatos = """
        SELECT
            cl.public_id              AS ClientePublicId,
            p.id                      AS PessoaId,
            p.nome                    AS Nome,
            p.documento_principal     AS Documento,
            p.tipo_pessoa             AS TipoPessoa,
            COALESCE(pc.valor, '')    AS TelefonePrincipal
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON  p.id           = cl.pessoa_id
            AND p.deleted_at   IS NULL
        LEFT JOIN core.pessoa_contato pc
            ON  pc.pessoa_id    = p.id
            AND pc.tipo_contato = 'telefone'
            AND pc.principal    = true
            AND pc.ativo        = true
        WHERE (
               @busca = ''
            OR p.nome_normalizado          ILIKE '%' || @busca || '%'
            OR p.documento_principal_limpo ILIKE '%' || @busca || '%'
            OR pc.valor_normalizado        ILIKE '%' || @busca || '%'
          )
        ORDER BY p.nome
        LIMIT  @tamanhoPagina
        OFFSET @offset;
        """;

    private const string QueryTotal = """
        SELECT COUNT(DISTINCT p.id)
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON  p.id           = cl.pessoa_id
            AND p.deleted_at   IS NULL
        LEFT JOIN core.pessoa_contato pc
            ON  pc.pessoa_id    = p.id
            AND pc.tipo_contato = 'telefone'
            AND pc.principal    = true
            AND pc.ativo        = true
        WHERE (
               @busca = ''
            OR p.nome_normalizado          ILIKE '%' || @busca || '%'
            OR p.documento_principal_limpo ILIKE '%' || @busca || '%'
            OR pc.valor_normalizado        ILIKE '%' || @busca || '%'
          );
        """;

    // ─── Método público ─────────────────────────────────────────────────────────

    /// <summary>
    /// Retorna a lista paginada de clientes do schema cadastro/core,
    /// com filtro opcional por nome, documento ou telefone.
    /// Cada item inclui o public_id do cliente (cadastro.cliente.public_id)
    /// que é o identificador preferencial para a criação de negócios.
    /// </summary>
    public async Task<ContatosPaginadosDto> ListarAsync(
        string busca,
        int    pagina,
        int    tamanhoPagina,
        CancellationToken ct = default)
    {
        busca        = (busca ?? string.Empty).Trim();
        pagina       = Math.Max(1, pagina);
        tamanhoPagina = Math.Clamp(tamanhoPagina, 1, 200);
        var offset   = (pagina - 1) * tamanhoPagina;

        var parametros = new { busca, tamanhoPagina, offset };

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);

        // Executamos sequencialmente: count primeiro, itens depois.
        var total = await conn.ExecuteScalarAsync<int>(
            new CommandDefinition(QueryTotal, parametros, cancellationToken: ct));

        var rows = await conn.QueryAsync<ContatoRow>(
            new CommandDefinition(QueryContatos, parametros, cancellationToken: ct));

        var itens = rows
            .Select(r => new ContatoDto(
                r.ClientePublicId,
                r.PessoaId,
                r.Nome ?? string.Empty,
                r.Documento ?? string.Empty,
                r.TipoPessoa,
                r.TelefonePrincipal ?? string.Empty))
            .ToList();

        return new ContatosPaginadosDto(
            Total:         total,
            Pagina:        pagina,
            TamanhoPagina: tamanhoPagina,
            Itens:         itens);
    }

    // ─── Mapeamento interno ─────────────────────────────────────────────────────

    private sealed class ContatoRow
    {
        public Guid    ClientePublicId   { get; init; }
        public long    PessoaId          { get; init; }
        public string? Nome              { get; init; }
        public string? Documento         { get; init; }
        public int     TipoPessoa        { get; init; }
        public string? TelefonePrincipal { get; init; }
    }
}
