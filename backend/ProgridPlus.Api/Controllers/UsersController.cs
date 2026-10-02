using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Seguranca;

namespace ProgridPlus.Api.Controllers;

/// <summary>
/// Controller de perfil do usuario autenticado no CRM.
/// O acesso ja foi validado pelo CrmAcessoHandler (policy "CrmAcesso").
/// Nao provisiona, nao altera, nao cria registros em seguranca.*.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    /// <summary>
    /// Retorna os dados do usuario autenticado conforme consultado no schema seguranca.
    /// O UsuarioAcesso ja esta disponivel via HttpContext.Items, preenchido pelo CrmAcessoHandler.
    /// </summary>
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
        // UsuarioAcesso disponibilizado pelo CrmAcessoHandler apos validacao de acesso
        if (HttpContext.Items["UsuarioAcesso"] is not UsuarioAcesso acesso)
            return StatusCode(500, new { message = "Contexto de acesso nao disponivel." });

        return Ok(new
        {
            usuarioId    = acesso.UsuarioId,
            username     = acesso.Username,
            nome         = acesso.Nome,
            email        = acesso.Email,
            isActive     = acesso.Ativo,
            acessoTotal  = acesso.AcessoTotal,
            permissoes   = acesso.TemPermissaoCrm ? new[] { "crm.acessar" } : Array.Empty<string>()
        });
    }
}