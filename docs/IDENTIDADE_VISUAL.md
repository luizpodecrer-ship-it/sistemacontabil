# Identidade do escritório e administração da plataforma

> Para os testes atuais sem cadastro, use [Acesso direto na nuvem](ACESSO_DIRETO_NUVEM.md). A atualização 008 provisiona uma identidade técnica administradora exclusiva do escritório de testes; não promove uma conta pessoal ou a primeira conta pública. A personalização nesse modo fica no Supabase. Os procedimentos de conta individual e demonstração local descritos abaixo se aplicam aos respectivos modos.


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

## Transferir os textos e logos para outro endereço

As personalizações locais não acompanham o código enviado ao GitHub e o backup operacional `nexo-backup-v1` não contém a identidade visual. Para levar a apresentação antiga à Netlify/Supabase:

1. Abra o endereço antigo no navegador em que os textos e logos foram salvos.
2. Entre no sistema e acesse **Configurações → Identidade do sistema → Transferir identidade visual**.
3. Clique em **Exportar identidade**. O JSON inclui a configuração exibida, todos os textos da entrada, logos/ícones PNG, cores, tamanhos e alinhamentos. Não inclui cadastros, senhas, chaves de API ou permissões administrativas.
4. No novo endereço, entre com uma conta administradora da plataforma, provisionada conforme a próxima seção. Acesse **Configurações → Identidade do sistema**, clique em **Importar identidade**, selecione o JSON e confira a prévia.
5. Clique em **Salvar identidade do sistema**. Somente esse salvamento grava a apresentação no Supabase para os visitantes da mesma instalação. A importação não concede permissões nem promove a conta.

Para o nome/logo/cor do escritório, repita em **Configurações → Personalização do escritório**. Os arquivos são separados por tipo; uma identidade de escritório não pode substituir a identidade do sistema. A importação limita o JSON a 10 MB, valida campos e imagens e mantém a configuração atual caso haja erro. Configurações incompletas antigas recebem os padrões apenas nos campos novos ausentes. Logos são preservados sem conversão.

Na entrada em nuvem, os textos padrão são exibidos desde a primeira renderização enquanto a apresentação pública é carregada. Se o carregamento falhar, uma mensagem persistente permite tentar novamente, mantendo o painel preenchido. Isso não recupera os textos personalizados que ainda estão apenas no navegador antigo. A personalização é lida do banco; configurações locais nunca são publicadas automaticamente no modo em nuvem.

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

5. Entre novamente no sistema com essa conta. O menu **Configurações → Identidade do sistema** aparecerá.
6. Envie o logo e o ícone e salve. A configuração do sistema será compartilhada com as instalações conectadas ao mesmo banco; cada escritório mantém a própria configuração.

Não existe cadastro público de administrador, promoção automática da primeira conta ou escolha de permissão no navegador. A lista de administradores só pode ser alterada pela administração confiável do banco.

## Permissões e validação

A marca do sistema tem leitura pública limitada aos dados de apresentação, necessária antes do login. Escrita exige `auth.uid()` registrado em `platform_admins`, validado no servidor. As tabelas não têm gravação direta concedida a usuários do aplicativo. O servidor valida campos, PNG, dimensões, ícone quadrado e revisão concorrente. Salvamentos geram auditoria.

A configuração do escritório usa o escritório proprietário da sessão autenticada, sem aceitar um identificador de outro escritório enviado pelo cliente. Não usa o localStorage como fonte em modo nuvem. Alterações concorrentes não sobrescrevem silenciosamente a revisão anterior.

Verificações: testes PostgreSQL com PGlite para permissões, isolamento e concorrência; testes de limites/contraste; testes de navegador para upload, branco, persistência, menu, favicon e responsividade. A integração com um Supabase de produção não foi executada neste ambiente.

## Personalizar a área de login

Em **Administração → Identidade do sistema → Personalizar área de login**, edite os textos e configure cada lado separadamente:

- **Lado esquerdo:** ícone quadrado próprio, até 500 × 500 px. Sem imagem própria, usa apenas o ícone do sistema. Tamanho de exibição de 32 a 160 px.
- **Lado direito:** logo horizontal próprio, até 500 × 250 px. Sem imagem própria, usa o logo do sistema. Tamanho de exibição de 80 a 400 px.
- Cada imagem possui controles de aumentar/diminuir, ajuste deslizante, alinhamento à esquerda, centro ou direita e cor de fundo independente. O fundo do painel direito também é configurável, com contraste automático dos textos.

A prévia acompanha os ajustes antes de salvar. Os limites de tamanho de exibição não alteram os pixels do arquivo enviado: a imagem mantém proporção e transparência, sem cortes ou filtros. O ícone do menu permanece independente. Logos antigos continuam no painel direito; à esquerda não se reutiliza um logo horizontal. No celular, permanece o ícone esquerdo e o painel direito fica oculto.

Os links “Ver Dot Pattern” e “Ver Dock” foram removidos da interface; os componentes de demonstração não foram apagados. A personalização altera a apresentação da entrada, preservando a autenticação e as mensagens obrigatórias da demonstração.

Instalações com Supabase precisam aplicar também **`supabase/migrations/005_login_branding.sql`**, após a 004. A migração mantém a permissão administrativa, valida os novos textos/cores/logos e preserva campos de login quando um cliente anterior salva apenas a marca principal. A interface confere a versão suportada antes de enviar uma alteração global; a versão atual requer também as atualizações 006 e 007 descritas abaixo.

Para os controles independentes, aplique **`supabase/migrations/006_login_branding_sides.sql`** depois da 005. A migração valida tamanhos, alinhamentos, cores e ícone quadrado, preservando os campos omitidos por clientes anteriores. A 006 oferece a versão 3 da função; a interface atual exige a versão 4, disponível na atualização 007. Sem Supabase configurado, estas opções continuam salvas apenas no navegador.

## Tamanho do logo no menu

Em **Identidade do sistema → Tamanho do logo no menu**, os botões +/− e a barra ajustam a altura entre 32 e 112 px. A prévia é imediata; o menu real usa o tamanho após salvar a identidade. O padrão é 64 px, inclusive em cadastros antigos. A imagem mantém a proporção e respeita a largura disponível. O ícone recolhido e os dois elementos do login mantêm suas próprias configurações.

Para persistir o novo campo em Supabase, aplique `supabase/migrations/007_menu_logo_size.sql` após a 006. Ela preserva os ajustes anteriores, valida o limite no servidor e mantém administração e controle de versão concorrente. A interface verifica a versão 4 antes do envio para impedir que um banco antigo descarte o campo silenciosamente. A migração foi testada em PostgreSQL local com PGlite; sua aplicação em um projeto Supabase existente é uma etapa separada. No ambiente local de testes, o ajuste é salvo no navegador.
