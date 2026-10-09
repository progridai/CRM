using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Seguranca;

/// <summary>
/// Consulta somente-leitura ao schema seguranca (administrado pelo WebApólice).
/// O CRM nunca insere, altera ou exclui dados neste schema.
/// </summary>
public sealed class SegurancaConsulta
{
    private readonly string _connectionString;

    public SegurancaConsulta(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
    }

    private const string QueryAcessoCrm = """
        SELECT
            u.id            AS UsuarioId,
            u.nome          AS Nome,
            u.email         AS Email,
            u.username      AS Username,
            u.ativo         AS Ativo,

            EXISTS (
                SELECT 1
                FROM seguranca.usuario_perfil up
                JOIN seguranca.perfil p ON p.id = up.perfil_id
                WHERE up.usuario_id = u.id
                  AND p.ativo = true
                  AND p.acesso_total = true
            ) AS AcessoTotal,

            EXISTS (
                SELECT 1
                FROM seguranca.usuario_perfil up
                JOIN seguranca.perfil p
                    ON p.id = up.perfil_id
                JOIN seguranca.perfil_permissao pp
                    ON pp.perfil_id = p.id
                JOIN seguranca.permissao pm
                    ON pm.id = pp.permissao_id
                JOIN seguranca.recurso r
                    ON r.id = pm.recurso_id
                JOIN seguranca.modulo m
                    ON m.id = r.modulo_id
                WHERE up.usuario_id = u.id
                  AND p.ativo  = true
                  AND pm.ativo = true
                  AND r.ativo  = true
                  AND m.ativo  = true
                  AND pm.codigo = 'crm.acessar'
            ) AS TemPermissaoCrm

        FROM seguranca.usuario u
        WHERE u.keycloak_sub = @sub;
        """;

    private const string QueryListarUsuarios = """
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
            u.id                    AS UsuarioId,
            COALESCE(u.nome, '')    AS Nome,
            COALESCE(u.username, '') AS Username,
            COALESCE(u.email, '')   AS Email,
            COUNT(n.id) FILTER (
                WHERE etapa_atual.classificacao = 'aberta'
            ) AS PosicoesEmAberto,
            COUNT(n.id) FILTER (
                WHERE etapa_atual.classificacao = 'fechada_positiva'
            ) AS PosicoesRecuperadas,
            COALESCE(
                SUM(n.valor) FILTER (
                    WHERE etapa_atual.classificacao = 'fechada_positiva'
                      AND DATE_TRUNC(
                            'month',
                            COALESCE(ur.recuperado_em, n.updated_at) AT TIME ZONE 'America/Sao_Paulo'
                          ) = DATE_TRUNC(
                            'month',
                            CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
                          )
                ),
                0
            ) AS RecuperadoNoMes
        FROM seguranca.usuario u
        LEFT JOIN crm.negocio n
            ON n.operador_id = u.id
           AND n.ativo = true
           AND n.deleted_at IS NULL
        LEFT JOIN crm.negocio_etapa etapa_atual
            ON etapa_atual.id = n.etapa_id
        LEFT JOIN ultima_recuperacao ur
            ON ur.negocio_id = n.id
        WHERE u.ativo = true
        GROUP BY u.id, u.nome, u.username, u.email
        ORDER BY u.nome;
        """;

    /// <summary>
    /// Retorna os usuários ativos do schema seguranca com os indicadores do CRM.
    /// Somente leitura — o CRM nunca altera seguranca.*.
    /// </summary>
    public async Task<IReadOnlyList<UsuarioListaDto>> ListarUsuariosAsync(
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<UsuarioListaDto>(
            new CommandDefinition(QueryListarUsuarios, cancellationToken: ct));
        return rows.AsList();
    }

    /// <summary>
    /// Retorna os dados de acesso do usuário identificado pelo sub do JWT,
    /// ou null se o sub não existir em seguranca.usuario.
    /// </summary>
    public async Task<UsuarioAcesso?> ConsultarAcessoAsync(string sub, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);

        // CommandDefinition permite passar o CancellationToken ao Dapper
        var cmd = new CommandDefinition(
            QueryAcessoCrm,
            parameters: new { sub },
            cancellationToken: ct);

        var row = await conn.QuerySingleOrDefaultAsync<UsuarioAcessoRow>(cmd);

        if (row is null)
            return null;

        return new UsuarioAcesso(
            row.UsuarioId,
            row.Nome ?? string.Empty,
            row.Email ?? string.Empty,
            row.Username ?? string.Empty,
            row.Ativo,
            row.AcessoTotal,
            row.TemPermissaoCrm);
    }

    // Classe interna para o mapeamento do Dapper (nomes case-insensitive)
    private sealed class UsuarioAcessoRow
    {
        public long UsuarioId { get; init; }
        public string? Nome { get; init; }
        public string? Email { get; init; }
        public string? Username { get; init; }
        public bool Ativo { get; init; }
        public bool AcessoTotal { get; init; }
        public bool TemPermissaoCrm { get; init; }
    }
}
