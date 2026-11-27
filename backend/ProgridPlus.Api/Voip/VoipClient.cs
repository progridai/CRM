using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;

namespace ProgridPlus.Api.Voip;

public sealed class VoipClient(IHttpClientFactory factory, ILogger<VoipClient> logger)
{
    public const string NomeHttpClient = "VoipClick2Call";
    private const int FolgaLeitura = 2048;

    public async Task DispararAsync(string url, string token, string ramal, string destino, CancellationToken ct)
    {
        using var client = factory.CreateClient(NomeHttpClient);
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        if (!request.Headers.TryAddWithoutValidation("X-Api-Token", token))
        {
            var recusado = CriarDetalhe(url, token, ramal, destino, null, null, null, null,
                "O cabeçalho da integração foi recusado pelo cliente HTTP.");
            logger.LogWarning(
                "Token do Discador VoIP recusado ao montar a requisição. Endpoint={Endpoint} Ramal={Ramal} Destino={Destino}",
                recusado.Endpoint, ramal, destino);
            throw new VoipFalha(500, "token_invalido", "O token salvo da integração não pôde ser enviado. Salve-o novamente.", recusado);
        }

        request.Content = JsonContent.Create(new { ramal, destino });
        var cronometro = Stopwatch.StartNew();
        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (OperationCanceledException ex) when (!ct.IsCancellationRequested)
        {
            cronometro.Stop();
            throw FalhaDeTransporte(
                url, token, ramal, destino, cronometro.ElapsedMilliseconds, ex,
                504, "tempo_esgotado", "A Sisnetsul não respondeu a tempo. Tente novamente.",
                LogLevel.Warning);
        }
        catch (HttpRequestException ex)
        {
            cronometro.Stop();
            throw FalhaDeTransporte(
                url, token, ramal, destino, cronometro.ElapsedMilliseconds, ex,
                502, "provedor_indisponivel", "Não foi possível conectar à API do Discador VoIP.",
                LogLevel.Error);
        }

        using (response)
        {
            if (response.IsSuccessStatusCode)
                return;

            var corpo = await LerCorpoAsync(response, token, ct);
            cronometro.Stop();
            var detalhe = CriarDetalhe(
                url, token, ramal, destino,
                (int)response.StatusCode,
                cronometro.ElapsedMilliseconds,
                corpo,
                null,
                null);
            logger.LogWarning(
                "Sisnetsul não concluiu a ligação. Endpoint={Endpoint} Http={StatusHttp} Ramal={Ramal} Destino={Destino} DuracaoMs={DuracaoMs} Corpo={Corpo}",
                detalhe.Endpoint, detalhe.StatusHttpProvedor, ramal, destino, detalhe.DuracaoMs, corpo);
            throw new VoipFalha(502, "provedor", Mensagem(response.StatusCode), detalhe);
        }
    }

    private VoipFalha FalhaDeTransporte(
        string url,
        string token,
        string ramal,
        string destino,
        long duracaoMs,
        Exception ex,
        int status,
        string codigo,
        string message,
        LogLevel nivel)
    {
        var tecnico = VoipTextoSeguro.Cadeia(ex, token);
        if (ex is HttpRequestException { HttpRequestError: var erro and not HttpRequestError.Unknown })
            tecnico = VoipTextoSeguro.Limpar($"{tecnico} | HttpRequestError={erro}", token) ?? tecnico;

        var detalhe = CriarDetalhe(url, token, ramal, destino, null, duracaoMs, null, ex.GetType().Name, tecnico);
        logger.Log(
            nivel,
            "Falha ao chamar a Sisnetsul. Endpoint={Endpoint} Ramal={Ramal} Destino={Destino} DuracaoMs={DuracaoMs} Tipo={TipoExcecao} Detalhe={DetalheTecnico}",
            detalhe.Endpoint, ramal, destino, duracaoMs, detalhe.TipoExcecao, detalhe.DetalheTecnico);
        return new VoipFalha(status, codigo, message, detalhe);
    }

    private static VoipErroDetalhe CriarDetalhe(
        string url,
        string token,
        string ramal,
        string destino,
        int? statusHttp,
        long? duracaoMs,
        string? resposta,
        string? tipo,
        string? tecnico) => new(
            DateTime.UtcNow,
            VoipTextoSeguro.Limpar(url, token, 500),
            ramal,
            destino,
            statusHttp,
            duracaoMs,
            resposta,
            tipo,
            tecnico);

    private static async Task<string?> LerCorpoAsync(HttpResponseMessage response, string token, CancellationToken ct)
    {
        try
        {
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var reader = new StreamReader(stream);
            var extra = Math.Min(Math.Max(token.Length, FolgaLeitura), 16 * 1024);
            var buffer = new char[VoipTextoSeguro.LimitePadrao + extra];
            var lidos = await reader.ReadBlockAsync(buffer.AsMemory(0, buffer.Length), ct);
            if (lidos == 0)
                return null;
            return VoipTextoSeguro.Limpar(new string(buffer, 0, lidos), token);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            return VoipTextoSeguro.Limpar(
                $"Falha ao ler o corpo da resposta: {ex.GetType().Name}: {ex.Message}",
                token);
        }
    }

    private static string Mensagem(HttpStatusCode status) => status switch
    {
        HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden =>
            "A Sisnetsul recusou o token da integração. Confira a configuração do Discador VoIP.",
        HttpStatusCode.NotFound =>
            "A URL da API do Discador VoIP não foi encontrada.",
        HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout =>
            "A Sisnetsul não respondeu a tempo. Tente novamente.",
        _ => "A Sisnetsul não concluiu a ligação. Tente novamente em instantes.",
    };
}
