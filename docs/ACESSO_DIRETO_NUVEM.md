# Escritório de testes na nuvem, sem cadastro pessoal

A Vercel serve o Nexopen e a API privada `/api/cloud`. O Supabase guarda empresas, sindicatos, cargos, colaboradores, movimentos, anexos e identidades visuais. Para esta fase existe **um escritório compartilhado de testes**, aberto por link privado, sem digitar usuário, e-mail ou senha. Este modo não substitui o futuro controle de acesso individual de uma equipe.

## Ativar na instalação existente

1. No projeto **nexopen** do Supabase, abra **SQL Editor → New query**. Execute o conteúdo completo de [`008_direct_cloud_test.sql`](../supabase/migrations/008_direct_cloud_test.sql). Ele exige as atualizações 001 a 007 já aplicadas. Não reaplique a 001 sobre tabelas existentes.
2. No Supabase, abra **Project Settings → API Keys**. Na seção **Secret keys**, crie/copie uma chave que começa com `sb_secret_`. A alternativa legada é `service_role` em **Legacy API Keys**. Esta chave é exclusiva do servidor. A chave `sb_publishable_` não serve para esta operação.
3. Na Vercel, abra **sistemacontabil → Settings → Environments → Production → Environment Variables → Add Environment Variable** e salve:

   | Nome | Tipo | Valor |
   |---|---|---|
   | `SUPABASE_URL` | Config | `https://exbdbtfqvdhrzexuezki.supabase.co` |
   | `SUPABASE_SECRET_KEY` | Secret | A chave privada do mesmo projeto Supabase |
   | `NEXOPEN_TEST_ACCESS_KEY` | Secret | Uma chave aleatória privada de 32 a 128 caracteres, usando letras, números, `_` ou `-` |

   Gere a chave do link em um gerenciador de senhas ou localmente com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`. Guarde-a no gerenciador. Não use os valores fictícios dos testes automatizados.

   **Não coloque a chave privada em nenhuma variável `VITE_`, no GitHub, em mensagens ou capturas de tela.** As antigas variáveis públicas `VITE_SUPABASE_*` não são usadas para autenticar este modo. `SUPABASE_URL` também aceita a URL pública já configurada como alternativa, mas é recomendável manter o nome explícito acima. Se houver `NEXOPEN_ACCESS_MODE=accounts`, remova-o para ativar o acesso direto.
4. Abra **Deployments** na Vercel e faça **Redeploy** da versão que contém esta atualização. Aguarde **Ready**. Salvar variáveis sem republicar não atualiza a instalação.
5. Abra e guarde como favorito o endereço abaixo, substituindo `SUA_CHAVE_PRIVADA` pela chave que você criou no passo 3:

   ```text
   https://sistemacontabil-phi.vercel.app/#test_access=SUA_CHAVE_PRIVADA
   ```

   O link autoriza acesso ao escritório inteiro. Compartilhe somente com quem participa dos testes. O endereço comum, sem o link ou uma sessão já aberta, não permite consultar dados. O segredo do fragmento é retirado da barra após abrir a sessão. O navegador conserva somente a autorização temporária em cookie HttpOnly, por oito horas. Ao expirar ou sair, reabra o favorito.

Não é necessário cadastrar uma conta pessoal nem receber confirmação de e-mail. No primeiro acesso, **o servidor** cria uma identidade técnica confirmada e o escritório exclusivo de testes usando a API administrativa oficial. Ela recebe permissão de personalização para permitir testar a identidade do sistema. Senha técnica, tokens Supabase e chave administrativa nunca chegam ao navegador. O provedor de senha do Supabase deve estar habilitado; a confirmação de e-mail e o cadastro público podem continuar como estão.

## Importar os cadastros que estavam no navegador

1. Guarde o backup completo já exportado do ambiente antigo. A ativação da nuvem não lê nem apaga as cópias do ambiente anterior.
2. Entre pelo link privado e abra **Configurações → Backup e recuperação**.
3. Em **Importar backup para a nuvem**, clique em **Selecionar backup JSON**, escolha o arquivo e confirme a quantidade de empresas/registros.
4. Aguarde **“Backup importado. Os dados estão salvos na nuvem.”**. As empresas e todos os módulos são gravados juntos; anexos são enviados ao bucket privado. A importação exige um escritório vazio e recusa substituir cadastros. Portanto, importe antes de começar a cadastrar novos registros.
5. Se o backup contiver identidades visuais, a opção marcada também as importa. Se já personalizou o sistema na nuvem, desmarque essa opção para importar somente os cadastros. Backups antigos podem não conter os textos/logos: nesse caso use a importação de identidade em **Identidade do sistema** ou refaça a personalização uma vez.
6. Reabra o link em outro navegador/dispositivo. Confira empresas, sindicatos, cargos, anexos e identidade visual. Após importar uma identidade, recarregue a página para aplicar os textos/logos do shell.

O backup JSON pode ter até 100 MB; cada arquivo pode ter até 30 MB. Dados JSON descomprimidos enviados à API podem ter até 40 MB. Arquivos são enviados/baixados em partes de 2 MB; snapshots grandes são comprimidos e, se necessário, transferidos em partes pelo armazenamento privado. Isso evita depender do limite de corpo de uma função Vercel para todo o backup.

## Persistência, acesso e falhas

- No acesso direto, a aplicação não usa `localStorage`, `sessionStorage` ou IndexedDB para cadastros, configurações, anexos ou seleção de empresa. A seleção de empresa/competência é temporária em memória e pode ser refeita ao abrir outro dispositivo. O navegador precisa receber dados em memória para exibi-los, mas não conserva uma cópia local da operação.
- Falhas de banco, arquivo, sessão ou API exibem erro e nunca mudam silenciosamente para o modo local. A versão HTML baixável continua sendo uma prévia local independente; use o site publicado para os testes em nuvem.
- A API aceita somente as operações implementadas. O cookie é HttpOnly, SameSite=Strict e Secure na Vercel. Escritas exigem a mesma origem. Credenciais do Supabase ficam no servidor; as operações de negócio usam a sessão da identidade proprietária e as políticas existentes de isolamento. O bucket continua privado.
- Trocar `NEXOPEN_TEST_ACCESS_KEY` e republicar invalida as sessões antigas. O novo link mantém o mesmo UUID e os dados; a autorização técnica é renovada automaticamente. Não exclua o usuário técnico no Supabase, pois ele é proprietário dos registros.
- Envios interrompidos podem deixar partes privadas temporárias em `workspace-files/<id>/_parts/` ou `_transport/`. Esses objetos não representam cadastros importados. Não remova arquivos finais ou dados do escritório para corrigir uma importação.
- Para retomar o login individual futuramente, o código anterior continua disponível com `NEXOPEN_ACCESS_MODE=accounts` e as variáveis públicas do modo de contas. Isso não transfere automaticamente o escritório compartilhado para contas novas.

## Verificação técnica

`npm run typecheck`, `npm test`, `npx playwright test --config playwright.direct.config.ts`, `npx playwright test --config playwright.cloud.config.ts` e `npm run export:preview` verificam o código localmente. Os testes usam PostgreSQL PGlite, SDK Supabase real contra serviço simulado e dois contextos de navegador com armazenamento local bloqueado. Não comprovam que a chave, migração e publicação do projeto real estão configuradas: isso exige a conferência do passo 6 na instalação publicada.
