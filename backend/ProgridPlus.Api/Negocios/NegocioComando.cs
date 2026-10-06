using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Negocios;

/// <summary>
/// Serviço de escrita do módulo Negócios.
/// Toda mutação de crm.negocio passa por aqui.
/// O CRM nunca insere em seguranca.* nem em cadastro.*/core.*.
/// </summary>
public sealed class NegocioComando
{
    private readonly string _connectionString;
    private readonly ILogger<NegocioComando> _logger;

    public NegocioComando(IConfiguration configuration, ILogger<NegocioComando> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
        _logger = logger;
    }

    // ─── Queries ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Resolve o cliente_id (cadastro.cliente.id) e o nome da pessoa a partir de
    /// core.pessoa.id. A FK em crm.negocio aponta para cadastro.cliente.id.
    /// </summary>
    private const string QueryResolverCliente = """
        SELECT
            cl.id       AS ClienteId,
            p.nome      AS NomeCliente
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON p.id = cl.pessoa_id
           AND p.deleted_at IS NULL
        WHERE cl.public_id = @clientePublicId
        LIMIT 1;
        """;

    private const string QueryResolverEtapa = """
        SELECT
            id      AS Id,
            nome    AS Nome,
            codigo  AS Codigo
        FROM crm.negocio_etapa
        WHERE public_id = @publicId
          AND ativo = true
        LIMIT 1;
        """;

    private const string QueryInserirNegocio = """
        INSERT INTO crm.negocio (
            cliente_id,
            etapa_id,
            operador_id,
            referencia,
            valor,
            competencia_ano,
            competencia_mes,
            competencia_int,
            data_vencimento,
            origem,
            notas
        )
        VALUES (
            @clienteId,
            @etapaId,
            @operadorId,
            @referencia,
            @valor,
            @competenciaAno,
            @competenciaMes,
            @competenciaInt,
            @dataVencimento,
            @origem,
            @notas
        )
        RETURNING id, public_id;
        """;

    private const string QueryInserirHistorico = """
        INSERT INTO crm.negocio_historico (
            negocio_id,
            usuario_id,
            tipo_evento,
            descricao,
            etapa_nova_id
        )
        VALUES (
            @negocioId,
            @usuarioId,
            'criado',
            @descricao,
            @etapaId
        );
        """;

    // ─── Método público ─────────────────────────────────────────────────────────

    /// <summary>
    /// Cria um negócio na base e registra o evento de criação no histórico.
    /// Executa tudo em uma única transação.
    /// </summary>
    /// <param name="cmd">Dados de criação validados pelo controller.</param>
    /// <param name="usuarioLogadoId">ID do usuário autenticado (de HttpContext.Items).</param>
    /// <param name="ct">CancellationToken da request.</param>
    /// <returns>DTO com dados básicos do negócio criado.</returns>
    /// <exception cref="InvalidOperationException">Cliente ou etapa não encontrados.</exception>
    /// <exception cref="ArgumentException">Dados inválidos no command.</exception>
    public async Task<NegocioCriadoDto> CriarAsync(
        CriarNegocioCommand cmd,
        long usuarioLogadoId,
        CancellationToken ct = default)
    {
        // ── Validações de domínio ──────────────────────────────────────────────
        if (cmd.Valor <= 0)
            throw new ArgumentException("O valor do débito deve ser maior que zero.", nameof(cmd.Valor));

        if (cmd.DataVencimento.Year is < 2000 or > 2100)
            throw new ArgumentException("Data de Vencimento inválida.", nameof(cmd.DataVencimento));

        if (cmd.Origem is not null && cmd.Origem.Length > 150)
            throw new ArgumentException("Origem não pode exceder 150 caracteres.", nameof(cmd.Origem));

        if (cmd.Referencia is not null && cmd.Referencia.Length > 50)
            throw new ArgumentException("Referência não pode exceder 50 caracteres.", nameof(cmd.Referencia));

        // Operador: usa o usuário logado se não informado
        var operadorId = cmd.OperadorId ?? usuarioLogadoId;

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // ── 1. Resolver cliente ────────────────────────────────────────────
            var clienteRow = await conn.QuerySingleOrDefaultAsync<ClienteRow>(
                new CommandDefinition(
                    QueryResolverCliente,
                    new { clientePublicId = cmd.ClientePublicId },
                    transaction: tx,
                    cancellationToken: ct));

            if (clienteRow is null)
                throw new InvalidOperationException(
                    $"Cliente não encontrado para public_id={cmd.ClientePublicId}.");

            // ── 2. Resolver etapa ──────────────────────────────────────────────
            var etapaRow = await conn.QuerySingleOrDefaultAsync<EtapaRow>(
                new CommandDefinition(
                    QueryResolverEtapa,
                    new { publicId = cmd.EtapaPublicId },
                    transaction: tx,
                    cancellationToken: ct));

            if (etapaRow is null)
                throw new InvalidOperationException(
                    $"Etapa não encontrada ou inativa: {cmd.EtapaPublicId}.");

            // ── 3. Inserir negócio ─────────────────────────────────────────────
            var competenciaMes = cmd.DataVencimento.Month;
            var competenciaAno = cmd.DataVencimento.Year;
            var competenciaInt = competenciaAno * 100 + competenciaMes;

            var negocioRow = await conn.QuerySingleAsync<NegocioRow>(
                new CommandDefinition(
                    QueryInserirNegocio,
                    new
                    {
                        clienteId     = clienteRow.ClienteId,
                        etapaId       = etapaRow.Id,
                        operadorId,
                        referencia    = cmd.Referencia?.Trim(),
                        valor         = cmd.Valor,
                        competenciaAno,
                        competenciaMes,
                        competenciaInt,
                        dataVencimento = cmd.DataVencimento,
                        origem        = string.IsNullOrWhiteSpace(cmd.Origem) ? null : cmd.Origem.Trim(),
                        notas         = string.IsNullOrWhiteSpace(cmd.Notas)  ? null : cmd.Notas.Trim()
                    },
                    transaction: tx,
                    cancellationToken: ct));

            // ── 4. Registrar histórico de criação ──────────────────────────────
            await conn.ExecuteAsync(
                new CommandDefinition(
                    QueryInserirHistorico,
                    new
                    {
                        negocioId = negocioRow.Id,
                        usuarioId = usuarioLogadoId,
                        descricao = $"Negocio criado na etapa '{etapaRow.Nome}'.",
                        etapaId   = etapaRow.Id
                    },
                    transaction: tx,
                    cancellationToken: ct));

            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "Negócio criado: public_id={PublicId}, cliente_id={ClienteId}, etapa={Etapa}, operador={Operador}.",
                negocioRow.PublicId, clienteRow.ClienteId, etapaRow.Codigo, operadorId);

            return new NegocioCriadoDto(
                PublicId:       negocioRow.PublicId,
                NomeCliente:    clienteRow.NomeCliente ?? string.Empty,
                EtapaNome:      etapaRow.Nome,
                EtapaCodigo:    etapaRow.Codigo,
                Valor:          cmd.Valor,
                CompetenciaMes: competenciaMes,
                CompetenciaAno: competenciaAno);
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    // ─── Mapeamento interno ─────────────────────────────────────────────────────

    private sealed class ClienteRow
    {
        public long    ClienteId   { get; init; }
        public string? NomeCliente { get; init; }
    }

    private sealed class EtapaRow
    {
        public long   Id     { get; init; }
        public string Nome   { get; init; } = string.Empty;
        public string Codigo { get; init; } = string.Empty;
    }

    private sealed class NegocioRow
    {
        public long Id       { get; init; }
        public Guid PublicId { get; init; }
    }
}
