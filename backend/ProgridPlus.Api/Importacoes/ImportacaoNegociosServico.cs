using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

public sealed partial class ImportacaoNegociosServico
{
    private readonly string _connectionString;
    private readonly ILogger<ImportacaoNegociosServico> _logger;

    public ImportacaoNegociosServico(
        IConfiguration configuration,
        ILogger<ImportacaoNegociosServico> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
        _logger = logger;
    }

    private const string QueryClientes = """
        SELECT
            cl.id AS ClienteId,
            COALESCE(p.nome, '') AS Nome,
            REGEXP_REPLACE(
                COALESCE(NULLIF(p.documento_principal_limpo, ''), p.documento_principal, ''),
                '\D', '', 'g'
            ) AS Documento
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p
            ON p.id = cl.pessoa_id
           AND p.deleted_at IS NULL
        WHERE REGEXP_REPLACE(
            COALESCE(NULLIF(p.documento_principal_limpo, ''), p.documento_principal, ''),
            '\D', '', 'g'
        ) = ANY(@documentos);
        """;

    private const string QueryUsuarios = """
        SELECT
            id AS UsuarioId,
            COALESCE(nome, '') AS Nome,
            COALESCE(username, '') AS Username
        FROM seguranca.usuario
        WHERE ativo = true;
        """;

    private const string QueryEtapaInicial = """
        SELECT id
        FROM crm.negocio_etapa
        WHERE codigo = 'nova_posicao'
          AND ativo = true
        LIMIT 1;
        """;

    private const string QuerySubstituirCompetencia = """
        UPDATE crm.negocio
        SET ativo = false,
            deleted_at = NOW(),
            updated_at = NOW()
        WHERE competencia_ano = @competenciaAno
          AND competencia_mes = @competenciaMes
          AND ativo = true
          AND deleted_at IS NULL;
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
            NULL,
            @origem,
            @notas
        )
        RETURNING id;
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
            'importado',
            @descricao,
            @etapaId
        );
        """;

    public async Task<ImportacaoNegociosResultadoDto> ImportarAsync(
        Stream arquivo,
        string nomeArquivo,
        int competenciaMes,
        int competenciaAno,
        string modo,
        long usuarioLogadoId,
        string? usuarioNome,
        CancellationToken ct = default)
    {
        if (competenciaMes is < 1 or > 12)
            throw new ArgumentException("O mês de competência deve estar entre 1 e 12.");
        if (competenciaAno is < 2000 or > 2100)
            throw new ArgumentException("O ano de competência deve estar entre 2000 e 2100.");

        modo = modo.Trim().ToLowerInvariant();
        if (modo is not ("adicionar" or "substituir"))
            throw new ArgumentException("O modo deve ser 'adicionar' ou 'substituir'.");

        nomeArquivo = LimitarTexto(Path.GetFileName(nomeArquivo), 255);
        var planilha = PlanilhaXlsxLeitor.Ler(arquivo);
        var logs = new List<ImportacaoNegociosLogDto>();
        var preValidadas = new List<LinhaPreValidada>();

        foreach (var linha in planilha.Linhas)
        {
            var cpf = NormalizarCpf(linha.Cpf);
            var referencia = NormalizarNumeroExcel(linha.Matricula);
            var origem = LimparTexto(linha.Estipulante);
            var situacao = LimparTexto(linha.Situacao);
            var cobrador = LimparTexto(linha.Cobrador);

            string? erro = null;
            if (cpf is null)
                erro = "CPF ausente ou inválido.";
            else if (string.IsNullOrWhiteSpace(referencia))
                erro = "Matrícula ausente; a referência não pôde ser preenchida.";
            else if (referencia.Length > 50)
                erro = "Matrícula excede o limite de 50 caracteres.";
            else if (string.IsNullOrWhiteSpace(origem))
                erro = "Estipulante ausente; a origem não pôde ser preenchida.";
            else if (origem.Length > 150)
                erro = "Estipulante excede o limite de 150 caracteres.";
            else if (string.IsNullOrWhiteSpace(cobrador))
                erro = "Cobrador não informado.";
            else if (!TentarLerValor(linha.Premio, out var valor) || valor <= 0)
                erro = "Prêmio ausente ou inválido; o valor do débito deve ser maior que zero.";
            else if (valor > 999_999_999_999.99m)
                erro = "Prêmio excede o limite aceito para o valor do débito.";

            if (erro is not null)
            {
                logs.Add(CriarLogErro(linha, erro, cpf, referencia));
                continue;
            }

            _ = TentarLerValor(linha.Premio, out var premio);
            premio = decimal.Round(premio, 2, MidpointRounding.AwayFromZero);
            preValidadas.Add(new LinhaPreValidada(
                linha,
                cpf!,
                referencia,
                origem,
                situacao,
                cobrador,
                premio));
        }

        if (preValidadas.Count == 0)
        {
            var resultadoSemLinhasValidas = CriarResultado(
                planilha,
                nomeArquivo,
                competenciaMes,
                competenciaAno,
                modo,
                logs,
                0,
                0m);
            await RegistrarImportacaoConcluidaAsync(
                resultadoSemLinhasValidas,
                usuarioLogadoId,
                usuarioNome,
                ct);
            return resultadoSemLinhasValidas;
        }

        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);

        try
        {
            var documentos = preValidadas.Select(linha => linha.Cpf).Distinct().ToArray();
            var clientes = (await conn.QueryAsync<ClienteRow>(new CommandDefinition(
                QueryClientes,
                new { documentos },
                transaction: tx,
                cancellationToken: ct))).AsList();

            var usuarios = (await conn.QueryAsync<UsuarioRow>(new CommandDefinition(
                QueryUsuarios,
                transaction: tx,
                cancellationToken: ct))).AsList();

            var etapaId = await conn.QuerySingleOrDefaultAsync<long?>(new CommandDefinition(
                QueryEtapaInicial,
                transaction: tx,
                cancellationToken: ct));

            if (etapaId is null)
                throw new InvalidOperationException("A etapa inicial 'Nova Posição' não está cadastrada ou está inativa.");

            var clientesPorCpf = clientes
                .GroupBy(cliente => cliente.Documento)
                .ToDictionary(group => group.Key, group => group.ToList(), StringComparer.Ordinal);

            var usuariosPorIdentificador = usuarios
                .SelectMany(usuario => new[] { usuario.Nome, usuario.Username }
                    .Where(identificador => !string.IsNullOrWhiteSpace(identificador))
                    .Select(identificador => new
                    {
                        Chave = NormalizarNome(identificador),
                        Usuario = usuario
                    }))
                .GroupBy(item => item.Chave)
                .ToDictionary(
                    group => group.Key,
                    group => group
                        .Select(item => item.Usuario)
                        .DistinctBy(usuario => usuario.UsuarioId)
                        .ToList(),
                    StringComparer.Ordinal);

            var validas = new List<LinhaResolvida>();
            foreach (var linha in preValidadas)
            {
                if (!clientesPorCpf.TryGetValue(linha.Cpf, out var clientesEncontrados) || clientesEncontrados.Count == 0)
                {
                    logs.Add(CriarLogErro(
                        linha.Original,
                        "Cliente não importado porque o CPF não existe no banco de dados.",
                        linha.Cpf,
                        linha.Referencia,
                        linha.Valor));
                    continue;
                }

                if (clientesEncontrados.Count > 1)
                {
                    logs.Add(CriarLogErro(
                        linha.Original,
                        "Cliente não importado porque o CPF está associado a mais de um cadastro.",
                        linha.Cpf,
                        linha.Referencia,
                        linha.Valor));
                    continue;
                }

                var identificadorCobrador = NormalizarNome(linha.Cobrador);
                if (!usuariosPorIdentificador.TryGetValue(identificadorCobrador, out var usuariosEncontrados) || usuariosEncontrados.Count == 0)
                {
                    logs.Add(CriarLogErro(
                        linha.Original,
                        $"Negócio não importado porque o responsável \"{linha.Cobrador}\" não corresponde ao nome ou username de um usuário ativo.",
                        linha.Cpf,
                        linha.Referencia,
                        linha.Valor));
                    continue;
                }

                if (usuariosEncontrados.Count > 1)
                {
                    logs.Add(CriarLogErro(
                        linha.Original,
                        $"Negócio não importado porque \"{linha.Cobrador}\" corresponde a mais de um usuário ativo por nome ou username.",
                        linha.Cpf,
                        linha.Referencia,
                        linha.Valor));
                    continue;
                }

                validas.Add(new LinhaResolvida(
                    linha,
                    clientesEncontrados[0],
                    usuariosEncontrados[0]));
            }

            var substituidos = 0;
            var valorImportado = 0m;

            // Evita apagar uma competência quando nenhuma linha passou pelas validações.
            if (validas.Count > 0 && modo == "substituir")
            {
                substituidos = await conn.ExecuteAsync(new CommandDefinition(
                    QuerySubstituirCompetencia,
                    new { competenciaAno, competenciaMes },
                    transaction: tx,
                    cancellationToken: ct));
            }

            foreach (var resolvida in validas)
            {
                var linha = resolvida.Linha;
                var negocioId = await conn.QuerySingleAsync<long>(new CommandDefinition(
                    QueryInserirNegocio,
                    new
                    {
                        clienteId = resolvida.Cliente.ClienteId,
                        etapaId,
                        operadorId = resolvida.Usuario.UsuarioId,
                        referencia = linha.Referencia,
                        valor = linha.Valor,
                        competenciaAno,
                        competenciaMes,
                        competenciaInt = competenciaAno * 100 + competenciaMes,
                        origem = linha.Origem,
                        notas = string.IsNullOrWhiteSpace(linha.Situacao) ? null : linha.Situacao,
                    },
                    transaction: tx,
                    cancellationToken: ct));

                await conn.ExecuteAsync(new CommandDefinition(
                    QueryInserirHistorico,
                    new
                    {
                        negocioId,
                        usuarioId = usuarioLogadoId,
                        etapaId,
                        descricao = $"Importado de {nomeArquivo}, aba {linha.Original.Aba}, linha {linha.Original.Linha}.",
                    },
                    transaction: tx,
                    cancellationToken: ct));

                valorImportado += linha.Valor;
                logs.Add(new ImportacaoNegociosLogDto(
                    linha.Original.Ordem,
                    linha.Original.Aba,
                    linha.Original.Linha,
                    "sucesso",
                    "Negócio importado na etapa Nova Posição.",
                    string.IsNullOrWhiteSpace(resolvida.Cliente.Nome) ? linha.Original.Nome : resolvida.Cliente.Nome,
                    MascararCpf(linha.Cpf),
                    linha.Referencia,
                    linha.Valor));
            }

            var resultado = CriarResultado(
                planilha,
                nomeArquivo,
                competenciaMes,
                competenciaAno,
                modo,
                logs,
                substituidos,
                valorImportado);

            await ImportacaoOperacaoHistoricoStore.InserirAsync(
                conn,
                tx,
                CriarRegistroImportacao(resultado, usuarioLogadoId, usuarioNome),
                ct);

            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "Importação concluída: arquivo={Arquivo}, competência={Ano}/{Mes}, modo={Modo}, importados={Importados}, não_importados={NaoImportados}, substituídos={Substituidos}.",
                nomeArquivo,
                competenciaAno,
                competenciaMes,
                modo,
                validas.Count,
                planilha.Linhas.Count - validas.Count,
                substituidos);

            return resultado;
        }
        catch
        {
            await tx.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    public async Task RegistrarFalhaAsync(
        string nomeArquivo,
        int competenciaMes,
        int competenciaAno,
        string modo,
        long usuarioLogadoId,
        string? usuarioNome,
        string mensagem)
    {
        if (competenciaMes is < 1 or > 12 || competenciaAno is < 2000 or > 2100)
            return;

        try
        {
            await using var connection = new NpgsqlConnection(_connectionString);
            await connection.OpenAsync(CancellationToken.None);
            await ImportacaoOperacaoHistoricoStore.InserirAsync(
                connection,
                null,
                new ImportacaoOperacaoRegistro(
                    "IMPORTACAO",
                    competenciaMes,
                    competenciaAno,
                    LimitarTexto(Path.GetFileName(nomeArquivo), 255),
                    usuarioLogadoId,
                    LimitarTextoNullable(usuarioNome, 200),
                    0,
                    0,
                    0,
                    0,
                    0,
                    "ERRO",
                    LimitarTexto(mensagem, 1000),
                    JsonSerializer.Serialize(new { modo = LimitarTexto(modo, 30) })),
                CancellationToken.None);
        }
        catch (Exception historyException)
        {
            _logger.LogError(historyException, "Não foi possível registrar a falha da importação no histórico operacional.");
        }
    }

    private async Task RegistrarImportacaoConcluidaAsync(
        ImportacaoNegociosResultadoDto resultado,
        long usuarioLogadoId,
        string? usuarioNome,
        CancellationToken ct)
    {
        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        await ImportacaoOperacaoHistoricoStore.InserirAsync(
            connection,
            null,
            CriarRegistroImportacao(resultado, usuarioLogadoId, usuarioNome),
            ct);
    }

    private static ImportacaoOperacaoRegistro CriarRegistroImportacao(
        ImportacaoNegociosResultadoDto resultado,
        long usuarioLogadoId,
        string? usuarioNome) =>
        new(
            "IMPORTACAO",
            resultado.CompetenciaMes,
            resultado.CompetenciaAno,
            LimitarTexto(resultado.Arquivo, 255),
            usuarioLogadoId,
            LimitarTextoNullable(usuarioNome, 200),
            resultado.TotalLinhas,
            resultado.Importados,
            0,
            resultado.Substituidos,
            resultado.ValorImportado,
            "SUCESSO",
            $"Importação concluída com {resultado.Importados} inserido(s) e {resultado.NaoImportados} não importado(s).",
            JsonSerializer.Serialize(new
            {
                modo = resultado.Modo,
                abasLidas = resultado.AbasLidas,
                existentesRemovidos = resultado.Substituidos,
                naoImportados = resultado.NaoImportados,
            }));

    private static ImportacaoNegociosResultadoDto CriarResultado(
        ImportacaoPlanilhaResultado planilha,
        string nomeArquivo,
        int competenciaMes,
        int competenciaAno,
        string modo,
        List<ImportacaoNegociosLogDto> logs,
        int substituidos,
        decimal valorImportado)
    {
        var logsOrdenados = logs.OrderBy(log => log.Ordem).ToList();
        var importados = logsOrdenados.Count(log => log.Status == "sucesso");
        return new ImportacaoNegociosResultadoDto(
            nomeArquivo,
            competenciaMes,
            competenciaAno,
            modo,
            planilha.AbasLidas,
            planilha.Linhas.Count,
            importados,
            planilha.Linhas.Count - importados,
            substituidos,
            valorImportado,
            logsOrdenados);
    }

    private static ImportacaoNegociosLogDto CriarLogErro(
        ImportacaoPlanilhaLinha linha,
        string mensagem,
        string? cpf,
        string? referencia,
        decimal? valor = null) =>
        new(
            linha.Ordem,
            linha.Aba,
            linha.Linha,
            "nao_importado",
            mensagem,
            string.IsNullOrWhiteSpace(linha.Nome) ? null : linha.Nome.Trim(),
            cpf is null ? null : MascararCpf(cpf),
            string.IsNullOrWhiteSpace(referencia) ? null : referencia,
            valor);

    private static bool TentarLerValor(string raw, out decimal valor)
    {
        var limpo = raw.Replace("R$", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
        var ptBr = CultureInfo.GetCultureInfo("pt-BR");
        var estilo = NumberStyles.Number | NumberStyles.AllowExponent | NumberStyles.AllowCurrencySymbol;
        var ultimaVirgula = limpo.LastIndexOf(',');
        var ultimoPonto = limpo.LastIndexOf('.');

        // A última pontuação costuma indicar o separador decimal. Com apenas
        // vírgula, prioriza o formato brasileiro para não transformar 47,18 em 4.718.
        if (ultimaVirgula >= 0 && ultimaVirgula > ultimoPonto)
            return decimal.TryParse(limpo, estilo, ptBr, out valor)
                || decimal.TryParse(limpo, estilo, CultureInfo.InvariantCulture, out valor);

        return decimal.TryParse(limpo, estilo, CultureInfo.InvariantCulture, out valor)
            || decimal.TryParse(limpo, estilo, ptBr, out valor);
    }

    private static string? NormalizarCpf(string raw)
    {
        var numerico = NormalizarNumeroExcel(raw);
        var digitos = DigitosRegex().Replace(numerico, string.Empty);
        if (digitos.Length is < 1 or > 11 || digitos.All(character => character == '0'))
            return null;
        return digitos.PadLeft(11, '0');
    }

    private static string NormalizarNumeroExcel(string raw)
    {
        raw = raw.Trim();
        if (decimal.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var numero) &&
            decimal.Truncate(numero) == numero)
        {
            return numero.ToString("0", CultureInfo.InvariantCulture);
        }
        return raw;
    }

    private static string LimparTexto(string value) =>
        EspacosRegex().Replace(value.Trim(), " ");

    private static string LimitarTexto(string? value, int tamanho)
    {
        var texto = value?.Trim() ?? string.Empty;
        return texto[..Math.Min(texto.Length, tamanho)];
    }

    private static string? LimitarTextoNullable(string? value, int tamanho) =>
        string.IsNullOrWhiteSpace(value) ? null : LimitarTexto(value, tamanho);

    private static string NormalizarNome(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                continue;
            builder.Append(char.IsLetterOrDigit(character) ? char.ToUpperInvariant(character) : ' ');
        }
        return EspacosRegex().Replace(builder.ToString().Trim(), " ");
    }

    private static string MascararCpf(string cpf) =>
        cpf.Length == 11 ? $"***.***.{cpf[6..9]}-{cpf[9..]}" : "CPF protegido";

    [GeneratedRegex(@"\D", RegexOptions.CultureInvariant)]
    private static partial Regex DigitosRegex();

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex EspacosRegex();

    private sealed record LinhaPreValidada(
        ImportacaoPlanilhaLinha Original,
        string Cpf,
        string Referencia,
        string Origem,
        string Situacao,
        string Cobrador,
        decimal Valor);

    private sealed record LinhaResolvida(
        LinhaPreValidada Linha,
        ClienteRow Cliente,
        UsuarioRow Usuario);

    private sealed class ClienteRow
    {
        public long ClienteId { get; init; }
        public string Nome { get; init; } = string.Empty;
        public string Documento { get; init; } = string.Empty;
    }

    private sealed class UsuarioRow
    {
        public long UsuarioId { get; init; }
        public string Nome { get; init; } = string.Empty;
        public string Username { get; init; } = string.Empty;
    }
}
