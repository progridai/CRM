using System.Net;
using System.Net.Http.Json;

namespace ProgridPlus.Api.Voip;

public sealed class VoipClient(IHttpClientFactory factory)
{
    public const string NomeHttpClient = "VoipClick2Call";

    public async Task DispararAsync(string url, string token, string ramal, string destino, CancellationToken ct)
    {
        using var client = factory.CreateClient(NomeHttpClient);
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        if (!request.Headers.TryAddWithoutValidation("X-Api-Token", token))
            throw new VoipFalha(500, "token_invalido", "O token salvo da integração não pôde ser enviado. Salve-o novamente.");
        request.Content = JsonContent.Create(new { ramal, destino });

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new VoipFalha(504, "tempo_esgotado", "A Sisnetsul não respondeu a tempo. Tente novamente.");
        }
        catch (HttpRequestException)
        {
            throw new VoipFalha(502, "provedor_indisponivel", "Não foi possível conectar à API do Discador VoIP.");
        }

        using (response)
        {
            if (response.IsSuccessStatusCode)
                return;

            throw new VoipFalha(502, "provedor", Mensagem(response.StatusCode));
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
