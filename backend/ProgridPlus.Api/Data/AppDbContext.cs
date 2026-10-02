using Microsoft.EntityFrameworkCore;
using ProgridPlus.Api.Seguranca;

namespace ProgridPlus.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuario> Usuarios => Set<Usuario>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>(e =>
        {
            e.ToTable("usuario", "seguranca");

            e.HasKey(u => u.Id);
            e.Property(u => u.Id).ValueGeneratedOnAdd();

            e.Property(u => u.PublicId)
             .HasDefaultValueSql("gen_random_uuid()")
             .IsRequired();
            e.HasIndex(u => u.PublicId).IsUnique();

            e.Property(u => u.KeycloakSub).HasMaxLength(100).IsRequired();
            e.HasIndex(u => u.KeycloakSub).IsUnique();

            e.Property(u => u.Username).HasMaxLength(100);
            e.Property(u => u.Nome).HasMaxLength(150);
            e.Property(u => u.Email).HasMaxLength(150);

            e.Property(u => u.Ativo).HasDefaultValue(true);
            e.Property(u => u.CreatedAt).HasDefaultValueSql("now()").IsRequired();
            e.Property(u => u.UpdatedAt).HasDefaultValueSql("now()").IsRequired();
        });
    }
}
