namespace ProgridPlus.Api.Negocios;

/// <summary>
/// Dados necessários para criar um negócio via POST /api/negocios.
/// O backend resolve todos os relacionamentos internamente pelos IDs.
/// CPF, nome e telefone NÃO são enviados — são dados do cliente no WebApólice.
/// </summary>
public sealed record CriarNegocioCommand(
    /// <summary>Public ID do cliente (cadastro.cliente.public_id) selecionado no autocomplete.</summary>
    Guid ClientePublicId,

    /// <summary>Valor do débito em reais. Deve ser maior que zero.</summary>
    decimal Valor,

    /// <summary>Referência externa opcional (ex: número do contrato, protocolo).</summary>
    string? Referencia,

    /// <summary>Data de Vencimento da fatura.</summary>
    DateTime DataVencimento,

    /// <summary>Texto livre de origem do negócio. Opcional.</summary>
    string? Origem,

    /// <summary>public_id da etapa inicial (crm.negocio_etapa.public_id).</summary>
    Guid EtapaPublicId,

    /// <summary>
    /// ID do operador responsável (seguranca.usuario.id).
    /// Quando null, o backend usa o usuário autenticado.
    /// </summary>
    long? OperadorId,

    /// <summary>Observações livres. Persistidas em crm.negocio.notas.</summary>
    string? Notas
);
