using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;

namespace ProgridPlus.Api.Importacoes;

/// <summary>
/// Leitor mínimo de XLSX para a planilha de inadimplência. A implementação usa
/// apenas Open XML (o XLSX é um ZIP de XMLs) e não executa macros nem fórmulas.
/// </summary>
internal static partial class PlanilhaXlsxLeitor
{
    private const int MaximoLinhas = 20_000;
    private const long MaximoXmlDescompactado = 50 * 1024 * 1024;
    private const long MaximoConteudoDescompactado = 100 * 1024 * 1024;

    private static readonly XNamespace SpreadsheetNs =
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

    private static readonly XNamespace OfficeRelationshipsNs =
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

    private static readonly XNamespace PackageRelationshipsNs =
        "http://schemas.openxmlformats.org/package/2006/relationships";

    private static readonly IReadOnlyDictionary<string, string> Cabecalhos =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["ESTIPULANTE"] = "estipulante",
            ["MATRICULA"] = "matricula",
            ["MATRCULA"] = "matricula", // arquivo legado com caractere de acento corrompido
            ["NOME"] = "nome",
            ["CPF"] = "cpf",
            ["SITUACAO"] = "situacao",
            ["SITUAO"] = "situacao", // arquivo legado com caracteres corrompidos
            ["PREMIO"] = "premio",
            ["COBRADOR"] = "cobrador",
        };

    private static readonly string[] Obrigatorios =
        ["estipulante", "matricula", "nome", "cpf", "situacao", "premio", "cobrador"];

    public static ImportacaoPlanilhaResultado Ler(Stream stream)
    {
        if (!stream.CanRead)
            throw new InvalidDataException("Não foi possível ler o arquivo enviado.");

        try
        {
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
            if (archive.Entries.Sum(entry => entry.Length) > MaximoConteudoDescompactado)
                throw new InvalidDataException("O conteúdo descompactado da planilha excede o limite permitido.");

            var workbookEntry = ObterEntrada(archive, "xl/workbook.xml");
            var relsEntry = ObterEntrada(archive, "xl/_rels/workbook.xml.rels");
            var workbook = CarregarXml(workbookEntry);
            var rels = CarregarXml(relsEntry);
            var sharedStrings = LerSharedStrings(archive);

            var relacionamentos = rels.Root?
                .Elements(PackageRelationshipsNs + "Relationship")
                .Where(elemento => elemento.Attribute("Id") is not null)
                .ToDictionary(
                    elemento => elemento.Attribute("Id")!.Value,
                    elemento => elemento.Attribute("Target")?.Value ?? string.Empty,
                    StringComparer.Ordinal)
                ?? new Dictionary<string, string>(StringComparer.Ordinal);

            var linhas = new List<ImportacaoPlanilhaLinha>();
            var abasLidas = new List<string>();
            var ordem = 0;

            var sheets = workbook.Root?
                .Element(SpreadsheetNs + "sheets")?
                .Elements(SpreadsheetNs + "sheet")
                ?? [];

            foreach (var sheet in sheets)
            {
                var nome = sheet.Attribute("name")?.Value?.Trim() ?? "Aba sem nome";
                var relationshipId = sheet.Attribute(OfficeRelationshipsNs + "id")?.Value;

                if (relationshipId is null || !relacionamentos.TryGetValue(relationshipId, out var target))
                    continue;

                var caminho = ResolverCaminhoPlanilha(target);
                var worksheetEntry = archive.GetEntry(caminho);
                if (worksheetEntry is null)
                    continue;

                var worksheet = CarregarXml(worksheetEntry);
                var rows = worksheet.Descendants(SpreadsheetNs + "row").ToList();
                var header = EncontrarCabecalho(rows, sharedStrings);
                if (header is null)
                    continue;

                abasLidas.Add(nome);

                foreach (var row in rows.Skip(header.RowIndex + 1))
                {
                    var valores = LerCelulas(row, sharedStrings);
                    if (header.Columns.Values.All(indice => !valores.TryGetValue(indice, out var valor) || string.IsNullOrWhiteSpace(valor)))
                        continue;

                    if (linhas.Count >= MaximoLinhas)
                        throw new InvalidDataException($"A planilha excede o limite de {MaximoLinhas:N0} linhas de dados.");

                    var numeroLinha = int.TryParse(row.Attribute("r")?.Value, out var parsedRow)
                        ? parsedRow
                        : header.RowNumber + linhas.Count + 1;

                    string Valor(string coluna) =>
                        valores.TryGetValue(header.Columns[coluna], out var valor) ? valor.Trim() : string.Empty;

                    linhas.Add(new ImportacaoPlanilhaLinha(
                        ++ordem,
                        nome,
                        numeroLinha,
                        Valor("estipulante"),
                        Valor("matricula"),
                        Valor("nome"),
                        Valor("cpf"),
                        Valor("situacao"),
                        Valor("premio"),
                        Valor("cobrador")));
                }
            }

            if (abasLidas.Count == 0)
            {
                throw new InvalidDataException(
                    "Nenhuma aba possui todas as colunas obrigatórias: Estipulante, Matrícula, Nome, CPF, Situação, Prêmio e Cobrador.");
            }

            if (linhas.Count == 0)
                throw new InvalidDataException("As abas reconhecidas não possuem linhas para importação.");

            return new ImportacaoPlanilhaResultado(abasLidas, linhas);
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidOperationException or XmlException or UriFormatException)
        {
            throw new InvalidDataException("O arquivo não é um XLSX válido ou está corrompido.", ex);
        }
    }

    private static HeaderInfo? EncontrarCabecalho(
        IReadOnlyList<XElement> rows,
        IReadOnlyList<string> sharedStrings)
    {
        for (var rowIndex = 0; rowIndex < Math.Min(rows.Count, 15); rowIndex++)
        {
            var valores = LerCelulas(rows[rowIndex], sharedStrings);
            var columns = new Dictionary<string, int>(StringComparer.Ordinal);

            foreach (var (columnIndex, value) in valores)
            {
                var normalizado = NormalizarCabecalho(value);
                if (Cabecalhos.TryGetValue(normalizado, out var canonical) && !columns.ContainsKey(canonical))
                    columns[canonical] = columnIndex;
            }

            if (Obrigatorios.All(columns.ContainsKey))
            {
                var numeroLinha = int.TryParse(rows[rowIndex].Attribute("r")?.Value, out var parsed)
                    ? parsed
                    : rowIndex + 1;
                return new HeaderInfo(rowIndex, numeroLinha, columns);
            }
        }

        return null;
    }

    private static Dictionary<int, string> LerCelulas(XElement row, IReadOnlyList<string> sharedStrings)
    {
        var resultado = new Dictionary<int, string>();
        var fallbackColumn = 0;

        foreach (var cell in row.Elements(SpreadsheetNs + "c"))
        {
            var reference = cell.Attribute("r")?.Value;
            var columnIndex = string.IsNullOrWhiteSpace(reference)
                ? fallbackColumn
                : ObterIndiceColuna(reference);

            fallbackColumn = columnIndex + 1;
            resultado[columnIndex] = LerValorCelula(cell, sharedStrings);
        }

        return resultado;
    }

    private static string LerValorCelula(XElement cell, IReadOnlyList<string> sharedStrings)
    {
        var tipo = cell.Attribute("t")?.Value;
        if (string.Equals(tipo, "inlineStr", StringComparison.Ordinal))
            return string.Concat(cell.Descendants(SpreadsheetNs + "t").Select(texto => texto.Value));

        var raw = cell.Element(SpreadsheetNs + "v")?.Value ?? string.Empty;
        if (string.Equals(tipo, "s", StringComparison.Ordinal) &&
            int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var sharedIndex) &&
            sharedIndex >= 0 && sharedIndex < sharedStrings.Count)
        {
            return sharedStrings[sharedIndex];
        }

        if (string.Equals(tipo, "b", StringComparison.Ordinal))
            return raw == "1" ? "TRUE" : "FALSE";

        return raw;
    }

    private static IReadOnlyList<string> LerSharedStrings(ZipArchive archive)
    {
        var entry = archive.GetEntry("xl/sharedStrings.xml");
        if (entry is null)
            return [];

        var document = CarregarXml(entry);
        return document.Root?
            .Elements(SpreadsheetNs + "si")
            .Select(item => string.Concat(item.Descendants(SpreadsheetNs + "t").Select(texto => texto.Value)))
            .ToList()
            ?? [];
    }

    private static XDocument CarregarXml(ZipArchiveEntry entry)
    {
        if (entry.Length > MaximoXmlDescompactado)
            throw new InvalidDataException("O conteúdo descompactado da planilha excede o limite permitido.");

        using var stream = entry.Open();
        return XDocument.Load(stream, LoadOptions.None);
    }

    private static ZipArchiveEntry ObterEntrada(ZipArchive archive, string caminho) =>
        archive.GetEntry(caminho)
        ?? throw new InvalidDataException("O arquivo enviado não possui a estrutura esperada de um XLSX.");

    private static string ResolverCaminhoPlanilha(string target)
    {
        if (target.StartsWith('/'))
            return target.TrimStart('/');

        var uri = new Uri(new Uri("https://xlsx.local/xl/workbook.xml"), target);
        return Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/'));
    }

    private static int ObterIndiceColuna(string reference)
    {
        var index = 0;
        foreach (var character in reference)
        {
            if (!char.IsLetter(character))
                break;
            index = index * 26 + (char.ToUpperInvariant(character) - 'A' + 1);
        }
        return Math.Max(0, index - 1);
    }

    private static string NormalizarCabecalho(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
                continue;
            if (char.IsLetterOrDigit(character))
                builder.Append(char.ToUpperInvariant(character));
        }
        return builder.ToString();
    }

    private sealed record HeaderInfo(
        int RowIndex,
        int RowNumber,
        IReadOnlyDictionary<string, int> Columns);
}
