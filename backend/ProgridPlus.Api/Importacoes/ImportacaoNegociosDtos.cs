namespace ProgridPlus.Api.Importacoes;

public sealed record ImportacaoNegociosResultadoDto(
    string Arquivo,
    int CompetenciaMes,
    int CompetenciaAno,
    string Modo,
    IReadOnlyList<string> AbasLidas,
    int TotalLinhas,
    int Importados,
    int NaoImportados,
    int Substituidos,
    decimal ValorImportado,
    IReadOnlyList<ImportacaoNegociosLogDto> Logs);

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
    int CompetenciaMes,
    int CompetenciaAno,
    string? NomeArquivo,
    long? UsuarioId,
    string? UsuarioNome,
    DateTimeOffset DataHora,
    int QuantidadeRegistros,
    int QuantidadeInseridos,
    int QuantidadeAtualizados,
    int QuantidadeExcluidos,
    decimal ValorTotal,
    string Resultado,
    string? Mensagem,
    string? DadosAdicionais);

public sealed record CompetenciaResumoDto(
    int CompetenciaMes,
    int CompetenciaAno,
    int Quantidade,
    decimal ValorTotal);

public sealed record ExclusaoCompetenciaResultadoDto(
    string Competencia,
    int QuantidadeExcluida,
    decimal ValorTotal,
    bool Sucesso);

internal sealed record ImportacaoPlanilhaLinha(
    int Ordem,
    string Aba,
    int Linha,
    string Estipulante,
    string Matricula,
    string Nome,
    string Cpf,
    string Situacao,
    string Premio,
    string Cobrador);

internal sealed record ImportacaoPlanilhaResultado(
    IReadOnlyList<string> AbasLidas,
    IReadOnlyList<ImportacaoPlanilhaLinha> Linhas);
