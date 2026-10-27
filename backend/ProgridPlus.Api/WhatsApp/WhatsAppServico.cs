using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.WhatsApp;

public sealed partial class WhatsAppServico
{
    private const string CodigoIntegracao = "sisnetsul_whatsapp";
    private readonly string _connectionString;
    private readonly IConfiguration _configuration;
    private readonly SisnetsulWhatsAppClient _client;
    private readonly ILogger<WhatsAppServico> _logger;

    public WhatsAppServico(
        IConfiguration configuration,
        SisnetsulWhatsAppClient client,
        ILogger<WhatsAppServico> logger)
    {
        _configuration = configuration;
        _client = client;
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
    }

    public async Task<WhatsAppConfiguracaoDto> ObterConfiguracaoAsync(CancellationToken ct = default)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        var configuracao = await CarregarConfiguracaoAsync(connection, ct);
        return ParaDto(configuracao);
    }

    public async Task<WhatsAppConfiguracaoDto> AtualizarConfiguracaoAsync(
        AtualizarWhatsAppConfiguracaoRequest request,
        long usuarioId,
        CancellationToken ct = default)
    {
        ValidarConfiguracao(request);

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);

        try
        {
            var anterior = await CarregarConfiguracaoAsync(connection, transaction, ct);

            const string atualizarIntegracao = """
                UPDATE crm.integracao
                SET base_url = @BaseUrl,
                    endpoint_disparo = @EndpointDisparo,
                    atualizado_por = @UsuarioId,
                    atualizado_em = now()
                WHERE id = @IntegracaoId;
                """;

            const string atualizarWhatsApp = """
                UPDATE crm.integracao_whatsapp_configuracao
                SET canal = @Canal,
                    template_padrao = @TemplatePadrao,
                    template_language = @TemplateLanguage,
                    mensagem_template = @MensagemTemplate,
                    seguro_padrao = @SeguroPadrao,
                    abrir_atendimento = @AbrirAtendimento,
                    fila_disparo = @FilaDisparo,
                    agente_disparo = @AgenteDisparo,
                    timeout_segundos = @TimeoutSegundos
                WHERE integracao_id = @IntegracaoId;
                """;

            var parametros = new
            {
                IntegracaoId = anterior.IntegracaoId,
                UsuarioId = usuarioId,
                BaseUrl = request.BaseUrl.Trim().TrimEnd('/'),
                EndpointDisparo = NormalizarEndpoint(request.EndpointDisparo),
                Canal = SomenteDigitos(request.Canal),
                TemplatePadrao = request.TemplatePadrao.Trim(),
                TemplateLanguage = request.TemplateLanguage.Trim(),
                MensagemTemplate = request.MensagemTemplate.Trim(),
                SeguroPadrao = request.SeguroPadrao.Trim(),
                request.AbrirAtendimento,
                FilaDisparo = TextoOpcional(request.FilaDisparo),
                AgenteDisparo = TextoOpcional(request.AgenteDisparo),
                request.TimeoutSegundos,
            };

            await connection.ExecuteAsync(new CommandDefinition(
                atualizarIntegracao, parametros, transaction, cancellationToken: ct));
            await connection.ExecuteAsync(new CommandDefinition(
                atualizarWhatsApp, parametros, transaction, cancellationToken: ct));

            var novoSnapshot = JsonSerializer.Serialize(new
            {
                parametros.BaseUrl,
                parametros.EndpointDisparo,
                parametros.Canal,
                parametros.TemplatePadrao,
                parametros.TemplateLanguage,
                parametros.MensagemTemplate,
                parametros.SeguroPadrao,
                parametros.AbrirAtendimento,
                parametros.FilaDisparo,
                parametros.AgenteDisparo,
                parametros.TimeoutSegundos,
            });
            var snapshotAnterior = JsonSerializer.Serialize(new
            {
                anterior.BaseUrl,
                anterior.EndpointDisparo,
                anterior.Canal,
                anterior.TemplatePadrao,
                anterior.TemplateLanguage,
                anterior.MensagemTemplate,
                anterior.SeguroPadrao,
                anterior.AbrirAtendimento,
                anterior.FilaDisparo,
                anterior.AgenteDisparo,
                anterior.TimeoutSegundos,
            });

            const string inserirHistorico = """
                INSERT INTO crm.integracao_configuracao_historico
                    (integracao_id, usuario_id, configuracao_anterior, configuracao_nova)
                VALUES
                    (@IntegracaoId, @UsuarioId, CAST(@Anterior AS jsonb), CAST(@Nova AS jsonb));
                """;
            await connection.ExecuteAsync(new CommandDefinition(
                inserirHistorico,
                new { anterior.IntegracaoId, UsuarioId = usuarioId, Anterior = snapshotAnterior, Nova = novoSnapshot },
                transaction,
                cancellationToken: ct));

            await transaction.CommitAsync(ct);
            return await ObterConfiguracaoAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    public async Task<WhatsAppPreviewDto> PrepararPreviewAsync(
        IReadOnlyList<Guid> negocioIds,
        CancellationToken ct = default)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        var configuracao = await CarregarConfiguracaoAsync(connection, ct);
        var preparacao = await PrepararDestinatariosAsync(connection, configuracao, negocioIds, ct);
        return ParaPreview(preparacao);
    }

    public async Task<WhatsAppDisparoResumoDto> CriarDisparoAsync(
        CriarDisparoWhatsAppRequest request,
        long usuarioId,
        string usuarioNome,
        CancellationToken ct = default)
    {
        var titulo = request.Titulo?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(titulo))
            throw new ArgumentException("Informe o título da campanha.");
        if (titulo.Length > 200)
            throw new ArgumentException("O título da campanha deve ter no máximo 200 caracteres.");
        if (request.NegocioIds is null || request.NegocioIds.Count == 0)
            throw new ArgumentException("Selecione pelo menos um negócio.");

        var idsSolicitados = request.NegocioIds.Where(id => id != Guid.Empty).Distinct().ToArray();
        if (idsSolicitados.Length == 0)
            throw new ArgumentException("Os negócios selecionados são inválidos.");
        if (idsSolicitados.Length > 5000)
            throw new ArgumentException("Cada disparo pode conter no máximo 5.000 negócios.");

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        var configuracao = await CarregarConfiguracaoAsync(connection, ct);
        var preparacao = await PrepararDestinatariosAsync(connection, configuracao, idsSolicitados, ct);
        if (preparacao.Destinatarios.Count == 0)
            throw new ArgumentException("Nenhum dos negócios selecionados possui um telefone válido para envio.");

        var tipo = string.Equals(request.Tipo, "individual", StringComparison.OrdinalIgnoreCase)
            || idsSolicitados.Length == 1
            ? "individual"
            : "massa";

        long disparoId;
        Guid disparoPublicId;
        await using (var transaction = await connection.BeginTransactionAsync(ct))
        {
            try
            {
                const string inserirDisparo = """
                    INSERT INTO crm.whatsapp_disparo (
                        integracao_id, tipo, titulo, template, template_language, status,
                        usuario_id, usuario_nome, total_selecionados, total_destinatarios, total_excluidos,
                        endpoint_fornecedor)
                    VALUES (
                        @IntegracaoId, @Tipo, @Titulo, @Template, @TemplateLanguage, 'pendente',
                        @UsuarioId, @UsuarioNome, @TotalSelecionados, @TotalDestinatarios, @TotalExcluidos,
                        @EndpointFornecedor)
                    RETURNING id AS Id, public_id AS PublicId;
                    """;
                var disparo = await connection.QuerySingleAsync<DisparoCriadoRow>(new CommandDefinition(
                    inserirDisparo,
                    new
                    {
                        configuracao.IntegracaoId,
                        Tipo = tipo,
                        Titulo = titulo,
                        Template = configuracao.TemplatePadrao,
                        configuracao.TemplateLanguage,
                        UsuarioId = usuarioId,
                        UsuarioNome = usuarioNome,
                        TotalSelecionados = idsSolicitados.Length,
                        TotalDestinatarios = preparacao.Destinatarios.Count,
                        TotalExcluidos = preparacao.Excluidos.Count,
                        EndpointFornecedor = new Uri(
                            new Uri(configuracao.BaseUrl.TrimEnd('/') + "/"),
                            configuracao.EndpointDisparo.TrimStart('/')).ToString(),
                    },
                    transaction,
                    cancellationToken: ct));

                disparoId = disparo.Id;
                disparoPublicId = disparo.PublicId;

                const string inserirDestinatario = """
                    INSERT INTO crm.whatsapp_disparo_destinatario (
                        disparo_id, negocio_id, nome, numero, mensagem, variaveis, status, erro)
                    VALUES (
                        @DisparoId, @NegocioId, @Nome, @Numero, @Mensagem,
                        CAST(@Variaveis AS jsonb), @Status, @Erro);
                    """;

                foreach (var destinatario in preparacao.Destinatarios)
                {
                    await connection.ExecuteAsync(new CommandDefinition(
                        inserirDestinatario,
                        new
                        {
                            DisparoId = disparoId,
                            destinatario.NegocioId,
                            destinatario.Nome,
                            destinatario.Numero,
                            destinatario.Mensagem,
                            Variaveis = JsonSerializer.Serialize(destinatario.Variaveis),
                            Status = "pendente",
                            Erro = (string?)null,
                        },
                        transaction,
                        cancellationToken: ct));
                }

                foreach (var excluido in preparacao.Excluidos)
                {
                    await connection.ExecuteAsync(new CommandDefinition(
                        inserirDestinatario,
                        new
                        {
                            DisparoId = disparoId,
                            excluido.NegocioId,
                            excluido.Nome,
                            Numero = excluido.Numero,
                            Mensagem = (string?)null,
                            Variaveis = "{}",
                            Status = "ignorado",
                            Erro = excluido.Motivo,
                        },
                        transaction,
                        cancellationToken: ct));
                }

                await transaction.CommitAsync(ct);
            }
            catch
            {
                await transaction.RollbackAsync(CancellationToken.None);
                throw;
            }
        }

        SisnetsulDisparoResultado resultado;
        try
        {
            resultado = await _client.DispararAsync(
                configuracao,
                titulo,
                preparacao.Destinatarios,
                ct);
        }
        catch (InvalidOperationException ex)
        {
            resultado = new SisnetsulDisparoResultado(false, null, ex.Message, false, null, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Falha inesperada ao enviar o disparo WhatsApp {DisparoId}.", disparoPublicId);
            resultado = new SisnetsulDisparoResultado(
                false,
                null,
                "Não foi possível confirmar o resultado do disparo.",
                true,
                null,
                null);
        }

        var status = resultado.Sucesso
            ? "aceito_fornecedor"
            : resultado.ResultadoIncerto ? "resultado_incerto" : "rejeitado";

        await AtualizarResultadoAsync(
            connection,
            disparoId,
            status,
            resultado,
            preparacao.Destinatarios,
            usuarioId,
            CancellationToken.None);

        var resumo = await ObterResumoAsync(connection, disparoPublicId, CancellationToken.None);
        return resumo with { Diagnostico = resultado.Diagnostico };
    }

    public async Task<IReadOnlyList<WhatsAppDisparoResumoDto>> ListarDisparosAsync(
        int limite = 100,
        CancellationToken ct = default)
    {
        limite = Math.Clamp(limite, 1, 500);
        await using var connection = new NpgsqlConnection(_connectionString);
        var rows = await connection.QueryAsync<DisparoResumoRow>(new CommandDefinition(
            QueryResumo + " ORDER BY d.criado_em DESC LIMIT @Limite;",
            new { Limite = limite },
            cancellationToken: ct));
        return rows.Select(ParaResumo).ToList();
    }

    public async Task<WhatsAppDisparoDetalheDto?> ObterDisparoAsync(
        Guid publicId,
        CancellationToken ct = default)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        var resumo = await connection.QuerySingleOrDefaultAsync<DisparoResumoRow>(new CommandDefinition(
            QueryResumo + " AND d.public_id = @PublicId;",
            new { PublicId = publicId },
            cancellationToken: ct));
        if (resumo is null) return null;

        const string queryDestinatarios = """
            SELECT
                n.public_id AS NegocioPublicId,
                dd.nome AS Nome,
                dd.numero AS Numero,
                dd.mensagem AS Mensagem,
                dd.status AS Status,
                dd.erro AS Erro
            FROM crm.whatsapp_disparo_destinatario dd
            LEFT JOIN crm.negocio n ON n.id = dd.negocio_id
            INNER JOIN crm.whatsapp_disparo d ON d.id = dd.disparo_id
            WHERE d.public_id = @PublicId
            ORDER BY dd.id;
            """;
        var destinatarios = await connection.QueryAsync<WhatsAppDisparoDestinatarioDto>(new CommandDefinition(
            queryDestinatarios,
            new { PublicId = publicId },
            cancellationToken: ct));
        return new WhatsAppDisparoDetalheDto(ParaResumo(resumo), destinatarios.AsList());
    }

    private async Task AtualizarResultadoAsync(
        NpgsqlConnection connection,
        long disparoId,
        string status,
        SisnetsulDisparoResultado resultado,
        IReadOnlyList<WhatsAppDestinatarioPreparado> destinatarios,
        long usuarioId,
        CancellationToken ct)
    {
        await using var transaction = await connection.BeginTransactionAsync(ct);
        try
        {
            const string atualizarDisparo = """
                UPDATE crm.whatsapp_disparo
                SET status = @Status,
                    campanha_id_externo = @CampanhaId,
                    http_status_fornecedor = @HttpStatusFornecedor,
                    mensagem_retorno = CASE WHEN @Sucesso THEN @Mensagem ELSE NULL END,
                    erro = CASE WHEN @Sucesso THEN NULL ELSE @Mensagem END,
                    concluido_em = now()
                WHERE id = @DisparoId;

                UPDATE crm.whatsapp_disparo_destinatario
                SET status = @StatusDestinatario,
                    erro = CASE WHEN @Sucesso THEN NULL ELSE @Mensagem END
                WHERE disparo_id = @DisparoId
                  AND status = 'pendente';
                """;
            await connection.ExecuteAsync(new CommandDefinition(
                atualizarDisparo,
                new
                {
                    DisparoId = disparoId,
                    Status = status,
                    resultado.CampanhaId,
                    resultado.HttpStatusFornecedor,
                    resultado.Mensagem,
                    resultado.Sucesso,
                    StatusDestinatario = status,
                },
                transaction,
                cancellationToken: ct));

            if (resultado.Sucesso)
            {
                var negocioIds = destinatarios
                    .SelectMany(destinatario => destinatario.NegocioIdsRelacionados)
                    .Distinct()
                    .ToArray();
                const string inserirAtividades = """
                    INSERT INTO crm.atividade (negocio_id, usuario_id, tipo, titulo, descricao)
                    SELECT
                        negocio_id,
                        @UsuarioId,
                        'whatsapp',
                        'Mensagem inicial enviada',
                        @Descricao
                    FROM unnest(@NegocioIds::bigint[]) AS negocio_id;
                    """;
                await connection.ExecuteAsync(new CommandDefinition(
                    inserirAtividades,
                    new
                    {
                        UsuarioId = usuarioId,
                        NegocioIds = negocioIds,
                        Descricao = resultado.CampanhaId is null
                            ? "Mensagem inicial aceita pela Sisnetsul."
                            : $"Mensagem inicial aceita pela Sisnetsul. Campanha {resultado.CampanhaId}.",
                    },
                    transaction,
                    cancellationToken: ct));

                var negociosMovidos = await MoverParaContatoEmAndamentoAsync(
                    connection,
                    transaction,
                    negocioIds,
                    usuarioId,
                    ct);

                _logger.LogInformation(
                    "{Total} negócio(s) movido(s) automaticamente para Contato em Andamento após o disparo WhatsApp {DisparoId}.",
                    negociosMovidos,
                    disparoId);
            }

            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private static async Task<int> MoverParaContatoEmAndamentoAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        IReadOnlyList<long> negocioIds,
        long usuarioId,
        CancellationToken ct)
    {
        const string buscarEtapa = """
            SELECT id
            FROM crm.negocio_etapa
            WHERE codigo = 'contato_em_andamento'
              AND ativo = true
            LIMIT 1;
            """;
        var etapaDestinoId = await connection.QuerySingleOrDefaultAsync<long?>(new CommandDefinition(
            buscarEtapa,
            transaction: transaction,
            cancellationToken: ct));
        if (etapaDestinoId is null)
            throw new InvalidOperationException("A etapa Contato em Andamento não está disponível.");

        const string moverNegocios = """
            WITH negocios_anteriores AS MATERIALIZED (
                SELECT n.id, n.etapa_id
                FROM crm.negocio n
                WHERE n.id = ANY(@NegocioIds)
                  AND n.ativo = true
                  AND n.deleted_at IS NULL
                  AND n.etapa_id <> @EtapaDestinoId
                FOR UPDATE
            ),
            negocios_atualizados AS (
                UPDATE crm.negocio n
                SET etapa_id = @EtapaDestinoId,
                    updated_at = now()
                FROM negocios_anteriores anterior
                WHERE n.id = anterior.id
                RETURNING n.id
            )
            INSERT INTO crm.negocio_historico (
                negocio_id,
                usuario_id,
                tipo_evento,
                descricao,
                etapa_anterior_id,
                etapa_nova_id)
            SELECT
                anterior.id,
                @UsuarioId,
                'mudanca_etapa',
                'Movido automaticamente para "Contato em Andamento" após envio de WhatsApp.',
                anterior.etapa_id,
                @EtapaDestinoId
            FROM negocios_anteriores anterior
            INNER JOIN negocios_atualizados atualizado ON atualizado.id = anterior.id;
            """;
        return await connection.ExecuteAsync(new CommandDefinition(
            moverNegocios,
            new
            {
                NegocioIds = negocioIds.ToArray(),
                EtapaDestinoId = etapaDestinoId.Value,
                UsuarioId = usuarioId,
            },
            transaction,
            cancellationToken: ct));
    }

    private async Task<PreparacaoDestinatarios> PrepararDestinatariosAsync(
        NpgsqlConnection connection,
        WhatsAppConfiguracaoInterna configuracao,
        IReadOnlyList<Guid> negocioIds,
        CancellationToken ct)
    {
        var ids = negocioIds.Where(id => id != Guid.Empty).Distinct().ToArray();
        const string query = """
            SELECT
                n.id AS NegocioId,
                n.public_id AS NegocioPublicId,
                n.competencia_mes AS CompetenciaMes,
                n.competencia_ano AS CompetenciaAno,
                p.nome AS Nome,
                (
                    SELECT pc.valor
                    FROM core.pessoa_contato pc
                    WHERE pc.pessoa_id = cl.pessoa_id
                      AND UPPER(pc.tipo_contato) IN ('CELULAR', 'TELEFONE')
                      AND pc.ativo = true
                      AND NULLIF(BTRIM(pc.valor), '') IS NOT NULL
                    ORDER BY
                      pc.principal DESC,
                      CASE UPPER(pc.tipo_contato) WHEN 'CELULAR' THEN 0 ELSE 1 END,
                      pc.id
                    LIMIT 1
                ) AS Telefone
            FROM crm.negocio n
            INNER JOIN cadastro.cliente cl ON cl.id = n.cliente_id
            INNER JOIN core.pessoa p ON p.id = cl.pessoa_id
            WHERE n.public_id = ANY(@Ids)
              AND n.ativo = true
              AND n.deleted_at IS NULL
            ORDER BY n.competencia_ano, n.competencia_mes, n.id;
            """;
        var rows = (await connection.QueryAsync<NegocioWhatsAppRow>(new CommandDefinition(
            query,
            new { Ids = ids },
            cancellationToken: ct))).AsList();

        var encontrados = rows.Select(row => row.NegocioPublicId).ToHashSet();
        var excluidos = ids
            .Where(id => !encontrados.Contains(id))
            .Select(id => new DestinatarioExcluido(0, id, "Negócio não encontrado", null, "Negócio não encontrado ou inativo."))
            .ToList();

        var porNumero = new Dictionary<string, List<NegocioWhatsAppRow>>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            var numero = NormalizarTelefone(row.Telefone);
            if (numero is null)
            {
                excluidos.Add(new DestinatarioExcluido(
                    row.NegocioId,
                    row.NegocioPublicId,
                    row.Nome,
                    row.Telefone,
                    "Telefone ausente ou inválido."));
                continue;
            }

            if (!porNumero.TryGetValue(numero, out var negociosDoNumero))
            {
                negociosDoNumero = [];
                porNumero[numero] = negociosDoNumero;
            }
            negociosDoNumero.Add(row);
        }

        var destinatarios = new List<WhatsAppDestinatarioPreparado>();
        foreach (var (numero, negociosDoNumero) in porNumero)
        {
            var principal = negociosDoNumero[0];
            var parcela = $"{principal.CompetenciaMes:00}/{principal.CompetenciaAno}";
            var variaveis = new Dictionary<string, string>
            {
                ["1"] = principal.Nome,
                ["2"] = parcela,
                ["3"] = configuracao.SeguroPadrao,
            };
            var mensagem = configuracao.MensagemTemplate
                .Replace("{{1}}", principal.Nome, StringComparison.Ordinal)
                .Replace("{{2}}", parcela, StringComparison.Ordinal)
                .Replace("{{3}}", configuracao.SeguroPadrao, StringComparison.Ordinal)
                .Replace("{{nome}}", principal.Nome, StringComparison.OrdinalIgnoreCase);

            destinatarios.Add(new WhatsAppDestinatarioPreparado(
                principal.NegocioId,
                principal.NegocioPublicId,
                negociosDoNumero.Select(item => item.NegocioId).Distinct().ToArray(),
                principal.Nome,
                numero,
                mensagem,
                variaveis));

            foreach (var duplicado in negociosDoNumero.Skip(1))
            {
                excluidos.Add(new DestinatarioExcluido(
                    duplicado.NegocioId,
                    duplicado.NegocioPublicId,
                    duplicado.Nome,
                    numero,
                    "Telefone repetido na mesma campanha; será enviado apenas uma vez."));
            }
        }

        return new PreparacaoDestinatarios(ids.Length, destinatarios, excluidos);
    }

    private static WhatsAppPreviewDto ParaPreview(PreparacaoDestinatarios preparacao) => new(
        preparacao.TotalSelecionados,
        preparacao.Destinatarios.Count,
        preparacao.Excluidos.Count,
        preparacao.Destinatarios.Select(item => new WhatsAppPreviewDestinatarioDto(
            item.NegocioPublicId,
            item.Nome,
            item.Numero,
            item.Mensagem)).ToList(),
        preparacao.Excluidos.Select(item => new WhatsAppPreviewExcluidoDto(
            item.NegocioPublicId,
            item.Nome,
            item.Numero,
            item.Motivo)).ToList());

    private async Task<WhatsAppConfiguracaoInterna> CarregarConfiguracaoAsync(
        NpgsqlConnection connection,
        CancellationToken ct) =>
        await CarregarConfiguracaoAsync(connection, null, ct);

    private static async Task<WhatsAppConfiguracaoInterna> CarregarConfiguracaoAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction? transaction,
        CancellationToken ct)
    {
        const string query = """
            SELECT
                i.id AS IntegracaoId,
                i.public_id AS PublicId,
                i.nome AS Nome,
                i.fornecedor AS Fornecedor,
                i.base_url AS BaseUrl,
                i.endpoint_disparo AS EndpointDisparo,
                w.canal AS Canal,
                w.template_padrao AS TemplatePadrao,
                w.template_language AS TemplateLanguage,
                w.mensagem_template AS MensagemTemplate,
                w.seguro_padrao AS SeguroPadrao,
                w.abrir_atendimento AS AbrirAtendimento,
                w.fila_disparo AS FilaDisparo,
                w.agente_disparo AS AgenteDisparo,
                w.timeout_segundos AS TimeoutSegundos,
                i.atualizado_em AS AtualizadoEm,
                u.nome AS AtualizadoPor
            FROM crm.integracao i
            INNER JOIN crm.integracao_whatsapp_configuracao w ON w.integracao_id = i.id
            LEFT JOIN seguranca.usuario u ON u.id = i.atualizado_por
            WHERE i.codigo = 'sisnetsul_whatsapp'
              AND i.ativo = true
            LIMIT 1;
            """;
        return await connection.QuerySingleOrDefaultAsync<WhatsAppConfiguracaoInterna>(new CommandDefinition(
            query,
            transaction: transaction,
            cancellationToken: ct))
            ?? throw new InvalidOperationException("A integração WhatsApp/Sisnetsul não está configurada.");
    }

    private WhatsAppConfiguracaoDto ParaDto(WhatsAppConfiguracaoInterna configuracao) => new(
        configuracao.PublicId,
        configuracao.Nome,
        configuracao.Fornecedor,
        configuracao.BaseUrl,
        configuracao.EndpointDisparo,
        configuracao.Canal,
        configuracao.TemplatePadrao,
        configuracao.TemplateLanguage,
        configuracao.MensagemTemplate,
        configuracao.SeguroPadrao,
        configuracao.AbrirAtendimento,
        configuracao.FilaDisparo,
        configuracao.AgenteDisparo,
        configuracao.TimeoutSegundos,
        !string.IsNullOrWhiteSpace(_configuration["Integracoes:Sisnetsul:ApiKey"]),
        configuracao.AtualizadoEm,
        configuracao.AtualizadoPor);

    private static void ValidarConfiguracao(AtualizarWhatsAppConfiguracaoRequest request)
    {
        if (!Uri.TryCreate(request.BaseUrl?.Trim(), UriKind.Absolute, out var baseUri)
            || !string.Equals(baseUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Informe um endereço base HTTPS válido.");
        if (string.IsNullOrWhiteSpace(baseUri.Host))
            throw new ArgumentException("O endereço base deve possuir um domínio válido.");
        if (string.IsNullOrWhiteSpace(request.EndpointDisparo))
            throw new ArgumentException("Informe o endpoint de disparo.");
        if (SomenteDigitos(request.Canal).Length < 10)
            throw new ArgumentException("Informe um canal oficial válido.");
        if (string.IsNullOrWhiteSpace(request.TemplatePadrao))
            throw new ArgumentException("Informe o template padrão.");
        if (string.IsNullOrWhiteSpace(request.TemplateLanguage))
            throw new ArgumentException("Informe o idioma do template.");
        if (string.IsNullOrWhiteSpace(request.MensagemTemplate))
            throw new ArgumentException("Informe o texto usado para registrar a mensagem.");
        if (string.IsNullOrWhiteSpace(request.SeguroPadrao))
            throw new ArgumentException("Informe o seguro padrão da terceira variável do template.");
        if (request.TimeoutSegundos is < 5 or > 120)
            throw new ArgumentException("O timeout deve ficar entre 5 e 120 segundos.");
    }

    private static string NormalizarEndpoint(string endpoint) => "/" + endpoint.Trim().TrimStart('/');
    private static string? TextoOpcional(string? texto) => string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
    private static string SomenteDigitos(string? valor) => DigitosRegex().Replace(valor ?? string.Empty, string.Empty);

    private static string? NormalizarTelefone(string? telefone)
    {
        var digitos = SomenteDigitos(telefone);
        if (digitos.StartsWith("55", StringComparison.Ordinal) && digitos.Length is 12 or 13)
            return digitos;
        if (digitos.Length is 10 or 11)
            return "55" + digitos;
        return null;
    }

    private const string QueryResumo = """
        SELECT
            d.public_id AS PublicId,
            d.tipo AS Tipo,
            d.titulo AS Titulo,
            d.template AS Template,
            d.status AS Status,
            d.total_selecionados AS TotalSelecionados,
            d.total_destinatarios AS TotalDestinatarios,
            d.total_excluidos AS TotalExcluidos,
            d.endpoint_fornecedor AS EndpointFornecedor,
            d.http_status_fornecedor AS HttpStatusFornecedor,
            d.campanha_id_externo AS CampanhaIdExterno,
            d.mensagem_retorno AS MensagemRetorno,
            d.erro AS Erro,
            d.criado_em AS CriadoEm,
            d.concluido_em AS ConcluidoEm,
            COALESCE(u.nome, d.usuario_nome, 'Sistema') AS OperadorNome
        FROM crm.whatsapp_disparo d
        LEFT JOIN seguranca.usuario u ON u.id = d.usuario_id
        WHERE 1 = 1
        """;

    private static async Task<WhatsAppDisparoResumoDto> ObterResumoAsync(
        NpgsqlConnection connection,
        Guid publicId,
        CancellationToken ct)
    {
        var row = await connection.QuerySingleAsync<DisparoResumoRow>(new CommandDefinition(
            QueryResumo + " AND d.public_id = @PublicId;",
            new { PublicId = publicId },
            cancellationToken: ct));
        return ParaResumo(row);
    }

    private static WhatsAppDisparoResumoDto ParaResumo(DisparoResumoRow row) => new(
        row.PublicId,
        row.Tipo,
        row.Titulo,
        row.Template,
        row.Status,
        row.TotalSelecionados,
        row.TotalDestinatarios,
        row.TotalExcluidos,
        row.EndpointFornecedor,
        row.HttpStatusFornecedor,
        row.CampanhaIdExterno,
        row.MensagemRetorno,
        row.Erro,
        row.CriadoEm,
        row.ConcluidoEm,
        row.OperadorNome);

    [GeneratedRegex("\\D+")]
    private static partial Regex DigitosRegex();

    private sealed class NegocioWhatsAppRow
    {
        public long NegocioId { get; init; }
        public Guid NegocioPublicId { get; init; }
        public short CompetenciaMes { get; init; }
        public short CompetenciaAno { get; init; }
        public string Nome { get; init; } = string.Empty;
        public string? Telefone { get; init; }
    }

    private sealed class DisparoCriadoRow
    {
        public long Id { get; init; }
        public Guid PublicId { get; init; }
    }

    private sealed class DisparoResumoRow
    {
        public Guid PublicId { get; init; }
        public string Tipo { get; init; } = string.Empty;
        public string Titulo { get; init; } = string.Empty;
        public string Template { get; init; } = string.Empty;
        public string Status { get; init; } = string.Empty;
        public int TotalSelecionados { get; init; }
        public int TotalDestinatarios { get; init; }
        public int TotalExcluidos { get; init; }
        public string EndpointFornecedor { get; init; } = string.Empty;
        public int? HttpStatusFornecedor { get; init; }
        public long? CampanhaIdExterno { get; init; }
        public string? MensagemRetorno { get; init; }
        public string? Erro { get; init; }
        public DateTime CriadoEm { get; init; }
        public DateTime? ConcluidoEm { get; init; }
        public string OperadorNome { get; init; } = string.Empty;
    }

    private sealed record DestinatarioExcluido(
        long NegocioId,
        Guid NegocioPublicId,
        string Nome,
        string? Numero,
        string Motivo);

    private sealed record PreparacaoDestinatarios(
        int TotalSelecionados,
        IReadOnlyList<WhatsAppDestinatarioPreparado> Destinatarios,
        IReadOnlyList<DestinatarioExcluido> Excluidos);
}
