using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

public partial class AdicionarIndicesBuscaContatos : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE EXTENSION IF NOT EXISTS pg_trgm;

            CREATE INDEX IF NOT EXISTS idx_pessoa_nome_normalizado_trgm
                ON core.pessoa USING gin (nome_normalizado gin_trgm_ops)
                WHERE deleted_at IS NULL;

            CREATE INDEX IF NOT EXISTS idx_pessoa_documento_limpo_trgm
                ON core.pessoa USING gin (documento_principal_limpo gin_trgm_ops)
                WHERE deleted_at IS NULL;

            CREATE INDEX IF NOT EXISTS idx_pessoa_contato_valor_normalizado_trgm
                ON core.pessoa_contato USING gin (valor_normalizado gin_trgm_ops)
                WHERE ativo = true
                  AND UPPER(tipo_contato) IN ('CELULAR', 'TELEFONE');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS core.idx_pessoa_contato_valor_normalizado_trgm;
            DROP INDEX IF EXISTS core.idx_pessoa_documento_limpo_trgm;
            DROP INDEX IF EXISTS core.idx_pessoa_nome_normalizado_trgm;
            """);
    }
}
