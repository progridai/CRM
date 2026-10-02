using Microsoft.EntityFrameworkCore;

namespace ProgridPlus.Api.Data;

/// <summary>
/// DbContext responsável exclusivamente pelo schema "crm".
/// Não deve mapear nem alterar objetos do schema "seguranca".
/// A identidade e autorização são lidas pelo AppDbContext (seguranca.usuario)
/// ou diretamente via queries de leitura ao schema seguranca.
/// </summary>
public sealed class CrmDbContext(DbContextOptions<CrmDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Schema padrão para todas as entidades deste contexto.
        // Nenhuma entidade pode ser mapeada para outros schemas (ex: seguranca, public).
        modelBuilder.HasDefaultSchema("crm");
    }
}
