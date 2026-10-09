using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CriarTabelaAtividadeAtalho : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS crm.atividade_atalho (
                    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
                    nome VARCHAR(100) NOT NULL,
                    tipo VARCHAR(50) NOT NULL,
                    titulo_padrao VARCHAR(150) NOT NULL,
                    descricao_padrao TEXT,
                    ordem INT NOT NULL DEFAULT 0,
                    ativo BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
                );

                INSERT INTO crm.atividade_atalho (nome, tipo, titulo_padrao, descricao_padrao, ordem, ativo)
                VALUES
                    ('Mensagem de cobrança enviada', 'whatsapp', 'Mensagem de Cobrança', 'Cobrança enviada via WhatsApp.', 1, true),
                    ('Proposta de acordo enviada', 'whatsapp', 'Proposta Enviada', 'Proposta de acordo enviada.', 2, true),
                    ('Comprovante solicitado', 'whatsapp', 'Comprovante Solicitado', 'Solicitado envio do comprovante de pagamento.', 3, true),
                    ('Tentativa sem atendimento', 'ligacao', 'Tentativa de Ligação', 'O cliente não atendeu a ligação.', 4, true),
                    ('Cliente pediu retorno', 'ligacao', 'Pediu Retorno', 'O cliente pediu para retornar a ligação em outro horário.', 5, true),
                    ('Promessa de pagamento acordada', 'ligacao', 'Promessa de Pagamento', 'Acordo verbal firmado com o cliente.', 6, true),
                    ('Pagamento confirmado', 'pagamento', 'Pagamento Confirmado', 'O pagamento foi confirmado.', 7, true)
                ON CONFLICT DO NOTHING;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS crm.atividade_atalho;");
        }
    }
}
