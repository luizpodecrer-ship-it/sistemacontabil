# Sindicatos e CNES

## Uso no Nexopen

**Sindicatos** fica no menu lateral, imediatamente abaixo de **Empresas**. O catálogo é compartilhado entre as empresas do mesmo escritório e não depende de uma empresa ou competência selecionada. Outros escritórios do SaaS não recebem esses cadastros.

Clique em **Novo sindicato** para preencher código interno, CNPJ, denominação, sigla, tipo de entidade, representação laboral/patronal, categoria, base territorial, registro/código sindical, processo, situação na fonte CNES, data de referência, endereço e contatos. Há máscaras de CNPJ, telefone com DDD e CEP; o CEP consulta o ViaCEP e preenche apenas campos vazios, sem substituir número, complemento ou dados já digitados. E-mail, site, CNPJ e datas são validados.

CNPJ e código interno não podem se repetir. É possível editar e inativar, sem excluir registros. Busca por nome, sigla, categoria, registro e CNPJ, filtros de sede/representação/situação interna e paginação de 50 resultados ajudam a localizar entidades.

**Situação interna** serve à organização do escritório. **Situação na fonte CNES** é texto do arquivo ou da consulta feita pelo usuário. Uma entidade ativa no catálogo não é apresentada como automaticamente regular no CNES. O cadastro não determina enquadramento sindical de empresas/colaboradores, abrangência de convenções, validade de representação nem parâmetros de folha. O campo Sindicato no colaborador ainda mantém seu fluxo anterior nesta entrega.

## Acesso oficial e limitação desta entrega

Foram tentados acessos ao portal MTE, ao serviço CNES e à consulta pública. O acesso HTTPS foi bloqueado neste ambiente na conexão com os domínios oficiais (HTTP 403). Não houve download da base oficial, validação do leiaute atual ou consulta a registros reais. Nenhum sindicato fictício foi publicado como entidade oficial; a base começa com os cadastros do usuário.

Links disponibilizados na tela:

- Entidades sindicais no MTE: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/relacoes-do-trabalho/entidades-sindicais
- Consulta pública CNES: https://www3.mte.gov.br/sistemas/cnes/cons_sindical.asp

São atalhos para as ferramentas externas; o Nexopen não contorna autenticação, CAPTCHA ou bloqueios, não raspa páginas e não afirma possuir uma API oficial. Os endereços não puderam ser conferidos a partir deste ambiente devido ao bloqueio. Caso o MTE altere um endereço, o caminho principal é o portal https://www.gov.br/trabalho-e-emprego.

## Importar o arquivo obtido no CNES

1. Abra **Consultar CNES** ou **Portal do MTE e base de dados**. Faça a consulta ou obtenha a planilha na ferramenta oficial.
2. No Nexopen, clique em **Importar CNES** e clique em **Selecionar planilha Excel** e escolha XLS, XLSX ou CSV. Exportações HTML/XML salvas como `.xls` também são reconhecidas.
3. A aba e o cabeçalho são procurados automaticamente nas primeiras 25 linhas de cada aba. Confira os campos identificados; a correspondência das colunas continua ajustável. **CNPJ e Denominação** são obrigatórios. O leiaute oficial vigente não é presumido.
4. Clique em **Cadastrar N sindicatos**. O sistema salva os registros válidos e volta à lista de sindicatos.
5. Se precisar corrigir a detecção, abra **Ajustes avançados: aba e colunas**. A data de referência é opcional; sem ela, permanece vazia. Não é exigida declaração de origem para importar uma planilha de teste.

Linhas com CNPJ repetido no próprio arquivo ficam todas para revisão. CNPJ já cadastrado é preservado, sem substituir alterações locais. Linhas com dados inválidos não são gravadas. A gravação verifica novamente os CNPJs atuais para evitar duplicidade com outra aba. A operação é atômica no armazenamento atual e gera histórico de importação.

Nome do arquivo, hash SHA-256, data de referência e data de importação ficam associados aos registros. O arquivo original não é armazenado. Tipo e representação sem correspondência com as opções internas ficam como **Não informado**, preservando o texto original nos dados de origem. A situação CNES é mantida como texto, sem conversão automática para situação interna.

Há um **Modelo CSV** com cabeçalho para organizar uma exportação. Ele é um modelo do Nexopen e não é anunciado como leiaute oficial do MTE.

## Limites e segurança da leitura

- Excel e CSV: até **20 MB** de arquivo. A leitura atual é feita no navegador, sem enviar a planilha à função Python ou depender dos limites da Vercel para upload/conversão.
- Excel é processado em um **Web Worker**, mantendo a tela responsiva e com prazo máximo de 45 segundos. O leitor reconhece XLS binário, XLSX, HTML e XML Spreadsheet 2003 exportados como XLS. Páginas de login/erro sem tabela não são aceitas como Excel.
- XLSX: até 64 MB de dados descompactados e 2.000 componentes. Arquivos protegidos ou excessivos são recusados antes da leitura completa. Macros, scripts HTML, links externos e fórmulas não são executados. Fórmulas/erros são sinalizados para revisão.
- Até 12 abas, 50.000 linhas de dados, 80 colunas e 1,2 milhão de células. O limite total de registros operacionais do escritório continua em 50.000 itens.
- CSV: UTF-8 ou Windows-1252, com vírgula, ponto e vírgula ou tabulação. Linhas vazias são preservadas para a numeração de revisão.
- A seleção mostra nome do arquivo e resultado da leitura. É possível corrigir um arquivo e selecioná-lo novamente com o mesmo nome. Leituras pendentes são canceladas ao sair da tela.

O catálogo usa o estado operacional existente: IndexedDB na demonstração ou Supabase isolado por escritório quando configurado. Não há nova migração SQL. Backup e trilha de operações incluem os cadastros. A integração com um Supabase de produção e a publicação efetiva na Vercel devem ser validadas na instalação; os testes locais usam dados sintéticos.

## Desenvolvimento

A interface atual não precisa de Python para importar sindicatos. O leitor é `@e965/xlsx` 0.20.3 (SheetJS CE, distribuição npm, Apache-2.0), fixado no lockfile, executado localmente no worker. A licença está em `public/vendor/sheetjs-license.txt`.

A API Python `/api/union_import` e o adaptador Vite anteriores foram mantidos para compatibilidade com versões anteriores, com seus limites de 4 MB; a interface atual não chama essa API. Dependências Python continuam necessárias para essa API legada e para a importação antiga de empresas.

Validação desta correção: testes unitários do leitor e testes de navegador Chromium com seleção real de arquivo, API desabilitada, salvamento e reimportação. Não foi possível instalar WebKit neste ambiente: os downloads oficiais retornaram HTTP 403. Portanto, não se afirma uma validação direta no Safari. O controle de arquivo é um input nativo sobre o botão visível, sem abertura por efeito assíncrono.

Verificações:

```bash
npm run typecheck
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run export:preview
NEXO_TEST_PREVIEW=1 npm run test:e2e
```
