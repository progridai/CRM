using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Negocios;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "CrmAcesso")]
public class AtividadesRapidasController(
    AtividadeAtalhosConsulta consulta,
    AtividadeAtalhoComando comando) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListarTodos([FromQuery] bool somenteAtivos = false, CancellationToken ct = default)
    {
        var atalhos = await consulta.ListarTodosAsync(somenteAtivos, ct);
        return Ok(atalhos);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] SalvarAtividadeAtalhoCommand cmd, CancellationToken ct = default)
    {
        var publicId = await comando.CriarAsync(cmd, ct);
        return Ok(new { publicId });
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Atualizar(Guid publicId, [FromBody] SalvarAtividadeAtalhoCommand cmd, CancellationToken ct = default)
    {
        await comando.AtualizarAsync(publicId, cmd, ct);
        return NoContent();
    }

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Excluir(Guid publicId, CancellationToken ct = default)
    {
        await comando.ExcluirAsync(publicId, ct);
        return NoContent();
    }
}
