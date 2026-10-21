namespace ProgridPlus.Api.Contatos;

public sealed record AtualizarTelefonesRequest(
    IReadOnlyList<TelefoneInput> Telefones
);

public sealed record TelefoneInput(
    long? Id,
    string Tipo,
    string Valor,
    bool Principal
);
