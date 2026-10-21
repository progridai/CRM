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
