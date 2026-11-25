using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using ExcelDataReader;

namespace ProgridPlus.Api.Importacoes;

internal static partial class PlanilhaXlsxLeitor
{
    private const int MaximoLinhas = 20_000;
    private const long MaximoConteudoDescompactado = 100 * 1024 * 1024;

    static PlanilhaXlsxLeitor() => Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

    public static ImportacaoPlanilhaResultado Ler(Stream stream)
    {
        try
        {
            if (stream.ReadByte() == 'P' && stream.ReadByte() == 'K')
            {
                stream.Position = 0;
                using var zip = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
                if (zip.Entries.Sum(entry => entry.Length) > MaximoConteudoDescompactado)
                    throw new InvalidDataException("O conteúdo descompactado da planilha excede o limite permitido.");
            }
            stream.Position = 0;
            using var excel = ExcelReaderFactory.CreateReader(stream, new ExcelReaderConfiguration { LeaveOpen = true });
            var linhas = new List<ImportacaoPlanilhaLinha>();
            var abas = new List<string>();

            do
            {
                Dictionary<string, int>? colunas = null;
                var numeroLinha = 0;
                while (excel.Read())
                {
                    numeroLinha++;
                    if (numeroLinha > MaximoLinhas + 30)
                        throw new InvalidDataException("Uma aba ultrapassa o limite de linhas.");
                    if (colunas is null)
                    {
                        if (numeroLinha > 30) break;
                        colunas = LerCabecalho(excel);
                        if (colunas is not null) abas.Add(excel.Name);
                        continue;
                    }

                    string Valor(string coluna) => colunas.TryGetValue(coluna, out var indice)
                        ? FormatarCelula(excel.GetValue(indice))
                        : string.Empty;
                    if (colunas.Values.All(indice => string.IsNullOrWhiteSpace(FormatarCelula(excel.GetValue(indice)))))
                        continue;
                    if (linhas.Count >= MaximoLinhas)
                        throw new InvalidDataException("A planilha excede o limite de 20.000 linhas de dados.");

                    TentarLerCompetencia(Valor("COMPETENCIA"), Valor("ANO"), out var mes, out var ano);
                    linhas.Add(new ImportacaoPlanilhaLinha(linhas.Count + 1, excel.Name, numeroLinha,
                        Valor("ESTIPULANTE"), Valor("REFERENCIA"), Valor("NOME"), Valor("CPF"), mes, ano,
                        Valor("SITUACAO"), Valor("PREMIO"), Valor("COBRADOR"), Valor("IDNEGOCIOCRM")));
                }
            } while (excel.NextResult());

            if (linhas.Count == 0)
                throw new InvalidDataException("Nenhuma linha encontrada. Confira as colunas Estipulante, CPF, Matrícula (ou Apólice/Contrato), Competência e Prêmio.");
            return new ImportacaoPlanilhaResultado(abas, linhas);
        }
        catch (Exception ex) when (ex is ExcelDataReader.Exceptions.ExcelReaderException or IOException or FormatException or ArgumentException)
        {
            throw new InvalidDataException("Não foi possível ler o arquivo Excel. Confira se ele está íntegro e sem senha.", ex);
        }
    }

    private static Dictionary<string, int>? LerCabecalho(IExcelDataReader excel)
    {
        var colunas = new Dictionary<string, int>(StringComparer.Ordinal);
        for (var i = 0; i < excel.FieldCount; i++)
        {
            var texto = FormatarCelula(excel.GetValue(i)).Normalize(NormalizationForm.FormD);
            var nome = string.Concat(texto.Where(char.IsLetterOrDigit)).ToUpperInvariant();
            nome = nome switch
            {
                "CLIENTE" or "SEGURADO" => "NOME",
                "MATRCULA" => "MATRICULA",
                "COMPETNCIA" => "COMPETENCIA",
                "SITUAO" => "SITUACAO",
                "COBRADORA" or "RESPONSAVEL" => "COBRADOR",
                _ => nome,
            };
            if (nome.Length > 0) colunas.TryAdd(nome, i);
        }

        foreach (var nome in new[] { "APOLICE", "CONTRATO", "MATRICULA" })
        {
            if (!colunas.TryGetValue(nome, out var indice)) continue;
            colunas["REFERENCIA"] = indice;
            break;
        }

        string[] obrigatorios = ["ESTIPULANTE", "CPF", "REFERENCIA", "COMPETENCIA", "PREMIO"];
        return obrigatorios.All(colunas.ContainsKey) ? colunas : null;
    }

    private static string FormatarCelula(object? valor) => valor switch
    {
        DateTime data => data.ToString("MM/yyyy", CultureInfo.InvariantCulture),
        IFormattable numero => numero.ToString(null, CultureInfo.InvariantCulture).Trim(),
        _ => valor?.ToString()?.Trim() ?? string.Empty,
    };

    private static void TentarLerCompetencia(string texto, string anoTexto, out int mes, out int ano)
    {
        var periodo = PeriodoRegex().Match(texto);
        if (!periodo.Success) periodo = PeriodoInvertidoRegex().Match(texto);
        if (periodo.Success)
        {
            mes = int.Parse(periodo.Groups["mes"].Value, CultureInfo.InvariantCulture);
            ano = int.Parse(periodo.Groups["ano"].Value, CultureInfo.InvariantCulture);
        }
        else if (texto.Length == 6 && int.TryParse(texto, out var periodoInt))
        {
            mes = periodoInt % 100;
            ano = periodoInt / 100;
        }
        else
        {
            int.TryParse(texto, out mes);
            int.TryParse(anoTexto, out ano);
        }
        if (mes is < 1 or > 12 || ano is < 2000 or > 2100)
            (mes, ano) = (0, 0);
    }

    [GeneratedRegex(@"^(?<mes>\d{1,2})\s*[/\-.]\s*(?<ano>\d{4})$", RegexOptions.CultureInvariant)]
    private static partial Regex PeriodoRegex();

    [GeneratedRegex(@"^(?<ano>\d{4})\s*[/\-.]\s*(?<mes>\d{1,2})$", RegexOptions.CultureInvariant)]
    private static partial Regex PeriodoInvertidoRegex();
}
