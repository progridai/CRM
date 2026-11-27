using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Assertiva;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/assertiva")]
[Authorize(Policy = "Assertiva")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AssertivaController(AssertivaServico servico) : ControllerBase
{
    [HttpGet("acesso")]
    public IActionResult VerificarAcesso() => NoContent();

    [HttpGet("/api/integracoes/assertiva")]
    [Authorize(Policy = "Administrador")]
    public Task<IActionResult> ObterConfiguracao(CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.ObterConfiguracaoAsync(ct)));

    [HttpPut("/api/integracoes/assertiva")]
    [Authorize(Policy = "Administrador")]
    public Task<IActionResult> SalvarConfiguracao(SalvarAssertivaRequest request, CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.SalvarAsync(request, UsuarioId, ct)));

    [HttpPost("/api/integracoes/assertiva/testar")]
    [Authorize(Policy = "Administrador")]
    public Task<IActionResult> TestarAutenticacao(CancellationToken ct) =>
        ExecutarAsync(async () =>
        {
            await servico.TestarAsync(ct);
            return NoContent();
        });

    [HttpGet("clientes/{clienteId:guid}")]
    public Task<IActionResult> ObterFicha(Guid clienteId, CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.ObterFichaAsync(clienteId, ct)));

    [HttpGet("clientes/{clienteId:guid}/historico")]
    public Task<IActionResult> Historico(Guid clienteId, [FromQuery] int pagina = 1, CancellationToken ct = default) =>
        ExecutarAsync(async () => Ok(await servico.HistoricoAsync(clienteId, pagina, ct)));

    [HttpPost("clientes/{clienteId:guid}/consultas")]
    public Task<IActionResult> Consultar(Guid clienteId, ConsultarAssertivaRequest request, CancellationToken ct) =>
        ExecutarAsync(async () => Ok(await servico.ConsultarAsync(clienteId, request, UsuarioId, ct)));

    [HttpPost("/api/contatos/{clienteId:guid}/telefones/assertiva")]
    public Task<IActionResult> AdicionarTelefone(Guid clienteId, AdicionarTelefoneAssertivaRequest request, CancellationToken ct) =>
        ExecutarAsync(async () =>
        {
            await servico.AdicionarTelefoneAsync(clienteId, request, UsuarioId, ct);
            return NoContent();
        });

    private long UsuarioId => HttpContext.Items["UsuarioId"] is long id ? id
        : throw new AssertivaFalha(401, "usuario_ausente", "Usuário não identificado.");

    private async Task<IActionResult> ExecutarAsync(Func<Task<IActionResult>> acao)
    {
        try
        {
            return await acao();
        }
        catch (AssertivaFalha ex)
        {
            return StatusCode(ex.Status, new { codigo = ex.Codigo, message = ex.Message });
        }
    }
}
