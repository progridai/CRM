using System.Text.RegularExpressions;
using Dapper;
using Npgsql;

namespace ProgridPlus.Api.Contatos;

/// <summary>
/// Mantém os telefones compartilhados com o WebAPolice em core.pessoa_contato.
/// Remoções são lógicas (ativo=false) para preservar o histórico da origem.
/// </summary>
public sealed partial class ContatoTelefoneComando
{
    private static readonly HashSet<string> TiposPermitidos =
        new(StringComparer.OrdinalIgnoreCase) { "CELULAR", "TELEFONE" };

    private readonly string _connectionString;
    private readonly ILogger<ContatoTelefoneComando> _logger;

    public ContatoTelefoneComando(
        IConfiguration configuration,
        ILogger<ContatoTelefoneComando> logger)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Missing DefaultConnection string");
        _logger = logger;
    }

    public async Task AtualizarAsync(
        long pessoaId,
        AtualizarTelefonesRequest request,
        long usuarioId,
        CancellationToken ct = default)
    {
        var inputs = request.Telefones ?? [];
        if (inputs.Count > 10)
            throw new ArgumentException("É possível cadastrar no máximo 10 telefones por contato.");

        var telefones = Normalizar(inputs);

        await using var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var transaction = await connection.BeginTransactionAsync(ct);

        try
        {
            var pessoaExiste = await connection.ExecuteScalarAsync<bool>(new CommandDefinition(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM cadastro.cliente cl
                    INNER JOIN core.pessoa p ON p.id = cl.pessoa_id
                    WHERE p.id = @pessoaId
                      AND p.deleted_at IS NULL
                );
                """,
                new { pessoaId },
                transaction,
                cancellationToken: ct));

            if (!pessoaExiste)
                throw new InvalidOperationException("Contato não encontrado.");

            // A tabela compartilhada não possui sequence/default para o ID. O lock só é
            // necessário ao incluir novos registros e torna MAX(id)+1 seguro entre sistemas.
            if (telefones.Any(t => t.Id is null))
            {
                await connection.ExecuteAsync(new CommandDefinition(
                    "LOCK TABLE core.pessoa_contato IN SHARE ROW EXCLUSIVE MODE;",
                    transaction: transaction,
                    cancellationToken: ct));
            }

            var existentes = (await connection.QueryAsync<TelefoneExistente>(new CommandDefinition(
                """
                SELECT id AS Id
                FROM core.pessoa_contato
                WHERE pessoa_id = @pessoaId
                  AND UPPER(tipo_contato) IN ('CELULAR', 'TELEFONE')
                  AND ativo = true
                FOR UPDATE;
                """,
                new { pessoaId },
                transaction,
                cancellationToken: ct))).ToList();

            var idsExistentes = existentes.Select(t => t.Id).ToHashSet();
            var idsRecebidos = telefones.Where(t => t.Id.HasValue).Select(t => t.Id!.Value).ToArray();

            if (idsRecebidos.Any(id => !idsExistentes.Contains(id)))
                throw new ArgumentException("Um dos telefones informados não pertence a este contato.");

            // Telefones omitidos pelo formulário são desativados, nunca apagados fisicamente.
            await connection.ExecuteAsync(new CommandDefinition(
                """
                UPDATE core.pessoa_contato
                SET ativo = false,
                    principal = false
                WHERE pessoa_id = @pessoaId
                  AND UPPER(tipo_contato) IN ('CELULAR', 'TELEFONE')
                  AND ativo = true
                  AND NOT (id = ANY(@idsRecebidos));
                """,
                new { pessoaId, idsRecebidos },
                transaction,
                cancellationToken: ct));

            // Garante apenas um principal entre CELULAR/TELEFONE sem alterar e-mail principal.
            await connection.ExecuteAsync(new CommandDefinition(
                """
                UPDATE core.pessoa_contato
                SET principal = false
                WHERE pessoa_id = @pessoaId
                  AND UPPER(tipo_contato) IN ('CELULAR', 'TELEFONE')
                  AND ativo = true;
                """,
                new { pessoaId },
                transaction,
                cancellationToken: ct));

            foreach (var telefone in telefones.Where(t => t.Id.HasValue))
            {
                await connection.ExecuteAsync(new CommandDefinition(
                    """
                    UPDATE core.pessoa_contato
                    SET tipo_contato = @tipo,
                        valor = @valor,
                        valor_normalizado = @valorNormalizado,
                        principal = @principal,
                        ativo = true
                    WHERE id = @id
                      AND pessoa_id = @pessoaId;
                    """,
                    new
                    {
                        id = telefone.Id,
                        pessoaId,
                        telefone.Tipo,
                        telefone.Valor,
                        telefone.ValorNormalizado,
                        telefone.Principal
                    },
                    transaction,
                    cancellationToken: ct));
            }

            var proximoId = 0L;
            if (telefones.Any(t => t.Id is null))
            {
                proximoId = await connection.ExecuteScalarAsync<long>(new CommandDefinition(
                    "SELECT COALESCE(MAX(id), 0) + 1 FROM core.pessoa_contato;",
                    transaction: transaction,
                    cancellationToken: ct));
            }

            foreach (var telefone in telefones.Where(t => t.Id is null))
            {
                await connection.ExecuteAsync(new CommandDefinition(
                    """
                    INSERT INTO core.pessoa_contato (
                        id,
                        pessoa_id,
                        tipo_contato,
                        valor,
                        valor_normalizado,
                        principal,
                        ativo,
                        created_at
                    ) VALUES (
                        @id,
                        @pessoaId,
                        @tipo,
                        @valor,
                        @valorNormalizado,
                        @principal,
                        true,
                        now()
                    );
                    """,
                    new
                    {
                        id = proximoId++,
                        pessoaId,
                        telefone.Tipo,
                        telefone.Valor,
                        telefone.ValorNormalizado,
                        telefone.Principal
                    },
                    transaction,
                    cancellationToken: ct));
            }

            await transaction.CommitAsync(ct);
            _logger.LogInformation(
                "Telefones do contato {PessoaId} atualizados pelo usuário {UsuarioId}: {Quantidade} ativo(s).",
                pessoaId,
                usuarioId,
                telefones.Count);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    private static List<TelefoneNormalizado> Normalizar(IReadOnlyList<TelefoneInput> inputs)
    {
        var idsDuplicados = inputs
            .Where(t => t.Id.HasValue)
            .GroupBy(t => t.Id)
            .Any(g => g.Count() > 1);
        if (idsDuplicados)
            throw new ArgumentException("A lista contém telefones duplicados.");

        if (inputs.Count > 0 && inputs.Count(t => t.Principal) != 1)
            throw new ArgumentException("Selecione exatamente um telefone principal.");

        var resultado = new List<TelefoneNormalizado>(inputs.Count);
        var numeros = new HashSet<string>(StringComparer.Ordinal);

        foreach (var input in inputs)
        {
            var tipo = input.Tipo?.Trim().ToUpperInvariant() ?? string.Empty;
            if (!TiposPermitidos.Contains(tipo))
                throw new ArgumentException("O tipo deve ser CELULAR ou TELEFONE.");

            var normalizado = ApenasDigitos().Replace(input.Valor ?? string.Empty, string.Empty);
            if (normalizado.Length is < 8 or > 13)
                throw new ArgumentException("Informe um telefone válido com DDD.");
            if (!numeros.Add(normalizado))
                throw new ArgumentException("O mesmo telefone foi informado mais de uma vez.");

            resultado.Add(new TelefoneNormalizado(
                input.Id,
                tipo,
                Formatar(normalizado),
                normalizado,
                input.Principal));
        }

        return resultado;
    }

    private static string Formatar(string numero) => numero.Length switch
    {
        8 => $"{numero[..4]}-{numero[4..]}",
        9 => $"{numero[..5]}-{numero[5..]}",
        10 => $"({numero[..2]}) {numero[2..6]}-{numero[6..]}",
        11 => $"({numero[..2]}) {numero[2..7]}-{numero[7..]}",
        12 when numero.StartsWith("55") => $"+55 ({numero[2..4]}) {numero[4..8]}-{numero[8..]}",
        13 when numero.StartsWith("55") => $"+55 ({numero[2..4]}) {numero[4..9]}-{numero[9..]}",
        _ => numero
    };

    [GeneratedRegex("\\D")]
    private static partial Regex ApenasDigitos();

    private sealed record TelefoneNormalizado(
        long? Id,
        string Tipo,
        string Valor,
        string ValorNormalizado,
        bool Principal);

    private sealed class TelefoneExistente
    {
        public long Id { get; init; }
    }
}
