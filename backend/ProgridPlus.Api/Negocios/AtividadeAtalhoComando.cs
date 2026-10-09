using System.Data;
using Dapper;
using Npgsql;
using Microsoft.Extensions.Configuration;

namespace ProgridPlus.Api.Negocios;

public sealed class AtividadeAtalhoComando(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection") 
        ?? throw new InvalidOperationException("DefaultConnection is missing");
    public async Task<Guid> CriarAsync(SalvarAtividadeAtalhoCommand cmd, CancellationToken ct = default)
    {
        var sql = """
            INSERT INTO crm.atividade_atalho (nome, tipo, titulo_padrao, descricao_padrao, ordem, ativo)
            VALUES (@Nome, @Tipo, @TituloPadrao, @DescricaoPadrao, @Ordem, @Ativo)
            RETURNING public_id;
            """;

        await using var conn = new NpgsqlConnection(_connectionString);
        return await conn.QuerySingleAsync<Guid>(new CommandDefinition(sql, cmd, cancellationToken: ct));
    }

    public async Task AtualizarAsync(Guid publicId, SalvarAtividadeAtalhoCommand cmd, CancellationToken ct = default)
    {
        var sql = """
            UPDATE crm.atividade_atalho
            SET nome = @Nome,
                tipo = @Tipo,
                titulo_padrao = @TituloPadrao,
                descricao_padrao = @DescricaoPadrao,
                ordem = @Ordem,
                ativo = @Ativo,
                updated_at = NOW()
            WHERE public_id = @PublicId;
            """;

        var p = new DynamicParameters(cmd);
        p.Add("PublicId", publicId);

        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, p, cancellationToken: ct));
        if (rows == 0)
            throw new InvalidOperationException("Atalho não encontrado.");
    }

    public async Task ExcluirAsync(Guid publicId, CancellationToken ct = default)
    {
        var sql = "DELETE FROM crm.atividade_atalho WHERE public_id = @PublicId;";
        await using var conn = new NpgsqlConnection(_connectionString);
        var rows = await conn.ExecuteAsync(new CommandDefinition(sql, new { PublicId = publicId }, cancellationToken: ct));
        if (rows == 0)
            throw new InvalidOperationException("Atalho não encontrado.");
    }
}
