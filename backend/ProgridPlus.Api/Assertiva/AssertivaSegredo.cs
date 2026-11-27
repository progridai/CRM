using System.Security.Cryptography;
using System.Text;

namespace ProgridPlus.Api.Assertiva;

public sealed class AssertivaSegredo(IConfiguration configuration)
{
    private static readonly byte[] Finalidade = "progrid.crm.assertiva.client-secret.v1"u8.ToArray();

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
        byte[] chave;
        try
        {
            chave = Convert.FromBase64String(configuration["Integracoes:Assertiva:ChaveProtecao"] ?? "");
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

    private static AssertivaFalha ChaveInvalida() =>
        new(503, "chave_protecao", "A chave de proteção da Assertiva está ausente ou inválida. Contate a administração.");
}
