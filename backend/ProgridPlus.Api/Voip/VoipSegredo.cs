using System.Security.Cryptography;
using System.Text;

namespace ProgridPlus.Api.Voip;

public sealed class VoipSegredo(IConfiguration configuration)
{
    private static readonly byte[] Finalidade = "progrid.crm.voip.api-token.v1"u8.ToArray();

    public string Proteger(string segredo)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var texto = Encoding.UTF8.GetBytes(segredo);
        var dados = new byte[28 + texto.Length];
        nonce.CopyTo(dados, 0);
        try
        {
            using var aes = CriarAes();
            aes.Encrypt(nonce, texto, dados.AsSpan(28), dados.AsSpan(12, 16), Finalidade);
            return Convert.ToBase64String(dados);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(texto);
        }
    }

    public string Abrir(string protegido)
    {
        byte[] dados;
        try
        {
            dados = Convert.FromBase64String(protegido);
        }
        catch (FormatException)
        {
            throw ChaveInvalida();
        }
        if (dados.Length <= 28)
            throw ChaveInvalida();

        var texto = new byte[dados.Length - 28];
        try
        {
            using var aes = CriarAes();
            aes.Decrypt(dados.AsSpan(0, 12), dados.AsSpan(28), dados.AsSpan(12, 16), texto, Finalidade);
            return Encoding.UTF8.GetString(texto);
        }
        catch (CryptographicException)
        {
            throw ChaveInvalida();
        }
        finally
        {
            CryptographicOperations.ZeroMemory(texto);
        }
    }

    private AesGcm CriarAes()
    {
        var configurada = configuration["Integracoes:Voip:ChaveProtecao"];
        if (string.IsNullOrWhiteSpace(configurada))
            configurada = configuration["Integracoes:Assertiva:ChaveProtecao"];

        byte[] chave;
        try
        {
            chave = Convert.FromBase64String(configurada ?? "");
        }
        catch (FormatException)
        {
            throw ChaveInvalida();
        }

        try
        {
            if (chave.Length != 32)
                throw ChaveInvalida();
            return new AesGcm(chave, 16);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(chave);
        }
    }

    private static VoipFalha ChaveInvalida() =>
        new(503, "chave_protecao", "A chave de proteção do Discador VoIP está ausente ou inválida. Contate a administração.");
}
