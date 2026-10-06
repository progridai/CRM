using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

/// <summary>
/// Adiciona a coluna crm.negocio.origem (varchar 150) para texto livre de origem.
/// A coluna origem_id (FK → crm.origem_negocio) é preservada intacta para compatibilidade
/// com dados existentes. O novo formulário de criação de negócio grava apenas em origem.
/// </summary>
public partial class AdicionarOrigemTextoNegocio : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.negocio
                ADD COLUMN IF NOT EXISTS origem varchar(150) NULL;

            COMMENT ON COLUMN crm.negocio.origem
                IS 'Texto livre de origem do negócio. Substitui origem_id no novo formulário. origem_id mantido para compatibilidade.';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.negocio
                DROP COLUMN IF EXISTS origem;
            """);
    }
}
