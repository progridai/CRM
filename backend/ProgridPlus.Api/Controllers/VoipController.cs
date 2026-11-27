using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Voip;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/voip")]
[Authorize(Policy = "DiscadorVoip")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class VoipController(VoipServico servico) : ControllerBase
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
    public Task<IActionResult> Ligar(LigarVoipRequest request, CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.LigarAsync(request, ct)));

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
            return StatusCode(ex.Status, new { codigo = ex.Codigo, message = ex.Message });
        }
    }
}
