namespace ProgridPlus.Api.Seguranca;

/// <summary>
/// Entidade que representa o usuário local do CRM, vinculado ao Keycloak via KeycloakSub (claim 'sub').
/// A cada login, os dados são sincronizados a partir do token JWT.
/// </summary>
public sealed class Usuario
{
    public long Id { get; set; }
    public Guid PublicId { get; set; } = Guid.NewGuid();

    /// <summary>Claim 'sub' do token Keycloak. Chave de identidade imutável.</summary>
    public string KeycloakSub { get; set; } = string.Empty;

    public string? Username { get; set; }
    public string? Nome { get; set; }
    public string? Email { get; set; }
    public bool Ativo { get; set; } = true;
    public DateTime? UltimoLoginEm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
