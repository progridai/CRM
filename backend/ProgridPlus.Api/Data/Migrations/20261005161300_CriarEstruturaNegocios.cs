using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations;

/// <summary>
/// Cria as 7 tabelas do módulo Negócios no schema crm.
/// FKs cross-schema (→ cadastro.cliente, → seguranca.usuario) são físicas conforme decisão do projeto.
/// Sem triggers, procedures ou lógica automática — toda regra fica na API.
/// </summary>
public partial class CriarEstruturaNegocios : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            -- ══════════════════════════════════════════════════════════════════════
            -- 1. crm.negocio_etapa
            --    Colunas configuráveis do Kanban.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.negocio_etapa (
                id          bigint                      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id   uuid                        NOT NULL DEFAULT gen_random_uuid(),
                codigo      varchar(50)                 NOT NULL,
                nome        varchar(100)                NOT NULL,
                classificacao varchar(30)               NOT NULL,
                ordem       smallint                    NOT NULL,
                cor_hex     varchar(7)                  NULL,
                ativo       boolean                     NOT NULL DEFAULT true,

                CONSTRAINT uq_negocio_etapa_public_id UNIQUE (public_id),
                CONSTRAINT uq_negocio_etapa_codigo    UNIQUE (codigo),
                CONSTRAINT chk_negocio_etapa_classificacao
                    CHECK (classificacao IN ('aberta', 'fechada_positiva', 'fechada_negativa'))
            );

            CREATE INDEX idx_negocio_etapa_ativo ON crm.negocio_etapa (ativo);

            -- ── Seed: 6 etapas iniciais ──────────────────────────────────────────
            INSERT INTO crm.negocio_etapa (codigo, nome, classificacao, ordem, cor_hex) VALUES
                ('nova_posicao',              'Nova Posição',              'aberta',            1, '#6366f1'),
                ('contato_em_andamento',      'Contato em Andamento',      'aberta',            2, '#3b82f6'),
                ('em_negociacao',             'Em Negociação',             'aberta',            3, '#8b5cf6'),
                ('aguardando_pagamento',      'Aguardando Pagamento',      'aberta',            4, '#f59e0b'),
                ('encerrado_sem_pagamento',   'Encerrado sem Pagamento',   'fechada_negativa',  5, '#dc2626'),
                ('quitado',                   'Quitado',                   'fechada_positiva',  6, '#059669');

            -- ══════════════════════════════════════════════════════════════════════
            -- 2. crm.origem_negocio
            --    Catálogo simples de origens dos negócios.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.origem_negocio (
                id      bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                nome    varchar(150) NOT NULL,
                ativo   boolean      NOT NULL DEFAULT true,

                CONSTRAINT uq_origem_negocio_nome UNIQUE (nome)
            );

            -- ══════════════════════════════════════════════════════════════════════
            -- 3. crm.negocio
            --    Entidade principal — posição de cobrança de um cliente no Kanban.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.negocio (
                id                  bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id           uuid            NOT NULL DEFAULT gen_random_uuid(),

                -- Relacionamentos
                cliente_id          bigint          NOT NULL,
                etapa_id            bigint          NOT NULL,
                origem_id           bigint          NULL,
                operador_id         bigint          NULL,   -- pode ser NULL (importação sem responsável)

                -- Identificação do título/contrato
                referencia          varchar(50)     NULL,
                numero_contrato     varchar(50)     NULL,   -- informação opcional, sem agrupamento
                motivo_recusa       varchar(150)    NULL,

                -- Valor e competência
                valor               numeric(14,2)   NOT NULL,
                competencia_ano     smallint        NOT NULL,
                competencia_mes     smallint        NOT NULL,
                competencia_int     int             NOT NULL,   -- calculado pela API: ano*100+mes

                -- Datas
                data_vencimento     date            NULL,

                -- Campo livre
                notas               text            NULL,

                -- Controle
                ativo               boolean         NOT NULL DEFAULT true,
                deleted_at          timestamptz     NULL,
                created_at          timestamptz     NOT NULL DEFAULT now(),
                updated_at          timestamptz     NOT NULL DEFAULT now(),

                -- Constraints
                CONSTRAINT uq_negocio_public_id UNIQUE (public_id),
                CONSTRAINT chk_negocio_valor_positivo
                    CHECK (valor >= 0),
                CONSTRAINT chk_negocio_competencia_mes
                    CHECK (competencia_mes BETWEEN 1 AND 12),
                CONSTRAINT chk_negocio_competencia_ano
                    CHECK (competencia_ano BETWEEN 2000 AND 2100),

                -- FKs internas
                CONSTRAINT fk_negocio_etapa
                    FOREIGN KEY (etapa_id)   REFERENCES crm.negocio_etapa (id),
                CONSTRAINT fk_negocio_origem
                    FOREIGN KEY (origem_id)  REFERENCES crm.origem_negocio (id),

                -- FKs cross-schema (físicas conforme decisão do projeto)
                CONSTRAINT fk_negocio_cliente
                    FOREIGN KEY (cliente_id)   REFERENCES cadastro.cliente (id),
                CONSTRAINT fk_negocio_operador
                    FOREIGN KEY (operador_id)  REFERENCES seguranca.usuario (id)
            );

            CREATE INDEX idx_negocio_cliente_id      ON crm.negocio (cliente_id);
            CREATE INDEX idx_negocio_etapa_id        ON crm.negocio (etapa_id);
            CREATE INDEX idx_negocio_operador_id     ON crm.negocio (operador_id);
            CREATE INDEX idx_negocio_competencia_int ON crm.negocio (competencia_int);
            CREATE INDEX idx_negocio_deleted_at      ON crm.negocio (deleted_at) WHERE deleted_at IS NULL;

            -- ══════════════════════════════════════════════════════════════════════
            -- 4. crm.etiqueta
            --    Cadastro de tags disponíveis para negócios.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.etiqueta (
                id      bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                nome    varchar(80) NOT NULL,
                cor_hex varchar(7)  NULL,
                ativo   boolean     NOT NULL DEFAULT true,

                CONSTRAINT uq_etiqueta_nome UNIQUE (nome)
            );

            -- ══════════════════════════════════════════════════════════════════════
            -- 5. crm.negocio_etiqueta
            --    Relação N:N entre negócio e etiquetas.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.negocio_etiqueta (
                negocio_id  bigint NOT NULL,
                etiqueta_id bigint NOT NULL,

                CONSTRAINT pk_negocio_etiqueta PRIMARY KEY (negocio_id, etiqueta_id),
                CONSTRAINT fk_negocio_etiqueta_negocio
                    FOREIGN KEY (negocio_id)  REFERENCES crm.negocio (id) ON DELETE CASCADE,
                CONSTRAINT fk_negocio_etiqueta_etiqueta
                    FOREIGN KEY (etiqueta_id) REFERENCES crm.etiqueta (id)
            );

            -- ══════════════════════════════════════════════════════════════════════
            -- 6. crm.atividade
            --    Interações manuais registradas em um negócio.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.atividade (
                id          bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                public_id   uuid            NOT NULL DEFAULT gen_random_uuid(),
                negocio_id  bigint          NOT NULL,
                usuario_id  bigint          NOT NULL,
                tipo        varchar(30)     NOT NULL,
                titulo      varchar(150)    NOT NULL,
                descricao   text            NULL,
                ocorrido_em timestamptz     NOT NULL DEFAULT now(),
                created_at  timestamptz     NOT NULL DEFAULT now(),

                CONSTRAINT uq_atividade_public_id UNIQUE (public_id),
                CONSTRAINT chk_atividade_tipo
                    CHECK (tipo IN ('whatsapp', 'ligacao', 'pagamento', 'anotacao', 'sistema')),

                CONSTRAINT fk_atividade_negocio
                    FOREIGN KEY (negocio_id)  REFERENCES crm.negocio (id) ON DELETE CASCADE,
                CONSTRAINT fk_atividade_usuario
                    FOREIGN KEY (usuario_id)  REFERENCES seguranca.usuario (id)
            );

            CREATE INDEX idx_atividade_negocio_id ON crm.atividade (negocio_id);

            -- ══════════════════════════════════════════════════════════════════════
            -- 7. crm.negocio_historico
            --    Linha do tempo imutável do negócio — preenchida pela API.
            -- ══════════════════════════════════════════════════════════════════════
            CREATE TABLE crm.negocio_historico (
                id                  bigint          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                negocio_id          bigint          NOT NULL,
                usuario_id          bigint          NULL,   -- NULL para eventos de sistema
                tipo_evento         varchar(40)     NOT NULL,
                descricao           text            NULL,
                etapa_anterior_id   bigint          NULL,
                etapa_nova_id       bigint          NULL,
                ocorrido_em         timestamptz     NOT NULL DEFAULT now(),

                CONSTRAINT chk_negocio_historico_tipo
                    CHECK (tipo_evento IN (
                        'importado',
                        'criado',
                        'etapa_alterada',
                        'operador_alterado',
                        'atividade_registrada',
                        'encerrado'
                    )),

                CONSTRAINT fk_historico_negocio
                    FOREIGN KEY (negocio_id)        REFERENCES crm.negocio (id) ON DELETE CASCADE,
                CONSTRAINT fk_historico_usuario
                    FOREIGN KEY (usuario_id)        REFERENCES seguranca.usuario (id),
                CONSTRAINT fk_historico_etapa_anterior
                    FOREIGN KEY (etapa_anterior_id) REFERENCES crm.negocio_etapa (id),
                CONSTRAINT fk_historico_etapa_nova
                    FOREIGN KEY (etapa_nova_id)     REFERENCES crm.negocio_etapa (id)
            );

            CREATE INDEX idx_negocio_historico_negocio_id ON crm.negocio_historico (negocio_id);
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            DROP TABLE IF EXISTS crm.negocio_historico;
            DROP TABLE IF EXISTS crm.atividade;
            DROP TABLE IF EXISTS crm.negocio_etiqueta;
            DROP TABLE IF EXISTS crm.etiqueta;
            DROP TABLE IF EXISTS crm.negocio;
            DROP TABLE IF EXISTS crm.origem_negocio;
            DROP TABLE IF EXISTS crm.negocio_etapa;
            """);
    }
}
