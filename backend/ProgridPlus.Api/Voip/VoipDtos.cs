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

public sealed record VoipErroDetalhe(
    DateTime HorarioUtc,
    string? Endpoint,
    string? Ramal,
    string? Destino,
    int? StatusHttpProvedor,
    long? DuracaoMs,
    string? RespostaProvedor,
    string? TipoExcecao,
    string? DetalheTecnico);

public sealed class VoipFalha(int status, string codigo, string message, VoipErroDetalhe? detalhe = null) : Exception(message)
{
    public int Status { get; } = status;
    public string Codigo { get; } = codigo;
    public VoipErroDetalhe? Detalhe { get; } = detalhe;
}
