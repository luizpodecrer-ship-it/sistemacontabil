# Nexo · Prévia do sistema contábil

Nome provisório. Primeira prévia visual em português, baseada nas referências fornecidas. Dados fictícios; não há autenticação, cálculo fiscal, envio de documentos ou conexão externa. Não use credenciais reais.

## Desenvolvimento

Requer Node.js 22.12+ (validado com Node 24).

```sh
cd /workspace/sistemacontabil
npm ci --cache /workspace/.npm-cache
npm run dev
```

`npm run build` gera `dist/`. `npm run preview` serve o build.

Explore a prévia pela tela de login, sem preencher credenciais. Menu lateral: dashboard, empresas, tarefas, documentos, integrações e personalização. O perfil no rodapé retorna ao login. Personalização e largura da sidebar persistem no navegador; empresas adicionadas permanecem apenas na sessão em memória. Exportação CSV contém dados demonstrativos.

O catálogo apresenta integrações planejadas. Footer é uma amostra acessível pelo rodapé; site público e Hero aguardam especificação. Próximas etapas: revisão visual, definição de stack de servidor e implementação de autenticação, isolamento por escritório, banco e auditoria.

## Prévia independente

Execute `npm run export:preview` para gerar `Nexo-previa.html` com CSS e JavaScript incluídos. Baixe o arquivo e abra no navegador; não exige servidor nem CDN. Usa os mesmos dados demonstrativos e limitações da aplicação. A persistência local depende das permissões do navegador para arquivos locais.

## React, TypeScript e shadcn

A prévia original em JavaScript permanece; `src/main.tsx` é a entrada React para novos componentes tipados. `components/ui/` é o diretório compartilhado de UI na raiz do projeto, configurado em `components.json`: mantém imports previsíveis e permite ao shadcn CLI adicionar componentes no local correto. O alias `@/` aponta para a raiz em Vite e TypeScript. Estilos globais: `src/style.css` (Tailwind v4); helper `cn`: `lib/utils.ts` (`clsx` + `tailwind-merge`).

O suporte já está instalado: `npm ci --cache /workspace/.npm-cache`, `npm run typecheck` e `npm run dev`. Para adicionar outros componentes pelo CLI, use `npx shadcn@latest add <componente>`; não é necessário reinicializar ou sobrescrever os estilos existentes.

`components/ui/dot-pattern.tsx` contém o componente fornecido e `components/ui/demo.tsx` sua demonstração. Use **Ver Dot Pattern** na prévia ou o fragmento `#dot-pattern` para abrir. O padrão recebe espaçamento (`width`, `height`), deslocamento (`x`, `y`), posição e raio do ponto (`cx`, `cy`, `cr`), classes e atributos SVG. O `useId` do React vincula cada padrão ao seu preenchimento. Não exige providers, estado global, imagens ou ícones. O SVG é decorativo e ocupa o contêiner; a demonstração tem 500px de altura e largura responsiva. A diretiva `use client` do exemplo é dispensável no Vite, que já executa no cliente.

## Dock animado

`components/ui/mac-os-dock.tsx` integra o dock fornecido; `components/ui/dock-demo.tsx` exporta `DemoOne`. Abra **Ver Dock** ou `#dock`. Usa `framer-motion`, ícones de interface do `lucide-react` e os SVGs de marcas fornecidos (essas marcas não estão disponíveis na versão instalada do Lucide). Não requer imagens, providers externos ou estado global. O tema é local à demonstração e reinicia ao sair; a preferência de movimento reduzido é respeitada. Tooltips abrem com mouse e foco, e os botões têm rótulos acessíveis. No celular, ícones e espaçamentos são compactados. Início retorna à prévia e o segundo item abre Dot Pattern. Botões sociais exibem aviso demonstrativo: não representam contas ou canais reais.

Validação da integração: `npm run typecheck`, `npm run export:preview` e verificações de renderização, alternância de tema, aviso social e retorno à prévia em DOM simulado. A revisão visual de animações em navegador continua necessária. O Vite pode informar que diretivas `use client` dos exemplos/dependências foram ignoradas; este projeto executa no cliente e não utiliza React Server Components.

## Publicação na Vercel

Importe este repositório, selecione a branch `main` e mantenha a pasta raiz `./`. O arquivo `vercel.json` define Vite, instalação com `npm ci`, build com `npm run build` e saída `dist`. Node 24 é indicado em `package.json`. Esta prévia não precisa de variáveis de ambiente. Cada push em `main` pode acionar a publicação automática, conforme a integração Git configurada na Vercel. Não inclui autenticação ou tratamento de dados reais.
