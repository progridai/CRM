using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Contatos;

namespace ProgridPlus.Api.Controllers;

/// <summary>
/// Consulta contatos e mantém os telefones compartilhados com o WebAPolice.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContatosController : ControllerBase
{
    private readonly ContatosConsulta _consulta;
    private readonly ContatoTelefoneComando _telefoneComando;
    private readonly ILogger<ContatosController> _logger;

    public ContatosController(
        ContatosConsulta consulta,
        ContatoTelefoneComando telefoneComando,
        ILogger<ContatosController> logger)
    {
        _consulta = consulta;
        _telefoneComando = telefoneComando;
        _logger = logger;
    }

    /// <summary>
    /// Lista contatos paginados com busca opcional por nome, CPF/CNPJ ou telefone.
    /// </summary>
    /// <param name="busca">Texto de busca livre (parcial). Vazio retorna todos.</param>
    /// <param name="pagina">Número da página (base 1). Padrão: 1.</param>
    /// <param name="tamanhoPagina">Itens por página. Padrão: 50. Máximo: 200.</param>
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string busca         = "",
        [FromQuery] int    pagina        = 1,
        [FromQuery] int    tamanhoPagina = 50,
        CancellationToken  ct            = default)
    {
        var resultado = await _consulta.ListarAsync(busca, pagina, tamanhoPagina, ct);
        return Ok(resultado);
    }

    /// <summary>Busca compacta para seletores de contato, sem contagem total.</summary>
    [HttpGet("busca")]
    public async Task<IActionResult> Buscar(
        [FromQuery] string termo,
        [FromQuery] int limite = 8,
        CancellationToken ct = default)
    {
        var resultado = await _consulta.BuscarAsync(termo, limite, ct);
        return Ok(resultado);
    }

    [HttpPut("{pessoaId:long}/telefones")]
    public async Task<IActionResult> AtualizarTelefones(
        long pessoaId,
        [FromBody] AtualizarTelefonesRequest request,
        CancellationToken ct = default)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioId)
        {
            _logger.LogWarning(
                "PUT /api/contatos/{PessoaId}/telefones: UsuarioId ausente no contexto.",
                pessoaId);
            return Unauthorized(new { message = "Usuário não identificado." });
        }

        try
        {
            await _telefoneComando.AtualizarAsync(pessoaId, request, usuarioId, ct);
            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
