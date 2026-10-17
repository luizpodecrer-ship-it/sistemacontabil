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

## Cadastro de empresas

Acesse **Empresas → Nova empresa**. O módulo agora usa React/TypeScript, com seis abas: Dados gerais; Fiscal e atividades; Pessoas e estabelecimentos; Atendimento e pessoal; Colaboradores; Documentos e histórico. Os campos têm larguras proporcionais ao conteúdo, com até quatro por linha no computador e uma coluna no celular. A lista de Empresas exibe apenas os cadastros locais; os exemplos dos demais módulos continuam demonstrativos.

- `components/ui/form-field.tsx`: campo reutilizável com label, exemplo cinza, mensagem de ajuda, estado inválido e erro associado para tecnologia assistiva.
- `lib/formats.ts`: máscaras e verificações compartilhadas (CNPJ numérico/alfanumérico, CPF, telefone com DDD, CEP, CNAE e moeda).
- `src/features/companies/model.ts`: modelo de dados e regras de rascunho/conclusão. Catálogos oficiais de natureza jurídica e CNAE ainda não estão integrados: os campos aceitam entrada manual, identificada na interface.
- `cep.ts`: consulta ViaCEP após completar 8 dígitos, com cancelamento de respostas antigas, timeout, nova tentativa e edição manual. Envia somente o CEP. Mantém número e complemento e evita substituir alterações feitas durante a consulta. O acesso real ao ViaCEP foi bloqueado pela rede do ambiente; os fluxos de sucesso, indisponibilidade, CEP não encontrado e resposta atrasada foram verificados com respostas simuladas no navegador.
- `storage.ts`: persistência IndexedDB de cadastro e anexos. Os dados ficam somente no navegador/origem atual, sem conta autenticada, segregação entre escritórios, backup ou sincronização. Não utilize dados reais de clientes antes do backend. Limpar dados do navegador remove os registros. Não há armazenamento de senhas ou certificados.

Salvar rascunho exige CNPJ válido e razão social. Campos opcionais preenchidos também são validados. Concluir exige endereço, e-mail, atividade principal, enquadramento definido, responsável, início do atendimento, primeira competência e áreas atendidas. Há bloqueio de CNPJ duplicado na lista, vigências sobrepostas e participação total acima de 100%. Filiais precisam ter a mesma raiz da matriz. A configuração tributária é cadastral e não executa apuração ou determina obrigações automaticamente.

Anexos: PDF/PNG/JPG, até 10 MB por arquivo e 30 MB por cadastro, com download local e remoção após confirmação. O histórico é local e registra salvamentos/seções alteradas; não equivale a auditoria autenticada ou versionamento contábil. Alterações não salvas exigem confirmação ao sair. Recolher a sidebar preserva o formulário.

Validação: `npm test` executa os testes das máscaras e regras. `npm run test:e2e` executa testes Chromium com Playwright (instale via `npx playwright install chromium`, ou forneça `CHROMIUM_PATH`; neste ambiente utiliza `/usr/bin/chromium`). `npm run typecheck` verifica os componentes tipados; `npm run export:preview` gera o build e HTML independente atualizado. O CEP requer internet mesmo no HTML independente.

## Operação integrada e cobertura

A navegação agora inclui 35 páginas operacionais. Dashboard e indicadores utilizam registros persistidos, sem números fictícios. Empresa e competência são contexto comum dos módulos; financeiro próprio e financeiro dos clientes são separados.

Fluxos implementados: tarefas e obrigações com evidência; documentos com original, hash e aprovação; diário, contas, balancete e estorno; revisão/fechamento/reabertura; NF-e XML e OFX locais; contratos e cobranças idempotentes; patrimônio e depreciação linear; pessoal e eventos manuais; ajustes fiscais e simulações; atendimento com respostas; conteúdo, convenções, benefícios, materiais de treinamento, prévias internas de portais, auditoria operacional e backup/restauração local em instalação vazia.

**A implementação não representa cobertura integral dos módulos contábeis ou operação pronta para produção.** A matriz detalhada de funcionalidades implementadas e pendentes está em [docs/COBERTURA.md](docs/COBERTURA.md). Transmissões oficiais, cálculos legais completos, equipe com permissões e portais autenticados externos dependem de desenvolvimento e validação adicionais.

Modo Supabase opcional: consulte [docs/CONFIGURAR_NUVEM.md](docs/CONFIGURAR_NUVEM.md), `.env.example` e `supabase/migrations/001_workspace.sql`. Sem as duas variáveis públicas, o sistema continua local. Nunca inclua chaves secretas em variáveis VITE. A migração SQL é testada em PostgreSQL embarcado; autenticação, armazenamento e políticas devem ser homologados também no Supabase real antes de ativar dados de clientes.


## Cadastro: referências visuais e consulta CNPJ

A evolução do cadastro inclui CPF/CNPJ, telefones em lista, dados complementares e configurações de pessoal por vigência. A consulta CNPJ usa dados públicos da BrasilAPI, preenche vazios e oferece revisão explícita para diferenças; indisponibilidade não impede cadastro manual. Consulte [docs/CADASTRO_REFERENCIAS.md](docs/CADASTRO_REFERENCIAS.md) para mapeamento, migração de dados antigos, limites da fonte e instruções da migração Supabase 002.

## Importação de empresas

Na página Empresas, o botão **Importar empresas** lê o relatório XLS com as sete colunas do cadastro ou o JSON preparado. Cadastros novos são rascunhos e inscrições repetidas no arquivo ficam separadas para revisão. No modo local os registros ficam no IndexedDB desse navegador. Veja [o guia de importação](docs/IMPORTACAO_EMPRESAS.md) para formato, limites, conversão Python na Vercel e migração opcional do Supabase.

## Colaboradores

A aba **Colaboradores**, ao lado de Atendimento e pessoal, compartilha o cadastro com Pessoal e vínculos. Possui blocos para documentos, contrato, jornada, dependentes e informações do eSocial. A Carteira Digital usa o CPF validado como identificação, sem consulta a dados oficiais. Veja [o guia e os limites da implementação](docs/COLABORADORES.md).
