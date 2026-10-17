# Colaboradores por empresa

Acesse **Empresas → abra a empresa → Colaboradores → Novo colaborador**. A empresa precisa estar salva; pode estar como rascunho. A mesma tela também está em **Pessoal e vínculos**, respeitando a empresa selecionada. Não há uma segunda cópia dos colaboradores: ambas utilizam itens do módulo `employees` em `nexo-workspace-v1` (ou no adaptador Supabase quando configurado).

## Cadastro e documentos

O formulário usa blocos expansíveis para dados pessoais e endereço, documentos/pagamento, contrato/remuneração, jornada, dependentes/benefícios/férias, informações complementares e eSocial. Há listas próprias para dependentes, dias da jornada, benefícios, períodos aquisitivos, vigências de salário/cargo, tomadores, mandatos de CIPA, treinamentos e convocações de trabalho intermitente. A foto aceita JPG/PNG até 2 MB e usa o mesmo armazenamento e backup dos anexos operacionais.

Nome e CPF válido permitem salvar rascunho. A conclusão confere dados essenciais do vínculo, conforme seu tipo, e os registros relacionados preenchidos. Concluir o formulário não equivale a homologar ou transmitir uma admissão. Campos específicos são mostrados conforme as escolhas; mudar para CTPS Digital não apaga os dados da carteira em papel.

Ao escolher **Digital**, a identificação da CTPS é o CPF validado e acompanha as alterações desse campo. O valor é somente leitura; não existe série de CTPS Digital. Um CPF válido **não comprova emissão ou ativação da carteira**. Nenhuma consulta a CPF, vínculos ou CTPS é feita ao governo. O CEP usa o ViaCEP, preenche somente campos vazios e permite correção manual, sem substituir número/complemento nem respostas de consultas antigas.

Orientação oficial: https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho

## Identificação, histórico e consistência

- Os dados são vinculados ao identificador persistido da empresa, compartilhado pelos módulos de folha, benefícios e portal interno. Filiais são selecionadas a partir do cadastro da própria empresa.
- A matrícula interna identifica o vínculo e não é reutilizada na mesma empresa. A matrícula eSocial é independente da matrícula interna e da categoria legada.
- CPF repetido com períodos sobrepostos é bloqueado como regra de prevenção de duplicidade desta implementação. Readmissão requer nova matrícula e admissão posterior ao encerramento anterior. Essa regra operacional não pretende abranger todas as hipóteses legais de vínculos simultâneos.
- Atualizações mantêm um histórico de campos e valores antes/depois, incluindo listas relacionadas serializadas. Registros legados são preservados. O histórico local não é imutável nem equivale à auditoria autenticada de produção.
- Conflitos entre revisões, mudanças de empresa de um vínculo já existente e alterações em competência fechada são bloqueados. O rascunho é preservado quando a gravação falha. Sair com alterações requer confirmação.

## Regras e limites trabalhistas

CPF, datas, percentuais, formato de horas, CBO, categoria eSocial, documentos informados e dependentes recebem validações cadastrais. Contrato de experiência informado acima de 90 dias, somada a prorrogação, é bloqueado conforme o art. 445 da CLT. A regra não valida, por si só, a legalidade de um contrato. FGTS, INSS, IRRF, salário e tolerâncias não são preenchidos com valores das imagens nem calculados automaticamente.

As categorias legadas e os códigos do eSocial são campos distintos. Catálogos completos e validação de códigos contra a versão oficial vigente **ainda não estão integrados**. Código eSocial é informado e conferido pelo responsável; validar seus três dígitos não comprova que o enquadramento é correto. Não são feitas inferências tributárias por CPF, função ou categoria.

Fontes para revisão profissional e futuras regras versionadas:

- Documentação técnica do eSocial: https://www.gov.br/esocial/pt-br/documentacao-tecnica
- CLT: https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm

Cálculos legais de folha, atualização automática de legislação, validação integral de jornadas, convenções coletivas, enquadramentos especiais e transmissões oficiais continuam pendentes. Não há consulta pública de CPF/CTPS; uma eventual recuperação de dados oficiais exigirá autorização e integração adequada. A implementação é cadastral e não representa conformidade trabalhista integral.

## Persistência e testes

No modo local os dados ficam neste navegador/origem, sem sincronização com outro dispositivo. O backup operacional existente inclui registros, foto e histórico. Com Supabase configurado, o adaptador usa as políticas de escritório já existentes; não é necessária nova migração para estes campos JSON. A operação com um Supabase real não foi validada neste ambiente.

`tests/employee-model.test.ts` verifica a derivação CPF/CTPS, duplicidade, readmissão, vigências, concorrência e competência fechada. `tests/e2e/employees.spec.ts` verifica a tela, persistência, separação por empresa, ligação com Pessoal e vínculos, conclusão, proteção de alterações e responsividade. Dados de teste são sintéticos; os dados pessoais das imagens não foram copiados.
