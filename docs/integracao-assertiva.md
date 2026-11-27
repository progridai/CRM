# Assertiva Localize no Progrid+

## Configuração

No WebApólice, habilite o recurso **ASSERTIVA** do módulo **CRM**. O acesso operacional usa a permissão existente `crm.assertiva.utilizar` ou um perfil com acesso total. A administração da integração exige acesso total e o recurso habilitado. A configuração fica no banco da instalação do CRM, seguindo o escopo da conexão existente.

No gerenciador de segredos da instalação, configure `Integracoes__Assertiva__ChaveProtecao` com 32 bytes aleatórios codificados em Base64. Use a mesma chave em todas as réplicas, preserve-a nos procedimentos de recuperação e mantenha-a fora do banco e do controle de versão. Se a chave for substituída, salve novamente o Client Secret com a nova chave antes de reativar as consultas.

Em **Administração → Integrações → Assertiva**, informe o **Client ID**, o **Client Secret** e a finalidade aprovada para a empresa. Defina o prazo de referência para reconsulta, inicialmente 90 dias, e a retenção dos resultados, inicialmente 365 dias. A opção **Testar autenticação salva** pede um token OAuth, sem chamar o Localize. Ative a configuração para disponibilizar novas consultas.

## Operação

Em **Negócios**, abra a ficha lateral do cliente e selecione a aba **Assertiva**. Em **Contatos**, use o botão **Assertiva** da linha do cliente. Ambos acessam o mesmo histórico, vinculado ao cadastro oficial.

A ficha lê os resultados do banco. Uma consulta ao fornecedor sempre parte de uma ação do operador. Dentro do prazo configurado, o CRM exige confirmação explícita sobre o possível custo adicional. O histórico registra quem consultou, quando, a operação, a situação, o protocolo disponível e a confirmação de antecipação. O cadastro oficial recebe um telefone somente após confirmação individual.

## Banco de dados e retenção

A migration `20261126150000_CriarIntegracaoAssertiva` cria:

- `crm.assertiva_configuracao` para parâmetros e credencial protegida.
- `crm.assertiva_consulta` para resultados de contato e metadados de auditoria.
- `crm.assertiva_telefone_inclusao` para a origem e autoria dos telefones adicionados ao cadastro.

O prazo de retenção remove telefones e e-mails dos resultados consultados. A aplicação aplica o prazo na leitura e processa a remoção no banco a cada cinco minutos. O histórico operacional e os telefones que já foram incluídos no cadastro oficial seguem as políticas aplicáveis a esses registros.

## Homologação com o contrato real

Confirme a emissão de token e o acesso do contrato ao Localize por CPF com a finalidade configurada. Em uma consulta autorizada, valide a forma e a disponibilidade dos telefones, e-mails e protocolos. Revise as condições de cobrança e confirme o prazo de retenção adotado pela empresa.

[Autenticação Assertiva](https://integracao.assertivasolucoes.com.br/v3/portal/autenticacao) · [Referência do Localize](https://integracao.assertivasolucoes.com.br/v3/portal/localize/reference)
