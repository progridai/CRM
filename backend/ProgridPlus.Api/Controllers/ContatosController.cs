using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Contatos;

namespace ProgridPlus.Api.Controllers;

/// <summary>
/// Listagem de contatos (pessoas) lida do schema core (somente leitura).
/// O CRM não cria tabela própria de contatos nesta fase.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ContatosController : ControllerBase
{
    private readonly ContatosConsulta _consulta;

    public ContatosController(ContatosConsulta consulta)
    {
        _consulta = consulta;
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
}
