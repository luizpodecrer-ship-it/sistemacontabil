# Identidade do escritório e administração da plataforma

## Onde personalizar

- **Personalização**: nome, logo, cor e endereço ilustrativo do escritório.
- **Administração → Identidade do sistema**: nome e logo da plataforma, ícone do menu recolhido e favicon da aba do navegador. A marca do escritório não é substituída.

O logo aparece sem cortes ou distorção, com prévia ampliada e fundo quadriculado para conferir transparência. O botão de envio é compacto. Há opção branca na paleta; o texto da prévia alterna para grafite quando o fundo exige contraste.

Escolha o limite antes de enviar:

| Uso | Limite de dimensões | Arquivo |
|---|---|---|
| Logo quadrado | até 500 × 500 px | PNG, JPG ou WebP, até 1 MB |
| Logo horizontal | até 500 × 250 px | PNG, JPG ou WebP, até 1 MB |
| Ícone do sistema | largura igual à altura, até 500 × 500 px | PNG, JPG ou WebP, até 1 MB |

Os dois formatos de logo definem a área máxima e a prévia; imagens menores mantêm sua proporção original. Imagens acima do limite são recusadas com as dimensões encontradas. A aplicação não estica nem corta a imagem. PNG transparente mantém a transparência. Os arquivos são decodificados no navegador e regravados como PNG; SVG não é aceito. A versão convertida também tem limite de 2 MB. Trocar o formato remove o logo da prévia após confirmação, para permitir novo envio.

## Modo atual de demonstração

Sem variáveis Supabase, escritório e plataforma são salvos separadamente neste navegador, nas chaves `nexo-brand` e `nexo-platform-brand`. O cadastro anterior do escritório é preservado. A administração fica disponível como demonstração local e informa essa limitação. Não representa autenticação administrativa e não altera a marca para outros visitantes ou dispositivos.

A marca do sistema é aplicada ao menu expandido, ao menu recolhido, à entrada local, ao título da aba e ao favicon. O ícone deve ser enviado separadamente do logo. A cor de destaque também tem prévia própria. No modo com autenticação a tela de entrada usa a marca pública do sistema, carregada do banco.

## Ativar administração autenticada e persistência compartilhada

Esta etapa é para uma instalação com Supabase, descrita em [CONFIGURAR_NUVEM.md](CONFIGURAR_NUVEM.md). Não é preciso executá-la para analisar a prévia local.

1. No Supabase, abra **SQL Editor**.
2. Depois das migrações anteriores, execute o conteúdo completo de `supabase/migrations/004_branding.sql`.
3. Em **Authentication → Users**, localize a conta que administrará a plataforma e copie seu UUID. Não é o e-mail nem uma senha.
4. Um administrador confiável do banco deve executar, substituindo o UUID de exemplo pelo UUID dessa conta:

```sql
insert into public.platform_admins(user_id)
values ('UUID-DA-CONTA-ADMINISTRADORA')
on conflict do nothing;
```

5. Entre novamente no sistema com essa conta. O menu **Administração → Identidade do sistema** aparecerá.
6. Envie o logo e o ícone e salve. A configuração do sistema será compartilhada com as instalações conectadas ao mesmo banco; cada escritório mantém a própria configuração.

Não existe cadastro público de administrador, promoção automática da primeira conta ou escolha de permissão no navegador. A lista de administradores só pode ser alterada pela administração confiável do banco.

## Permissões e validação

A marca do sistema tem leitura pública limitada aos dados de apresentação, necessária antes do login. Escrita exige `auth.uid()` registrado em `platform_admins`, validado no servidor. As tabelas não têm gravação direta concedida a usuários do aplicativo. O servidor valida campos, PNG, dimensões, ícone quadrado e revisão concorrente. Salvamentos geram auditoria.

A configuração do escritório usa o escritório proprietário da sessão autenticada, sem aceitar um identificador de outro escritório enviado pelo cliente. Não usa o localStorage como fonte em modo nuvem. Alterações concorrentes não sobrescrevem silenciosamente a revisão anterior.

Verificações: testes PostgreSQL com PGlite para permissões, isolamento e concorrência; testes de limites/contraste; testes de navegador para upload, branco, persistência, menu, favicon e responsividade. A integração com um Supabase de produção não foi executada neste ambiente.

## Personalizar a área de login

Em **Administração → Identidade do sistema → Personalizar área de login**, edite título e subtítulo do formulário, botão de entrada, destaque e título do painel lateral, descrição e textos de rodapé. É possível enviar um logo exclusivo para a entrada, nos mesmos limites de imagem. Sem logo próprio, será utilizado o logo do sistema e, na falta dele, o ícone ou nome. A edição mostra uma prévia antes de salvar.

O fundo do ícone do menu e o fundo do logo da entrada são independentes da imagem. O padrão é branco, corrigindo a exibição de símbolos pretos transparentes. Para uma marca branca, escolha fundo escuro. O painel lateral também tem cor própria, com contraste do texto ajustado automaticamente. As imagens mantêm proporção e não recebem filtros ou recortes.

Os links “Ver Dot Pattern” e “Ver Dock” foram removidos da interface; os componentes de demonstração não foram apagados. A personalização altera a apresentação da entrada, preservando a autenticação e as mensagens obrigatórias da demonstração.

Instalações com Supabase precisam aplicar também **`supabase/migrations/005_login_branding.sql`**, após a 004. A migração mantém a permissão administrativa, valida os novos textos/cores/logos e preserva campos de login quando um cliente anterior salva apenas a marca principal. A interface confere a versão suportada antes de enviar uma alteração global; sem a atualização 005, não informa que os novos campos foram salvos.
