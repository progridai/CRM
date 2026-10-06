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
        SELECT
            n.public_id       AS PublicId,
            n.valor           AS Valor,
            n.referencia      AS Referencia,
            n.competencia_mes AS CompetenciaMes,
            n.competencia_ano AS CompetenciaAno,
            n.origem          AS Origem,
            n.data_vencimento AS DataVencimento,
            e.codigo          AS EtapaCodigo,
            p.nome            AS NomeCliente,
            p.documento_principal AS Documento,
            (
                SELECT pc.valor 
                FROM core.pessoa_contato pc 
                WHERE pc.pessoa_id = cl.pessoa_id 
                  AND pc.tipo_contato = 'telefone' 
                  AND pc.principal = true 
                  AND pc.ativo = true 
                LIMIT 1
            ) AS TelefonePrincipal
        FROM crm.negocio n
        INNER JOIN crm.negocio_etapa e ON e.id = n.etapa_id
        INNER JOIN cadastro.cliente cl ON cl.id = n.cliente_id
        INNER JOIN core.pessoa p ON p.id = cl.pessoa_id
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
}

public sealed class NegocioListaDto
{
    public Guid PublicId { get; set; }
    public decimal Valor { get; set; }
    public string? Referencia { get; set; }
    public int CompetenciaMes { get; set; }
    public int CompetenciaAno { get; set; }
    public string? Origem { get; set; }
    public DateTime? DataVencimento { get; set; }
    public string EtapaCodigo { get; set; } = string.Empty;
    public string NomeCliente { get; set; } = string.Empty;
    public string? Documento { get; set; }
    public string? TelefonePrincipal { get; set; }
}
