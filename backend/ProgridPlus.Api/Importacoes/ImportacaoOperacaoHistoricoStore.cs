using System.Data;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

internal sealed record ImportacaoOperacaoRegistro(
    int MesCobranca,
    int AnoCobranca,
    string? NomeArquivo,
    long? UsuarioId,
    string? UsuarioNome,
    int QuantidadeRegistros,
    int QuantidadeInseridos,
    int QuantidadeVinculados,
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
            mes_cobranca,
            ano_cobranca,
            nome_arquivo,
            usuario_id,
            usuario_nome,
            quantidade_registros,
            quantidade_inseridos,
            quantidade_vinculados,
            quantidade_excluidos,
            valor_total,
            resultado,
            mensagem,
            dados_adicionais
        ) VALUES (
            'IMPORTACAO',
            @MesCobranca,
            @AnoCobranca,
            @NomeArquivo,
            @UsuarioId,
            @UsuarioNome,
            @QuantidadeRegistros,
            @QuantidadeInseridos,
            @QuantidadeVinculados,
            @QuantidadeExcluidos,
            @ValorTotal,
            @Resultado,
            @Mensagem,
            CAST(@DadosAdicionaisJson AS jsonb)
        ) RETURNING id;
        """;

    public static Task<long> InserirAsync(
        NpgsqlConnection connection,
        IDbTransaction? transaction,
        ImportacaoOperacaoRegistro registro,
        CancellationToken ct = default) =>
        connection.QuerySingleAsync<long>(new CommandDefinition(
            InsertSql,
            registro,
            transaction,
            cancellationToken: ct));
}
