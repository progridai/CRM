using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.WhatsApp;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Administrador")]
public sealed class IntegracoesController(WhatsAppServico whatsAppServico) : ControllerBase
{
    [HttpGet("whatsapp")]
    public async Task<ActionResult<WhatsAppConfiguracaoDto>> ObterWhatsApp(CancellationToken ct)
    {
        try
        {
            return Ok(await whatsAppServico.ObterConfiguracaoAsync(ct));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("whatsapp")]
    public async Task<ActionResult<WhatsAppConfiguracaoDto>> AtualizarWhatsApp(
        [FromBody] AtualizarWhatsAppConfiguracaoRequest request,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioId)
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });

        try
        {
            return Ok(await whatsAppServico.AtualizarConfiguracaoAsync(request, usuarioId, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
