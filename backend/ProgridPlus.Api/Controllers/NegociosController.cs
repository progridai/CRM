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

    /// <summary>
    /// Altera a etapa de um negócio no Kanban.
    /// </summary>
    [HttpPatch("{publicId}/etapa")]
    public async Task<IActionResult> AlterarEtapa(
        [FromRoute] Guid publicId,
        [FromBody] AlterarEtapaCommand cmd,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioLogadoId)
        {
            _logger.LogWarning("PATCH /api/negocios/{Id}/etapa: UsuarioId ausente no contexto.", publicId);
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });
        }

        if (cmd.NovaEtapaPublicId == Guid.Empty)
            return BadRequest(new { message = "novaEtapaPublicId é obrigatório." });

        try
        {
            await _comando.MoverEtapaAsync(publicId, cmd.NovaEtapaPublicId, usuarioLogadoId, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("PATCH /api/negocios/{Id}/etapa: {Erro}", publicId, ex.Message);
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Lista as atividades de um ou mais negócios.
    /// Para o Kanban consolidado, pode receber múltiplos IDs separados por vírgula.
    /// </summary>
    [HttpGet("atividades")]
    public async Task<IActionResult> ListarAtividades([FromQuery] string negocioIds, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(negocioIds))
            return BadRequest(new { message = "negocioIds é obrigatório." });

        var idsArray = negocioIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(id => Guid.TryParse(id.Trim(), out var parsed) ? parsed : Guid.Empty)
            .Where(g => g != Guid.Empty)
            .ToArray();

        if (idsArray.Length == 0)
            return BadRequest(new { message = "IDs de negócios inválidos." });

        var atividades = await _consulta.ListarAtividadesAsync(idsArray, ct);
        return Ok(atividades);
    }

    /// <summary>
    /// Lista o histórico de alterações de um negócio específico.
    /// </summary>
    [HttpGet("{publicId}/historico")]
    public async Task<IActionResult> ListarHistorico([FromRoute] Guid publicId, CancellationToken ct)
    {
        var historico = await _consulta.ListarHistoricoAsync(publicId, ct);
        return Ok(historico);
    }

    /// <summary>
    /// Registra uma nova atividade num negócio.
    /// </summary>
    [HttpPost("{publicId}/atividades")]
    public async Task<IActionResult> RegistrarAtividade(
        [FromRoute] Guid publicId,
        [FromBody] RegistrarAtividadeCommand cmd,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioLogadoId)
        {
            _logger.LogWarning("POST /api/negocios/{Id}/atividades: UsuarioId ausente no contexto.", publicId);
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });
        }

        try
        {
            var resultado = await _comando.RegistrarAtividadeAsync(publicId, cmd, usuarioLogadoId, ct);
            return CreatedAtAction(
                nameof(ListarAtividades),
                new { negocioIds = publicId.ToString() },
                resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("POST /api/negocios/{Id}/atividades: {Erro}", publicId, ex.Message);
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
