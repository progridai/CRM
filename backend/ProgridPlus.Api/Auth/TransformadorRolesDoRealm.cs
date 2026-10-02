using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;

namespace ProgridPlus.Api.Auth;

public sealed class TransformadorRolesDoRealm : IClaimsTransformation
{
    private const string ClaimRealmAccess = "realm_access";

    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not { IsAuthenticated: true })
        {
            return Task.FromResult(principal);
        }

        var realmAccessClaim = principal.FindFirst(ClaimRealmAccess);
        if (realmAccessClaim is null)
        {
            return Task.FromResult(principal);
        }

        List<string> roles;
        try
        {
            var realmAccess = JsonDocument.Parse(realmAccessClaim.Value);
            if (!realmAccess.RootElement.TryGetProperty("roles", out var rolesElement))
            {
                return Task.FromResult(principal);
            }

            roles = new List<string>();
            foreach (var roleElement in rolesElement.EnumerateArray())
            {
                var roleName = roleElement.GetString();
                if (!string.IsNullOrWhiteSpace(roleName))
                {
                    roles.Add(roleName);
                }
            }
        }
        catch (JsonException)
        {
            return Task.FromResult(principal);
        }

        if (roles.Count == 0)
        {
            return Task.FromResult(principal);
        }

        var identidadeAtual = (ClaimsIdentity)principal.Identity!;
        var rolesExistentes = identidadeAtual.Claims
            .Where(c => c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToHashSet(StringComparer.Ordinal);

        var claimsParaAdicionar = roles
            .Where(r => !rolesExistentes.Contains(r))
            .Select(r => new Claim(ClaimTypes.Role, r))
            .ToList();

        if (claimsParaAdicionar.Count == 0)
        {
            return Task.FromResult(principal);
        }

        var novaIdentidade = identidadeAtual.Clone();
        novaIdentidade.AddClaims(claimsParaAdicionar);

        var novoPrincipal = new ClaimsPrincipal(novaIdentidade);
        return Task.FromResult(novoPrincipal);
    }
}
