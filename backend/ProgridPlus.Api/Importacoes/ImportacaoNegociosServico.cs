using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Importacoes;

public sealed partial class ImportacaoNegociosServico(IConfiguration configuration)
{
    private readonly string _connectionString = configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Missing DefaultConnection string");

    private const string QueryClientes = """
        SELECT cl.id AS Id, COALESCE(p.nome, '') AS Nome,
            REGEXP_REPLACE(COALESCE(NULLIF(p.documento_principal_limpo, ''), p.documento_principal, ''), '\D', '', 'g') AS Documento
        FROM cadastro.cliente cl
        INNER JOIN core.pessoa p ON p.id = cl.pessoa_id AND p.deleted_at IS NULL
        WHERE REGEXP_REPLACE(COALESCE(NULLIF(p.documento_principal_limpo, ''), p.documento_principal, ''), '\D', '', 'g')
            = ANY(@Documentos);
        """;

    private const string QueryCobradoras = """
        SELECT id AS Id, COALESCE(NULLIF(BTRIM(nome), ''), NULLIF(BTRIM(username), ''), id::text) AS Nome,
            username AS Username, ativo AS Ativo
        FROM seguranca.usuario ORDER BY id;
        """;

    private const string QueryNegocios = """
        SELECT id AS Id, public_id AS PublicId, cliente_id AS ClienteId, operador_id AS OperadorId,
            competencia_mes::int AS Mes, competencia_ano::int AS Ano,
            referencia AS Referencia, origem AS Origem, valor AS Valor
        FROM crm.negocio
        WHERE ativo = true AND deleted_at IS NULL AND cliente_id = ANY(@Clientes)
        ORDER BY id;
        """;

    private const string QueryVinculos = """
        SELECT i.importacao_operacao_id AS OperacaoId, i.negocio_id AS NegocioId
        FROM crm.importacao_negocio i
        JOIN crm.importacao_operacao o ON o.id = i.importacao_operacao_id
        WHERE o.ano_cobranca = @Ano AND o.mes_cobranca = @Mes
            AND o.resultado = 'SUCESSO' AND i.encerrado_por_operacao_id IS NULL
        ORDER BY i.importacao_operacao_id, i.negocio_id;
        """;

    public async Task<ImportacaoPlanilhaAnaliseDto> AnalisarAsync(
        Stream arquivo, string nome, int mes, int ano, string modo, long[] participantes, CancellationToken ct)
    {
        ValidarMesCobranca(mes, ano);
        ValidarModo(modo);
        var planilha = PlanilhaXlsxLeitor.Ler(arquivo);
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead, ct);
        var plano = await PrepararAsync(conn, tx, planilha, Path.GetFileName(nome), mes, ano, modo, participantes, ct);
        return plano.Analise;
    }

    public async Task<ImportacaoNegociosResultadoDto> ImportarAsync(
        Stream arquivo, string nome, int mes, int ano, string modo, long[] participantes, string revisao,
        long usuarioId, string? usuarioNome, CancellationToken ct)
    {
        ValidarMesCobranca(mes, ano);
        ValidarModo(modo);
        nome = Path.GetFileName(nome);
        var planilha = PlanilhaXlsxLeitor.Ler(arquivo);
        await using var conn = new NpgsqlConnection(_connectionString);
        await conn.OpenAsync(ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await conn.ExecuteAsync(new CommandDefinition(
            "SELECT pg_advisory_xact_lock(67394821);", transaction: tx, cancellationToken: ct));
        var plano = await PrepararAsync(conn, tx, planilha, nome, mes, ano, modo, participantes, ct);
        var analise = plano.Analise;

        if (!string.Equals(revisao, analise.Revisao, StringComparison.Ordinal))
            throw new InvalidOperationException("A análise mudou. Revise o arquivo e a distribuição antes de confirmar.");
        if (plano.Registros.Length == 0 || analise.SemDistribuicao > 0)
            throw new InvalidOperationException("A carga precisa de negócios aptos e distribuição completa.");
        if (modo != "adicionar" && analise.Rejeitados > 0)
            throw new InvalidOperationException("Corrija as linhas rejeitadas antes de substituir ou limpar o mês.");

        var etapa = analise.Novos == 0 ? null : await conn.QuerySingleOrDefaultAsync<long?>(new CommandDefinition("""
            SELECT id FROM crm.negocio_etapa WHERE codigo = 'nova_posicao' AND ativo = true;
            """, transaction: tx, cancellationToken: ct));
        if (analise.Novos > 0 && etapa is null)
            throw new InvalidOperationException("A etapa Nova Posição está indisponível.");

        var operacao = await ImportacaoOperacaoHistoricoStore.InserirAsync(conn, tx,
            new ImportacaoOperacaoRegistro(mes, ano, Limitar(nome, 255), usuarioId, Limitar(usuarioNome, 200),
                analise.TotalLinhas, analise.Novos, analise.Existentes, plano.Encerrar.Length, analise.ValorTotal,
                "SUCESSO", $"{analise.Novos} novo(s), {analise.Existentes} vinculado(s), {analise.Rejeitados} rejeitado(s).",
                JsonSerializer.Serialize(new { modo, analise.AbasLidas, analise.Rejeitados, analise.Distribuicao })), ct);

        if (plano.Encerrar.Length > 0)
        {
            await conn.ExecuteAsync(new CommandDefinition("""
                UPDATE crm.importacao_negocio i SET encerrado_por_operacao_id = @Operacao
                FROM unnest(@Lotes::bigint[], @Negocios::bigint[]) AS anterior(lote, negocio)
                WHERE i.importacao_operacao_id = anterior.lote AND i.negocio_id = anterior.negocio
                    AND i.encerrado_por_operacao_id IS NULL;
                """, new
                {
                    Operacao = operacao,
                    Lotes = plano.Encerrar.Select(v => v.OperacaoId).ToArray(),
                    Negocios = plano.Encerrar.Select(v => v.NegocioId).ToArray(),
                }, tx, cancellationToken: ct));
        }

        var ids = new List<long>(plano.Registros.Length);
        foreach (var registro in plano.Registros)
        {
            var linha = registro.Linha;
            if (registro.Existente is { } existente)
            {
                ids.Add(existente.Id);
                continue;
            }

            var negocio = await conn.QuerySingleAsync<long>(new CommandDefinition("""
                INSERT INTO crm.negocio (cliente_id, etapa_id, operador_id, referencia, valor, competencia_ano,
                    competencia_mes, competencia_int, origem, notas)
                VALUES (@Cliente, @Etapa, @Operador, @Referencia, @Valor, @Ano, @Mes, @Periodo, @Origem, @Notas)
                RETURNING id;
                """, new
                {
                    Cliente = registro.Cliente.Id,
                    Etapa = etapa,
                    Operador = registro.OperadorId,
                    Referencia = linha.Matricula,
                    registro.Valor,
                    Ano = linha.CompetenciaAno,
                    Mes = linha.CompetenciaMes,
                    Periodo = linha.CompetenciaAno * 100 + linha.CompetenciaMes,
                    Origem = linha.Estipulante,
                    Notas = string.IsNullOrWhiteSpace(linha.Situacao) ? null : linha.Situacao,
                }, tx, cancellationToken: ct));
            ids.Add(negocio);
            await conn.ExecuteAsync(new CommandDefinition("""
                INSERT INTO crm.negocio_historico (negocio_id, usuario_id, tipo_evento, descricao, etapa_nova_id)
                VALUES (@Negocio, @Usuario, 'importado', @Descricao, @Etapa);
                """, new
                {
                    Negocio = negocio,
                    Usuario = usuarioId,
                    Descricao = $"Importado de {nome}, aba {linha.Aba}, linha {linha.Linha}.",
                    Etapa = etapa,
                }, tx, cancellationToken: ct));
        }

        await conn.ExecuteAsync(new CommandDefinition("""
            INSERT INTO crm.importacao_negocio (importacao_operacao_id, negocio_id, aba, linha)
            SELECT @Operacao, v.negocio, v.aba, v.linha
            FROM unnest(@Negocios::bigint[], @Abas::text[], @Linhas::int[]) AS v(negocio, aba, linha);
            """, new
            {
                Operacao = operacao,
                Negocios = ids.ToArray(),
                Abas = plano.Registros.Select(r => r.Linha.Aba).ToArray(),
                Linhas = plano.Registros.Select(r => r.Linha.Linha).ToArray(),
            }, tx, cancellationToken: ct));
        await tx.CommitAsync(ct);
        return new ImportacaoNegociosResultadoDto(nome, mes, ano, planilha.AbasLidas, analise.TotalLinhas,
            analise.Novos, analise.Existentes, analise.Rejeitados, analise.ValorTotal, analise.Logs);
    }

    private static async Task<PlanoImportacao> PrepararAsync(
        NpgsqlConnection conn, NpgsqlTransaction tx, ImportacaoPlanilhaResultado planilha, string nome,
        int mes, int ano, string modo, long[] participantes, CancellationToken ct)
    {
        var documentos = planilha.Linhas.Select(linha => NormalizarCpf(linha.Cpf)).OfType<string>().Distinct().ToArray();
        var clientes = (await conn.QueryAsync<Cliente>(new CommandDefinition(QueryClientes,
            new { Documentos = documentos }, tx, cancellationToken: ct))).ToLookup(c => c.Documento);
        var usuarios = (await conn.QueryAsync<Cobradora>(new CommandDefinition(QueryCobradoras,
            transaction: tx, cancellationToken: ct))).ToDictionary(u => u.Id);
        var ativos = usuarios.Values.Where(u => u.Ativo).ToArray();
        participantes = participantes.Distinct().Order().ToArray();
        if (participantes.Any(id => !usuarios.TryGetValue(id, out var usuario) || !usuario.Ativo))
            throw new ArgumentException("Uma das cobradoras selecionadas está inativa ou indisponível.");

        var existentePorCliente = (await conn.QueryAsync<Negocio>(new CommandDefinition(QueryNegocios,
            new { Clientes = clientes.SelectMany(grupo => grupo).Select(c => c.Id).ToArray() },
            tx, cancellationToken: ct))).ToLookup(n => n.ClienteId);
        var candidatos = new List<Registro>();
        var logs = new List<ImportacaoNegociosLogDto>();
        var valorEncontrado = 0m;
        foreach (var linha in planilha.Linhas)
        {
            var cpf = NormalizarCpf(linha.Cpf);
            var valor = LerPremio(linha.Premio);
            valorEncontrado += valor ?? 0m;
            var localizados = cpf is null ? [] : clientes[cpf].ToArray();
            string? erro = null;
            Negocio? existente = null;
            long? indicado = null;
            if (cpf is null || localizados.Length != 1)
                erro = "CPF inválido, não cadastrado ou associado a mais de um cliente no WebApólice.";
            else if (linha.Matricula.Length is 0 or > 50 || linha.Estipulante.Length is 0 or > 150)
                erro = "Estipulante ou referência do contrato/matrícula ausente ou inválida.";
            else if (linha.CompetenciaMes == 0)
                erro = "Competência inválida. Informe mês e ano da parcela.";
            else if (valor is null)
                erro = "Prêmio inválido. Informe o valor individual positivo da dívida.";
            else
            {
                var negocios = existentePorCliente[localizados[0].Id];
                var mesmoPeriodo = negocios.Where(n => n.Mes == linha.CompetenciaMes && n.Ano == linha.CompetenciaAno
                    && ChaveTexto(n.Origem) == ChaveTexto(linha.Estipulante)).ToArray();
                var correspondencias = mesmoPeriodo.Where(n => ChaveTexto(n.Referencia) == ChaveTexto(linha.Matricula)).ToArray();
                if (linha.NegocioPublicId.Length > 0)
                {
                    if (!Guid.TryParse(linha.NegocioPublicId, out var id) ||
                        (existente = correspondencias.SingleOrDefault(n => n.PublicId == id)) is null)
                        erro = "ID Negócio CRM incompatível com o CPF, a referência ou a competência.";
                }
                else if (correspondencias.Length > 1)
                    erro = "Mais de um negócio corresponde a este segurado, estipulante, referência e competência.";
                else if (correspondencias.Length == 0 && linha.Matricula.All(char.IsAsciiDigit) &&
                    mesmoPeriodo.Any(n => n.Referencia is { Length: > 0 } referencia && referencia.All(char.IsAsciiDigit)
                        && referencia.TrimStart('0') == linha.Matricula.TrimStart('0')))
                    erro = "A referência difere de uma parcela cadastrada apenas por zeros à esquerda. Confira a identificação.";
                else
                    existente = correspondencias.SingleOrDefault();

                if (erro is null && existente is not null && existente.Valor != valor)
                    erro = "O prêmio diverge do valor cadastrado para a mesma parcela. Confira antes de importar.";
                if (erro is null && existente is null && linha.Cobrador.Length > 0)
                {
                    var cobradoras = ativos.Where(u => NormalizarNome(u.Nome) == NormalizarNome(linha.Cobrador)
                        || NormalizarNome(u.Username) == NormalizarNome(linha.Cobrador)).ToArray();
                    if (cobradoras.Length == 1) indicado = cobradoras[0].Id;
                    else if (!negocios.Any(n => n.OperadorId.HasValue))
                        erro = "Cobradora informada não corresponde a um único usuário ativo.";
                }
            }
            if (erro is not null)
                logs.Add(Log(linha, "nao_importado", erro, valor));
            else
                candidatos.Add(new Registro(linha, localizados[0], valor!.Value, existente, indicado, existente?.OperadorId));
        }

        var registros = new List<Registro>();
        foreach (var grupo in candidatos.GroupBy(Chave))
        {
            if (grupo.Count() == 1)
                registros.Add(grupo.First());
            else
                logs.AddRange(grupo.Select(r => Log(r.Linha, "nao_importado",
                    "A planilha repete este segurado, estipulante, referência e competência. Resolva a ambiguidade na origem.", r.Valor)));
        }

        var distribuicao = Distribuir(registros, existentePorCliente, usuarios, participantes, logs);
        var aptos = distribuicao.OrderBy(r => r.Linha.Ordem).ToArray();
        foreach (var r in aptos)
            logs.Add(Log(r.Linha, r.Existente is null ? "sucesso" : "vinculado",
                r.Existente is not null ? "Negócio existente. Histórico, valor e responsável preservados."
                    : r.OperadorId is null ? "Novo negócio. Aguardando distribuição." : "Novo negócio.", r.Valor));
        var idsMantidos = aptos.Where(r => r.Existente is not null).Select(r => r.Existente!.Id).ToHashSet();
        var anteriores = modo == "adicionar" ? [] : (await conn.QueryAsync<Vinculo>(new CommandDefinition(
            QueryVinculos, new { Mes = mes, Ano = ano }, tx, cancellationToken: ct))).ToArray();
        var encerrar = anteriores.Where(v => modo == "limpar" || !idsMantidos.Contains(v.NegocioId)).ToArray();
        var operadores = ativos.Select(u => new ImportacaoCobradoraDto(u.Id, u.Nome))
            .OrderBy(u => u.Nome).ThenBy(u => u.Id).ToArray();
        var totais = aptos.GroupBy(r => r.OperadorId).Select(grupo =>
            new ImportacaoDistribuicaoDto(grupo.Key, grupo.Key is long id && usuarios.TryGetValue(id, out var u)
                ? u.Nome : "Sem responsável", grupo.Select(r => r.Cliente.Id).Distinct().Count(),
                grupo.Count(), grupo.Sum(r => r.Valor))).OrderBy(g => g.Nome).ThenBy(g => g.CobradoraId).ToArray();
        var competencias = planilha.Linhas.Where(l => l.CompetenciaMes != 0)
            .Select(l => new PeriodoCompetenciaDto(l.CompetenciaMes, l.CompetenciaAno))
            .Distinct().OrderBy(p => p.Ano).ThenBy(p => p.Mes).ToArray();
        var ordenados = logs.OrderBy(l => l.Ordem).ToArray();
        var revisao = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(
            new { nome, mes, ano, modo, participantes, aptos, encerrar, ordenados, totais })));
        return new PlanoImportacao(new ImportacaoPlanilhaAnaliseDto(nome, competencias, planilha.AbasLidas,
            planilha.Linhas.Count, valorEncontrado, aptos.Sum(r => r.Valor), aptos.Count(r => r.Existente is null),
            idsMantidos.Count, ordenados.Count(l => l.Status == "nao_importado"),
            aptos.Count(r => r.Existente is null && r.OperadorId is null), encerrar.Length, ordenados,
            operadores, totais, revisao), aptos, encerrar);
    }

    private static IEnumerable<Registro> Distribuir(List<Registro> registros, ILookup<long, Negocio> existentes,
        Dictionary<long, Cobradora> usuarios, long[] participantes, List<ImportacaoNegociosLogDto> logs)
    {
        var atribuidos = registros.Where(r => r.Existente is not null).ToList();
        var pendentes = new List<Registro[]>();
        foreach (var grupo in registros.Where(r => r.Existente is null).GroupBy(r => r.Cliente.Id))
        {
            var fixos = existentes[grupo.Key].Select(n => n.OperadorId).OfType<long>().Distinct().ToArray();
            var indicados = grupo.Select(r => r.Indicado).OfType<long>().Distinct().ToArray();
            var preferidos = fixos.Length > 0 ? fixos : indicados;
            if (preferidos.Length > 1 || (preferidos is [var responsavel] &&
                (!usuarios.TryGetValue(responsavel, out var u) || !u.Ativo)))
            {
                logs.AddRange(grupo.Select(r => Log(r.Linha, "nao_importado",
                    "Segurado com responsáveis conflitantes ou responsável anterior inativo. Revise a atribuição.", r.Valor)));
                continue;
            }

            if (preferidos is [var id])
                atribuidos.AddRange(grupo.Select(r => r with { OperadorId = id }));
            else
                pendentes.Add(grupo.ToArray());
        }

        var cargas = participantes.ToDictionary(id => id, id => atribuidos.Where(r => r.OperadorId == id).Sum(r => r.Valor));
        foreach (var grupo in pendentes.OrderByDescending(g => g.Sum(r => r.Valor)).ThenBy(g => g[0].Cliente.Id))
        {
            if (cargas.Count == 0)
            {
                atribuidos.AddRange(grupo);
                continue;
            }
            var id = cargas.MinBy(item => (item.Value, item.Key)).Key;
            cargas[id] += grupo.Sum(r => r.Valor);
            atribuidos.AddRange(grupo.Select(r => r with { OperadorId = id }));
        }
        return atribuidos;
    }

    internal static void ValidarMesCobranca(int mes, int ano)
    {
        if (mes is < 1 or > 12 || ano is < 2000 or > 2100)
            throw new ArgumentException("Informe um mês de cobrança válido entre janeiro de 2000 e dezembro de 2100.");
    }

    private static void ValidarModo(string modo)
    {
        if (modo is not ("adicionar" or "substituir" or "limpar"))
            throw new ArgumentException("Modo de importação inválido.");
    }

    private static (long Cliente, string Origem, string Referencia, int Mes, int Ano) Chave(Registro r) =>
        (r.Cliente.Id, ChaveTexto(r.Linha.Estipulante), ChaveTexto(r.Linha.Matricula),
            r.Linha.CompetenciaMes, r.Linha.CompetenciaAno);

    private static string ChaveTexto(string? valor) => (valor ?? string.Empty).Trim().ToUpperInvariant();

    private static ImportacaoNegociosLogDto Log(ImportacaoPlanilhaLinha linha, string status, string mensagem, decimal? valor)
    {
        var cpf = NormalizarCpf(linha.Cpf);
        return new ImportacaoNegociosLogDto(linha.Ordem, linha.Aba, linha.Linha, status, mensagem,
            linha.Nome, cpf is null ? null : $"***.***.{cpf[6..9]}-{cpf[9..]}", linha.Matricula, valor);
    }

    private static decimal? LerPremio(string raw)
    {
        var limpo = raw.Replace("R$", string.Empty, StringComparison.OrdinalIgnoreCase).Trim();
        var cultura = limpo.LastIndexOf(',') > limpo.LastIndexOf('.')
            ? CultureInfo.GetCultureInfo("pt-BR") : CultureInfo.InvariantCulture;
        if (!decimal.TryParse(limpo, NumberStyles.Number | NumberStyles.AllowExponent, cultura, out var valor)
            || valor is < 0.005m or > 999_999_999_999.99m)
            return null;
        return decimal.Round(valor, 2, MidpointRounding.AwayFromZero);
    }

    private static string? NormalizarCpf(string raw)
    {
        if (raw.Any(c => !char.IsAsciiDigit(c) && c is not ('.' or '-' or ' '))) return null;
        var digitos = string.Concat(raw.Where(char.IsAsciiDigit));
        return digitos.Length is > 0 and <= 11 && digitos.Any(c => c != '0') ? digitos.PadLeft(11, '0') : null;
    }

    private static string NormalizarNome(string? valor) => Regex.Replace(
        string.Concat((valor ?? string.Empty).Normalize(NormalizationForm.FormD).Where(c =>
            CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)).ToUpperInvariant(), @"\s+", " ").Trim();

    private static string? Limitar(string? valor, int tamanho) =>
        valor is null ? null : valor[..Math.Min(valor.Length, tamanho)];

    private sealed record PlanoImportacao(ImportacaoPlanilhaAnaliseDto Analise, Registro[] Registros, Vinculo[] Encerrar);
    private sealed record Registro(ImportacaoPlanilhaLinha Linha, Cliente Cliente, decimal Valor, Negocio? Existente,
        long? Indicado, long? OperadorId);
    private sealed record Cliente(long Id, string Nome, string Documento);
    private sealed record Cobradora(long Id, string Nome, string? Username, bool Ativo);
    private sealed record Negocio(long Id, Guid PublicId, long ClienteId, long? OperadorId, int Mes, int Ano,
        string? Referencia, string? Origem, decimal Valor);
    private sealed record Vinculo(long OperacaoId, long NegocioId);
}
