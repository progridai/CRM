namespace ProgridPlus.Api.Seguranca;

/// <summary>
/// Projeção somente-leitura do resultado da consulta de acesso ao CRM.
/// Produzida pela query sobre seguranca.usuario, sem gravar nenhum dado.
/// </summary>
public sealed record UsuarioAcesso(
    long UsuarioId,
    string Nome,
    string Email,
    string Username,
    bool Ativo,
    bool AcessoTotal,
    bool TemPermissaoCrm
)
{
    /// <summary>
    /// Retorna true se o usuário está ativo e possui acesso ao CRM
    /// por acesso_total ou pela permissão crm.acessar.
    /// </summary>
    public bool PodeAcessarCrm =>
        Ativo && (AcessoTotal || TemPermissaoCrm);
}
