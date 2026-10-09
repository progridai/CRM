using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProgridPlus.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AjustarConstraintHistoricoMudancaEtapa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE crm.negocio_historico DROP CONSTRAINT IF EXISTS chk_negocio_historico_tipo;

                ALTER TABLE crm.negocio_historico ADD CONSTRAINT chk_negocio_historico_tipo
                    CHECK (tipo_evento IN (
                        'importado',
                        'criado',
                        'etapa_alterada',
                        'mudanca_etapa',
                        'operador_alterado',
                        'atividade_registrada',
                        'encerrado'
                    ));
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE crm.negocio_historico DROP CONSTRAINT IF EXISTS chk_negocio_historico_tipo;

                ALTER TABLE crm.negocio_historico ADD CONSTRAINT chk_negocio_historico_tipo
                    CHECK (tipo_evento IN (
                        'importado',
                        'criado',
                        'etapa_alterada',
                        'operador_alterado',
                        'atividade_registrada',
                        'encerrado'
                    ));
            ");
        }
    }
}
