using Dapper;
using Npgsql;
using System.Text.Json;

namespace ProgridPlus.Api.Contatos;

/// <summary>
/// Consulta dados de contatos nos schemas cadastro e core, compartilhados com o WebApólice.
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
        WITH contatos_paginados AS MATERIALIZED (
            SELECT
                cl.id                  AS ClienteId,
                cl.public_id           AS ClientePublicId,
                p.id                   AS PessoaId,
                p.nome                 AS Nome,
                p.documento_principal  AS Documento,
                p.tipo_pessoa          AS TipoPessoa
            FROM cadastro.cliente cl
            INNER JOIN core.pessoa p
                ON  p.id = cl.pessoa_id
                AND p.deleted_at IS NULL
            WHERE (
                   @busca = ''
                OR p.nome_normalizado          ILIKE '%' || @busca || '%'
                OR p.documento_principal_limpo ILIKE '%' || @busca || '%'
                OR EXISTS (
                    SELECT 1
                    FROM core.pessoa_contato pc_busca
                    WHERE pc_busca.pessoa_id = p.id
                      AND UPPER(pc_busca.tipo_contato) IN ('CELULAR', 'TELEFONE')
                      AND pc_busca.ativo = true
                      AND pc_busca.valor_normalizado ILIKE '%' || @busca || '%'
                )
            )
            ORDER BY p.nome, p.id
            LIMIT  @tamanhoPagina
            OFFSET @offset
        )
        SELECT
            contato.ClientePublicId,
            contato.PessoaId,
            contato.Nome,
            contato.Documento,
            contato.TipoPessoa,
            COALESCE(telefones.json, '[]'::jsonb)::text AS TelefonesJson,
            COALESCE(ultimo_negocio.origem, '') AS Origem,
            COALESCE(totais.total_em_debito, 0) AS TotalEmDebito,
            COALESCE(ultimo_negocio.etapa_nome, 'Sem negócio') AS StatusGeral,
            COALESCE(ultimo_negocio.etapa_codigo, '') AS StatusCodigo,
            ultimo_negocio.etapa_cor_hex AS StatusCorHex
        FROM contatos_paginados contato
        LEFT JOIN LATERAL (
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', pc.id,
                    'tipo', UPPER(pc.tipo_contato),
                    'valor', pc.valor,
                    'principal', pc.principal
                )
                ORDER BY
                    pc.principal DESC,
                    CASE UPPER(pc.tipo_contato)
                        WHEN 'CELULAR' THEN 0
                        ELSE 1
                    END,
                    pc.id
            ) AS json
            FROM core.pessoa_contato pc
            WHERE pc.pessoa_id = contato.PessoaId
              AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
              AND pc.ativo = true
              AND NULLIF(BTRIM(pc.valor), '') IS NOT NULL
        ) telefones ON true
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(n.valor), 0) AS total_em_debito
            FROM crm.negocio n
            WHERE n.cliente_id = contato.ClienteId
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
            WHERE n.cliente_id = contato.ClienteId
              AND n.ativo = true
              AND n.deleted_at IS NULL
            ORDER BY n.created_at DESC, n.id DESC
            LIMIT 1
        ) ultimo_negocio ON true
        ORDER BY contato.Nome, contato.PessoaId;
        """;

    private const string QueryTotalSemBusca = """
        SELECT COUNT(*)
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON p.id = cl.pessoa_id
           AND p.deleted_at IS NULL;
        """;

    private const string QueryTotalComBusca = """
        SELECT COUNT(*)
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON p.id = cl.pessoa_id
           AND p.deleted_at IS NULL
        WHERE p.nome_normalizado          ILIKE '%' || @busca || '%'
           OR p.documento_principal_limpo ILIKE '%' || @busca || '%'
           OR EXISTS (
                SELECT 1
                FROM core.pessoa_contato pc
                WHERE pc.pessoa_id = p.id
                  AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
                  AND pc.ativo = true
                  AND pc.valor_normalizado ILIKE '%' || @busca || '%'
           );
        """;

    private const string QueryBuscaRapida = """
        WITH correspondencias AS (
            SELECT
                cl.id AS ClienteId,
                cl.public_id AS ClientePublicId,
                p.id AS PessoaId,
                p.nome AS Nome,
                p.documento_principal AS Documento,
                p.tipo_pessoa AS TipoPessoa,
                CASE
                    WHEN p.nome_normalizado ILIKE @busca || '%' THEN 0
                    ELSE 2
                END AS Relevancia
            FROM core.pessoa p
            INNER JOIN cadastro.cliente cl ON cl.pessoa_id = p.id
            WHERE p.deleted_at IS NULL
              AND p.nome_normalizado ILIKE '%' || @busca || '%'

            UNION ALL

            SELECT
                cl.id,
                cl.public_id,
                p.id,
                p.nome,
                p.documento_principal,
                p.tipo_pessoa,
                CASE
                    WHEN p.documento_principal_limpo = @buscaDigitos THEN 0
                    WHEN p.documento_principal_limpo LIKE @buscaDigitos || '%' THEN 1
                    ELSE 2
                END
            FROM core.pessoa p
            INNER JOIN cadastro.cliente cl ON cl.pessoa_id = p.id
            WHERE @buscaDigitos <> ''
              AND p.deleted_at IS NULL
              AND p.documento_principal_limpo LIKE '%' || @buscaDigitos || '%'

            UNION ALL

            SELECT
                cl.id,
                cl.public_id,
                p.id,
                p.nome,
                p.documento_principal,
                p.tipo_pessoa,
                CASE
                    WHEN pc.valor_normalizado = @buscaDigitos THEN 0
                    WHEN pc.valor_normalizado LIKE @buscaDigitos || '%' THEN 1
                    ELSE 2
                END
            FROM core.pessoa_contato pc
            INNER JOIN core.pessoa p
                ON p.id = pc.pessoa_id
               AND p.deleted_at IS NULL
            INNER JOIN cadastro.cliente cl ON cl.pessoa_id = p.id
            WHERE @buscaDigitos <> ''
              AND pc.ativo = true
              AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
              AND pc.valor_normalizado LIKE '%' || @buscaDigitos || '%'
        ),
        candidatos AS MATERIALIZED (
            SELECT DISTINCT ON (PessoaId)
                ClienteId,
                ClientePublicId,
                PessoaId,
                Nome,
                Documento,
                TipoPessoa,
                Relevancia
            FROM correspondencias
            ORDER BY PessoaId, Relevancia
        ),
        limitados AS MATERIALIZED (
            SELECT *
            FROM candidatos
            ORDER BY Relevancia, Nome, PessoaId
            LIMIT @limite
        )
        SELECT
            contato.ClientePublicId,
            contato.PessoaId,
            contato.Nome,
            contato.Documento,
            contato.TipoPessoa,
            COALESCE(telefones.json, '[]'::jsonb)::text AS TelefonesJson,
            '' AS Origem,
            0::numeric AS TotalEmDebito,
            'Sem negócio' AS StatusGeral,
            '' AS StatusCodigo,
            NULL::varchar AS StatusCorHex
        FROM limitados contato
        LEFT JOIN LATERAL (
            SELECT JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', pc.id,
                    'tipo', UPPER(pc.tipo_contato),
                    'valor', pc.valor,
                    'principal', pc.principal
                )
                ORDER BY
                    pc.principal DESC,
                    CASE UPPER(pc.tipo_contato) WHEN 'CELULAR' THEN 0 ELSE 1 END,
                    pc.id
            ) AS json
            FROM core.pessoa_contato pc
            WHERE pc.pessoa_id = contato.PessoaId
              AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
              AND pc.ativo = true
              AND NULLIF(BTRIM(pc.valor), '') IS NOT NULL
        ) telefones ON true
        ORDER BY contato.Relevancia, contato.Nome, contato.PessoaId;
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

        await using var totalConnection = new NpgsqlConnection(_connectionString);
        await using var itemsConnection = new NpgsqlConnection(_connectionString);
        await Task.WhenAll(
            totalConnection.OpenAsync(ct),
            itemsConnection.OpenAsync(ct));

        var totalQuery = busca.Length == 0 ? QueryTotalSemBusca : QueryTotalComBusca;
        var totalTask = totalConnection.ExecuteScalarAsync<int>(
            new CommandDefinition(totalQuery, parametros, cancellationToken: ct));
        var rowsTask = itemsConnection.QueryAsync<ContatoRow>(
            new CommandDefinition(QueryContatos, parametros, cancellationToken: ct));

        await Task.WhenAll(totalTask, rowsTask);
        var total = await totalTask;
        var rows = await rowsTask;

        var itens = rows.Select(MapContato).ToList();

        return new ContatosPaginadosDto(
            Total:         total,
            Pagina:        pagina,
            TamanhoPagina: tamanhoPagina,
            Itens:         itens);
    }

    /// <summary>
    /// Busca rápida para campos de autocomplete. Não executa COUNT(*) porque o
    /// seletor precisa apenas dos primeiros resultados, não do total da base.
    /// </summary>
    public async Task<IReadOnlyList<ContatoDto>> BuscarAsync(
        string busca,
        int limite,
        CancellationToken ct = default)
    {
        busca = (busca ?? string.Empty).Trim();
        if (busca.Length < 2)
            return [];

        limite = Math.Clamp(limite, 1, 20);
        var buscaDigitos = new string(busca.Where(char.IsDigit).ToArray());
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);

        var rows = await connection.QueryAsync<ContatoRow>(new CommandDefinition(
            QueryBuscaRapida,
            new { busca, buscaDigitos, limite },
            cancellationToken: ct));

        return rows.Select(MapContato).ToList();
    }

    // ─── Mapeamento interno ─────────────────────────────────────────────────────

    private static ContatoDto MapContato(ContatoRow row)
    {
        var telefones = JsonSerializer.Deserialize<List<ContatoTelefoneDto>>(
                row.TelefonesJson ?? "[]",
                JsonSerializerOptions.Web)
            ?? [];

        // WebAPolice permite contatos sem um telefone explicitamente principal.
        // Para o editor do CRM, garantimos exatamente um principal quando há números.
        var principalIndex = telefones.FindIndex(t => t.Principal);
        if (principalIndex < 0 && telefones.Count > 0)
            principalIndex = 0;

        for (var i = 0; i < telefones.Count; i++)
            telefones[i] = telefones[i] with { Principal = i == principalIndex };

        return new ContatoDto(
            row.ClientePublicId,
            row.PessoaId,
            row.Nome ?? string.Empty,
            row.Documento ?? string.Empty,
            row.TipoPessoa,
            telefones.FirstOrDefault()?.Valor ?? string.Empty,
            telefones,
            row.Origem ?? string.Empty,
            row.TotalEmDebito,
            row.StatusGeral ?? "Sem negócio",
            row.StatusCodigo ?? string.Empty,
            row.StatusCorHex);
    }

    private sealed class ContatoRow
    {
        public Guid    ClientePublicId   { get; init; }
        public long    PessoaId          { get; init; }
        public string? Nome              { get; init; }
        public string? Documento         { get; init; }
        public int     TipoPessoa        { get; init; }
        public string? TelefonesJson      { get; init; }
        public string? Origem            { get; init; }
        public decimal TotalEmDebito     { get; init; }
        public string? StatusGeral       { get; init; }
        public string? StatusCodigo      { get; init; }
        public string? StatusCorHex      { get; init; }
    }
}
