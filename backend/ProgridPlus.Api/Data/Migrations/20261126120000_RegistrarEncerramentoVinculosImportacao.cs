using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ProgridPlus.Api.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20261126120000_RegistrarEncerramentoVinculosImportacao")]
public sealed class RegistrarEncerramentoVinculosImportacao : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        ALTER TABLE crm.importacao_negocio
            ADD COLUMN encerrado_por_operacao_id bigint
                REFERENCES crm.importacao_operacao(id) ON DELETE RESTRICT,
            ADD CONSTRAINT chk_importacao_negocio_encerramento
                CHECK (encerrado_por_operacao_id <> importacao_operacao_id);
        """);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM crm.importacao_negocio WHERE encerrado_por_operacao_id IS NOT NULL) THEN
                RAISE EXCEPTION 'Existem vínculos encerrados. A reversão alteraria a composição das cargas.';
            END IF;
        END $$;
        ALTER TABLE crm.importacao_negocio
            DROP CONSTRAINT chk_importacao_negocio_encerramento,
            DROP COLUMN encerrado_por_operacao_id;
        """);
}
