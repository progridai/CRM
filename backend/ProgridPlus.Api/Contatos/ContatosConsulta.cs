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
            COALESCE(pc.valor, '')    AS TelefonePrincipal,
            COALESCE(ultimo_negocio.origem, '') AS Origem,
            COALESCE(totais.total_em_debito, 0) AS TotalEmDebito,
            COALESCE(ultimo_negocio.etapa_nome, 'Sem negócio') AS StatusGeral,
            COALESCE(ultimo_negocio.etapa_codigo, '') AS StatusCodigo,
            ultimo_negocio.etapa_cor_hex AS StatusCorHex
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON  p.id           = cl.pessoa_id
            AND p.deleted_at   IS NULL
        LEFT JOIN core.pessoa_contato pc
            ON  pc.pessoa_id    = p.id
            AND pc.tipo_contato = 'telefone'
            AND pc.principal    = true
            AND pc.ativo        = true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(n.valor), 0) AS total_em_debito
            FROM crm.negocio n
            WHERE n.cliente_id = cl.id
              AND n.ativo = true
              AND n.deleted_at IS NULL
        ) totais ON true
        LEFT JOIN LATERAL (
            SELECT
                n.origem,
                etapa.nome AS etapa_nome,
                etapa.codigo AS etapa_codigo,
                etapa.cor_hex AS etapa_cor_hex
            FROM crm.negocio n
            INNER JOIN crm.negocio_etapa etapa ON etapa.id = n.etapa_id
            WHERE n.cliente_id = cl.id
              AND n.ativo = true
              AND n.deleted_at IS NULL
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT 1
        ) ultimo_negocio ON true
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
                r.TelefonePrincipal ?? string.Empty,
                r.Origem ?? string.Empty,
                r.TotalEmDebito,
                r.StatusGeral ?? "Sem negócio",
                r.StatusCodigo ?? string.Empty,
                r.StatusCorHex))
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
        public string? Origem            { get; init; }
        public decimal TotalEmDebito     { get; init; }
        public string? StatusGeral       { get; init; }
        public string? StatusCodigo      { get; init; }
        public string? StatusCorHex      { get; init; }
    }
}
