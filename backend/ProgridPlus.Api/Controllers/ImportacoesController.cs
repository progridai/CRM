using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Importacoes;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ImportacoesController : ControllerBase
{
    private const long TamanhoMaximoArquivo = 10 * 1024 * 1024;
    private readonly ImportacaoNegociosServico _servico;
    private readonly ILogger<ImportacoesController> _logger;

    public ImportacoesController(
        ImportacaoNegociosServico servico,
        ILogger<ImportacoesController> logger)
    {
        _servico = servico;
        _logger = logger;
    }

    [HttpPost("negocios")]
    [RequestSizeLimit(TamanhoMaximoArquivo)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportarNegocios(
        [FromForm] IFormFile arquivo,
        [FromForm] int competenciaMes,
        [FromForm] int competenciaAno,
        [FromForm] string modo,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioLogadoId)
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });

        if (arquivo is null || arquivo.Length == 0)
            return BadRequest(new { message = "Selecione uma planilha XLSX para importar." });

        if (arquivo.Length > TamanhoMaximoArquivo)
            return BadRequest(new { message = "A planilha deve ter no máximo 10 MB." });

        if (!string.Equals(Path.GetExtension(arquivo.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Formato inválido. Envie um arquivo com extensão .xlsx." });

        try
        {
            await using var stream = arquivo.OpenReadStream();
            var resultado = await _servico.ImportarAsync(
                stream,
                arquivo.FileName,
                competenciaMes,
                competenciaAno,
                modo ?? string.Empty,
                usuarioLogadoId,
                ct);

            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidDataException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Falha de regra na importação de negócios: {Erro}", ex.Message);
            return UnprocessableEntity(new { message = ex.Message });
        }
    }
}
