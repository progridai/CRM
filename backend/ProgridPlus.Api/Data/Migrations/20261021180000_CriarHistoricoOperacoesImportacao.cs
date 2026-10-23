using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

public partial class CriarHistoricoOperacoesImportacao : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE crm.importacao_operacao (
                id                      bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id               uuid            NOT NULL DEFAULT gen_random_uuid(),
                tipo_operacao           varchar(30)     NOT NULL,
                competencia_mes         smallint        NOT NULL,
                competencia_ano         smallint        NOT NULL,
                nome_arquivo            varchar(255)    NULL,
                usuario_id              bigint          NULL,
                usuario_nome            varchar(200)    NULL,
                data_hora               timestamptz     NOT NULL DEFAULT now(),
                quantidade_registros    integer         NOT NULL DEFAULT 0,
                quantidade_inseridos    integer         NOT NULL DEFAULT 0,
                quantidade_atualizados  integer         NOT NULL DEFAULT 0,
                quantidade_excluidos    integer         NOT NULL DEFAULT 0,
                valor_total             numeric(14,2)   NOT NULL DEFAULT 0,
                resultado               varchar(20)     NOT NULL,
                mensagem                text            NULL,
                dados_adicionais        jsonb           NULL,

                CONSTRAINT uq_importacao_operacao_public_id UNIQUE (public_id),
                CONSTRAINT chk_importacao_operacao_tipo
                    CHECK (tipo_operacao IN ('IMPORTACAO', 'EXCLUSAO_COMPETENCIA')),
                CONSTRAINT chk_importacao_operacao_resultado
                    CHECK (resultado IN ('SUCESSO', 'ERRO')),
                CONSTRAINT chk_importacao_operacao_mes
                    CHECK (competencia_mes BETWEEN 1 AND 12),
                CONSTRAINT chk_importacao_operacao_ano
                    CHECK (competencia_ano BETWEEN 2000 AND 2100),
                CONSTRAINT chk_importacao_operacao_quantidades
                    CHECK (
                        quantidade_registros >= 0 AND
                        quantidade_inseridos >= 0 AND
                        quantidade_atualizados >= 0 AND
                        quantidade_excluidos >= 0
                    ),
                CONSTRAINT fk_importacao_operacao_usuario
                    FOREIGN KEY (usuario_id) REFERENCES seguranca.usuario (id) ON DELETE SET NULL
            );

            CREATE INDEX idx_importacao_operacao_data_hora
                ON crm.importacao_operacao (data_hora DESC);
            CREATE INDEX idx_importacao_operacao_competencia
                ON crm.importacao_operacao (competencia_ano, competencia_mes, data_hora DESC);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TABLE IF EXISTS crm.importacao_operacao;");
    }
}
