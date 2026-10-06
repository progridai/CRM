namespace ProgridPlus.Api.Negocios;

/// <summary>
/// Resposta mínima após a criação bem-sucedida de um negócio.
/// </summary>
public sealed record NegocioCriadoDto(
    Guid   PublicId,
    string NomeCliente,
    string EtapaNome,
    string EtapaCodigo,
    decimal Valor,
    int    CompetenciaMes,
    int    CompetenciaAno
);
