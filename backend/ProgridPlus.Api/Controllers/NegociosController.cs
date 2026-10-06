using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Negocios;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NegociosController : ControllerBase
{
    private readonly NegociosConsulta _consulta;
    private readonly NegocioComando   _comando;
    private readonly ILogger<NegociosController> _logger;

    public NegociosController(
        NegociosConsulta consulta,
        NegocioComando   comando,
        ILogger<NegociosController> logger)
    {
        _consulta = consulta;
        _comando  = comando;
        _logger   = logger;
    }

    /// <summary>
    /// Lista as etapas ativas do Kanban ordenadas por ordem.
    /// </summary>
    [HttpGet("etapas")]
    public async Task<IActionResult> ListarEtapas(CancellationToken ct)
    {
        var etapas = await _consulta.ListarEtapasAsync(ct);
        return Ok(etapas);
    }

    /// <summary>
    /// Lista os negócios ativos.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> ListarNegocios(CancellationToken ct)
    {
        var negocios = await _consulta.ListarNegociosAsync(ct);
        return Ok(negocios);
    }

    /// <summary>
    /// Cria um novo negócio no CRM.
    /// O operador é resolvido pelo usuário autenticado se não informado no body.
    /// CPF, nome e telefone NÃO são aceitos — o backend resolve pelo cliente selecionado.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CriarNegocio(
        [FromBody] CriarNegocioCommand cmd,
        CancellationToken ct)
    {
        // UsuarioId injetado pelo CrmAcessoHandler após autenticação
        if (HttpContext.Items["UsuarioId"] is not long usuarioLogadoId)
        {
            _logger.LogWarning("POST /api/negocios: UsuarioId ausente no contexto.");
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });
        }

        // Validação básica — o serviço também valida, mas retornamos 400 aqui
        if (cmd.ClientePublicId == Guid.Empty)
            return BadRequest(new { message = "clientePublicId é obrigatório." });

        if (cmd.EtapaPublicId == Guid.Empty)
            return BadRequest(new { message = "etapaPublicId é obrigatório." });

        try
        {
            var resultado = await _comando.CriarAsync(cmd, usuarioLogadoId, ct);
            return CreatedAtAction(
                nameof(ListarEtapas),   // rota de referência (sem recurso individual por enquanto)
                new { },
                resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("POST /api/negocios: {Erro}", ex.Message);
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
