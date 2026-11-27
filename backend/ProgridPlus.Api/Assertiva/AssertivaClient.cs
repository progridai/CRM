using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ProgridPlus.Api.Assertiva;

public sealed class AssertivaClient(IHttpClientFactory factory, AssertivaSegredo segredo)
{
    public const string NomeHttpClient = "Assertiva";
    private readonly SemaphoreSlim _tokenLock = new(1);
    private Token? _token;

    internal async Task TestarAutenticacaoAsync(AssertivaConfiguracao config, CancellationToken ct) =>
        _ = await ObterTokenAsync(config, renovar: true, ct);

    internal async Task<AssertivaResposta> ConsultarCpfAsync(
        AssertivaConfiguracao config, string cpf, CancellationToken ct)
    {
        var token = await ObterTokenAsync(config, renovar: false, ct);
        using var client = factory.CreateClient(NomeHttpClient);
        using var request = new HttpRequestMessage(HttpMethod.Get,
            $"localize/v3/cpf?cpf={cpf}&idFinalidade={config.Finalidade.ToString(CultureInfo.InvariantCulture)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Valor);
        using var response = await client.SendAsync(request, ct);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
            Interlocked.CompareExchange(ref _token, null, token);

        ValidarStatus(response, autenticacao: false);
        if (response.StatusCode == HttpStatusCode.NoContent)
            return new AssertivaResposta(null, new([], []), (int)response.StatusCode);

        using var json = await LerJsonAsync(response, ct);
        var raiz = json.RootElement;
        if (raiz.ValueKind != JsonValueKind.Object || !raiz.TryGetProperty("resposta", out var dados)
            || dados.ValueKind is not (JsonValueKind.Object or JsonValueKind.Null))
            throw RespostaInvalida((int)response.StatusCode);

        var protocolo = Texto(Campo(raiz, "cabecalho"), "protocolo");
        if (protocolo?.Length > 128)
            protocolo = null;

        var telefones = Campo(dados, "telefones");
        var numeros = LerTelefones(Campo(telefones, "moveis"), "CELULAR")
            .Concat(LerTelefones(Campo(telefones, "fixos"), "TELEFONE"))
            .Concat(LerTelefones(telefones, null))
            .DistinctBy(t => t.Numero)
            .ToArray();

        var emails = Itens(Campo(dados, "emails"))
            .Select(item => Texto(item, "email") ?? Valor(item))
            .Where(email => email is { Length: <= 254 } && System.Net.Mail.MailAddress.TryCreate(email, out var valido)
                && string.Equals(valido.Address, email, StringComparison.Ordinal))
            .Select(email => email!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new AssertivaResposta(protocolo, new(numeros, emails), (int)response.StatusCode);
    }

    private async Task<Token> ObterTokenAsync(AssertivaConfiguracao config, bool renovar, CancellationToken ct)
    {
        await _tokenLock.WaitAsync(ct);
        try
        {
            var atual = Volatile.Read(ref _token);
            if (!renovar && atual?.Revisao == config.Revisao && atual.ExpiraEm > DateTime.UtcNow)
                return atual;

            using var client = factory.CreateClient(NomeHttpClient);
            using var request = new HttpRequestMessage(HttpMethod.Post, "oauth2/v3/token");
            var credenciais = $"{config.ClientId}:{segredo.Abrir(config.SecretProtegido)}";
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes(credenciais)));
            request.Content = new FormUrlEncodedContent([new("grant_type", "client_credentials")]);

            var inicio = DateTime.UtcNow;
            using var response = await client.SendAsync(request, ct);
            ValidarStatus(response, autenticacao: true);
            using var json = await LerJsonAsync(response, ct);
            var valor = Texto(json.RootElement, "access_token");
            var expira = Campo(json.RootElement, "expires_in");
            if (string.IsNullOrWhiteSpace(valor) || valor.Any(char.IsWhiteSpace)
                || expira.ValueKind != JsonValueKind.Number || !expira.TryGetInt32(out var segundos) || segundos <= 0)
                throw RespostaInvalida((int)response.StatusCode);

            var token = new Token(config.Revisao, valor, inicio.AddSeconds(segundos - Math.Min(10, segundos / 5)));
            Volatile.Write(ref _token, token);
            return token;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private static void ValidarStatus(HttpResponseMessage response, bool autenticacao)
    {
        if (response.IsSuccessStatusCode)
            return;

        var status = (int)response.StatusCode;
        throw status switch
        {
            401 => new AssertivaFalha(502, "autenticacao", "A Assertiva recusou a autenticação. Verifique as credenciais.", status),
            403 => new AssertivaFalha(502, "permissao", "A Assertiva negou acesso. Verifique a permissão do contrato e a finalidade configurada.", status),
            429 or >= 500 => new AssertivaFalha(503, "indisponivel", "A Assertiva está indisponível. Tente novamente mais tarde.", status),
            _ => new AssertivaFalha(502, "rejeitada",
                autenticacao ? "A Assertiva rejeitou o pedido de autenticação." : "A Assertiva rejeitou a consulta.", status)
        };
    }

    private static async Task<JsonDocument> LerJsonAsync(HttpResponseMessage response, CancellationToken ct)
    {
        try
        {
            return JsonDocument.Parse(await response.Content.ReadAsByteArrayAsync(ct));
        }
        catch (JsonException)
        {
            throw RespostaInvalida((int)response.StatusCode);
        }
    }

    private static AssertivaFalha RespostaInvalida(int status) =>
        new(502, "resposta_invalida", "A Assertiva retornou uma resposta inesperada.", status);

    private static IEnumerable<AssertivaTelefone> LerTelefones(JsonElement grupo, string? tipo)
    {
        foreach (var item in Itens(grupo))
        {
            var numero = Texto(item, "numero") ?? Texto(item, "telefone") ?? Valor(item);
            if (numero is null)
                continue;

            var digitos = NormalizarTelefone(numero);
            var ddd = Texto(item, "ddd");
            if (digitos.Length is 8 or 9 && ddd is not null)
                digitos = NormalizarTelefone(ddd + digitos);

            if (digitos.Length is 10 or 11)
                yield return new(digitos, tipo ?? (digitos.Length == 11 ? "CELULAR" : "TELEFONE"));
        }
    }

    internal static string NormalizarTelefone(string numero)
    {
        var digitos = Regex.Replace(numero, "[^0-9]", "");
        return digitos.Length is 12 or 13 && digitos.StartsWith("55", StringComparison.Ordinal)
            ? digitos[2..] : digitos;
    }

    private static IEnumerable<JsonElement> Itens(JsonElement elemento) =>
        elemento.ValueKind == JsonValueKind.Array ? elemento.EnumerateArray() : [];

    private static JsonElement Campo(JsonElement elemento, string nome) =>
        elemento.ValueKind == JsonValueKind.Object && elemento.TryGetProperty(nome, out var valor) ? valor : default;

    private static string? Texto(JsonElement elemento, string campo) => Valor(Campo(elemento, campo));

    private static string? Valor(JsonElement elemento) => elemento.ValueKind switch
    {
        JsonValueKind.String => elemento.GetString()?.Trim(),
        JsonValueKind.Number => elemento.GetRawText(),
        _ => null
    };

    private sealed record Token(Guid Revisao, string Valor, DateTime ExpiraEm);
}
