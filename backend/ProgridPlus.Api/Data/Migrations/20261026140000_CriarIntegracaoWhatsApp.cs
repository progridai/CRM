using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

public partial class CriarIntegracaoWhatsApp : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            CREATE TABLE crm.integracao (
                id                  bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id           uuid            NOT NULL DEFAULT gen_random_uuid(),
                codigo              varchar(80)     NOT NULL,
                nome                varchar(120)    NOT NULL,
                fornecedor          varchar(120)    NOT NULL,
                base_url            varchar(500)    NOT NULL,
                endpoint_disparo    varchar(300)    NOT NULL,
                ativo               boolean         NOT NULL DEFAULT true,
                atualizado_por      bigint          NULL,
                criado_em           timestamptz     NOT NULL DEFAULT now(),
                atualizado_em       timestamptz     NOT NULL DEFAULT now(),

                CONSTRAINT uq_integracao_public_id UNIQUE (public_id),
                CONSTRAINT uq_integracao_codigo UNIQUE (codigo),
                CONSTRAINT fk_integracao_usuario
                    FOREIGN KEY (atualizado_por) REFERENCES seguranca.usuario (id) ON DELETE SET NULL
            );

            CREATE TABLE crm.integracao_whatsapp_configuracao (
                integracao_id       bigint          PRIMARY KEY,
                canal               varchar(30)     NOT NULL,
                template_padrao     varchar(160)    NOT NULL,
                template_language   varchar(20)     NOT NULL DEFAULT 'pt_BR',
                mensagem_template   text            NOT NULL,
                variavel_2_padrao   varchar(200)    NOT NULL,
                abrir_atendimento   boolean         NOT NULL DEFAULT true,
                fila_disparo        varchar(120)    NULL,
                agente_disparo      varchar(120)    NULL,
                timeout_segundos    integer         NOT NULL DEFAULT 30,

                CONSTRAINT fk_integracao_whatsapp_integracao
                    FOREIGN KEY (integracao_id) REFERENCES crm.integracao (id) ON DELETE CASCADE,
                CONSTRAINT chk_integracao_whatsapp_timeout
                    CHECK (timeout_segundos BETWEEN 5 AND 120)
            );

            CREATE TABLE crm.integracao_configuracao_historico (
                id                      bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                integracao_id           bigint          NOT NULL,
                usuario_id              bigint          NULL,
                configuracao_anterior   jsonb           NOT NULL,
                configuracao_nova       jsonb           NOT NULL,
                alterado_em             timestamptz     NOT NULL DEFAULT now(),

                CONSTRAINT fk_integracao_historico_integracao
                    FOREIGN KEY (integracao_id) REFERENCES crm.integracao (id) ON DELETE CASCADE,
                CONSTRAINT fk_integracao_historico_usuario
                    FOREIGN KEY (usuario_id) REFERENCES seguranca.usuario (id) ON DELETE SET NULL
            );

            CREATE TABLE crm.whatsapp_disparo (
                id                      bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id               uuid            NOT NULL DEFAULT gen_random_uuid(),
                integracao_id           bigint          NOT NULL,
                tipo                    varchar(20)     NOT NULL,
                titulo                  varchar(200)    NOT NULL,
                template                varchar(160)    NOT NULL,
                template_language       varchar(20)     NOT NULL,
                status                  varchar(30)     NOT NULL,
                usuario_id              bigint          NULL,
                usuario_nome            varchar(200)    NULL,
                total_selecionados      integer         NOT NULL DEFAULT 0,
                total_destinatarios     integer         NOT NULL DEFAULT 0,
                total_excluidos         integer         NOT NULL DEFAULT 0,
                campanha_id_externo     bigint          NULL,
                mensagem_retorno        text            NULL,
                erro                    text            NULL,
                criado_em               timestamptz     NOT NULL DEFAULT now(),
                concluido_em            timestamptz     NULL,

                CONSTRAINT uq_whatsapp_disparo_public_id UNIQUE (public_id),
                CONSTRAINT fk_whatsapp_disparo_integracao
                    FOREIGN KEY (integracao_id) REFERENCES crm.integracao (id) ON DELETE RESTRICT,
                CONSTRAINT fk_whatsapp_disparo_usuario
                    FOREIGN KEY (usuario_id) REFERENCES seguranca.usuario (id) ON DELETE SET NULL,
                CONSTRAINT chk_whatsapp_disparo_tipo
                    CHECK (tipo IN ('individual', 'massa')),
                CONSTRAINT chk_whatsapp_disparo_status
                    CHECK (status IN ('pendente', 'aceito_fornecedor', 'rejeitado', 'resultado_incerto')),
                CONSTRAINT chk_whatsapp_disparo_totais
                    CHECK (total_selecionados >= 0 AND total_destinatarios >= 0 AND total_excluidos >= 0)
            );

            CREATE TABLE crm.whatsapp_disparo_destinatario (
                id                  bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                disparo_id          bigint          NOT NULL,
                negocio_id          bigint          NULL,
                nome                varchar(250)    NOT NULL,
                numero              varchar(30)     NULL,
                mensagem            text            NULL,
                variaveis           jsonb           NOT NULL DEFAULT '{}'::jsonb,
                status              varchar(30)     NOT NULL,
                erro                text            NULL,
                criado_em           timestamptz     NOT NULL DEFAULT now(),

                CONSTRAINT fk_whatsapp_destinatario_disparo
                    FOREIGN KEY (disparo_id) REFERENCES crm.whatsapp_disparo (id) ON DELETE CASCADE,
                CONSTRAINT fk_whatsapp_destinatario_negocio
                    FOREIGN KEY (negocio_id) REFERENCES crm.negocio (id) ON DELETE SET NULL,
                CONSTRAINT chk_whatsapp_destinatario_status
                    CHECK (status IN ('pendente', 'aceito_fornecedor', 'rejeitado', 'resultado_incerto', 'ignorado'))
            );

            CREATE INDEX idx_integracao_historico_data
                ON crm.integracao_configuracao_historico (integracao_id, alterado_em DESC);
            CREATE INDEX idx_whatsapp_disparo_criado_em
                ON crm.whatsapp_disparo (criado_em DESC);
            CREATE INDEX idx_whatsapp_disparo_usuario
                ON crm.whatsapp_disparo (usuario_id, criado_em DESC);
            CREATE INDEX idx_whatsapp_destinatario_disparo
                ON crm.whatsapp_disparo_destinatario (disparo_id, id);

            INSERT INTO crm.integracao
                (codigo, nome, fornecedor, base_url, endpoint_disparo, ativo)
            VALUES
                ('sisnetsul_whatsapp', 'WhatsApp', 'Sisnetsul',
                 'https://whats.sisnetsul.com.br:4270', '/Central/disparoMeta', true);

            INSERT INTO crm.integracao_whatsapp_configuracao (
                integracao_id, canal, template_padrao, template_language,
                mensagem_template, variavel_2_padrao, abrir_atendimento, fila_disparo,
                timeout_segundos)
            SELECT
                id,
                '551140002908',
                'inadimplentes_aviso_parcela',
                'pt_BR',
                $mensagem$Olá, {{1}}.

            Este é um aviso importante sobre a parcela de cobertura do seu seguro {{2}}, que continua em aberto.

            Nosso compromisso é com a sua proteção. Por isso, alertamos que o não pagamento poderá acarretar o cancelamento da sua apólice e a perda dos benefícios adquiridos, impactando o histórico e as condições de valores que você garantiu ao longo de todo esse tempo.

            Ainda é possível regularizar essa situação e evitar qualquer prejuízo à sua cobertura. Por favor, acesse uma das opções abaixo:$mensagem$,
                'Icatu - COPEL',
                true,
                'Cobrança',
                30
            FROM crm.integracao
            WHERE codigo = 'sisnetsul_whatsapp';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS crm.whatsapp_disparo_destinatario;
            DROP TABLE IF EXISTS crm.whatsapp_disparo;
            DROP TABLE IF EXISTS crm.integracao_configuracao_historico;
            DROP TABLE IF EXISTS crm.integracao_whatsapp_configuracao;
            DROP TABLE IF EXISTS crm.integracao;
            """);
    }
}
