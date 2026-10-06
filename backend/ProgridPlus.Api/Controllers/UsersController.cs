using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Seguranca;

namespace ProgridPlus.Api.Controllers;

/// <summary>
/// Controller de usuários do CRM.
/// Somente leitura — o CRM não provisiona nem altera usuários em seguranca.*.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly SegurancaConsulta _seguranca;

    public UsersController(SegurancaConsulta seguranca)
    {
        _seguranca = seguranca;
    }

    /// <summary>
    /// Lista os usuários ativos do schema seguranca com busca opcional
    /// por nome, username ou e-mail.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string busca = "",
        CancellationToken ct    = default)
    {
        var usuarios = await _seguranca.ListarUsuariosAsync(busca, ct);
        return Ok(new { total = usuarios.Count, itens = usuarios });
    }

    /// <summary>
    /// Retorna os dados do usuário autenticado conforme consultado no schema seguranca.
    /// O UsuarioAcesso já está disponível via HttpContext.Items, preenchido pelo CrmAcessoHandler.
    /// </summary>
    [HttpGet("profile")]
    public IActionResult GetProfile()
    {
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