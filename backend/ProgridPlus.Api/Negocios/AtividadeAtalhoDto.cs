namespace ProgridPlus.Api.Negocios;

public sealed record AtividadeAtalhoDto
{
    public Guid PublicId { get; init; }
    public string Nome { get; init; } = string.Empty;
    public string Tipo { get; init; } = string.Empty;
    public string TituloPadrao { get; init; } = string.Empty;
    public string? DescricaoPadrao { get; init; }
    public int Ordem { get; init; }
    public bool Ativo { get; init; }
}
