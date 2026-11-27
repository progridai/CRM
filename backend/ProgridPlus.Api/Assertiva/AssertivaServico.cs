using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Npgsql;
using ProgridPlus.Api.Contatos;

namespace ProgridPlus.Api.Assertiva;

internal sealed record AssertivaConfiguracao(
    string ClientId, string SecretProtegido, bool Ativa, int Finalidade, int PrazoDias, int RetencaoDias, Guid Revisao);

public sealed class AssertivaServico(
    IConfiguration configuration, AssertivaClient client, AssertivaSegredo segredo, ContatoTelefoneComando telefones)
{
    private const int PrazoPadrao = 90;
    private const int RetencaoPadrao = 365;
    private const string ColunasConfiguracao = """
        client_id AS ClientId, secret_protegido AS SecretProtegido, ativa, finalidade,
        prazo_dias AS PrazoDias, retencao_dias AS RetencaoDias, revisao
        """;

    private const string ColunasHistorico = """
        c.id, c.solicitado_em AS Data, COALESCE(u.nome, u.username, 'Usuário indisponível') AS Usuario,
        c.status, c.erro, c.protocolo, c.dentro_do_prazo AS DentroDoPrazo,
        c.antecipacao_confirmada AS AntecipacaoConfirmada, c.operacao
        """;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private NpgsqlConnection Conectar() => new(configuration.GetConnectionString("DefaultConnection"));

    public async Task<AssertivaConfiguracaoDto> ObterConfiguracaoAsync(CancellationToken ct)
    {
        await using var db = Conectar();
        return Projetar(await LerConfiguracaoAsync(db, ct));
    }

    public async Task<AssertivaConfiguracaoDto> SalvarAsync(SalvarAssertivaRequest request, long usuario, CancellationToken ct)
    {
        var clientId = request.ClientId?.Trim();
        if (string.IsNullOrWhiteSpace(clientId) || clientId.Length > 255 || clientId.Contains(':')
            || request.ClientSecret?.Length > 2048 || request.Finalidade is not (1 or 2 or 5)
            || request.PrazoDias is < 1 or > 3650 || request.RetencaoDias is < 1 or > 3650)
            throw new AssertivaFalha(400, "configuracao_invalida", "Confira o Client ID, a finalidade e os prazos informados.");

        await using var db = Conectar();
        var atual = await LerConfiguracaoAsync(db, ct);
        if (atual?.Revisao != request.Revisao)
            throw ConfiguracaoAlterada();

        var protegido = string.IsNullOrEmpty(request.ClientSecret)
            ? atual?.SecretProtegido : segredo.Proteger(request.ClientSecret);
        if (protegido is null || (clientId != atual?.ClientId && string.IsNullOrEmpty(request.ClientSecret)))
            throw new AssertivaFalha(400, "secret_ausente", "Informe o Client Secret para este Client ID.");

        var config = new AssertivaConfiguracao(clientId, protegido, request.Ativa, request.Finalidade,
            request.PrazoDias, request.RetencaoDias, Guid.NewGuid());
        var gravadas = await db.ExecuteAsync(new CommandDefinition("""
            INSERT INTO crm.assertiva_configuracao
                (id, client_id, secret_protegido, ativa, finalidade, prazo_dias, retencao_dias, revisao, atualizado_por)
            VALUES (1, @ClientId, @SecretProtegido, @Ativa, @Finalidade, @PrazoDias, @RetencaoDias, @Revisao, @usuario)
            ON CONFLICT (id) DO UPDATE SET
                client_id = excluded.client_id, secret_protegido = excluded.secret_protegido, ativa = excluded.ativa,
                finalidade = excluded.finalidade, prazo_dias = excluded.prazo_dias, retencao_dias = excluded.retencao_dias,
                revisao = excluded.revisao, atualizado_em = now(), atualizado_por = excluded.atualizado_por
            WHERE assertiva_configuracao.revisao = @anterior;
            """, new
            {
                config.ClientId, config.SecretProtegido, config.Ativa, config.Finalidade,
                config.PrazoDias, config.RetencaoDias, config.Revisao, usuario, anterior = request.Revisao
            }, cancellationToken: ct));
        if (gravadas == 0)
            throw ConfiguracaoAlterada();

        return Projetar(config);
    }

    public async Task TestarAsync(CancellationToken ct)
    {
        await using var db = Conectar();
        var config = await LerConfiguracaoAsync(db, ct)
            ?? throw new AssertivaFalha(409, "sem_configuracao", "Salve as credenciais antes de testar a autenticação.");
        using var limite = CancellationTokenSource.CreateLinkedTokenSource(ct);
        limite.CancelAfter(TimeSpan.FromSeconds(25));
        try
        {
            await client.TestarAutenticacaoAsync(config, limite.Token);
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            throw Indisponivel();
        }
    }

    public async Task<AssertivaFichaDto> ObterFichaAsync(Guid clientePublicId, CancellationToken ct)
    {
        await using var db = Conectar();
        var cadastro = await ObterClienteAsync(db, clientePublicId, ct);
        var config = await LerConfiguracaoAsync(db, ct);
        var prazo = config?.PrazoDias ?? PrazoPadrao;
        var retencao = config?.RetencaoDias ?? RetencaoPadrao;
        var agora = DateTime.UtcNow;

        var ultima = await db.QuerySingleOrDefaultAsync<ConsultaSalva>(new CommandDefinition($"""
            SELECT {ColunasHistorico}, c.concluido_em AS Concluido,
                CASE WHEN c.concluido_em >= @corte THEN c.resultado::text END AS Resultado
            FROM crm.assertiva_consulta c
            LEFT JOIN seguranca.usuario u ON u.id = c.usuario_id
            WHERE c.cliente_id = @id AND c.status IN ('sucesso', 'sem_resultado')
            ORDER BY c.solicitado_em DESC, c.id DESC LIMIT 1;
            """, new { cadastro.Id, corte = agora.AddDays(-retencao) }, cancellationToken: ct));

        var tentativa = (await LerHistoricoAsync(db, cadastro.Id, 0, 1, ct)).SingleOrDefault();
        AssertivaResultadoDto? resultado = null;
        if (ultima is not null)
        {
            var dados = Desserializar(ultima.Resultado);
            var oficiais = dados.Telefones.Count == 0 ? new HashSet<string>() :
                await LerNumerosOficiaisAsync(db, cadastro.PessoaId, ct);
            var dias = Math.Max(0, (int)(agora - ultima.Concluido).TotalDays);
            resultado = new(ultima.Id, ultima.Concluido, ultima.Usuario, dias,
                ultima.Concluido > agora.AddDays(-prazo), ultima.Resultado is null,
                dados.Telefones.Select(t => new AssertivaTelefoneDto(t.Numero, t.Tipo, oficiais.Contains(t.Numero))).ToArray(),
                dados.Emails, ultima.Status);
        }

        return new(config?.Ativa == true, Cpf(cadastro) is not null, prazo, tentativa?.Id, resultado, tentativa);
    }

    public async Task<IReadOnlyList<AssertivaHistoricoDto>> HistoricoAsync(Guid clientePublicId, int pagina, CancellationToken ct)
    {
        await using var db = Conectar();
        var cadastro = await ObterClienteAsync(db, clientePublicId, ct);
        return await LerHistoricoAsync(db, cadastro.Id, (Math.Clamp(pagina, 1, 100000) - 1) * 20, 20, ct);
    }

    public async Task<AssertivaFichaDto> ConsultarAsync(Guid clientePublicId, ConsultarAssertivaRequest request, long usuario, CancellationToken ct)
    {
        if (request.OperacaoId == Guid.Empty)
            throw new AssertivaFalha(400, "operacao_invalida", "Identificador da operação inválido.");

        await using var db = Conectar();
        var cadastro = await ObterClienteAsync(db, clientePublicId, ct);
        var cpf = Cpf(cadastro) ?? throw new AssertivaFalha(422, "cpf_invalido", "O cadastro oficial precisa ter um CPF válido.");
        var config = await LerConfiguracaoAsync(db, ct);
        if (config?.Ativa != true)
            throw new AssertivaFalha(409, "integracao_inativa", "A configuração da Assertiva está inativa.");

        if (!await ReservarAsync(db, cadastro.Id, request, usuario, config, ct))
            return await ObterFichaAsync(clientePublicId, ct);

        AssertivaResposta? resposta = null;
        AssertivaFalha? falha = null;
        using var limite = new CancellationTokenSource(TimeSpan.FromSeconds(45));
        try
        {
            // Depois da reserva, a consulta e a auditoria sobrevivem ao fechamento da ficha.
            resposta = await client.ConsultarCpfAsync(config, cpf, limite.Token);
        }
        catch (AssertivaFalha ex)
        {
            falha = ex;
        }
        catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
        {
            falha = Indisponivel();
        }

        var status = falha is not null ? "erro" :
            resposta!.Contatos.Telefones.Count + resposta.Contatos.Emails.Count > 0 ? "sucesso" : "sem_resultado";
        await db.ExecuteAsync(new CommandDefinition("""
            UPDATE crm.assertiva_consulta
            SET status = @status, concluido_em = now(), erro = @erro, status_http = @statusHttp,
                protocolo = @protocolo, resultado = CAST(@resultado AS jsonb)
            WHERE id = @OperacaoId AND status = 'pendente';
            """, new
            {
                request.OperacaoId, status, erro = falha?.Codigo, statusHttp = resposta?.StatusHttp ?? falha?.StatusHttp,
                protocolo = resposta?.Protocolo, resultado = resposta is null ? null : JsonSerializer.Serialize(resposta.Contatos, Json)
            }, cancellationToken: CancellationToken.None));

        if (falha is not null)
            throw falha;

        return await ObterFichaAsync(clientePublicId, ct);
    }

    private static async Task<bool> ReservarAsync(NpgsqlConnection db, long clienteId, ConsultarAssertivaRequest request,
        long usuario, AssertivaConfiguracao config, CancellationToken ct)
    {
        await db.OpenAsync(ct);
        await using var tx = await db.BeginTransactionAsync(ct);
        await db.ExecuteAsync(new CommandDefinition("""
            SELECT pg_advisory_xact_lock(hashtextextended('crm.assertiva:' || CAST(@clienteId AS text), 0));
            UPDATE crm.assertiva_consulta
            SET status = 'erro', erro = 'interrompida', concluido_em = now()
            WHERE cliente_id = @clienteId AND status = 'pendente'
                AND solicitado_em < now() - interval '2 minutes';
            """, new { clienteId }, tx, cancellationToken: ct));

        var clienteDaOperacao = await db.ExecuteScalarAsync<long?>(new CommandDefinition("""
            SELECT cliente_id FROM crm.assertiva_consulta WHERE id = @OperacaoId;
            """, new { request.OperacaoId }, tx, cancellationToken: ct));
        if (clienteDaOperacao is not null)
        {
            if (clienteDaOperacao != clienteId)
                throw new AssertivaFalha(409, "operacao_invalida", "Identificador da operação já utilizado.");
            await tx.CommitAsync(ct);
            return false;
        }

        var atual = await db.QuerySingleOrDefaultAsync<Tentativa>(new CommandDefinition("""
            SELECT id, status FROM crm.assertiva_consulta
            WHERE cliente_id = @clienteId ORDER BY solicitado_em DESC, id DESC LIMIT 1;
            """, new { clienteId }, tx, cancellationToken: ct));
        if (atual?.Status == "pendente" || atual?.Id != request.UltimaTentativaId)
            throw new AssertivaFalha(409, "consulta_alterada", "Já existe uma consulta em andamento ou a ficha mudou. Confira o resultado antes de atualizar.");

        var recente = await db.ExecuteScalarAsync<bool>(new CommandDefinition("""
            SELECT EXISTS (
                SELECT 1 FROM crm.assertiva_consulta
                WHERE cliente_id = @clienteId AND status IN ('sucesso', 'sem_resultado')
                    AND concluido_em > now() - make_interval(days => @PrazoDias)
            );
            """, new { clienteId, config.PrazoDias }, tx, cancellationToken: ct));
        if (recente && !request.ConfirmouAntecipacao)
            throw new AssertivaFalha(409, "confirmacao_necessaria", "Confirme que deseja consultar novamente dentro do prazo configurado.");

        var reservada = await db.ExecuteAsync(new CommandDefinition("""
            INSERT INTO crm.assertiva_consulta (id, cliente_id, usuario_id, finalidade, status,
                dentro_do_prazo, antecipacao_confirmada, solicitado_em)
            SELECT @OperacaoId, @clienteId, @usuario, finalidade, 'pendente', @recente, @confirmou, clock_timestamp()
            FROM crm.assertiva_configuracao
            WHERE id = 1 AND ativa AND revisao = @Revisao
            ON CONFLICT (id) DO NOTHING;
            """, new { request.OperacaoId, clienteId, usuario, recente, confirmou = recente && request.ConfirmouAntecipacao, config.Revisao },
            tx, cancellationToken: ct));
        if (reservada == 0)
            throw ConfiguracaoAlterada();

        await tx.CommitAsync(CancellationToken.None);
        return true;
    }

    public async Task AdicionarTelefoneAsync(Guid clientePublicId, AdicionarTelefoneAssertivaRequest request,
        long usuario, CancellationToken ct)
    {
        await using var db = Conectar();
        var cadastro = await ObterClienteAsync(db, clientePublicId, ct);
        await db.OpenAsync(ct);
        await using var tx = await db.BeginTransactionAsync(ct);
        var dadosJson = await db.ExecuteScalarAsync<string?>(new CommandDefinition("""
            SELECT c.resultado::text FROM crm.assertiva_consulta c
            CROSS JOIN crm.assertiva_configuracao cfg
            WHERE c.id = @ConsultaId AND c.cliente_id = @Id AND c.status = 'sucesso'
                AND c.concluido_em >= now() - make_interval(days => cfg.retencao_dias);
            """, new { request.ConsultaId, cadastro.Id }, tx, cancellationToken: ct));
        var numero = AssertivaClient.NormalizarTelefone(request.Numero ?? "");
        var telefone = Desserializar(dadosJson).Telefones.SingleOrDefault(t => t.Numero == numero)
            ?? throw new AssertivaFalha(404, "telefone_ausente", "Telefone não disponível no resultado salvo.");

        var novoId = await telefones.AdicionarAssertivaAsync(db, tx, cadastro.PessoaId, telefone.Numero, telefone.Tipo, ct);
        if (novoId is not null)
        {
            await db.ExecuteAsync(new CommandDefinition("""
                INSERT INTO crm.assertiva_telefone_inclusao (pessoa_contato_id, consulta_id, usuario_id)
                VALUES (@novoId, @ConsultaId, @usuario);
                """, new { novoId, request.ConsultaId, usuario }, tx, cancellationToken: ct));
        }

        await tx.CommitAsync(ct);
    }

    internal async Task AplicarRetencaoAsync(CancellationToken ct)
    {
        await using var db = Conectar();
        await db.ExecuteAsync(new CommandDefinition("""
            UPDATE crm.assertiva_consulta c SET resultado = NULL
            FROM crm.assertiva_configuracao cfg
            WHERE c.resultado IS NOT NULL AND c.concluido_em < now() - make_interval(days => cfg.retencao_dias);
            UPDATE crm.assertiva_consulta SET status = 'erro', erro = 'interrompida', concluido_em = now()
            WHERE status = 'pendente' AND solicitado_em < now() - interval '2 minutes';
            """, cancellationToken: ct));
    }

    private static async Task<Cliente> ObterClienteAsync(NpgsqlConnection db, Guid clientePublicId, CancellationToken ct) =>
        await db.QuerySingleOrDefaultAsync<Cliente>(new CommandDefinition("""
            SELECT cl.id, p.id AS PessoaId,
                COALESCE(NULLIF(p.documento_principal_limpo, ''), p.documento_principal) AS Documento
            FROM cadastro.cliente cl JOIN core.pessoa p ON p.id = cl.pessoa_id
            WHERE cl.public_id = @clientePublicId AND p.deleted_at IS NULL;
            """, new { clientePublicId }, cancellationToken: ct))
        ?? throw new AssertivaFalha(404, "cliente_ausente", "Cliente não encontrado no cadastro oficial.");

    private static Task<AssertivaConfiguracao?> LerConfiguracaoAsync(NpgsqlConnection db, CancellationToken ct) =>
        db.QuerySingleOrDefaultAsync<AssertivaConfiguracao>(new CommandDefinition(
            $"SELECT {ColunasConfiguracao} FROM crm.assertiva_configuracao WHERE id = 1;", cancellationToken: ct));

    private static async Task<IReadOnlyList<AssertivaHistoricoDto>> LerHistoricoAsync(
        NpgsqlConnection db, long clienteId, int offset, int tamanho, CancellationToken ct) =>
        (await db.QueryAsync<AssertivaHistoricoDto>(new CommandDefinition($"""
            SELECT {ColunasHistorico}
            FROM crm.assertiva_consulta c LEFT JOIN seguranca.usuario u ON u.id = c.usuario_id
            WHERE c.cliente_id = @clienteId
            ORDER BY c.solicitado_em DESC, c.id DESC OFFSET @offset LIMIT @tamanho;
            """, new { clienteId, offset, tamanho }, cancellationToken: ct))).AsList();

    private static async Task<HashSet<string>> LerNumerosOficiaisAsync(NpgsqlConnection db, long pessoaId, CancellationToken ct) =>
        (await db.QueryAsync<string>(new CommandDefinition("""
            SELECT COALESCE(NULLIF(valor_normalizado, ''), valor, '') FROM core.pessoa_contato
            WHERE pessoa_id = @pessoaId AND ativo AND UPPER(tipo_contato) IN ('CELULAR', 'TELEFONE');
            """, new { pessoaId }, cancellationToken: ct))).Select(AssertivaClient.NormalizarTelefone).ToHashSet();

    private static string? Cpf(Cliente cadastro)
    {
        var valor = Regex.Replace(cadastro.Documento ?? "", "[^0-9]", "");
        if (valor.Length != 11 || valor.All(digito => digito == valor[0]))
            return null;

        for (var tamanho = 9; tamanho <= 10; tamanho++)
        {
            var soma = 0;
            for (var i = 0; i < tamanho; i++)
                soma += (valor[i] - '0') * (tamanho + 1 - i);
            if ((soma * 10 % 11) % 10 != valor[tamanho] - '0')
                return null;
        }
        return valor;
    }

    private static AssertivaContatos Desserializar(string? dados) =>
        dados is null ? new([], []) : JsonSerializer.Deserialize<AssertivaContatos>(dados, Json)!;

    private static AssertivaConfiguracaoDto Projetar(AssertivaConfiguracao? config) => config is null
        ? new("", false, false, null, PrazoPadrao, RetencaoPadrao, null)
        : new(config.ClientId, true, config.Ativa, config.Finalidade, config.PrazoDias, config.RetencaoDias, config.Revisao);

    private static AssertivaFalha Indisponivel() =>
        new(503, "indisponivel", "A Assertiva está indisponível ou não respondeu a tempo.");

    private static AssertivaFalha ConfiguracaoAlterada() =>
        new(409, "configuracao_alterada", "A configuração da Assertiva mudou. Recarregue a tela e confira os dados.");

    private sealed record Cliente(long Id, long PessoaId, string? Documento);
    private sealed record Tentativa(Guid Id, string Status);
    private sealed class ConsultaSalva
    {
        public Guid Id { get; init; }
        public string Usuario { get; init; } = "";
        public DateTime Concluido { get; init; }
        public string Status { get; init; } = "";
        public string? Resultado { get; init; }
    }
}
