using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

public sealed class ImportacaoOperacoesServico(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Missing DefaultConnection string");

    public async Task<IReadOnlyList<ImportacaoOperacaoDto>> ListarHistoricoAsync(
        int limite,
        CancellationToken ct = default)
    {
        limite = Math.Clamp(limite, 1, 200);
        const string sql = """
            SELECT
                public_id AS PublicId,
                tipo_operacao AS TipoOperacao,
                mes_cobranca::int AS MesCobranca,
                ano_cobranca::int AS AnoCobranca,
                competencia_legado_mes::int AS CompetenciaLegadoMes,
                competencia_legado_ano::int AS CompetenciaLegadoAno,
                nome_arquivo AS NomeArquivo,
                usuario_id AS UsuarioId,
                usuario_nome AS UsuarioNome,
                data_hora AS DataHora,
                quantidade_registros AS QuantidadeRegistros,
                quantidade_inseridos AS QuantidadeInseridos,
                quantidade_vinculados AS QuantidadeVinculados,
                quantidade_atualizados AS QuantidadeAtualizados,
                quantidade_excluidos AS QuantidadeExcluidos,
                valor_total AS ValorTotal,
                resultado AS Resultado,
                mensagem AS Mensagem,
                dados_adicionais::text AS DadosAdicionais
            FROM crm.importacao_operacao
            ORDER BY data_hora DESC, id DESC
            LIMIT @limite;
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var rows = await connection.QueryAsync<ImportacaoOperacaoRow>(new CommandDefinition(
            sql,
            new { limite },
            cancellationToken: ct));
        return rows.Select(row => new ImportacaoOperacaoDto(
            row.PublicId, row.TipoOperacao, row.MesCobranca, row.AnoCobranca,
            row.CompetenciaLegadoMes, row.CompetenciaLegadoAno, row.NomeArquivo, row.UsuarioId, row.UsuarioNome,
            new DateTimeOffset(DateTime.SpecifyKind(row.DataHora, DateTimeKind.Utc)),
            row.QuantidadeRegistros, row.QuantidadeInseridos, row.QuantidadeVinculados, row.QuantidadeAtualizados,
            row.QuantidadeExcluidos, row.ValorTotal, row.Resultado, row.Mensagem, row.DadosAdicionais)).ToList();
    }

    public async Task<MesCobrancaResumoDto> ConsultarMesCobrancaAsync(
        int anoCobranca,
        int mesCobranca,
        CancellationToken ct = default)
    {
        ImportacaoNegociosServico.ValidarMesCobranca(mesCobranca, anoCobranca);
        const string sql = """
            SELECT COUNT(*)::int AS Quantidade, COALESCE(SUM(n.valor), 0) AS ValorTotal
            FROM crm.negocio n
            WHERE n.ativo = true AND n.deleted_at IS NULL
              AND EXISTS (
                  SELECT 1
                  FROM crm.importacao_negocio i
                  INNER JOIN crm.importacao_operacao o ON o.id = i.importacao_operacao_id
                  WHERE i.negocio_id = n.id AND o.resultado = 'SUCESSO'
                    AND i.encerrado_por_operacao_id IS NULL
                    AND o.ano_cobranca = @anoCobranca AND o.mes_cobranca = @mesCobranca
              );
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var resumo = await connection.QuerySingleAsync<MesCobrancaResumoRow>(new CommandDefinition(
            sql,
            new { anoCobranca, mesCobranca },
            cancellationToken: ct));
        return new MesCobrancaResumoDto(mesCobranca, anoCobranca, resumo.Quantidade, resumo.ValorTotal);
    }

    // Npgsql retorna timestamptz como DateTime UTC.
    private sealed record ImportacaoOperacaoRow(
        Guid PublicId,
        string TipoOperacao,
        int? MesCobranca,
        int? AnoCobranca,
        int? CompetenciaLegadoMes,
        int? CompetenciaLegadoAno,
        string? NomeArquivo,
        long? UsuarioId,
        string? UsuarioNome,
        DateTime DataHora,
        int QuantidadeRegistros,
        int QuantidadeInseridos,
        int QuantidadeVinculados,
        int QuantidadeAtualizados,
        int QuantidadeExcluidos,
        decimal ValorTotal,
        string Resultado,
        string? Mensagem,
        string? DadosAdicionais);

    private sealed record MesCobrancaResumoRow(int Quantidade, decimal ValorTotal);
}
