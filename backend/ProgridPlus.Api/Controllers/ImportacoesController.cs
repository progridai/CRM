using System.Diagnostics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProgridPlus.Api.Importacoes;
using ProgridPlus.Api.Seguranca;

namespace ProgridPlus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ImportacoesController(
    ImportacaoNegociosServico servico,
    ImportacaoOperacoesServico operacoes,
    ILogger<ImportacoesController> logger) : ControllerBase
{
    private const long TamanhoMaximoArquivo = 10 * 1024 * 1024;

    [HttpPost("negocios/analisar")]
    [RequestSizeLimit(TamanhoMaximoArquivo + 65536)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> AnalisarPlanilha([FromForm] DadosImportacao dados, CancellationToken ct)
    {
        var inicio = Stopwatch.GetTimestamp();
        var referencia = HttpContext.TraceIdentifier;
        try
        {
            await using var stream = AbrirPlanilha(dados.Arquivo);
            var analise = await servico.AnalisarAsync(stream, dados.Arquivo.FileName, dados.MesCobranca,
                dados.AnoCobranca, dados.Modo, dados.Participantes, ct);
            logger.LogInformation(
                "Análise de importação concluída. Referência {Referencia}, {Linhas} linhas, {Rejeitados} rejeitadas, {DuracaoMs} ms.",
                referencia, analise.TotalLinhas, analise.Rejeitados, Stopwatch.GetElapsedTime(inicio).TotalMilliseconds);
            return Ok(analise);
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidDataException)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            var sqlState = (ex as Npgsql.PostgresException)?.SqlState;
            logger.LogError(
                "Falha na análise de importação. Referência {Referencia}, exceção {Tipo}, SQLSTATE {SqlState}, {DuracaoMs} ms.",
                referencia, ex.GetType().Name, sqlState, Stopwatch.GetElapsedTime(inicio).TotalMilliseconds);
            return StatusCode(500, new { message = "A API não conseguiu analisar a planilha.", referencia });
        }
    }

    [HttpPost("negocios")]
    [RequestSizeLimit(TamanhoMaximoArquivo + 65536)]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> ImportarNegocios([FromForm] DadosImportacao dados, CancellationToken ct)
    {
        if (HttpContext.Items["UsuarioId"] is not long usuarioId)
            return StatusCode(500, new { message = "Contexto de usuário não disponível." });
        var acesso = HttpContext.Items["UsuarioAcesso"] as UsuarioAcesso;
        try
        {
            await using var stream = AbrirPlanilha(dados.Arquivo);
            return Ok(await servico.ImportarAsync(stream, dados.Arquivo.FileName, dados.MesCobranca,
                dados.AnoCobranca, dados.Modo, dados.Participantes, dados.Revisao ?? string.Empty, usuarioId,
                acesso is null ? null : string.IsNullOrWhiteSpace(acesso.Nome) ? acesso.Username : acesso.Nome, ct));
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidDataException)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Falha ao confirmar a importação de negócios.");
            return StatusCode(500, new { message = "Não foi possível concluir a importação." });
        }
    }

    [HttpGet("historico")]
    public async Task<ActionResult<IReadOnlyList<ImportacaoOperacaoDto>>> ListarHistorico(
        [FromQuery] int limite = 100, CancellationToken ct = default) =>
        Ok(await operacoes.ListarHistoricoAsync(limite, ct));

    [HttpGet("meses-cobranca/{anoCobranca:int}/{mesCobranca:int}/resumo")]
    public async Task<ActionResult<MesCobrancaResumoDto>> ConsultarMesCobranca(
        int anoCobranca, int mesCobranca, CancellationToken ct)
    {
        try
        {
            return Ok(await operacoes.ConsultarMesCobrancaAsync(anoCobranca, mesCobranca, ct));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("competencias/{ano:int}/{mes:int}/resumo")]
    public IActionResult ConsultarCompetenciaLegada() => StatusCode(410, new
    {
        message = "Consulte o resumo por mês de cobrança em /api/importacoes/meses-cobranca/{ano}/{mes}/resumo.",
    });

    [HttpDelete("competencias/{ano:int}/{mes:int}")]
    public IActionResult ExcluirCompetenciaLegada() => Conflict(new
    {
        message = "Para corrigir um mês, selecione a operação correspondente no assistente de importação.",
    });

    private static Stream AbrirPlanilha(IFormFile? arquivo)
    {
        if (arquivo is null || arquivo.Length == 0)
            throw new ArgumentException("Selecione um arquivo Excel.");
        if (arquivo.Length > TamanhoMaximoArquivo)
            throw new ArgumentException("A planilha deve ter no máximo 10 MB.");
        if (Path.GetExtension(arquivo.FileName).ToLowerInvariant() is not (".xls" or ".xlsx"))
            throw new ArgumentException("Envie um arquivo .xls ou .xlsx.");
        return arquivo.OpenReadStream();
    }

    public sealed class DadosImportacao
    {
        public IFormFile Arquivo { get; set; } = null!;
        public int MesCobranca { get; set; }
        public int AnoCobranca { get; set; }
        public string Modo { get; set; } = "adicionar";
        public long[] Participantes { get; set; } = [];
        public string? Revisao { get; set; }
    }
}
