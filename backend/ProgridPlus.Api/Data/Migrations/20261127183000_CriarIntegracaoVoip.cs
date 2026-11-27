using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ProgridPlus.Api.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20261127183000_CriarIntegracaoVoip")]
public sealed class CriarIntegracaoVoip : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        CREATE TABLE crm.voip_configuracao (
            id integer PRIMARY KEY CHECK (id = 1),
            url_api varchar(500) NOT NULL DEFAULT 'https://bravida.sisnetsul.com.br/api/click2call',
            token_criptografado text,
            ativo boolean NOT NULL DEFAULT false,
            atualizado_em timestamptz NOT NULL DEFAULT now(),
            atualizado_por bigint
        );
        """);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        DROP TABLE crm.voip_configuracao;
        """);
}
