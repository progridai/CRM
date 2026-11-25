using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ProgridPlus.Api.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20261125120000_SepararMesCobranca")]
public sealed class SepararMesCobranca : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE crm.importacao_operacao RENAME COLUMN competencia_mes TO competencia_legado_mes;
            ALTER TABLE crm.importacao_operacao RENAME COLUMN competencia_ano TO competencia_legado_ano;

            ALTER TABLE crm.importacao_operacao
                ALTER COLUMN competencia_legado_mes DROP NOT NULL,
                ALTER COLUMN competencia_legado_ano DROP NOT NULL,
                ALTER COLUMN valor_total TYPE numeric(19,2),
                ADD COLUMN mes_cobranca smallint,
                ADD COLUMN ano_cobranca smallint,
                ADD COLUMN quantidade_vinculados integer NOT NULL DEFAULT 0,
                ADD CONSTRAINT chk_importacao_operacao_vinculados CHECK (quantidade_vinculados >= 0),
                ADD CONSTRAINT chk_importacao_operacao_periodo CHECK (
                    (mes_cobranca IS NULL AND ano_cobranca IS NULL
                        AND competencia_legado_mes IS NOT NULL AND competencia_legado_ano IS NOT NULL)
                    OR
                    (tipo_operacao = 'IMPORTACAO' AND mes_cobranca IS NOT NULL AND ano_cobranca IS NOT NULL
                        AND mes_cobranca BETWEEN 1 AND 12 AND ano_cobranca BETWEEN 2000 AND 2100
                        AND competencia_legado_mes IS NULL AND competencia_legado_ano IS NULL)
                );

            CREATE INDEX idx_importacao_operacao_mes_cobranca
                ON crm.importacao_operacao (ano_cobranca, mes_cobranca)
                WHERE resultado = 'SUCESSO' AND ano_cobranca IS NOT NULL;

            CREATE TABLE crm.importacao_negocio (
                importacao_operacao_id bigint NOT NULL REFERENCES crm.importacao_operacao (id) ON DELETE RESTRICT,
                negocio_id bigint NOT NULL REFERENCES crm.negocio (id) ON DELETE RESTRICT,
                aba text NOT NULL,
                linha integer NOT NULL CHECK (linha > 0),
                PRIMARY KEY (importacao_operacao_id, negocio_id)
            );

            CREATE INDEX idx_importacao_negocio_negocio_id
                ON crm.importacao_negocio (negocio_id);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM crm.importacao_operacao WHERE ano_cobranca IS NOT NULL)
                    OR EXISTS (SELECT 1 FROM crm.importacao_negocio) THEN
                    RAISE EXCEPTION 'Existem novas operações de cobrança. A reversão descartaria períodos ou vínculos.';
                END IF;
            END $$;

            DROP TABLE crm.importacao_negocio;
            DROP INDEX crm.idx_importacao_operacao_mes_cobranca;

            ALTER TABLE crm.importacao_operacao
                DROP CONSTRAINT chk_importacao_operacao_periodo,
                DROP CONSTRAINT chk_importacao_operacao_vinculados,
                DROP COLUMN quantidade_vinculados,
                DROP COLUMN ano_cobranca,
                DROP COLUMN mes_cobranca,
                ALTER COLUMN valor_total TYPE numeric(14,2),
                ALTER COLUMN competencia_legado_mes SET NOT NULL,
                ALTER COLUMN competencia_legado_ano SET NOT NULL;

            ALTER TABLE crm.importacao_operacao RENAME COLUMN competencia_legado_ano TO competencia_ano;
            ALTER TABLE crm.importacao_operacao RENAME COLUMN competencia_legado_mes TO competencia_mes;
            """);
    }
}
