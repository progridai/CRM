using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

/// <summary>
/// Migration inicial do schema "crm".
/// Cria o schema crm no PostgreSQL.
/// Não cria tabelas funcionais (leads, oportunidades, contatos etc.).
/// Não altera nem cria objetos no schema "seguranca".
/// </summary>
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.EnsureSchema("crm");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Remove o schema somente se não houver objetos.
        // Em ambientes de produção, o DROP SCHEMA deve ser executado manualmente.
        migrationBuilder.Sql("DROP SCHEMA IF EXISTS crm RESTRICT;");
    }
}
