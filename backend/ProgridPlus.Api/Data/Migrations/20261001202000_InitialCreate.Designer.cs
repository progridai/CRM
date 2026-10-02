using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ProgridPlus.Api.Data;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20261001202000_InitialCreate")]
partial class InitialCreate
{
    protected override void BuildTargetModel(ModelBuilder modelBuilder)
    {
#pragma warning disable 612, 618
        modelBuilder
            .HasDefaultSchema("crm")
            .HasAnnotation("ProductVersion", "10.0.12")
            .HasAnnotation("Relational:MaxIdentifierLength", 63);
#pragma warning restore 612, 618
    }
}
