# Conectar o sistema ao banco e login reais

A Netlify ou a Vercel hospeda o site. Para contas e dados compartilhados, o código também precisa de um serviço de banco, autenticação e arquivos. O projeto já possui um adaptador opcional para Supabase. A ativação ainda depende de criar/configurar esse serviço e executar a validação no ambiente real. Até lá, o site continua no modo local.

## 1. Criar o projeto

1. Acesse https://supabase.com e entre com sua conta.
2. Crie uma organização, se solicitado, e clique em New project.
3. Use um nome como `sistemacontabil`. Escolha a região de hospedagem de acordo com a política do negócio e disponibilidade do provedor.
4. Crie uma senha forte para o banco e guarde-a no seu gerenciador de senhas. Não envie a senha pelo chat.
5. Aguarde o projeto ficar disponível.

## 2. Instalar a estrutura do banco

O responsável técnico deve revisar `supabase/migrations/001_workspace.sql` e executar o arquivo completo no SQL Editor de um projeto novo, seguido de `supabase/migrations/002_company_person_type.sql` e `supabase/migrations/003_import_companies.sql`, depois `supabase/migrations/004_branding.sql`, `supabase/migrations/005_login_branding.sql` e `supabase/migrations/006_login_branding_sides.sql`, seguidas de `supabase/migrations/007_menu_logo_size.sql`. Execute apenas as migrações ainda não aplicadas: a 002 habilita CPF e a 003 habilita importação de empresas em lote e a 004 separa a identidade visual do escritório e da plataforma. A atribuição do administrador da plataforma está descrita em [IDENTIDADE_VISUAL.md](IDENTIDADE_VISUAL.md). O arquivo cria tabelas, funções, políticas de isolamento e um bucket privado. Não execute sobre um banco existente sem revisar conflitos. As políticas são destinadas ao primeiro modo de nuvem, com uma conta proprietária por escritório. Não representam o modelo final de equipe/cliente/empregado.

## 3. Configurar autenticação por nome de usuário

O Nexopen solicita somente **nome de usuário e senha**, tanto na entrada quanto na criação de conta. Não pede e-mail pessoal e não envia confirmação ou recuperação por e-mail. O provedor de senha do Supabase é mantido; cada usuário é representado internamente por um identificador técnico no domínio reservado `users.nexopen.invalid`, sem entrega de mensagens. Não se trata de autenticação local: sessões, senhas e isolamento por UUID continuam no Supabase.

No Supabase, abra **Authentication → Sign In / Providers** (em versões anteriores, **Providers → Email**):

- mantenha o provedor **Email** habilitado, pois é o provedor de senha usado internamente;
- para permitir criar contas pela interface, habilite **Allow new users to sign up**;
- desabilite **Confirm email** e salve. Esta instalação passou a usar usuários sem e-mail real, então a confirmação não faz parte desse modelo de acesso. Antes da mudança, revise eventuais outros aplicativos que compartilhem o mesmo projeto Supabase.

Antes de cadastrar, a interface verifica `/auth/v1/settings` com a chave pública. Se `mailer_autoconfirm` não for `true` ou o cadastro estiver desativado, informa que a instalação precisa ser configurada e não cria uma conta pendente nem dispara e-mail. O backend continua validando unicidade, senha e autenticação. Uma conta recém-criada não recebe automaticamente permissão administrativa.

Em **Authentication → URL Configuration**, mantenha **Site URL** e **Redirect URLs** com o endereço publicado, por exemplo `https://nexopen.netlify.app`. Isso também preserva a configuração de eventuais links legados; a nova interface não inicia recuperação por e-mail.

O usuário usa de 3 a 32 caracteres ASCII: letras sem acentos, números, ponto, hífen ou sublinhado, começando e terminando com letra/número. Espaços nas extremidades e maiúsculas são normalizados; `Luiz.Queiroz` e `luiz.queiroz` são o mesmo usuário. Nomes diferentes não se tornam o mesmo identificador por regras de ponto ou hífen de provedores de e-mail. A senha de criação deve ter pelo menos 12 caracteres e também cumprir as políticas configuradas no Supabase.

### Contas anteriores criadas com e-mail

Uma conta antiga não ganha um nome de usuário automaticamente. Não crie outra conta para tentar recuperar os dados dessa conta: isso produziria outro UUID e outro escritório. Um operador confiável pode associar um nome mantendo o UUID, a senha, o escritório e as permissões:

```sh
npx tsx scripts/assign-username.ts UUID-DA-CONTA luiz.queiroz
```

O comando requer `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente administrativo seguro. Essa chave nunca vai ao navegador, ao repositório, ao chat nem a uma variável `VITE_`. O utilitário chama a API administrativa oficial para atualizar o identificador da conta e confirmar o acesso; não escreve diretamente nas tabelas internas de autenticação e não recebe nem altera a senha. Confira o UUID em **Authentication → Users** e use a ferramenta apenas para a conta autorizada. O nome fica também em `user_metadata.username` para identificação, mas permissões continuam baseadas em UUID e nas políticas existentes, nunca nesse metadado.

Para um ambiente novo e vazio, depois de configurar o Supabase basta abrir **Criar conta** no Nexopen, escolher o usuário e a senha e entrar. Para recuperar senha sem e-mail, a tela orienta procurar o administrador. A redefinição deve ocorrer por administração confiável com verificação do titular; não há redefinição pública sem verificação, senha padrão ou promoção automática da primeira conta. A primeira conta administradora da identidade visual continua sendo provisionada pelo UUID conforme [IDENTIDADE_VISUAL.md](IDENTIDADE_VISUAL.md).

Google e MFA ainda não fazem parte do fluxo implementado em nuvem. Não configure credenciais de terceiros como se esses recursos já estivessem ativos.

## 4. Informar as configurações na hospedagem

No Supabase, localize a URL do projeto e a chave **publishable** (ou a chave legada **anon**, conforme a tela do provedor). Na Netlify, abra **Project configuration → Environment variables**. Na Vercel, abra **Settings → Environment Variables**. Adicione:

| Nome | Conteúdo |
|---|---|
| `VITE_SUPABASE_URL` | URL HTTPS do seu projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública publishable/anon |

Esses dois valores fazem parte do frontend; **nunca use `service_role`, secret key, senha do banco ou token administrativo em variáveis `VITE_`**. Informe valores somente nos campos de configuração apropriados, sem publicá-los no repositório. Se apenas uma variável for preenchida, o modo em nuvem não será ativado. Na Netlify, as variáveis precisam estar disponíveis no escopo **Builds** e no contexto **Production**; **All scopes** inclui esse escopo. Depois de salvar ambas e instalar o SQL, publique um novo build: **Deploys → Trigger deploy → Deploy site** na Netlify ou **Redeploy** na Vercel. O projeto usa Node 24, comando `npm run build` e diretório de publicação `dist`.

### Diagnosticar o primeiro acesso

O acesso direto da demonstração não cria uma conta em `Authentication → Users`. Na instalação em nuvem, entre com um usuário cadastrado no novo formato ou associado à conta anterior pela ferramenta administrativa. A senha do Nexopen é independente da senha do banco e da conta usada no painel do Supabase.

- **Nome de usuário ou senha inválidos:** confira o nome e a senha. Confirme se a conta está no mesmo projeto Supabase indicado por `VITE_SUPABASE_URL` na versão publicada.
- **Conta ainda não liberada / cadastro por usuário não habilitado:** revise a configuração de autenticação descrita acima. A interface não pede que um usuário sem e-mail confirme uma mensagem.
- **Serviço de acesso não configurado corretamente:** confira se a URL e a chave pública pertencem ao mesmo projeto e gere um novo build.
- **Limite de tentativas:** aguarde o intervalo do serviço antes de tentar novamente.

Os erros são traduzidos por códigos conhecidos ou mensagens legadas explicitamente reconhecidas, sem mostrar mensagens internas, chaves ou identificadores de outras contas. Uma falha ao abrir a sessão libera novamente o formulário, em vez de deixá-lo preso em “Aguarde…”. A permissão de administrador da identidade visual é separada do login; concedê-la não corrige senha ou liberação da conta.

## 5. Homologar antes de usar dados reais

1. Abra o site. Ele deve mostrar acesso autenticado, e não o botão “Explorar a prévia”.
2. Crie uma conta com nome de usuário de teste e senha, sem informar e-mail. Confira a entrada imediata e a persistência da sessão ao recarregar.
3. Cadastre uma empresa de teste e um documento. Saia pelo botão do perfil e entre novamente.
4. Acesse em outro navegador/computador com a mesma conta e confira os dados.
5. Crie uma segunda conta e confirme que não consegue ler empresas, movimentos ou arquivos da primeira, inclusive por acesso direto às APIs.
6. Teste o procedimento administrativo de recuperação de senha, concorrência entre abas, indisponibilidade de rede e download de anexos.
7. Execute a jornada de fechamento e valide com o responsável técnico/contábil. Amplie a matriz de testes de autorização antes de convidar outras pessoas.

As empresas e arquivos locais anteriores não são transferidos automaticamente ao conectar Supabase. O backup pode exportá-los, mas a restauração implementada neste momento é apenas local e em instalação vazia; a migração para nuvem exige um fluxo técnico próprio.
