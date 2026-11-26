using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/assertiva")]
[Authorize(Policy = "Assertiva")]
public sealed class AssertivaController : ControllerBase
{
    [HttpGet("acesso")]
    public IActionResult VerificarAcesso() => NoContent();
}
