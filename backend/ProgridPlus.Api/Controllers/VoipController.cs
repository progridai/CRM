using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Voip;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/voip")]
[Authorize(Policy = "DiscadorVoip")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class VoipController(VoipServico servico, ILogger<VoipController> logger) : ControllerBase
{
    [HttpGet("configuracao")]
    [Authorize(Policy = "Administrador")]
    public Task<IActionResult> ObterConfiguracao(CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.ObterAsync(ct)));

    [HttpPut("configuracao")]
    [Authorize(Policy = "Administrador")]
    public Task<IActionResult> SalvarConfiguracao(SalvarVoipRequest request, CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.SalvarAsync(request, UsuarioId, ct)));

    [HttpPost("ligar")]
    public async Task<IActionResult> Ligar(LigarVoipRequest request, CancellationToken ct)
    {
        string? ramal = null;
        string? destino = null;
        try
        {
            ramal = ApenasDigitos(request.Ramal, 12);
            destino = ApenasDigitos(request.Destino, 15);
            return Ok(await servico.LigarAsync(request, ct));
        }
        catch (VoipFalha ex)
        {
            return Falha(ex);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            var tecnico = VoipTextoSeguro.Cadeia(ex, null);
            logger.LogError(
                "Erro interno ao iniciar a ligação VoIP. Tipo={TipoExcecao} Detalhe={DetalheTecnico} Ramal={Ramal} Destino={Destino}{NovaLinha}{StackTrace}",
                ex.GetType().Name,
                tecnico,
                ramal,
                destino,
                Environment.NewLine,
                ex.StackTrace);
            return StatusCode(500, new
            {
                codigo = "erro_interno",
                message = "Erro interno ao iniciar a ligação.",
                detalhe = new VoipErroDetalhe(
                    DateTime.UtcNow,
                    null,
                    ramal,
                    destino,
                    null,
                    null,
                    null,
                    ex.GetType().Name,
                    tecnico),
            });
        }
    }

    private long UsuarioId => HttpContext.Items["UsuarioId"] is long id ? id
        : throw new VoipFalha(401, "usuario_ausente", "Usuário não identificado.");

    private async Task<IActionResult> ExecutarAsync(Func<Task<IActionResult>> acao)
    {
        try
        {
            return await acao();
        }
        catch (VoipFalha ex)
        {
            return Falha(ex);
        }
    }

    private ObjectResult Falha(VoipFalha ex) =>
        StatusCode(ex.Status, new { codigo = ex.Codigo, message = ex.Message, detalhe = ex.Detalhe });

    private static string? ApenasDigitos(string? valor, int limite)
    {
        if (string.IsNullOrWhiteSpace(valor) || limite <= 0)
            return null;

        var digitos = new char[limite];
        var quantidade = 0;
        foreach (var caractere in valor)
        {
            if (!char.IsDigit(caractere))
                continue;
            digitos[quantidade++] = caractere;
            if (quantidade == limite)
                break;
        }

        return quantidade == 0 ? null : new string(digitos, 0, quantidade);
    }
}
