# Contexto de transferência — CRM de recuperação de inadimplência

## Finalidade deste documento

Este arquivo resume as análises e decisões tomadas sobre os requisitos necessários para colocar o CRM em operação com um fluxo básico de cobrança. Ele foi preparado para permitir a continuidade do trabalho em outra máquina após clonar o repositório.

O diagnóstico completo está em [Diagnostico_Prontidao_CRM_Recuperacao_Inadimplencia.docx](./Diagnostico_Prontidao_CRM_Recuperacao_Inadimplencia.docx). Este resumo é a referência operacional mais curta para as próximas tarefas.

## Objetivo atual

Colocar o CRM em uso o mais rápido possível com um piloto controlado, cobrindo o fluxo:

1. Receber uma base oficial de inadimplência.
2. Importar as posições sem criar dados incorretos ou duplicados.
3. Distribuir as cobranças para operadores.
4. Registrar contatos, atividades e histórico.
5. Registrar o pagamento ou o encerramento da cobrança.
6. Conferir os resultados e indicadores com a base de origem.

O objetivo imediato não é reproduzir todas as planilhas e controles paralelos existentes.

## Funcionalidades já existentes no CRM

O repositório já contém, entre outros recursos:

- Autenticação e controle de acesso com Keycloak.
- Kanban de negócios com movimentação entre etapas.
- Visualização em lista, filtros e ordenação.
- Criação manual de negócios.
- Registro de atividades e histórico.
- Atalhos para WhatsApp, ligação, pagamento e anotação.
- Cadastro e consulta de contatos, incluindo telefones.
- Importação de planilhas XLSX com log de linhas importadas e rejeitadas.
- Modos de importação para adicionar ou substituir uma competência.
- Envio individual e em massa pelo WhatsApp, com prévia e histórico de disparos.
- Indicadores básicos de saldo, recuperação, aguardando pagamento e ausência de contato.

O CRM está adequado para demonstrações, mas ainda precisa de validações e ajustes antes de substituir os controles operacionais.

## Materiais analisados

Foram utilizados como evidência:

- Reunião com a usuária Daniele, transcrita em arquivo de texto.
- Manual operacional de recuperação de inadimplência.
- Planilha operacional utilizada pela Daniele.
- Planilha `INADIMPLENCIA FAEC - AGOSTO 2026.xlsx`, enviada por Maurício e já aceita pelo importador atual.
- Implementação atual do frontend, backend e banco de dados do CRM.

As orientações de Daniele, do manual e das planilhas não foram consideradas regras automaticamente aprovadas. O proprietário deve validar qualquer regra que altere o processo oficial.

Os arquivos originais da reunião, do manual e das planilhas estavam fora do repositório. Eles não serão obtidos por um novo `git clone`. Este documento contém as conclusões necessárias para continuar; os arquivos originais só precisam ser copiados separadamente se for necessário refazer ou auditar a análise.

## Decisão sobre qual planilha usar

### Decisão recomendada para o piloto

Manter a planilha enviada por Maurício como base de importação do primeiro piloto.

Não adotar diretamente a planilha da Daniele como novo layout de importação neste momento.

### Motivo

A planilha de Maurício já contém os dados necessários para abrir uma cobrança:

- Estipulante.
- Matrícula.
- Nome.
- CPF.
- Ano.
- Competência.
- Situação.
- Prêmio ou valor da dívida.
- Cobrador.

A planilha da Daniele contém muitos campos que representam resultados ou controles produzidos durante a cobrança, não dados necessários para abrir o negócio. Telefones, contatos, produtividade e histórico de atividades também já pertencem ao CRM.

### Campos da planilha da Daniele que não devem dirigir a importação inicial

- Telefone: os contatos já existem no CRM.
- Data, meio e quantidade de contatos: devem ser gerados pelas atividades do CRM.
- Produtividade: deve ser calculada pelos relatórios do CRM.
- Observações da cobradora: novas observações devem ficar no histórico do CRM.
- Situação secundária: deve resultar do fluxo do Kanban.
- Forma de pagamento: não é necessária para abrir a cobrança.
- Repasse e observações operacionais: podem ficar para uma fase posterior.
- Apólice: estava vazia nos registros da FAEC analisados.
- Limite para cobrança: também estava vazio nos registros da FAEC analisados.

### Pagamentos existentes na planilha da Daniele

Data de pagamento, valor recuperado e situação de pagamento são resultados da operação. Para um ciclo novo, devem ser registrados pelo CRM depois da importação.

Esses campos só precisam ser migrados se o CRM entrar no meio de um ciclo que já tenha cobranças trabalhadas ou pagas. A alternativa mais simples para o piloto é começar com uma base nova de cobranças abertas.

## Estrutura observada na planilha de Maurício

A aba detalhada `POR APÓLICE` possui 335 posições:

- 335 linhas com ano 2026.
- 335 linhas com competência 8, correspondentes a agosto.
- 318 linhas com situação `EM ABERTO`.
- 17 linhas com situação `NÃO DESCONTOU`.
- Todas as linhas indicam a cobradora Helena.

A aba `UNIFICADO` contém uma consolidação, mas não possui todas as colunas obrigatórias do importador. Portanto, atualmente apenas a aba detalhada é reconhecida.

Foi encontrado um grupo de cinco linhas com a mesma combinação de CPF, matrícula, estipulante, ano, competência, situação e valor. O nome varia entre essas linhas. É necessário confirmar se são cobranças distintas ou duplicidades da origem.

## Funcionamento atual do importador

O leitor reconhece como obrigatórias somente estas colunas:

- Estipulante.
- Matrícula.
- Nome.
- CPF.
- Situação.
- Prêmio.
- Cobrador.

O sistema atual:

- Usa CPF para localizar o cliente já cadastrado.
- Usa matrícula como referência do negócio.
- Usa estipulante como origem.
- Usa prêmio como valor.
- Localiza o operador pelo nome ou usuário informado como cobrador.
- Grava a situação da planilha apenas no campo de observações.
- Coloca todos os registros importados na etapa `Nova Posição`.
- Deixa a data de vencimento vazia.
- Não usa o nome da planilha para substituir o nome cadastrado do cliente.
- Não utiliza as colunas `ANO` e `COMPETÊNCIA` da planilha.
- Aplica a todas as linhas o mês e o ano escolhidos manualmente na tela de importação.

No modo `adicionar`, uma nova importação pode criar negócios repetidos. No modo `substituir`, os negócios ativos daquela competência são desativados e as linhas válidas são recriadas.

## Principais riscos para o piloto

### 1. Competência incorreta

O arquivo possui ano e competência, mas o importador os ignora. Um usuário pode selecionar o mês errado na tela e atribuir todas as cobranças ao período incorreto.

Requisito mínimo recomendado:

- Manter a seleção de competência na tela.
- Ler ano e competência da planilha para validação.
- Bloquear a importação quando a seleção não coincidir com o conteúdo do arquivo.
- Bloquear ou tratar explicitamente arquivos com mais de uma competência.

### 2. Duplicidade de negócios

É necessário definir o identificador lógico de uma cobrança. A combinação inicial sugerida é:

`CPF + estipulante + matrícula + ano + competência`

Requisito mínimo recomendado:

- Exibir duplicidades antes da confirmação.
- Não criar novamente uma cobrança já importada com a mesma chave.
- Se duas dívidas legítimas puderem compartilhar essa chave, incluir um identificador adicional fornecido pela origem, como apólice, contrato ou parcela.

### 3. Situações elegíveis

É necessário confirmar se `EM ABERTO` e `NÃO DESCONTOU` devem entrar no Kanban como `Nova Posição`.

Requisito mínimo recomendado:

- Importar apenas situações aprovadas para cobrança.
- Rejeitar ou registrar no log as situações não reconhecidas.
- Não transformar silenciosamente qualquer texto em uma cobrança ativa.

### 4. Pagamento

O Excel não precisa trazer pagamento quando o piloto começa com uma base nova. Entretanto, o CRM precisa registrar o resultado da cobrança.

É necessário confirmar se existem pagamentos parciais.

Se todos os pagamentos forem integrais, a primeira versão pode encerrar o negócio utilizando o valor original. Se houver pagamentos parciais, o CRM precisa registrar separadamente:

- Data do pagamento.
- Valor recuperado.
- Situação integral ou parcial.
- Referência ou comprovante, quando exigido.
- Encaminhamento para baixa ou encerramento.

### 5. Prazo de cobrança

A planilha de Maurício não traz uma data limite. A coluna equivalente da planilha da Daniele estava vazia para a FAEC.

É necessário confirmar se a cobrança da FAEC:

- Possui uma data final definida.
- Continua até a chegada da próxima base.
- Depende de um prazo configurado por carteira.

Se houver prazo, ele deve ser armazenado por negócio, ciclo ou carteira. Trocar de planilha não resolve essa regra.

## Perguntas pendentes para Maurício

Estas são as perguntas mínimas, sem abrir uma revisão completa de todo o processo:

1. As situações `EM ABERTO` e `NÃO DESCONTOU` devem entrar no Kanban para cobrança?
2. Cada linha da aba `POR APÓLICE` representa uma dívida diferente?
3. Quando CPF, estipulante, matrícula e competência forem iguais, devemos manter mais de uma linha ou considerar duplicidade?
4. Existem pagamentos parciais ou todo pagamento quita o valor completo?
5. A FAEC possui uma data limite de cobrança ou o trabalho segue até a chegada da próxima base?
6. O piloto pode começar com uma base nova, sem migrar o histórico operacional da planilha da Daniele?

## Prioridades recomendadas para as próximas tarefas

### P0 — necessárias para iniciar o piloto

1. Validar com Maurício as seis perguntas anteriores.
2. Fazer o importador conferir a competência da planilha com a competência selecionada.
3. Definir e aplicar a chave de duplicidade.
4. Definir quais situações são aceitas na importação.
5. Executar uma prévia de importação mostrando quantidade de linhas, valor total, situações e duplicidades.
6. Importar apenas uma carteira e uma competência controladas.
7. Conferir quantidade e valor total entre Excel, log de importação e Kanban.
8. Testar o fluxo completo até pagamento ou encerramento.

### P1 — necessárias antes da operação completa

1. Estruturar o registro de pagamento, principalmente se houver pagamento parcial.
2. Registrar próxima ação ou data de retorno de uma cobrança.
3. Configurar prazo final quando a carteira possuir limite de cobrança.
4. Restringir operações críticas de importação, substituição e exclusão conforme o perfil do usuário.
5. Melhorar filtros e segurança dos disparos em massa pelo WhatsApp.
6. Reconciliar os indicadores do CRM com valores independentes da base.

### P2 — melhorias posteriores

- Dashboards e relatórios avançados de produtividade.
- Integração com SharePoint para comprovantes.
- SMS, e-mail e telefonia integrados.
- Integração direta com os sistemas de origem.
- Automação de baixa e confirmação de pagamento.
- Regras específicas e alertas por carteira.
- Migração de históricos antigos, quando realmente necessária.

## Critério de sucesso do piloto

O piloto deve comprovar o fluxo:

`Excel oficial → validação → importação → Kanban → atividade → pagamento/encerramento → indicador`

Antes de liberar o uso mais amplo, confirmar:

- A competência foi gravada corretamente.
- Nenhuma cobrança foi duplicada indevidamente.
- Todas as linhas rejeitadas possuem motivo claro no log.
- A quantidade importada confere com a base aprovada.
- O valor total importado confere com a base aprovada.
- O operador consegue registrar a evolução do caso.
- Um pagamento ou encerramento aparece corretamente no histórico e nos indicadores.

## Orientação para continuar em outra máquina

Depois de clonar o repositório, iniciar uma nova conversa no Codex com uma solicitação semelhante a:

> Leia `docs/CONTEXTO_TRANSFERENCIA_CRM.md` e `docs/Diagnostico_Prontidao_CRM_Recuperacao_Inadimplencia.docx`. Em seguida, inspecione o estado atual do repositório e confirme quais requisitos P0 já estão implementados. Preserve alterações existentes e não trate as orientações da planilha da Daniele como regras aprovadas. Quero continuar a preparação do piloto, começando pelo próximo requisito P0 ainda pendente.

Antes de implementar qualquer alteração, o novo ambiente deve:

1. Ler eventuais arquivos `AGENTS.md` do repositório.
2. Verificar a branch e o `git status`.
3. Confirmar se o código mudou depois da elaboração deste documento.
4. Revalidar as conclusões técnicas contra a implementação atual.
5. Não depender dos caminhos locais da máquina anterior.

## Segurança e privacidade

- Não copiar credenciais mencionadas em reuniões ou documentos para este arquivo, commits ou mensagens.
- Não versionar bases contendo CPF, telefone ou dados financeiros reais.
- Os documentos de diagnóstico e contexto não contêm credenciais conhecidas.
- Se for necessário transportar as planilhas originais, usar um meio seguro e mantê-las fora do Git.

## Observação sobre Git

Um `git clone` só recupera arquivos que tenham sido adicionados, commitados e enviados ao repositório remoto. Antes de trocar de máquina, é necessário garantir que este documento e o diagnóstico estejam incluídos em um commit e tenham sido enviados ao remoto apropriado.
