using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

public partial class AjustarVariaveisTemplateWhatsApp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.integracao_whatsapp_configuracao
                RENAME COLUMN variavel_2_padrao TO seguro_padrao;

            UPDATE crm.integracao_whatsapp_configuracao
            SET mensagem_template = REPLACE(
                mensagem_template,
                'sobre a parcela de cobertura do seu seguro {{2}}',
                'sobre a parcela {{2}} de cobertura do seu seguro {{3}}');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE crm.integracao_whatsapp_configuracao
            SET mensagem_template = REPLACE(
                mensagem_template,
                'sobre a parcela {{2}} de cobertura do seu seguro {{3}}',
                'sobre a parcela de cobertura do seu seguro {{2}}');

            ALTER TABLE crm.integracao_whatsapp_configuracao
                RENAME COLUMN seguro_padrao TO variavel_2_padrao;
            """);
    }
}
