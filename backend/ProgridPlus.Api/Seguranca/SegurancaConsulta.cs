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
        SELECT
            u.id        AS UsuarioId,
            u.nome      AS Nome,
            u.username  AS Username,
            u.email     AS Email
        FROM seguranca.usuario u
        WHERE u.ativo = true
          AND (
               @busca = ''
            OR u.nome     ILIKE '%' || @busca || '%'
            OR u.username ILIKE '%' || @busca || '%'
            OR u.email    ILIKE '%' || @busca || '%'
          )
        ORDER BY u.nome;
        """;

    /// <summary>
    /// Retorna os usuários ativos do schema seguranca com filtro opcional.
    /// Somente leitura — o CRM nunca altera seguranca.*.
    /// </summary>
    public async Task<IReadOnlyList<UsuarioListaDto>> ListarUsuariosAsync(
        string busca, CancellationToken ct = default)
    {
        busca = (busca ?? string.Empty).Trim();
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.QueryAsync<UsuarioListaDto>(
            new CommandDefinition(QueryListarUsuarios, new { busca }, cancellationToken: ct));
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
