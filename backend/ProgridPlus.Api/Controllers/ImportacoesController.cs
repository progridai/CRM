using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Importacoes;
using ProgridPlus.Api.Seguranca;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ImportacoesController : ControllerBase
{
    private const long TamanhoMaximoArquivo = 10 * 1024 * 1024;
    private readonly ImportacaoNegociosServico _servico;
    private readonly ImportacaoOperacoesServico _operacoesServico;
    private readonly ILogger<ImportacoesController> _logger;

    public ImportacoesController(
        ImportacaoNegociosServico servico,
        ImportacaoOperacoesServico operacoesServico,
        ILogger<ImportacoesController> logger)
    {
        _servico = servico;
        _operacoesServico = operacoesServico;
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
                ObterUsuarioNome(),
                ct);

            return Ok(resultado);
        }
        catch (Exception ex)
        {
            var mensagemPublica = ex switch
            {
                ArgumentException or InvalidDataException or InvalidOperationException => ex.Message,
                _ => "Não foi possível concluir a importação.",
            };

            await _servico.RegistrarFalhaAsync(
                arquivo.FileName,
                competenciaMes,
                competenciaAno,
                modo ?? string.Empty,
                usuarioLogadoId,
                ObterUsuarioNome(),
                mensagemPublica);

            if (ex is ArgumentException or InvalidDataException)
                return BadRequest(new { message = ex.Message });

            if (ex is InvalidOperationException)
            {
                _logger.LogWarning("Falha de regra na importação de negócios: {Erro}", ex.Message);
                return UnprocessableEntity(new { message = ex.Message });
            }

            _logger.LogError(ex, "Falha inesperada na importação de negócios.");
            return StatusCode(500, new { message = mensagemPublica });
        }
    }

    [HttpGet("historico")]
    public async Task<ActionResult<IReadOnlyList<ImportacaoOperacaoDto>>> ListarHistorico(
        [FromQuery] int limite = 100,
        CancellationToken ct = default)
    {
        var historico = await _operacoesServico.ListarHistoricoAsync(limite, ct);
        return Ok(historico);
    }

    [HttpGet("competencias/{competenciaAno:int}/{competenciaMes:int}/resumo")]
    public async Task<ActionResult<CompetenciaResumoDto>> ConsultarCompetencia(
        int competenciaAno,
        int competenciaMes,
        CancellationToken ct)
    {
        try
        {
            return Ok(await _operacoesServico.ConsultarCompetenciaAsync(
                competenciaAno,
                competenciaMes,
                ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("competencias/{competenciaAno:int}/{competenciaMes:int}")]
    public async Task<ActionResult<ExclusaoCompetenciaResultadoDto>> ExcluirCompetencia(
        int competenciaAno,
        int competenciaMes,
        CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioLogadoId)
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });

        try
        {
            var resultado = await _operacoesServico.ExcluirCompetenciaAsync(
                competenciaAno,
                competenciaMes,
                usuarioLogadoId,
                ObterUsuarioNome(),
                ct);
            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Falha ao excluir negócios da competência {Ano}/{Mes}.",
                competenciaAno,
                competenciaMes);
            return StatusCode(500, new { message = "Não foi possível excluir os negócios desta competência." });
        }
    }

    private string? ObterUsuarioNome()
    {
        if (HttpContext.Items["UsuarioAcesso"] is not UsuarioAcesso acesso)
            return null;

        return string.IsNullOrWhiteSpace(acesso.Nome) ? acesso.Username : acesso.Nome;
    }
}
