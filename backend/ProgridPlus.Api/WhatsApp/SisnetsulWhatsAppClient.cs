using System.Net.Http.Json;
using System.Text.Json;

namespace ProgridPlus.Api.WhatsApp;

public sealed class SisnetsulWhatsAppClient(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<SisnetsulWhatsAppClient> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<SisnetsulDisparoResultado> DispararAsync(
        WhatsAppConfiguracaoInterna configuracao,
        string titulo,
        IReadOnlyList<WhatsAppDestinatarioPreparado> destinatarios,
        CancellationToken ct)
    {
        var apiKey = configuration["Integracoes:Sisnetsul:ApiKey"]?.Trim();
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("A credencial da integração Sisnetsul não está configurada no servidor.");

        var uri = new Uri(new Uri(configuracao.BaseUrl.TrimEnd('/') + "/"), configuracao.EndpointDisparo.TrimStart('/'));
        var payloadRequest = new
        {
            titulo,
            canal = configuracao.Canal,
            template = configuracao.TemplatePadrao,
            templateLanguage = configuracao.TemplateLanguage,
            destinatarios = destinatarios.Select(destinatario => new
            {
                numero = destinatario.Numero,
                nome = destinatario.Nome,
                mensagem = destinatario.Mensagem,
                variaveis = destinatario.Variaveis,
            }),
            abrirAtendimento = configuracao.AbrirAtendimento,
            filaDisparo = configuracao.FilaDisparo,
            agenteDisparo = configuracao.AgenteDisparo,
        };
        var corpoJson = JsonSerializer.Serialize(payloadRequest, JsonOptions);
        var curl = $"curl --request POST '{uri}' "
            + "--header 'Content-Type: application/json' "
            + "--header 'X-API-Key: <API_KEY>' "
            + $"--data-raw '{EscaparAspasSimples(corpoJson)}'";
        var requisicaoDiagnostico = new SisnetsulRequisicaoDiagnosticoDto(
            "POST",
            uri.ToString(),
            new Dictionary<string, string>
            {
                ["Content-Type"] = "application/json",
                ["X-API-Key"] = "[CONFIGURADA E MASCARADA]",
            },
            curl,
            titulo,
            configuracao.Canal,
            configuracao.TemplatePadrao,
            configuracao.TemplateLanguage,
            destinatarios.Count,
            destinatarios.Select(destinatario => destinatario.Numero).ToArray(),
            ["numero", "nome", "mensagem", "variaveis"],
            configuracao.AbrirAtendimento,
            configuracao.FilaDisparo,
            configuracao.AgenteDisparo);
        using var request = new HttpRequestMessage(HttpMethod.Post, uri);
        request.Headers.TryAddWithoutValidation("X-API-Key", apiKey);
        request.Content = JsonContent.Create(payloadRequest, options: JsonOptions);

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(configuracao.TimeoutSegundos));

        logger.LogInformation(
            "Iniciando chamada Sisnetsul: endpoint={Endpoint}, destinatarios={Total}, template={Template}.",
            uri,
            destinatarios.Count,
            configuracao.TemplatePadrao);

        try
        {
            using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeoutCts.Token);
            var body = await response.Content.ReadAsStringAsync(timeoutCts.Token);
            SisnetsulDisparoResponse? payload = null;

            if (!string.IsNullOrWhiteSpace(body))
            {
                try
                {
                    payload = JsonSerializer.Deserialize<SisnetsulDisparoResponse>(body, JsonOptions);
                }
                catch (JsonException)
                {
                    // O corpo não é confiável nem necessário para classificar o status HTTP.
                }
            }

            if (!response.IsSuccessStatusCode || payload?.Success == false)
            {
                var mensagem = payload?.Message
                    ?? $"A Sisnetsul respondeu com HTTP {(int)response.StatusCode}.";
                logger.LogWarning(
                    "Sisnetsul recusou o disparo: endpoint={Endpoint}, http={HttpStatus}, mensagem={Mensagem}.",
                    uri,
                    (int)response.StatusCode,
                    mensagem);
                return new SisnetsulDisparoResultado(
                    false,
                    payload?.CampanhaId,
                    mensagem,
                    false,
                    (int)response.StatusCode,
                    new SisnetsulDiagnosticoDto(
                        requisicaoDiagnostico,
                        new SisnetsulRespostaDiagnosticoDto((int)response.StatusCode, body)));
            }

            logger.LogInformation(
                "Sisnetsul aceitou o disparo: endpoint={Endpoint}, http={HttpStatus}, campanha={CampanhaId}.",
                uri,
                (int)response.StatusCode,
                payload?.CampanhaId);
            return new SisnetsulDisparoResultado(
                true,
                payload?.CampanhaId,
                payload?.Message ?? "Campanha aceita pela Sisnetsul.",
                false,
                (int)response.StatusCode,
                new SisnetsulDiagnosticoDto(
                    requisicaoDiagnostico,
                    new SisnetsulRespostaDiagnosticoDto((int)response.StatusCode, body)));
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return new SisnetsulDisparoResultado(
                false,
                null,
                "A chamada expirou sem confirmação. Consulte a Sisnetsul antes de reenviar.",
                true,
                null,
                new SisnetsulDiagnosticoDto(
                    requisicaoDiagnostico,
                    new SisnetsulRespostaDiagnosticoDto(null, null)));
        }
        catch (HttpRequestException ex)
        {
            return new SisnetsulDisparoResultado(
                false,
                null,
                $"Não foi possível confirmar a comunicação com a Sisnetsul: {ex.Message}",
                true,
                null,
                new SisnetsulDiagnosticoDto(
                    requisicaoDiagnostico,
                    new SisnetsulRespostaDiagnosticoDto(null, ex.Message)));
        }
    }

    private sealed record SisnetsulDisparoResponse(
        bool Success,
        string? Message,
        long? CampanhaId,
        string? Titulo,
        int? Total);

    private static string EscaparAspasSimples(string valor) => valor.Replace("'", "'\"'\"'", StringComparison.Ordinal);
}

public sealed record SisnetsulDisparoResultado(
    bool Sucesso,
    long? CampanhaId,
    string Mensagem,
    bool ResultadoIncerto,
    int? HttpStatusFornecedor,
    SisnetsulDiagnosticoDto? Diagnostico);

public sealed record WhatsAppConfiguracaoInterna(
    long IntegracaoId,
    Guid PublicId,
    string Nome,
    string Fornecedor,
    string BaseUrl,
    string EndpointDisparo,
    string Canal,
    string TemplatePadrao,
    string TemplateLanguage,
    string MensagemTemplate,
    string SeguroPadrao,
    bool AbrirAtendimento,
    string? FilaDisparo,
    string? AgenteDisparo,
    int TimeoutSegundos,
    DateTime AtualizadoEm,
    string? AtualizadoPor);

public sealed record WhatsAppDestinatarioPreparado(
    long NegocioId,
    Guid NegocioPublicId,
    IReadOnlyList<long> NegocioIdsRelacionados,
    string Nome,
    string Numero,
    string Mensagem,
    IReadOnlyDictionary<string, string> Variaveis);
