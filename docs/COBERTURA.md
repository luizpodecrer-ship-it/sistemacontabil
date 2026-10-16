# Cobertura da implementação e limites de liberação

Esta entrega amplia a aplicação em desenvolvimento. Ter uma página navegável não significa que todo o módulo esteja pronto para produção. O Documento Geral do Produto exige regras e validação profissional por rotina, regime, atividade, jurisdição e vigência. Nenhuma transmissão, guia tributária ou pagamento é executado automaticamente nesta versão.

| Capacidade da documentação | Implementado e exercitável | Pendente para cobertura integral |
|---|---|---|
| Empresas e estabelecimentos | Cadastro em nove abas, máscaras, validações, CEP, histórico e anexos | Catálogos oficiais e consulta cadastral CNPJ |
| Contabilidade | Plano de contas, partidas balanceadas, diário, saldo anterior, balancete, estorno, resultado preliminar e bloqueio por competência | Centros de custo, conciliação abrangente, encerramento de resultado, demonstrações oficiais, consolidação e validação CFC |
| Escrita Fiscal | Cadastro e importação XML NF-e, preservação de original, duplicidade, conferência e integração contábil | Motor de apuração por regime/UF/município; obrigações oficiais e guias |
| Folha de Pagamento | Empregados, vínculos, eventos manuais, soma de proventos/descontos por competência | INSS, IRRF, FGTS, férias, afastamentos, rescisão, convenções aplicadas, eSocial |
| Patrimônio | Bens, custo, residual, vida útil, depreciação linear mensal e contabilização idempotente | Prorrata, taxas e diferenças fiscais, transferências e lançamentos completos de baixa |
| Lalur | Cadastro de ajustes por IRPJ/CSLL, fonte e competência | Apuração legal, partes A/B, e-Lalur/e-Lacs e ECF |
| Reforma Tributária | Cenários com base/alíquota/fonte/vigência explícitas e memória aritmética | Regras oficiais versionadas por operação e leiaute |
| Administrar | Empresas, equipe/capacidade informada e indicadores calculados sobre registros | Apontamento de horas, produtividade/custos e dimensionamento real |
| Processos | Tarefas, responsável, prazo, prioridade, evidência, revisão, geração explícita de recorrência mensal e impedimentos no fechamento | Agendamento automático em segundo plano, dependências avançadas e notificações |
| Honorários | Contratos, vigência, geração de cobrança por mês, vencimento e prevenção de duplicidade | Reajustes, extras e faturamento fiscal |
| Auditoria | Histórico local de operações e trilha de gravação no backend preparado | Identidade do revisor por ação, segregação de funções, retenção imutável e consulta completa de auditoria de produção |
| Contabilidade Digital | Sugestões por regra de texto e contas sobre movimentos OFX, com revisão humana | Importadores adicionais e classificação assistida por IA |
| Conta Digital | Importação OFX, conferência e conciliação manual; sem conta bancária própria | Parceiro habilitado, consentimento, autenticação bancária e operação financeira |
| Cobranças | Títulos em aberto/liquidados, comprovação de recebimento, honorários vinculados e recebimento integrado ao financeiro próprio | Emissão Pix/boleto por parceiro, webhooks e régua de mensagens |
| Benefícios | Cadastro por empregado, fornecedor, competência, valor e situação | Integração de fornecedores e reflexos automáticos na folha |
| Conteúdo | Cadastro editorial com fonte, vigência, responsável e corpo do material | Conteúdo licenciado e revisão editorial especializada |
| Portal do Cliente | Prévia interna de documentos aprovados destinados ao cliente | Login externo e autorização por empresa/usuário no servidor |
| Messenger | Solicitações, prazo, responsável, situação e respostas internas | Entrega de mensagens, e-mail/WhatsApp oficial e notificações |
| Busca NF-e | Importação manual NF-e com validação de destinatário/emitente, chave e competência | Consulta autorizada em fonte externa, certificado e validação de assinatura; NFS-e específica |
| BOX-e / Central de documentos | Upload, hash SHA-256 contra duplicidade, original preservado, classificação, aprovação e download | Versionamento completo, processamento assíncrono e política de guarda |
| Backup em Nuvem | Exportação JSON com anexos; restauração local validada em instalação vazia | Backup automático na nuvem, retenção, ensaio de desastre/RPO/RTO e restauração administrativa remota |
| Portal do Empregado | Prévia interna filtrada por empregado e documento aprovado | Identidade e isolamento do empregado no servidor, assinaturas e solicitações externas |
| Busca Convenções | Cadastro, territorialidade, vigência, fonte e responsável | Busca contratada e validação profissional de enquadramento |
| Academy | Registro de materiais, perfil de público e conclusão local | Conteúdo próprio, progresso individual autenticado, avaliações e certificados |

## Infraestrutura

Sem configuração externa, a aplicação mantém o modo local IndexedDB, com aviso visível. Empresas existentes são preservadas. Os dados operacionais usam banco local separado, com transações e revisão; não há sincronização entre computadores no modo local.

O adaptador opcional Supabase foi preparado para autenticação por e-mail/senha, confirmação, recuperação de senha, escritório proprietário por conta, persistência das empresas e do estado operacional, anexos privados e trilha de escrita no servidor. As políticas e funções SQL foram exercitadas em PostgreSQL embarcado (PGlite), incluindo negação de acesso entre escritórios, escrita direta e anexo de outro proprietário, além de conflito de revisão e partidas não balanceadas. Isso não é uma validação ponta a ponta do serviço Supabase hospedado.

O primeiro modo de nuvem é exclusivo da conta proprietária. Cadastro de equipe não cria permissões ou usuários. Convites, múltiplos perfis, MFA e portais externos permanecem pendentes. O plano de contas é compartilhado entre empresas do mesmo escritório nesta entrega. O estado operacional é um agregado por escritório, com revisão otimista: exige decomposição e processamento assíncrono para volumes maiores.

Para ativar o adaptador, siga CONFIGURAR_NUVEM.md. Variáveis ausentes não ativam nuvem, nem convertem o login de demonstração em autenticação real. Não há migração automática de dados locais para Supabase. Antes de usar dados reais, é necessário homologar o ambiente configurado, as permissões, recuperação, proteção e as rotinas aplicáveis com profissionais responsáveis.
