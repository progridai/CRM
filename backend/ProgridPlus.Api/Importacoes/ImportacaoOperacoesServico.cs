using System.Text.Json;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

public sealed class ImportacaoOperacoesServico
{
    private readonly string _connectionString;
    private readonly ILogger<ImportacaoOperacoesServico> _logger;

    public ImportacaoOperacoesServico(
        IConfiguration configuration,
        ILogger<ImportacaoOperacoesServico> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
        _logger = logger;
    }

    public async Task<IReadOnlyList<ImportacaoOperacaoDto>> ListarHistoricoAsync(
        int limite,
        CancellationToken ct = default)
    {
        limite = Math.Clamp(limite, 1, 200);
        const string sql = """
            SELECT
                public_id AS PublicId,
                tipo_operacao AS TipoOperacao,
                competencia_mes::int AS CompetenciaMes,
                competencia_ano::int AS CompetenciaAno,
                nome_arquivo AS NomeArquivo,
                usuario_id AS UsuarioId,
                usuario_nome AS UsuarioNome,
                data_hora AS DataHora,
                quantidade_registros AS QuantidadeRegistros,
                quantidade_inseridos AS QuantidadeInseridos,
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
            row.PublicId, row.TipoOperacao, row.CompetenciaMes, row.CompetenciaAno,
            row.NomeArquivo, row.UsuarioId, row.UsuarioNome,
            new DateTimeOffset(DateTime.SpecifyKind(row.DataHora, DateTimeKind.Utc)),
            row.QuantidadeRegistros, row.QuantidadeInseridos, row.QuantidadeAtualizados,
            row.QuantidadeExcluidos, row.ValorTotal, row.Resultado, row.Mensagem,
            row.DadosAdicionais)).ToList();
    }

    // Npgsql returns timestamptz as UTC DateTime; Dapper record constructors require matching types.
    private sealed record ImportacaoOperacaoRow(
        Guid PublicId,
        string TipoOperacao,
        int CompetenciaMes,
        int CompetenciaAno,
        string? NomeArquivo,
        long? UsuarioId,
        string? UsuarioNome,
        DateTime DataHora,
        int QuantidadeRegistros,
        int QuantidadeInseridos,
        int QuantidadeAtualizados,
        int QuantidadeExcluidos,
        decimal ValorTotal,
        string Resultado,
        string? Mensagem,
        string? DadosAdicionais);

    public async Task<CompetenciaResumoDto> ConsultarCompetenciaAsync(
        int competenciaAno,
        int competenciaMes,
        CancellationToken ct = default)
    {
        ValidarCompetencia(competenciaAno, competenciaMes);
        const string sql = """
            SELECT
                COUNT(*)::int AS Quantidade,
                COALESCE(SUM(valor), 0)::numeric AS ValorTotal
            FROM crm.negocio
            WHERE competencia_ano = @competenciaAno
              AND competencia_mes = @competenciaMes
              AND ativo = true
              AND deleted_at IS NULL;
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var resumo = await connection.QuerySingleAsync<CompetenciaResumoRow>(new CommandDefinition(
            sql,
            new { competenciaAno, competenciaMes },
            cancellationToken: ct));

        return new CompetenciaResumoDto(
            competenciaMes,
            competenciaAno,
            resumo.Quantidade,
            resumo.ValorTotal);
    }

    public async Task<ExclusaoCompetenciaResultadoDto> ExcluirCompetenciaAsync(
        int competenciaAno,
        int competenciaMes,
        long usuarioId,
        string? usuarioNome,
        CancellationToken ct = default)
    {
        ValidarCompetencia(competenciaAno, competenciaMes);

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);

        try
        {
            const string selectSql = """
                SELECT id AS Id, valor AS Valor
                FROM crm.negocio
                WHERE competencia_ano = @competenciaAno
                  AND competencia_mes = @competenciaMes
                  AND ativo = true
                  AND deleted_at IS NULL
                FOR UPDATE;
                """;

            var negocios = (await connection.QueryAsync<NegocioExclusaoRow>(new CommandDefinition(
                selectSql,
                new { competenciaAno, competenciaMes },
                transaction,
                cancellationToken: ct))).AsList();

            var ids = negocios.Select(negocio => negocio.Id).ToArray();
            var valorTotal = negocios.Sum(negocio => negocio.Valor);
            var quantidadeExcluida = 0;

            if (ids.Length > 0)
            {
                const string updateSql = """
                    UPDATE crm.negocio
                    SET ativo = false,
                        deleted_at = NOW(),
                        updated_at = NOW()
                    WHERE id = ANY(@ids)
                      AND ativo = true
                      AND deleted_at IS NULL;
                    """;
                quantidadeExcluida = await connection.ExecuteAsync(new CommandDefinition(
                    updateSql,
                    new { ids },
                    transaction,
                    cancellationToken: ct));
            }

            await ImportacaoOperacaoHistoricoStore.InserirAsync(
                connection,
                transaction,
                new ImportacaoOperacaoRegistro(
                    "EXCLUSAO_COMPETENCIA",
                    competenciaMes,
                    competenciaAno,
                    null,
                    usuarioId,
                    Limitar(usuarioNome, 200),
                    negocios.Count,
                    0,
                    0,
                    quantidadeExcluida,
                    valorTotal,
                    "SUCESSO",
                    $"{quantidadeExcluida} negócio(s) excluído(s) da competência.",
                    JsonSerializer.Serialize(new
                    {
                        estrategia = "exclusao_logica",
                        quantidadeAntes = negocios.Count,
                    })),
                ct);

            await transaction.CommitAsync(ct);

            return new ExclusaoCompetenciaResultadoDto(
                $"{competenciaAno:D4}-{competenciaMes:D2}",
                quantidadeExcluida,
                valorTotal,
                true);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            await RegistrarFalhaExclusaoAsync(
                competenciaAno,
                competenciaMes,
                usuarioId,
                usuarioNome,
                ex.Message);
            throw;
        }
    }

    private async Task RegistrarFalhaExclusaoAsync(
        int competenciaAno,
        int competenciaMes,
        long usuarioId,
        string? usuarioNome,
        string mensagem)
    {
        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(CancellationToken.None);
            await ImportacaoOperacaoHistoricoStore.InserirAsync(
                connection,
                null,
                new ImportacaoOperacaoRegistro(
                    "EXCLUSAO_COMPETENCIA",
                    competenciaMes,
                    competenciaAno,
                    null,
                    usuarioId,
                    Limitar(usuarioNome, 200),
                    0,
                    0,
                    0,
                    0,
                    0,
                    "ERRO",
                    Limitar(mensagem, 1000),
                    null),
                CancellationToken.None);
        }
        catch (Exception historyException)
        {
            _logger.LogError(historyException, "Não foi possível registrar a falha da exclusão no histórico operacional.");
        }
    }

    private static void ValidarCompetencia(int ano, int mes)
    {
        if (mes is < 1 or > 12)
            throw new ArgumentException("O mês de competência deve estar entre 1 e 12.");
        if (ano is < 2000 or > 2100)
            throw new ArgumentException("O ano de competência deve estar entre 2000 e 2100.");
    }

    private static string? Limitar(string? valor, int tamanho) =>
        string.IsNullOrWhiteSpace(valor)
            ? null
            : valor.Trim()[..Math.Min(valor.Trim().Length, tamanho)];

    private sealed class CompetenciaResumoRow
    {
        public int Quantidade { get; init; }
        public decimal ValorTotal { get; init; }
    }

    private sealed class NegocioExclusaoRow
    {
        public long Id { get; init; }
        public decimal Valor { get; init; }
    }
}
