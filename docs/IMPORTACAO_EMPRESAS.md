# Importação de empresas

Na página Empresas, clique em **Importar empresas**, selecione o relatório `.xls`, confira o resumo e clique em **Importar N cadastros**. Um JSON preparado no formato `nexo-company-import-v1` também pode ser usado; nesse caso a leitura é feita no navegador.

O XLS deve conter uma única aba e estas sete colunas, nesta ordem:
Código, Razão Social, Tipo Insc., Inscrição, Status, Data Inativação, CNAE Preponderante.

- Novos registros ficam como Rascunho, mantendo código, CPF/CNPJ, nome, status, data e CNAE preponderante. Não são inferidos regime tributário, CNAE principal ou situação na Receita.
- Todas as linhas de uma inscrição repetida na mesma planilha ficam fora da importação, para revisão. As linhas e os códigos são mostrados no relatório.
- Cadastros existentes são encontrados pela inscrição. Somente campos vazios são complementados; códigos diferentes ficam registrados como alternativos. Reimportar o mesmo arquivo não duplica os cadastros.
- O lote é gravado em uma transação. No modo local, os dados ficam no IndexedDB do navegador usado na importação. Não são sincronizados com outro navegador.
- Nenhuma carteira de clientes é incluída no código ou no HTML de demonstração.

## Leitura do XLS na Vercel

`api/company_import.py` usa o runtime Python da Vercel e `requirements.txt` instala xlrd. A API recebe até 4 MB, lê em memória, retorna JSON e não persiste nem registra o conteúdo da planilha. Não executa macros. Funciona após o deploy; o servidor de desenvolvimento Vite sozinho não executa Python. No desenvolvimento, use o JSON preparado ou execute o handler com um servidor HTTP Python local.

## Banco em nuvem opcional

Instalações que já configuraram Supabase precisam aplicar também `supabase/migrations/003_import_companies.sql` no SQL Editor, depois das migrações 001 e 002. Essa função importa o lote na mesma transação, respeitando o escritório autenticado e as revisões dos registros. No modo local essa migração não é necessária.

## Verificação

`npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e` validam tipos, regras de importação, rollback no banco e navegação com persistência local. O teste do navegador intercepta a conversão XLS com dados sintéticos, e também verifica a leitura de JSON. O leitor Python tem testes separados: `python -m pip install -r requirements.txt` e `python -m unittest discover -s tests -p 'test_*.py'`. O XLS de teste contém somente dados sintéticos.
