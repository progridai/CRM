using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Seguranca;
using ProgridPlus.Api.WhatsApp;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class WhatsAppController(
    WhatsAppServico whatsAppServico,
    ILogger<WhatsAppController> logger) : ControllerBase
{
    [HttpGet("disparos")]
    public async Task<ActionResult<IReadOnlyList<WhatsAppDisparoResumoDto>>> ListarDisparos(
        [FromQuery] int limite = 100,
        CancellationToken ct = default)
    {
        return Ok(await whatsAppServico.ListarDisparosAsync(limite, ct));
    }

    [HttpGet("disparos/{publicId:guid}")]
    public async Task<ActionResult<WhatsAppDisparoDetalheDto>> ObterDisparo(
        Guid publicId,
        CancellationToken ct)
    {
        var detalhe = await whatsAppServico.ObterDisparoAsync(publicId, ct);
        return detalhe is null
            ? NotFound(new { message = "Disparo não encontrado." })
            : Ok(detalhe);
    }

    [HttpPost("disparos/preview")]
    public async Task<ActionResult<WhatsAppPreviewDto>> PrepararPreview(
        [FromBody] CriarDisparoWhatsAppRequest request,
        CancellationToken ct)
    {
        if (request.NegocioIds is null || request.NegocioIds.Count == 0)
            return BadRequest(new { message = "Selecione pelo menos um negócio." });

        try
        {
            return Ok(await whatsAppServico.PrepararPreviewAsync(request.NegocioIds, ct));
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

    [HttpPost("disparos")]
    public async Task<ActionResult<WhatsAppDisparoResumoDto>> CriarDisparo(
        [FromBody] CriarDisparoWhatsAppRequest request,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioId)
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });

        var usuarioNome = HttpContext.Items["UsuarioAcesso"] is UsuarioAcesso acesso
            ? (string.IsNullOrWhiteSpace(acesso.Nome) ? acesso.Username : acesso.Nome)
            : "Sistema";

        try
        {
            var resultado = await whatsAppServico.CriarDisparoAsync(
                request,
                usuarioId,
                usuarioNome,
                ct);

            if (resultado.Status == "aceito_fornecedor")
            {
                return CreatedAtAction(
                    nameof(ObterDisparo),
                    new { publicId = resultado.PublicId },
                    resultado);
            }

            return StatusCode(StatusCodes.Status502BadGateway, resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            logger.LogWarning("Disparo de WhatsApp recusado por configuração/regra: {Erro}", ex.Message);
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
