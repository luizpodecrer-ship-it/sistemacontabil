# Cargos e consulta CBO

Acesse **Visão geral → Cargos**, escolha a empresa e clique em **Novo cargo**. O código é sugerido por empresa e pode ser editado; não se repete na mesma empresa. Descrição, CBO e status são obrigatórios. O mesmo código e a mesma ocupação podem ser usados por empresas distintas.

O cadastro oferece identificação eSocial, tipo, vagas, situação, dados de lei quando aplicáveis, acumulação, tempo especial, dedicação exclusiva, unidade orçamentária, atividades, requisitos e referências salariais por vigência. Os campos legais ficam agrupados em uma seção expansível. É possível editar e inativar o cargo; não há exclusão destrutiva. A consulta da CBO preenche a descrição apenas quando ela está vazia, preservando nomes internos já informados.

Os registros usam o armazenamento operacional existente: IndexedDB na demonstração, ou estado operacional do escritório autenticado no Supabase. Participam do backup e da trilha de operações existentes. A numeração é validada novamente ao salvar e revisões concorrentes são rejeitadas. Nenhuma nova migração é necessária. A persistência Supabase segue as permissões e limites da instalação atual; a integração em produção não foi executada nesta alteração.

## Base disponível e limite de atualização

A consulta contém todas as **2.693 ocupações** da cópia pública `@nit-sst/cboservice@1.0.2`, publicada em **08/08/2023**, incluindo códigos com zeros iniciais. A interface identifica a edição e informa que sua atualidade oficial ainda não foi conferida. Não é consulta em tempo real nem há sincronização automática com o governo. O portal oficial foi inacessível no ambiente de desenvolvimento (HTTP 403).

Busca por código com ou sem hífen, título sem diferenciação de acentos/maiúsculas, sinônimos, filtros por grande grupo e família, ordenação por código/descrição e páginas de 50 resultados permitem percorrer a base inteira. A classificação não determina piso salarial, convenção aplicável, direito a acumulação ou enquadramento legal. O histórico salarial do cargo é informativo e não altera automaticamente salários de colaboradores. O formulário de colaboradores existente permanece independente nesta entrega.

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
