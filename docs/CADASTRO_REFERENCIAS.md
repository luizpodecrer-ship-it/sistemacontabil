# Evolução do cadastro a partir das referências visuais

As telas de referência orientaram os dados e as relações. O layout Tailwind e os componentes existentes foram mantidos; as abas e os títulos de seção receberam ícones lineares Lucide com traço de 1,6, correspondente ao menu lateral.

## Inscrição e dados gerais

O tipo de cliente permite pessoa jurídica (CNPJ numérico/alfanumérico validado) ou pessoa física (CPF validado). O campo interno `values.cnpj` foi preservado por compatibilidade e contém a inscrição principal conforme o tipo; não significa que todo cliente possui CNPJ. Trocar o tipo limpa a inscrição com confirmação e preserva os demais dados para revisão. Cadastros com filiais precisam resolver esses vínculos antes de alterar o tipo.

Campos adicionados: tipo/número de inscrição complementar CEI histórica, CNO ou CAEPF; início e término das atividades; data de inativação; andar, sala/conjunto, caixa postal, UF/CEP da caixa postal; registro na Junta, cartório/termo, data de registro em cartório, livro e folha. O responsável pode ser selecionado entre as pessoas vinculadas, sem repetir seu cadastro.

Telefones passaram a ser uma lista com tipo, número com DDD, contato/setor e indicação de principal. Os campos legados `phone`/`mobile` são convertidos em linhas no momento da leitura, sem perda dos números, anexos ou históricos. Não há alteração do banco IndexedDB nem exclusão dos registros antigos na leitura; a estrutura normalizada é persistida ao salvar. Backups antigos são normalizados ao restaurar.

## Consulta automática por CNPJ

- Fonte: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, sem chave privada. Somente o CNPJ é enviado, com política de referência `no-referrer`.
- A consulta ocorre após 500 ms ao completar um CNPJ numérico válido. CNPJ inválido e CPF não acionam o endpoint. CNPJ alfanumérico permanece disponível para cadastro manual, pois a fonte numérica ainda não o atende.
- Não consulta automaticamente ao abrir um cadastro já preenchido. O botão Consultar CNPJ permite solicitar atualização explicitamente.
- Preenche apenas campos vazios. Diferenças em campos preenchidos aparecem em uma seção de revisão, com seleção e aplicação explícitas.
- Importa CNAEs quando a lista está vazia e acrescenta telefones não repetidos. Não importa CPF mascarado de sócios nem presume regime tributário, desoneração ou cronogramas legais.
- Registra fonte, data da consulta e inscrição de origem junto ao cadastro. Os dados retornados são sugestões cadastrais que exigem conferência; não constituem consulta autenticada em tempo real à Receita Federal.
- Trata cancelamento, respostas antigas, tempo limite, CNPJ não encontrado, limite de requisições, rede e retorno inválido. O preenchimento manual continua disponível.
- O acesso real à BrasilAPI retornou 403 no ambiente de execução. A integração e seus fluxos foram testados com respostas simuladas no navegador. Não há garantia de disponibilidade ou atualização da fonte externa.

A busca de CEP foi preservada, mas não volta a consultar automaticamente ao abrir um endereço existente: isso impede que ela substitua o endereço cadastral recebido do CNPJ ou uma correção manual. Alterar o CEP ou clicar em Consultar novamente dispara a consulta.

## Configurações de pessoal

Nova aba com:

1. Situação e observações da parametrização.
2. Parâmetros de folha por competência: desoneração, alíquota/indicativo/critério, códigos DARF/IRRF/PIS, alíquota PIS, centralização de recolhimentos, Simples Nacional, enquadramento/adesão, anexo por atividade/CNAE, concomitância, MEI e porte trabalhista.
3. PAT por vigência: adesão, início/fim, quantidades por faixa de salários mínimos, origem/competência do levantamento, modalidades e percentuais de alimentação.
4. eSocial por vigência: grupo, início de tabelas, não periódicos, periódicos, SST e marcos históricos de substituição de obrigações.

Os detalhes condicionais aparecem conforme as escolhas. Nenhuma alíquota, data histórica, pessoa ou quantidade das imagens foi adotada como padrão. As linhas possuem fonte e responsável de validação, exigidos ao concluir um cadastro que contenha essas configurações. Rascunhos permitem completar o levantamento depois.

Validações: datas finais não anteriores às iniciais; sobreposição de vigências para o mesmo contexto (na folha, o mesmo CNAE); percentuais de 0 a 100; participantes inteiros e não negativos; origem das quantidades PAT; MEI condicionado a Simples Nacional. Não é imposta soma de 100% entre modalidades PAT sem definição normativa. Quantidades são informadas a partir de levantamento identificado, sem deduzir enquadramento ou reajustar folha automaticamente.

São configurações cadastrais. Não efetuam apuração, transmissão, confirmação de recibos ou aplicação automática de regras trabalhistas. Conteúdos de abas não visíveis nas referências (Omie, detalhes adicionais e previsão de pagamentos) não foram inventados.

## Nuvem

Para projetos Supabase novos, execute `001_workspace.sql` e depois `002_company_person_type.sql`. Para quem já aplicou 001, execute apenas 002. A segunda migração atualiza a função de gravação para aceitar inscrição CPF, mantendo índices e dados PJ existentes. As políticas de isolamento não foram ampliadas. A migração 002 é verificada junto à 001 nos testes PostgreSQL embarcados.
