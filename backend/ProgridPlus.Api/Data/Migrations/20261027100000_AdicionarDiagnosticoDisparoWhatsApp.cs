using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

public partial class AdicionarDiagnosticoDisparoWhatsApp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.whatsapp_disparo
                ADD COLUMN endpoint_fornecedor varchar(800) NOT NULL DEFAULT '',
                ADD COLUMN http_status_fornecedor integer NULL;

            ALTER TABLE crm.whatsapp_disparo
                ADD CONSTRAINT chk_whatsapp_disparo_http_status
                CHECK (http_status_fornecedor IS NULL OR http_status_fornecedor BETWEEN 100 AND 599);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.whatsapp_disparo
                DROP CONSTRAINT IF EXISTS chk_whatsapp_disparo_http_status,
                DROP COLUMN IF EXISTS http_status_fornecedor,
                DROP COLUMN IF EXISTS endpoint_fornecedor;
            """);
    }
}
