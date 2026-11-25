namespace ProgridPlus.Api.Importacoes;

public sealed record ImportacaoNegociosResultadoDto(
    string Arquivo,
    int MesCobranca,
    int AnoCobranca,
    IReadOnlyList<string> AbasLidas,
    int TotalLinhas,
    int Inseridos,
    int Vinculados,
    int NaoImportados,
    decimal ValorImportado,
    IReadOnlyList<ImportacaoNegociosLogDto> Logs);

public sealed record ImportacaoPlanilhaAnaliseDto(
    string Arquivo,
    IReadOnlyList<PeriodoCompetenciaDto> Competencias,
    IReadOnlyList<string> AbasLidas,
    int TotalLinhas,
    decimal ValorEncontrado,
    decimal ValorTotal,
    int Novos,
    int Existentes,
    int Rejeitados,
    int SemDistribuicao,
    int VinculosEncerrados,
    IReadOnlyList<ImportacaoNegociosLogDto> Logs,
    IReadOnlyList<ImportacaoCobradoraDto> Cobradoras,
    IReadOnlyList<ImportacaoDistribuicaoDto> Distribuicao,
    string Revisao);

public sealed record ImportacaoCobradoraDto(long Id, string Nome);

public sealed record ImportacaoDistribuicaoDto(long? CobradoraId, string Nome, int Clientes, int Negocios, decimal ValorTotal);

public sealed record PeriodoCompetenciaDto(int Mes, int Ano);

public sealed record ImportacaoNegociosLogDto(
    int Ordem,
    string Aba,
    int Linha,
    string Status,
    string Mensagem,
    string? Nome,
    string? Cpf,
    string? Referencia,
    decimal? Valor);

public sealed record ImportacaoOperacaoDto(
    Guid PublicId,
    string TipoOperacao,
    int? MesCobranca,
    int? AnoCobranca,
    int? CompetenciaLegadoMes,
    int? CompetenciaLegadoAno,
    string? NomeArquivo,
    long? UsuarioId,
    string? UsuarioNome,
    DateTimeOffset DataHora,
    int QuantidadeRegistros,
    int QuantidadeInseridos,
    int QuantidadeVinculados,
    int QuantidadeAtualizados,
    int QuantidadeExcluidos,
    decimal ValorTotal,
    string Resultado,
    string? Mensagem,
    string? DadosAdicionais);

public sealed record MesCobrancaResumoDto(
    int MesCobranca,
    int AnoCobranca,
    int Quantidade,
    decimal ValorTotal);

internal sealed record ImportacaoPlanilhaLinha(
    int Ordem,
    string Aba,
    int Linha,
    string Estipulante,
    string Matricula,
    string Nome,
    string Cpf,
    int CompetenciaMes,
    int CompetenciaAno,
    string Situacao,
    string Premio,
    string Cobrador,
    string NegocioPublicId);

internal sealed record ImportacaoPlanilhaResultado(
    IReadOnlyList<string> AbasLidas,
    IReadOnlyList<ImportacaoPlanilhaLinha> Linhas);
