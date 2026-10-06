namespace ProgridPlus.Api.Negocios;

public sealed record EtapaDto(
    long Id,
    Guid PublicId,
    string Codigo,
    string Nome,
    string Classificacao,
    string? CorHex
);
