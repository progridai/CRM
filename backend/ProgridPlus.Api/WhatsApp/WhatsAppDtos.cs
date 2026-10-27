namespace ProgridPlus.Api.WhatsApp;

public sealed record WhatsAppConfiguracaoDto(
    Guid PublicId,
    string Nome,
    string Fornecedor,
    string BaseUrl,
    string EndpointDisparo,
    string Canal,
    string TemplatePadrao,
    string TemplateLanguage,
    string MensagemTemplate,
    string SeguroPadrao,
    bool AbrirAtendimento,
    string? FilaDisparo,
    string? AgenteDisparo,
    int TimeoutSegundos,
    bool CredencialConfigurada,
    DateTime AtualizadoEm,
    string? AtualizadoPor);

public sealed record AtualizarWhatsAppConfiguracaoRequest(
    string BaseUrl,
    string EndpointDisparo,
    string Canal,
    string TemplatePadrao,
    string TemplateLanguage,
    string MensagemTemplate,
    string SeguroPadrao,
    bool AbrirAtendimento,
    string? FilaDisparo,
    string? AgenteDisparo,
    int TimeoutSegundos);

public sealed record CriarDisparoWhatsAppRequest(
    string Titulo,
    IReadOnlyList<Guid> NegocioIds,
    string? Tipo = null);

public sealed record WhatsAppPreviewDestinatarioDto(
    Guid NegocioPublicId,
    string Nome,
    string Numero,
    string Mensagem);

public sealed record WhatsAppPreviewExcluidoDto(
    Guid NegocioPublicId,
    string Nome,
    string? Numero,
    string Motivo);

public sealed record WhatsAppPreviewDto(
    int Selecionados,
    int Aptos,
    int Excluidos,
    IReadOnlyList<WhatsAppPreviewDestinatarioDto> Destinatarios,
    IReadOnlyList<WhatsAppPreviewExcluidoDto> ItensExcluidos);

public sealed record WhatsAppDisparoResumoDto(
    Guid PublicId,
    string Tipo,
    string Titulo,
    string Template,
    string Status,
    int TotalSelecionados,
    int TotalDestinatarios,
    int TotalExcluidos,
    string EndpointFornecedor,
    int? HttpStatusFornecedor,
    long? CampanhaIdExterno,
    string? MensagemRetorno,
    string? Erro,
    DateTime CriadoEm,
    DateTime? ConcluidoEm,
    string OperadorNome,
    SisnetsulDiagnosticoDto? Diagnostico = null);

public sealed record SisnetsulDiagnosticoDto(
    SisnetsulRequisicaoDiagnosticoDto Requisicao,
    SisnetsulRespostaDiagnosticoDto Resposta);

public sealed record SisnetsulRequisicaoDiagnosticoDto(
    string Metodo,
    string Url,
    IReadOnlyDictionary<string, string> Cabecalhos,
    string Curl,
    string Titulo,
    string Canal,
    string Template,
    string TemplateLanguage,
    int TotalDestinatarios,
    IReadOnlyList<string> NumerosDestinatarios,
    IReadOnlyList<string> CamposPorDestinatario,
    bool AbrirAtendimento,
    string? FilaDisparo,
    string? AgenteDisparo);

public sealed record SisnetsulRespostaDiagnosticoDto(
    int? HttpStatus,
    string? Corpo);

public sealed record WhatsAppDisparoDestinatarioDto(
    Guid? NegocioPublicId,
    string Nome,
    string? Numero,
    string? Mensagem,
    string Status,
    string? Erro);

public sealed record WhatsAppDisparoDetalheDto(
    WhatsAppDisparoResumoDto Disparo,
    IReadOnlyList<WhatsAppDisparoDestinatarioDto> Destinatarios);
