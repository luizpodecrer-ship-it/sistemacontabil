# Cargos e consulta CBO

Acesse **Cargos** no menu lateral, imediatamente abaixo de **Visão geral**. O catálogo é compartilhado entre as empresas do mesmo escritório e pode ser cadastrado antes de criar empresas. Não depende de empresa ou competência selecionada. Não é compartilhado entre escritórios de clientes distintos do SaaS.

O código interno é sugerido e único no catálogo do escritório. Descrição, CBO e status são obrigatórios. É possível criar diferentes cargos internos com a mesma ocupação CBO. Os demais campos continuam disponíveis: identificação eSocial, tipo, vagas de referência, dados legais, atividades, requisitos e referências salariais por vigência.

## Segmentos e seleção no colaborador

No cargo, marque um ou mais **Segmentos de aplicação**. Sem marcação, ele será sugerido em todos os segmentos. São usadas as 21 seções da CNAE como agrupamento organizacional. Essa marcação é feita pelo usuário; a aplicação não inventa uma tabela oficial de equivalência obrigatória entre CNAE e CBO.

Dentro de **Empresas → cadastro da empresa → Colaboradores → Contrato e remuneração**, ou em **Pessoal e vínculos**, o campo Cargo consulta os cargos ativos do catálogo. O usuário pode buscar por nome, código ou CBO. A seleção preenche automaticamente o CBO e grava o identificador do cargo no vínculo. O CBO é exibido somente para leitura. A opção **Atualizar lista de cargos** recarrega o catálogo sem descartar o formulário.

A sugestão considera os CNAEs das atividades cadastradas e vigentes da empresa. Na ausência de atividades, usa o CNAE preponderante informado como referência de segmento. Cargos comuns a todos os segmentos também aparecem. É possível mudar o filtro para **Todos os segmentos** ou selecionar um segmento manualmente; o filtro não é uma restrição legal. Sem CNAE identificável, são exibidos todos os cargos ativos.

Novos vínculos concluídos devem selecionar um cargo do catálogo. Rascunhos podem ser salvos antes dessa seleção. Vínculos antigos com texto livre preservam seus dados até a substituição explícita por um cargo cadastrado. Inativar um cargo impede novas seleções, preservando colaboradores já vinculados. Alterar a descrição ou o CBO do catálogo não reescreve silenciosamente os dados históricos dos colaboradores; uma nova seleção confere os dados atuais. Salários contratuais também não são alterados pelo cadastro de cargos.

## Persistência e transição dos cadastros anteriores

Os registros continuam no armazenamento operacional existente: IndexedDB na demonstração ou estado operacional isolado por escritório no Supabase. Participam do backup e da trilha de operações existentes. Nenhuma nova migração SQL é necessária.

Ao carregar os módulos operacionais ou o cadastro de colaboradores, os cargos anteriormente associados a empresas são transferidos automaticamente para o catálogo compartilhado. Todos os identificadores, dados, requisitos e históricos são preservados. Códigos repetidos são renumerados sem excluir registros, mantendo código original e empresa de origem nos campos de rastreabilidade. A transferência é auditada e não se repete após persistida. Registros aparentemente semelhantes não são mesclados automaticamente.

A numeração é revalidada no salvamento, assim como a disponibilidade do cargo e a correspondência de seu CBO ao selecionar no colaborador. Revisões concorrentes continuam protegidas pelo armazenamento operacional. A integração com um Supabase de produção não foi executada nesta alteração.

## Base disponível e limite de atualização

A consulta contém todas as **2.693 ocupações** da cópia pública `@nit-sst/cboservice@1.0.2`, publicada em **08/08/2023**, incluindo códigos com zeros iniciais. A interface identifica a edição e informa que sua atualidade oficial ainda não foi conferida. Não é consulta em tempo real nem há sincronização automática com o governo. O portal oficial foi inacessível no ambiente de desenvolvimento (HTTP 403).

Busca por código com ou sem hífen, título sem diferenciação de acentos/maiúsculas, sinônimos, filtros por grande grupo e família, ordenação por código/descrição e páginas de 50 resultados permitem percorrer a base inteira. A classificação não determina piso salarial, convenção aplicável, direito a acumulação ou enquadramento legal. O histórico salarial do cargo é informativo e não altera automaticamente salários de colaboradores. O formulário de colaboradores usa o catálogo interno para selecionar cargo e CBO.

Fontes e atribuição:

- Portal oficial: https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo
- Títulos e códigos: https://registry.npmjs.org/@nit-sst/cboservice/-/cboservice-1.0.2.tgz — autor `guizombas`, licença ISC. Os dados foram extraídos, sem instalar ou executar o pacote. SHA-256 do JSON de origem consta em `cbo-data.json`.
- Sinônimos e nomes de famílias disponíveis: https://github.com/datasets-br/cbo, commit `92c3bbbf1dbb201530b7058b24f755303a437757`, extração da publicação oficial de 2016, disponibilizada como domínio público. Sinônimos só são associados a códigos presentes na cópia principal. Famílias novas sem título nessa fonte aparecem pelo código.

Licença ISC da fonte de títulos/códigos:

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Atualizar com o arquivo oficial

O responsável técnico deve baixar a tabela **Ocupação** no portal do Ministério, conferir sua edição e executar:

```bash
node scripts/import-cbo.mjs /caminho/CBO2002_OCUPACAO.csv "CBO — edição conferida" "https://endereco-oficial-do-arquivo"
npm run typecheck
npm test
npm run export:preview
```

O importador aceita CSV UTF-8/Windows-1252, separador vírgula/ponto e vírgula e colunas CODIGO/TITULO. Rejeita códigos duplicados, registros inválidos e arquivos com menos de 2.000 ocupações. Gera código, título, contagem, fonte e hash; não marca atualização automática como verificada. Não conserva sinônimos antigos na substituição. Conferir diferenças, ajustar o teste da edição/contagem e revisar os cargos cujo código deixou a nova base antes da publicação. Não apaga ou modifica cargos salvos. O script permite um quarto argumento para gerar em outro caminho durante revisão.
