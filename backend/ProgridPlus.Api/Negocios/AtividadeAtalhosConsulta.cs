using System.Data;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;

namespace ProgridPlus.Api.Negocios;

public sealed class AtividadeAtalhosConsulta(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection") 
        ?? throw new InvalidOperationException("DefaultConnection is missing");

    public async Task<IEnumerable<AtividadeAtalhoDto>> ListarTodosAsync(bool somenteAtivos = false, CancellationToken ct = default)
    {
        var sql = """
            SELECT
                public_id AS PublicId,
                nome AS Nome,
                tipo AS Tipo,
                titulo_padrao AS TituloPadrao,
                descricao_padrao AS DescricaoPadrao,
                ordem AS Ordem,
                ativo AS Ativo
            FROM crm.atividade_atalho
            WHERE (@SomenteAtivos = false OR ativo = true)
            ORDER BY ordem ASC, nome ASC;
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        return await conn.QueryAsync<AtividadeAtalhoDto>(
            new CommandDefinition(sql, new { SomenteAtivos = somenteAtivos }, cancellationToken: ct));
    }
}
