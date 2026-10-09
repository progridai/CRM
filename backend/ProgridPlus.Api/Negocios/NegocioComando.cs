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
        RETURNING id AS Id, public_id AS PublicId;
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

    private const string QueryResolverNegocio = """
        SELECT
            id          AS Id,
            public_id   AS PublicId,
            etapa_id    AS EtapaId
        FROM crm.negocio
        WHERE public_id = @negocioPublicId
          AND ativo = true
          AND deleted_at IS NULL
        LIMIT 1;
        """;

    private const string QueryResolverEtapaPorId = """
        SELECT
            id      AS Id,
            nome    AS Nome,
            codigo  AS Codigo
        FROM crm.negocio_etapa
        WHERE id = @id
        LIMIT 1;
        """;

    private const string QueryAtualizarEtapaNegocio = """
        UPDATE crm.negocio
        SET etapa_id = @novaEtapaId,
            updated_at = now()
        WHERE id = @negocioId;
        """;

    private const string QueryInserirHistoricoMudancaEtapa = """
        INSERT INTO crm.negocio_historico (
            negocio_id,
            usuario_id,
            tipo_evento,
            descricao,
            etapa_anterior_id,
            etapa_nova_id
        )
        VALUES (
            @negocioId,
            @usuarioId,
            'mudanca_etapa',
            @descricao,
            @etapaAnteriorId,
            @novaEtapaId
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

        if (cmd.CompetenciaAno is < 2000 or > 2100)
            throw new ArgumentException("Ano de Competência inválido.", nameof(cmd.CompetenciaAno));

        if (cmd.CompetenciaMes is < 1 or > 12)
            throw new ArgumentException("Mês de Competência inválido.", nameof(cmd.CompetenciaMes));

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
            var competenciaMes = cmd.CompetenciaMes;
            var competenciaAno = cmd.CompetenciaAno;
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
                        origem        = string.IsNullOrWhiteSpace(cmd.Origem) ? "Manual" : cmd.Origem.Trim(),
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
                        descricao = $"Negócio criado na etapa \"{etapaRow.Nome}\".",
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

    /// <summary>
    /// Altera a etapa de um negócio no Kanban e registra a mudança no histórico.
    /// </summary>
    public async Task MoverEtapaAsync(
        Guid negocioPublicId,
        Guid novaEtapaPublicId,
        long usuarioLogadoId,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            // 1. Resolver Negócio
            var negocio = await conn.QuerySingleOrDefaultAsync<NegocioBaseRow>(
                new CommandDefinition(
                    QueryResolverNegocio,
                    new { negocioPublicId },
                    transaction: tx,
                    cancellationToken: ct));

            if (negocio is null)
                throw new InvalidOperationException($"Negócio não encontrado ou inativo: {negocioPublicId}.");

            // 2. Resolver Nova Etapa
            var novaEtapa = await conn.QuerySingleOrDefaultAsync<EtapaRow>(
                new CommandDefinition(
                    QueryResolverEtapa,
                    new { publicId = novaEtapaPublicId },
                    transaction: tx,
                    cancellationToken: ct));

            if (novaEtapa is null)
                throw new InvalidOperationException($"Etapa destino não encontrada ou inativa: {novaEtapaPublicId}.");

            if (negocio.EtapaId == novaEtapa.Id)
            {
                // Já está na mesma etapa, não faz nada
                await tx.RollbackAsync(ct);
                return;
            }

            // Opcional: resolver etapa anterior para montar a descrição
            var etapaAnterior = await conn.QuerySingleOrDefaultAsync<EtapaRow>(
                new CommandDefinition(
                    QueryResolverEtapaPorId,
                    new { id = negocio.EtapaId },
                    transaction: tx,
                    cancellationToken: ct));

            var nomeAnterior = etapaAnterior?.Nome ?? "Desconhecida";

            // 3. Atualizar etapa do negócio
            await conn.ExecuteAsync(
                new CommandDefinition(
                    QueryAtualizarEtapaNegocio,
                    new { novaEtapaId = novaEtapa.Id, negocioId = negocio.Id },
                    transaction: tx,
                    cancellationToken: ct));

            // 4. Inserir histórico
            await conn.ExecuteAsync(
                new CommandDefinition(
                    QueryInserirHistoricoMudancaEtapa,
                    new
                    {
                        negocioId = negocio.Id,
                        usuarioId = usuarioLogadoId,
                        descricao = $"Movido de \"{nomeAnterior}\" para \"{novaEtapa.Nome}\".",
                        etapaAnteriorId = negocio.EtapaId,
                        novaEtapaId = novaEtapa.Id
                    },
                    transaction: tx,
                    cancellationToken: ct));

            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "Negócio {PublicId} movido da etapa {Antiga} para {Nova} pelo usuário {Usuario}.",
                negocioPublicId, negocio.EtapaId, novaEtapa.Id, usuarioLogadoId);
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private const string QueryInserirAtividade = """
        INSERT INTO crm.atividade (
            negocio_id,
            usuario_id,
            tipo,
            titulo,
            descricao
        )
        VALUES (
            @negocioId,
            @usuarioId,
            @tipo,
            @titulo,
            @descricao
        )
        RETURNING public_id AS PublicId, tipo AS Tipo, titulo AS Titulo, descricao AS Descricao, ocorrido_em AS OcorridoEm;
        """;

    public async Task<AtividadeDto> RegistrarAtividadeAsync(
        Guid negocioPublicId,
        RegistrarAtividadeCommand cmd,
        long usuarioLogadoId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(cmd.Tipo) || string.IsNullOrWhiteSpace(cmd.Titulo))
            throw new ArgumentException("Tipo e Título são obrigatórios.");

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var negocio = await conn.QuerySingleOrDefaultAsync<NegocioBaseRow>(
                new CommandDefinition(QueryResolverNegocio, new { negocioPublicId }, transaction: tx, cancellationToken: ct));

            if (negocio is null)
                throw new InvalidOperationException($"Negócio não encontrado: {negocioPublicId}");

            var usuarioNome = await conn.QuerySingleOrDefaultAsync<string>(
                new CommandDefinition(
                    "SELECT u.nome FROM seguranca.usuario u WHERE u.id = @id",
                    new { id = usuarioLogadoId }, transaction: tx, cancellationToken: ct)) ?? "Sistema";

            var atividadeRow = await conn.QuerySingleAsync<AtividadeRow>(
                new CommandDefinition(
                    QueryInserirAtividade,
                    new
                    {
                        negocioId = negocio.Id,
                        usuarioId = usuarioLogadoId,
                        tipo = cmd.Tipo,
                        titulo = cmd.Titulo,
                        descricao = cmd.Descricao
                    },
                    transaction: tx,
                    cancellationToken: ct));

            await tx.CommitAsync(ct);

            return new AtividadeDto(
                PublicId: atividadeRow.PublicId,
                Tipo: atividadeRow.Tipo,
                Titulo: atividadeRow.Titulo,
                Descricao: atividadeRow.Descricao,
                OcorridoEm: atividadeRow.OcorridoEm,
                NomeUsuario: usuarioNome,
                NegocioPublicId: negocioPublicId
            );
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

    private sealed class NegocioBaseRow
    {
        public long Id { get; init; }
        public Guid PublicId { get; init; }
        public long EtapaId { get; init; }
    }

    private sealed class AtividadeRow
    {
        public Guid PublicId { get; init; }
        public string Tipo { get; init; } = string.Empty;
        public string Titulo { get; init; } = string.Empty;
        public string? Descricao { get; init; }
        public DateTime OcorridoEm { get; init; }
    }
}
