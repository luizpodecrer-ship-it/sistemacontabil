# Conectar o sistema ao banco e login reais

A Vercel hospeda o site. Para contas e dados compartilhados, o código também precisa de um serviço de banco, autenticação e arquivos. O projeto já possui um adaptador opcional para Supabase. A ativação ainda depende de criar/configurar esse serviço e executar a validação no ambiente real. Até lá, o site continua no modo local.

## 1. Criar o projeto

1. Acesse https://supabase.com e entre com sua conta.
2. Crie uma organização, se solicitado, e clique em New project.
3. Use um nome como `sistemacontabil`. Escolha a região de hospedagem de acordo com a política do negócio e disponibilidade do provedor.
4. Crie uma senha forte para o banco e guarde-a no seu gerenciador de senhas. Não envie a senha pelo chat.
5. Aguarde o projeto ficar disponível.

## 2. Instalar a estrutura do banco

O responsável técnico deve revisar `supabase/migrations/001_workspace.sql` e executar o arquivo completo no SQL Editor de um projeto novo, seguido de `supabase/migrations/002_company_person_type.sql` e `supabase/migrations/003_import_companies.sql`, depois `supabase/migrations/004_branding.sql`, `supabase/migrations/005_login_branding.sql` e `supabase/migrations/006_login_branding_sides.sql`, seguidas de `supabase/migrations/007_menu_logo_size.sql`. Execute apenas as migrações ainda não aplicadas: a 002 habilita CPF e a 003 habilita importação de empresas em lote e a 004 separa a identidade visual do escritório e da plataforma. A atribuição do administrador da plataforma está descrita em [IDENTIDADE_VISUAL.md](IDENTIDADE_VISUAL.md). O arquivo cria tabelas, funções, políticas de isolamento e um bucket privado. Não execute sobre um banco existente sem revisar conflitos. As políticas são destinadas ao primeiro modo de nuvem, com uma conta proprietária por escritório. Não representam o modelo final de equipe/cliente/empregado.

## 3. Configurar autenticação

Em Authentication → URL Configuration:

- Site URL: `https://sistemacontabil-phi.vercel.app`
- Adicione esse mesmo endereço às Redirect URLs para confirmação e recuperação de senha.
- Em Authentication → Providers, mantenha Email ativo e confirmação de e-mail habilitada. Configure um provedor SMTP adequado antes de produção; os limites do serviço de testes de e-mail não são garantia de entrega.

Google e MFA ainda não fazem parte do fluxo implementado em nuvem. Não configure credenciais de terceiros como se esses recursos já estivessem ativos.

## 4. Informar as configurações na Vercel

No Supabase, localize a URL do projeto e a chave **publishable** (ou a chave legada **anon**, conforme a tela do provedor). No projeto da Vercel, vá a Settings → Environment Variables e adicione:

| Nome | Conteúdo |
|---|---|
| `VITE_SUPABASE_URL` | URL HTTPS do seu projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública publishable/anon |

Esses dois valores fazem parte do frontend; **nunca use `service_role`, secret key, senha do banco ou token administrativo em variáveis `VITE_`**. Informe valores somente nos campos de configuração apropriados, sem publicá-los no repositório. Se apenas uma variável for preenchida, o modo em nuvem não será ativado. Depois de salvar ambas e instalar o SQL, faça Redeploy na Vercel para gerar um novo build.

## 5. Homologar antes de usar dados reais

1. Abra o site. Ele deve mostrar acesso autenticado, e não o botão “Explorar a prévia”.
2. Crie uma conta com e-mail de teste e confirme o e-mail.
3. Cadastre uma empresa de teste e um documento. Saia pelo botão do perfil e entre novamente.
4. Acesse em outro navegador/computador com a mesma conta e confira os dados.
5. Crie uma segunda conta e confirme que não consegue ler empresas, movimentos ou arquivos da primeira, inclusive por acesso direto às APIs.
6. Teste recuperação de senha, concorrência entre abas, indisponibilidade de rede e download de anexos.
7. Execute a jornada de fechamento e valide com o responsável técnico/contábil. Amplie a matriz de testes de autorização antes de convidar outras pessoas.

As empresas e arquivos locais anteriores não são transferidos automaticamente ao conectar Supabase. O backup pode exportá-los, mas a restauração implementada neste momento é apenas local e em instalação vazia; a migração para nuvem exige um fluxo técnico próprio.
