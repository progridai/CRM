namespace ProgridPlus.Api.Negocios;

public record RegistrarAtividadeCommand(
    string Tipo,
    string Titulo,
    string? Descricao
);
