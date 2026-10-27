using Microsoft.AspNetCore.Authorization;
using ProgridPlus.Api.Seguranca;
using System.Security.Claims;

namespace ProgridPlus.Api.Auth;

/// <summary>
/// Marker que representa o requisito de acesso ao CRM.
/// Registrado como policy "CrmAcesso".
/// </summary>
public sealed class CrmAcessoRequirement(bool exigirAcessoTotal = false) : IAuthorizationRequirement
{
    public bool ExigirAcessoTotal { get; } = exigirAcessoTotal;
}

/// <summary>
/// Handler que valida se o usuário autenticado (via JWT Keycloak) possui
/// acesso ao CRM conforme as regras do schema seguranca do WebApólice.
///
/// Regras:
///   • JWT inválido/ausente  → 401 (tratado antes, pelo middleware de autenticação)
///   • Sub não encontrado    → 403
///   • Usuário inativo       → 403
///   • acesso_total = true   → permitir
///   • crm.acessar presente  → permitir
///   • qualquer outro caso   → 403
///
/// Após autorizar, disponibiliza o UsuarioId interno via HttpContext.Items["UsuarioId"]
/// para os serviços do CRM consumirem sem nova consulta ao banco.
/// </summary>
public sealed class CrmAcessoHandler(
    SegurancaConsulta segurancaConsulta,
    IHttpContextAccessor httpContextAccessor,
    ILogger<CrmAcessoHandler> logger)
    : AuthorizationHandler<CrmAcessoRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CrmAcessoRequirement requirement)
    {
        var sub = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? context.User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(sub))
        {
            // Sub ausente após autenticação bem-sucedida → nega
            logger.LogWarning("CrmAcessoHandler: claim 'sub' ausente no token.");
            context.Fail();
            return;
        }

        var ct = httpContextAccessor.HttpContext?.RequestAborted ?? CancellationToken.None;

        UsuarioAcesso? acesso;
        try
        {
            acesso = await segurancaConsulta.ConsultarAcessoAsync(sub, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "CrmAcessoHandler: erro ao consultar seguranca.usuario para sub={Sub}.", sub);
            context.Fail();
            return;
        }

        if (acesso is null)
        {
            logger.LogWarning("CrmAcessoHandler: sub={Sub} não encontrado em seguranca.usuario.", sub);
            context.Fail();
            return;
        }

        if (!acesso.Ativo)
        {
            logger.LogWarning("CrmAcessoHandler: usuário {UsuarioId} está inativo.", acesso.UsuarioId);
            context.Fail();
            return;
        }

        if (!acesso.PodeAcessarCrm)
        {
            logger.LogWarning(
                "CrmAcessoHandler: usuário {UsuarioId} não possui crm.acessar nem acesso_total.",
                acesso.UsuarioId);
            context.Fail();
            return;
        }

        if (requirement.ExigirAcessoTotal && !acesso.AcessoTotal)
        {
            logger.LogWarning(
                "CrmAcessoHandler: usuário {UsuarioId} tentou acessar recurso administrativo sem acesso_total.",
                acesso.UsuarioId);
            context.Fail();
            return;
        }

        // Disponibiliza o usuario_id para os controllers/serviços do CRM
        if (httpContextAccessor.HttpContext is { } http)
        {
            http.Items["UsuarioId"] = acesso.UsuarioId;
            http.Items["UsuarioAcesso"] = acesso;
        }

        logger.LogInformation(
            "CrmAcessoHandler: acesso concedido — usuário {UsuarioId} (acesso_total={AcessoTotal}, crm.acessar={TemPermissao}).",
            acesso.UsuarioId, acesso.AcessoTotal, acesso.TemPermissaoCrm);

        context.Succeed(requirement);
    }
}
