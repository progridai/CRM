using System.Data;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

internal sealed record ImportacaoOperacaoRegistro(
    string TipoOperacao,
    int CompetenciaMes,
    int CompetenciaAno,
    string? NomeArquivo,
    long? UsuarioId,
    string? UsuarioNome,
    int QuantidadeRegistros,
    int QuantidadeInseridos,
    int QuantidadeAtualizados,
    int QuantidadeExcluidos,
    decimal ValorTotal,
    string Resultado,
    string? Mensagem,
    string? DadosAdicionaisJson);

internal static class ImportacaoOperacaoHistoricoStore
{
    private const string InsertSql = """
        INSERT INTO crm.importacao_operacao (
            tipo_operacao,
            competencia_mes,
            competencia_ano,
            nome_arquivo,
            usuario_id,
            usuario_nome,
            quantidade_registros,
            quantidade_inseridos,
            quantidade_atualizados,
            quantidade_excluidos,
            valor_total,
            resultado,
            mensagem,
            dados_adicionais
        ) VALUES (
            @TipoOperacao,
            @CompetenciaMes,
            @CompetenciaAno,
            @NomeArquivo,
            @UsuarioId,
            @UsuarioNome,
            @QuantidadeRegistros,
            @QuantidadeInseridos,
            @QuantidadeAtualizados,
            @QuantidadeExcluidos,
            @ValorTotal,
            @Resultado,
            @Mensagem,
            CAST(@DadosAdicionaisJson AS jsonb)
        );
        """;

    public static Task InserirAsync(
        NpgsqlConnection connection,
        IDbTransaction? transaction,
        ImportacaoOperacaoRegistro registro,
        CancellationToken ct = default) =>
        connection.ExecuteAsync(new CommandDefinition(
            InsertSql,
            registro,
            transaction,
            cancellationToken: ct));
}
