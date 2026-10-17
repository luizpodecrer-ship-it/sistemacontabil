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
2. No Nexopen, clique em **Importar CNES** e selecione XLS, XLSX ou CSV.
3. Confira aba e linha de cabeçalho. A aplicação sugere nomes de colunas comuns, mas permite ajustar a correspondência. **CNPJ e Denominação** são obrigatórios. O leiaute oficial vigente não é presumido.
4. Informe a **data de referência do arquivo**. Confira a prévia dos novos registros e as linhas separadas para revisão.
5. Confirme origem/revisão e clique em **Importar N sindicatos**.

Linhas com CNPJ repetido no próprio arquivo ficam todas para revisão. CNPJ já cadastrado é preservado, sem substituir alterações locais. Linhas com dados inválidos não são gravadas. A gravação verifica novamente os CNPJs atuais para evitar duplicidade com outra aba. A operação é atômica no armazenamento atual e gera histórico de importação.

Nome do arquivo, hash SHA-256, data de referência e data de importação ficam associados aos registros. O arquivo original não é armazenado. Tipo e representação sem correspondência com as opções internas ficam como **Não informado**, preservando o texto original nos dados de origem. A situação CNES é mantida como texto, sem conversão automática para situação interna.

Há um **Modelo CSV** com cabeçalho para organizar uma exportação. Ele é um modelo do Nexopen e não é anunciado como leiaute oficial do MTE.

## Limites e segurança da leitura

- XLS/XLSX: até 4 MB de arquivo e de resposta convertida, para compatibilidade com a função hospedada. Arquivos maiores devem ser exportados como CSV.
- CSV: até 20 MB, lido no navegador, UTF-8 ou Windows-1252, com vírgula, ponto e vírgula ou tabulação.
- Até 12 abas, 50.000 linhas de dados, 80 colunas e 1,2 milhão de células. Os registros operacionais do escritório têm limite total de 50.000 itens. Essas condições podem exigir selecionar uma parte da base antes da importação.
- XLS/XLSX são enviados somente ao leitor do próprio aplicativo. A leitura é em memória, sem logs do conteúdo e sem executar macros. XLSX usa XML protegido, limites de descompressão e não segue links externos. Fórmulas/erros em XLSX são sinalizados para revisão, não calculados. O XLS binário usa os valores armazenados, sem recalcular fórmulas.
- CSV não executa fórmulas; prévias são renderizadas como texto. A importação não busca nem envia registros ao CNES.

O catálogo usa o estado operacional existente: IndexedDB na demonstração ou Supabase isolado por escritório quando configurado. Não há nova migração SQL. Backup e trilha de operações incluem os cadastros. A integração com um Supabase de produção e a publicação efetiva na Vercel devem ser validadas na instalação; os testes locais usam dados sintéticos.

## Desenvolvimento

Para a leitura de Excel local, além das dependências Node:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run dev
```

O Vite usa `.venv/bin/python` quando disponível e aceita `NEXO_PYTHON` para outro executável. Tanto desenvolvimento quanto `npm run preview` oferecem `/api/union_import`. Na Vercel, a função Python usa `requirements.txt`. O HTML independente permite CSV; Excel exige o aplicativo servido com a API.

Verificações:

```bash
npm run typecheck
npm test
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run export:preview
NEXO_TEST_PREVIEW=1 npm run test:e2e
```
