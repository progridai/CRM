namespace ProgridPlus.Api.Negocios;

public record AtividadeDto(
    Guid PublicId,
    string Tipo,
    string Titulo,
    string? Descricao,
    DateTime OcorridoEm,
    string NomeUsuario,
    Guid NegocioPublicId
);
