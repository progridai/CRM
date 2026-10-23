using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Negocios;

public sealed class NegociosConsulta
{
    private readonly string _connectionString;

    public NegociosConsulta(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
    }

    private const string QueryEtapas = """
        SELECT 
            id AS Id,
            public_id AS PublicId,
            codigo AS Codigo,
            nome AS Nome,
            classificacao AS Classificacao,
            cor_hex AS CorHex
        FROM crm.negocio_etapa
        WHERE ativo = true
        ORDER BY ordem ASC;
        """;

    private const string QueryNegocios = """
        WITH ultima_recuperacao AS (
            SELECT
                h.negocio_id,
                MAX(h.ocorrido_em) AS recuperado_em
            FROM crm.negocio_historico h
            INNER JOIN crm.negocio_etapa etapa_historico
                ON etapa_historico.id = h.etapa_nova_id
               AND etapa_historico.classificacao = 'fechada_positiva'
            GROUP BY h.negocio_id
        )
        SELECT
            n.public_id       AS PublicId,
            n.valor           AS Valor,
            n.referencia      AS Referencia,
            n.competencia_mes AS CompetenciaMes,
            n.competencia_ano AS CompetenciaAno,
            n.origem          AS Origem,
            n.notas           AS Notas,
            n.data_vencimento AS DataVencimento,
            CASE
                WHEN e.classificacao = 'fechada_positiva'
                    THEN COALESCE(ur.recuperado_em, n.updated_at)
                ELSE NULL
            END AS RecuperadoEm,
            n.operador_id     AS OperadorId,
            op.nome           AS NomeOperador,
            e.codigo          AS EtapaCodigo,
            p.nome            AS NomeCliente,
            p.documento_principal AS Documento,
            (
                SELECT pc.valor 
                FROM core.pessoa_contato pc 
                WHERE pc.pessoa_id = cl.pessoa_id 
                  AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
                  AND pc.ativo = true 
                  AND NULLIF(BTRIM(pc.valor), '') IS NOT NULL
                ORDER BY
                  pc.principal DESC,
                  CASE UPPER(pc.tipo_contato)
                    WHEN 'CELULAR' THEN 0
                    ELSE 1
                  END,
                  pc.id
                LIMIT 1
            ) AS TelefonePrincipal,
            (
                SELECT COUNT(*)
                FROM crm.atividade a
                WHERE a.negocio_id = n.id
            ) AS AtividadesCount
        FROM crm.negocio n
        INNER JOIN crm.negocio_etapa e ON e.id = n.etapa_id
        INNER JOIN cadastro.cliente cl ON cl.id = n.cliente_id
        INNER JOIN core.pessoa p ON p.id = cl.pessoa_id
        LEFT JOIN seguranca.usuario op ON op.id = n.operador_id
        LEFT JOIN ultima_recuperacao ur ON ur.negocio_id = n.id
        WHERE n.ativo = true AND n.deleted_at IS NULL
        ORDER BY n.created_at DESC;
        """;

    public async Task<IReadOnlyList<EtapaDto>> ListarEtapasAsync(CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<EtapaDto>(
            new CommandDefinition(QueryEtapas, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<NegocioListaDto>> ListarNegociosAsync(CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<NegocioListaDto>(
            new CommandDefinition(QueryNegocios, cancellationToken: ct));
        return rows.AsList();
    }

    private const string QueryAtividades = """
        SELECT 
            a.public_id AS PublicId,
            a.tipo AS Tipo,
            a.titulo AS Titulo,
            a.descricao AS Descricao,
            a.ocorrido_em AS OcorridoEm,
            u.nome AS NomeUsuario,
            n.public_id AS NegocioPublicId
        FROM crm.atividade a
        INNER JOIN seguranca.usuario u ON u.id = a.usuario_id
        INNER JOIN crm.negocio n ON n.id = a.negocio_id
        WHERE n.public_id = ANY(@NegocioIds)
        ORDER BY a.ocorrido_em DESC;
        """;

    public async Task<IReadOnlyList<AtividadeDto>> ListarAtividadesAsync(Guid[] negocioIds, CancellationToken ct = default)
    {
        if (negocioIds.Length == 0) return Array.Empty<AtividadeDto>();

        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<AtividadeDto>(
            new CommandDefinition(QueryAtividades, new { NegocioIds = negocioIds }, cancellationToken: ct));
        return rows.AsList();
    }

    private const string QueryHistorico = """
        SELECT
            h.id AS Id,
            h.tipo_evento AS TipoEvento,
            h.descricao AS Descricao,
            h.ocorrido_em AS OcorridoEm,
            COALESCE(u.nome, 'Sistema') AS NomeUsuario,
            ea.nome AS EtapaAnteriorNome,
            en.nome AS EtapaNovaNome
        FROM crm.negocio_historico h
        INNER JOIN crm.negocio n ON n.id = h.negocio_id
        LEFT JOIN seguranca.usuario u ON u.id = h.usuario_id
        LEFT JOIN crm.negocio_etapa ea ON ea.id = h.etapa_anterior_id
        LEFT JOIN crm.negocio_etapa en ON en.id = h.etapa_nova_id
        WHERE n.public_id = @NegocioPublicId
        ORDER BY h.ocorrido_em DESC;
        """;

    public async Task<IReadOnlyList<HistoricoDto>> ListarHistoricoAsync(Guid negocioPublicId, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<HistoricoDto>(
            new CommandDefinition(QueryHistorico, new { NegocioPublicId = negocioPublicId }, cancellationToken: ct));
        return rows.AsList();
    }
}

public sealed class HistoricoDto
{
    public long Id { get; set; }
    public string TipoEvento { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public DateTime OcorridoEm { get; set; }
    public string NomeUsuario { get; set; } = string.Empty;
    public string? EtapaAnteriorNome { get; set; }
    public string? EtapaNovaNome { get; set; }
}

public sealed class NegocioListaDto
{
    public Guid PublicId { get; set; }
    public decimal Valor { get; set; }
    public string? Referencia { get; set; }
    public int CompetenciaMes { get; set; }
    public int CompetenciaAno { get; set; }
    public string? Origem { get; set; }
    public string? Notas { get; set; }
    public DateTime? DataVencimento { get; set; }
    public DateTime? RecuperadoEm { get; set; }
    public string EtapaCodigo { get; set; } = string.Empty;
    public string NomeCliente { get; set; } = string.Empty;
    public string? Documento { get; set; }
    public string? TelefonePrincipal { get; set; }
    public long? OperadorId { get; set; }
    public string? NomeOperador { get; set; }
    public int AtividadesCount { get; set; }
}
