using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace ProgridPlus.Api.Data.Migrations;

[DbContext(typeof(CrmDbContext))]
[Migration("20261126150000_CriarIntegracaoAssertiva")]
public sealed class CriarIntegracaoAssertiva : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        CREATE TABLE crm.assertiva_configuracao (
            id integer PRIMARY KEY CHECK (id = 1),
            client_id varchar(255) NOT NULL,
            secret_protegido text NOT NULL,
            ativa boolean NOT NULL,
            finalidade integer NOT NULL CHECK (finalidade IN (1, 2, 5)),
            prazo_dias integer NOT NULL CHECK (prazo_dias BETWEEN 1 AND 3650),
            retencao_dias integer NOT NULL CHECK (retencao_dias BETWEEN 1 AND 3650),
            revisao uuid NOT NULL,
            atualizado_em timestamptz NOT NULL DEFAULT now(),
            atualizado_por bigint NOT NULL
        );

        CREATE TABLE crm.assertiva_consulta (
            id uuid PRIMARY KEY,
            cliente_id bigint NOT NULL REFERENCES cadastro.cliente(id),
            usuario_id bigint NOT NULL,
            solicitado_em timestamptz NOT NULL DEFAULT now(),
            concluido_em timestamptz,
            operacao text NOT NULL DEFAULT 'localize.cpf',
            finalidade integer NOT NULL,
            status text NOT NULL CHECK (status IN ('pendente', 'sucesso', 'sem_resultado', 'erro')),
            erro text,
            status_http integer,
            protocolo varchar(128),
            dentro_do_prazo boolean NOT NULL,
            antecipacao_confirmada boolean NOT NULL,
            resultado jsonb
        );
        CREATE INDEX ix_assertiva_consulta_cliente ON crm.assertiva_consulta
            (cliente_id, solicitado_em DESC, id DESC);
        CREATE INDEX ix_assertiva_consulta_consumo ON crm.assertiva_consulta (solicitado_em, usuario_id);
        CREATE INDEX ix_assertiva_consulta_retencao ON crm.assertiva_consulta
            (concluido_em) WHERE resultado IS NOT NULL;
        CREATE UNIQUE INDEX ux_assertiva_consulta_pendente ON crm.assertiva_consulta (cliente_id)
            WHERE status = 'pendente';

        CREATE TABLE crm.assertiva_telefone_inclusao (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            pessoa_contato_id bigint NOT NULL,
            consulta_id uuid NOT NULL REFERENCES crm.assertiva_consulta(id),
            usuario_id bigint NOT NULL,
            origem text NOT NULL DEFAULT 'Assertiva',
            incluido_em timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_assertiva_telefone_inclusao_contato ON crm.assertiva_telefone_inclusao (pessoa_contato_id);
        """);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        DROP TABLE crm.assertiva_telefone_inclusao;
        DROP TABLE crm.assertiva_consulta;
        DROP TABLE crm.assertiva_configuracao;
        """);
}
