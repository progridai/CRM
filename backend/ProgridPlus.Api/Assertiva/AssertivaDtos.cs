namespace ProgridPlus.Api.Assertiva;

public sealed record AssertivaConfiguracaoDto(
    string ClientId, bool SecretConfigurado, bool Ativa, int? Finalidade, int PrazoDias, int RetencaoDias, Guid? Revisao);

public sealed record SalvarAssertivaRequest(
    string? ClientId, string? ClientSecret, bool Ativa, int Finalidade, int PrazoDias, int RetencaoDias, Guid? Revisao);

public sealed record ConsultarAssertivaRequest(Guid OperacaoId, Guid? UltimaTentativaId, bool ConfirmouAntecipacao);
public sealed record AdicionarTelefoneAssertivaRequest(Guid ConsultaId, string Numero);

public sealed record AssertivaTelefone(string Numero, string Tipo);
public sealed record AssertivaContatos(IReadOnlyList<AssertivaTelefone> Telefones, IReadOnlyList<string> Emails);
public sealed record AssertivaTelefoneDto(string Numero, string Tipo, bool NoCadastro);
public sealed record AssertivaResultadoDto(
    Guid Id, DateTime Data, string Usuario, int DiasDecorridos, bool Recente, bool ResultadoExpirado,
    IReadOnlyList<AssertivaTelefoneDto> Telefones, IReadOnlyList<string> Emails, string Status);

public sealed record AssertivaFichaDto(
    bool Configurada, bool TemCpf, int PrazoDias, Guid? UltimaTentativaId,
    AssertivaResultadoDto? UltimaConsulta, AssertivaHistoricoDto? UltimaTentativa);
public sealed record AssertivaHistoricoDto(
    Guid Id, DateTime Data, string Usuario, string Status, string? Erro, string? Protocolo,
    bool DentroDoPrazo, bool AntecipacaoConfirmada, string Operacao);

internal sealed record AssertivaResposta(
    string? Protocolo, AssertivaContatos Contatos, int StatusHttp);

public sealed class AssertivaFalha(int status, string codigo, string message, int? statusHttp = null) : Exception(message)
{
    public int Status { get; } = status;
    public string Codigo { get; } = codigo;
    public int? StatusHttp { get; } = statusHttp;
}
