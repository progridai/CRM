using System.Text.RegularExpressions;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Voip;

public sealed class VoipServico(IConfiguration configuration, VoipSegredo segredo, VoipClient client)
{
    public const string UrlPadrao = "https://bravida.sisnetsul.com.br/api/click2call/";
    private static readonly Regex Digitos = new(@"\D", RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private NpgsqlConnection Conectar() => new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<VoipConfiguracaoDto> ObterAsync(CancellationToken ct)
    {
        await using var db = Conectar();
        var atual = await LerAsync(db, ct);
        return Projetar(atual);
    }

    public async Task<VoipConfiguracaoDto> SalvarAsync(SalvarVoipRequest request, long usuario, CancellationToken ct)
    {
        var url = ValidarUrl(request.UrlApi);
        var tokenInformado = request.Token?.Trim();
        if (tokenInformado?.Length > 2048)
            throw new VoipFalha(400, "token_invalido", "O token informado é longo demais.");

        await using var db = Conectar();
        var atual = await LerAsync(db, ct);
        var protegido = string.IsNullOrEmpty(tokenInformado)
            ? atual?.TokenCriptografado
            : segredo.Proteger(tokenInformado);
        if (string.IsNullOrEmpty(protegido))
            throw new VoipFalha(400, "token_ausente", "Informe o token da API para salvar a integração.");

        await db.ExecuteAsync(new CommandDefinition("""
            INSERT INTO crm.voip_configuracao (id, url_api, token_criptografado, ativo, atualizado_por)
            VALUES (1, @url, @token, @ativo, @usuario)
            ON CONFLICT (id) DO UPDATE SET
                url_api = excluded.url_api,
                token_criptografado = excluded.token_criptografado,
                ativo = excluded.ativo,
                atualizado_em = now(),
                atualizado_por = excluded.atualizado_por;
            """, new { url, token = protegido, ativo = request.Ativo, usuario }, cancellationToken: ct));

        return Projetar(await LerAsync(db, ct)
            ?? throw new VoipFalha(500, "configuracao_indisponivel", "Não foi possível confirmar a configuração salva."));
    }

    public async Task<LigarVoipResposta> LigarAsync(LigarVoipRequest request, CancellationToken ct)
    {
        var ramal = Digitos.Replace(request.Ramal ?? "", "");
        var destino = Digitos.Replace(request.Destino ?? "", "");
        if (ramal.Length is < 1 or > 12 || destino.Length is < 8 or > 15)
            throw new VoipFalha(400, "destino_invalido", "Informe o ramal e um telefone de destino válido.");

        await using var db = Conectar();
        var atual = await LerAsync(db, ct);
        if (atual is null || !atual.Ativo || string.IsNullOrEmpty(atual.TokenCriptografado))
            throw new VoipFalha(409, "integracao_inativa", "A integração do Discador VoIP não está ativa ou ainda não tem token.");

        var token = segredo.Abrir(atual.TokenCriptografado);
        try
        {
            await client.DispararAsync(atual.UrlApi, token, ramal, destino, ct);
        }
        catch (VoipFalha)
        {
            throw;
        }
        catch (OperationCanceledException ex) when (!ct.IsCancellationRequested)
        {
            throw new VoipFalha(
                504,
                "tempo_esgotado",
                "A Sisnetsul não respondeu a tempo. Tente novamente.",
                DetalheTransporte(atual.UrlApi, ramal, destino, ex, token));
        }
        catch (HttpRequestException ex)
        {
            throw new VoipFalha(
                502,
                "provedor_indisponivel",
                "Não foi possível conectar à API do Discador VoIP.",
                DetalheTransporte(atual.UrlApi, ramal, destino, ex, token));
        }

        return new LigarVoipResposta($"Chamada iniciada! Atenda no ramal {ramal}.");
    }

    private static VoipErroDetalhe DetalheTransporte(string endpoint, string ramal, string destino, Exception ex, string token) =>
        new(
            DateTime.UtcNow,
            VoipTextoSeguro.Limpar(endpoint, token, 500),
            ramal,
            destino,
            null,
            null,
            null,
            ex.GetType().Name,
            VoipTextoSeguro.Cadeia(ex, token));

    private static VoipConfiguracaoDto Projetar(VoipConfiguracao? atual) => new(
        atual?.UrlApi ?? UrlPadrao,
        atual?.Ativo ?? false,
        !string.IsNullOrEmpty(atual?.TokenCriptografado),
        atual?.AtualizadoEm,
        atual?.AtualizadoPor);

    private static string ValidarUrl(string? informada)
    {
        var url = (informada ?? "").Trim();
        if (url.Length is < 12 or > 500
            || !Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || string.IsNullOrEmpty(uri.Host)
            || !string.IsNullOrEmpty(uri.UserInfo))
            throw new VoipFalha(400, "url_invalida", "Informe uma URL https:// válida para a API do Discador VoIP.");
        return VoipClient.GarantirBarraFinal(uri);
    }

    private static Task<VoipConfiguracao?> LerAsync(NpgsqlConnection db, CancellationToken ct) =>
        db.QuerySingleOrDefaultAsync<VoipConfiguracao>(new CommandDefinition("""
            SELECT c.url_api AS UrlApi,
                   c.token_criptografado AS TokenCriptografado,
                   c.ativo AS Ativo,
                   c.atualizado_em AS AtualizadoEm,
                   COALESCE(u.nome, u.username) AS AtualizadoPor
            FROM crm.voip_configuracao c
            LEFT JOIN seguranca.usuario u ON u.id = c.atualizado_por
            WHERE c.id = 1;
            """, cancellationToken: ct));

    private sealed record VoipConfiguracao(
        string UrlApi, string? TokenCriptografado, bool Ativo, DateTime? AtualizadoEm, string? AtualizadoPor);
}
