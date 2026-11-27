namespace ProgridPlus.Api.Voip;

public sealed record VoipConfiguracaoDto(
    string UrlApi,
    bool Ativo,
    bool TokenConfigurado,
    DateTime? AtualizadoEm,
    string? AtualizadoPor);

public sealed record SalvarVoipRequest(string? UrlApi, string? Token, bool Ativo);

public sealed record LigarVoipRequest(string? Ramal, string? Destino);

public sealed record LigarVoipResposta(string Mensagem);

public sealed class VoipFalha(int status, string codigo, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Codigo { get; } = codigo;
}
