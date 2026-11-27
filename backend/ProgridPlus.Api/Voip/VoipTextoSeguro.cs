using System.Text.RegularExpressions;

namespace ProgridPlus.Api.Voip;

public static class VoipTextoSeguro
{
    public const int LimitePadrao = 2000;

    private static readonly Regex Credencial = new(
        @"(?i)\b(password|pwd|user\s*id|username|x-api-token)\b\s*[:=]\s*(?:""[^""]*""|'[^']*'|\S+)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Regex TrechoConexao = new(
        @"(?i)\b(?:host|server|data\s*source|user\s*id|username|password|pwd|database|port)\s*=\s*[^;]*" +
        @"(?:\s*;\s*(?:host|server|data\s*source|user\s*id|username|password|pwd|database|port)\s*=\s*[^;]*)+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    public static string? Limpar(string? texto, string? segredo, int limite = LimitePadrao)
    {
        if (string.IsNullOrWhiteSpace(texto) || limite <= 0)
            return null;

        var limpo = texto.Replace("\0", "", StringComparison.Ordinal);
        if (!string.IsNullOrEmpty(segredo))
        {
            limpo = limpo.Replace(segredo, "[redigido]", StringComparison.Ordinal);
            var escapado = Uri.EscapeDataString(segredo);
            if (!string.Equals(escapado, segredo, StringComparison.Ordinal))
                limpo = limpo.Replace(escapado, "[redigido]", StringComparison.Ordinal);
        }

        limpo = TrechoConexao.Replace(limpo, "[redigido]");
        limpo = Credencial.Replace(limpo, "$1=[redigido]");

        if (limpo.Length <= limite)
            return limpo;
        return string.Concat(limpo.AsSpan(0, limite), "…");
    }

    public static string Cadeia(Exception ex, string? segredo, int limite = LimitePadrao)
    {
        var partes = new List<string>(3);
        for (var atual = ex; atual is not null && partes.Count < 3; atual = atual.InnerException)
        {
            if (string.IsNullOrWhiteSpace(atual.Message))
                continue;
            partes.Add($"{atual.GetType().Name}: {atual.Message}");
        }

        var texto = partes.Count == 0 ? ex.GetType().Name : string.Join(" | ", partes);
        return Limpar(texto, segredo, limite) ?? ex.GetType().Name;
    }
}
