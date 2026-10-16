import type { FieldSpec } from "@/components/ui/form-field";
export type ModuleDef = {
  id: string;
  name: string;
  group: string;
  description: string;
  fields: FieldSpec[];
  columns: string[];
  scope: "company" | "office";
  period?: boolean;
  status?: string[];
  note?: string;
};
const f = (
  key: string,
  label: string,
  placeholder = "",
  extra: Partial<FieldSpec> = {},
): FieldSpec => ({ key, label, placeholder, ...extra });
const s = (
  key: string,
  label: string,
  options: string[],
  extra: Partial<FieldSpec> = {},
): FieldSpec => ({ key, label, options, ...extra });
const title = f("title", "Título", "Descreva o registro", { required: true });
const amount = f("amount", "Valor", "R$ 0,00", {
  mask: "money",
  required: true,
});
const date = f("date", "Data", "", { type: "date", required: true });
const note = f(
  "notes",
  "Observações",
  "Informações complementares, sem credenciais.",
  { type: "textarea", wide: true },
);
export const modules: ModuleDef[] = [
  {
    id: "tasks",
    name: "Processos e tarefas",
    group: "Operação",
    description:
      "Pendências, responsáveis, prazos e evidências por empresa e competência.",
    scope: "company",
    period: true,
    columns: ["title", "owner", "due", "status"],
    status: ["Pendente", "Em andamento", "Em revisão", "Concluído"],
    fields: [
      title,
      f("owner", "Responsável", "Nome do responsável", { required: true }),
      f("due", "Prazo", "", { type: "date", required: true }),
      s("priority", "Prioridade", ["Normal", "Alta", "Urgente"], {
        required: true,
      }),
      s("blocking", "Impede fechamento?", ["Sim", "Não"], { required: true }),
      f(
        "evidence",
        "Evidência / conclusão",
        "Descreva a revisão ou referência do comprovante.",
      ),
      note,
    ],
  },
  {
    id: "obligations",
    name: "Agenda de obrigações",
    group: "Operação",
    description:
      "Agenda manual de obrigações aplicáveis, com evidências de entrega.",
    scope: "company",
    period: true,
    status: ["Pendente", "Em andamento", "Em revisão", "Concluído"],
    columns: ["title", "due", "owner", "status"],
    fields: [
      title,
      f("owner", "Responsável", "Nome", { required: true }),
      f("due", "Vencimento", "", { type: "date", required: true }),
      s("blocking", "Impede fechamento?", ["Sim", "Não"], { required: true }),
      s(
        "delivery",
        "Etapa da entrega",
        [
          "Preparação",
          "Gerado",
          "Validado",
          "Transmitido",
          "Recepcionado",
          "Rejeitado",
        ],
        { required: true },
      ),
      f("protocol", "Protocolo / recibo", "Obrigatório ao registrar recepção."),
      f("evidence", "Evidência", "Referência do arquivo ou retorno oficial"),
      note,
    ],
    note: "A transmissão não é executada pelo sistema. Registre o retorno recebido na fonte oficial.",
  },
  {
    id: "docs",
    name: "Central de documentos",
    group: "Operação",
    description:
      "Arquivos originais, classificação e disponibilização controlada na prévia.",
    scope: "company",
    period: true,
    status: ["Recebido", "Em revisão", "Aprovado"],
    columns: ["title", "kind", "status", "audience"],
    fields: [
      title,
      s(
        "kind",
        "Tipo",
        [
          "XML fiscal",
          "Extrato",
          "Contrato",
          "Guia",
          "Demonstrativo",
          "Comprovante",
          "Outro",
        ],
        { required: true },
      ),
      s(
        "audience",
        "Disponibilizar para",
        ["Somente equipe", "Cliente", "Empregado"],
        { required: true },
      ),
      f("employeeId", "Empregado", "Selecione o empregado"),
      note,
    ],
  },
  {
    id: "fiscal",
    name: "Escrita fiscal",
    group: "Núcleo contábil",
    description:
      "Documentos fiscais de entrada e saída com controle de origem e revisão.",
    scope: "company",
    period: true,
    status: ["Importado", "Em revisão", "Conferido"],
    columns: ["title", "direction", "date", "amount", "status"],
    fields: [
      title,
      s("direction", "Operação", ["Entrada", "Saída"], { required: true }),
      date,
      f("key", "Chave / identificador", "Chave de 44 dígitos para NF-e"),
      f("number", "Número do documento", "Ex.: 123"),
      f("issuer", "Emitente / contraparte", "Nome ou razão social"),
      amount,
      f("tax", "Tributo informado no documento", "R$ 0,00", { mask: "money" }),
      note,
    ],
    note: "Conferência e valores informados. Apuração legal, geração de guias e transmissão ainda dependem de especificação por regime e validação profissional.",
  },
  {
    id: "employees",
    name: "Pessoal e vínculos",
    group: "Núcleo contábil",
    description:
      "Cadastro de empregados e vínculos para organizar os eventos de pessoal.",
    scope: "company",
    columns: ["title", "cpf", "role", "admission"],
    fields: [
      f("title", "Nome completo", "Nome do empregado", { required: true }),
      f("cpf", "CPF", "000.000.000-00", { mask: "cpf", required: true }),
      f("role", "Cargo", "Ex.: Analista", { required: true }),
      f("admission", "Admissão", "", { type: "date", required: true }),
      f("termination", "Desligamento", "", { type: "date" }),
      f("salary", "Salário contratual", "R$ 0,00", {
        mask: "money",
        required: true,
      }),
      f("email", "E-mail", "nome@empresa.com.br", { type: "email" }),
      note,
    ],
  },
  {
    id: "payrollEvents",
    name: "Folha de pagamento",
    group: "Núcleo contábil",
    description:
      "Eventos manuais e demonstrativo preliminar de proventos e descontos.",
    scope: "company",
    period: true,
    columns: ["title", "employeeId", "type", "amount"],
    fields: [
      title,
      f("employeeId", "Empregado", "", { required: true }),
      s("type", "Natureza", ["Provento", "Desconto"], { required: true }),
      f("rubric", "Rubrica", "Ex.: SAL-001", { required: true }),
      amount,
      note,
    ],
    note: "Prévia aritmética de eventos informados. Não calcula automaticamente INSS, IRRF, FGTS, férias ou rescisão e não gera holerite oficial.",
  },
  {
    id: "assets",
    name: "Patrimônio",
    group: "Núcleo contábil",
    description:
      "Bens, vida útil, valor residual e memória da depreciação linear mensal.",
    scope: "company",
    columns: ["title", "date", "amount", "months", "disposed"],
    fields: [
      title,
      f("code", "Código patrimonial", "PAT-0001", { required: true }),
      date,
      amount,
      f("residual", "Valor residual", "R$ 0,00", { mask: "money" }),
      f("months", "Vida útil em meses", "Ex.: 60", {
        type: "number",
        required: true,
      }),
      s("disposed", "Situação", ["Em uso", "Baixado"], { required: true }),
      f("disposalDate", "Data da baixa", "", { type: "date" }),
      note,
    ],
    note: "Método linear mensal configurado pelo usuário, a partir do mês seguinte à aquisição. Tratamento fiscal e taxas legais precisam de validação.",
  },
  {
    id: "lalur",
    name: "IRPJ, CSLL e ajustes",
    group: "Núcleo contábil",
    description:
      "Controle manual de adições, exclusões e compensações para revisão.",
    scope: "company",
    period: true,
    columns: ["title", "tax", "type", "amount"],
    fields: [
      title,
      s("tax", "Tributo", ["IRPJ", "CSLL"], { required: true }),
      s("type", "Ajuste", ["Adição", "Exclusão", "Compensação"], {
        required: true,
      }),
      amount,
      f("basis", "Fundamentação / fonte", "Referência normativa e vigência", {
        required: true,
      }),
      note,
    ],
    note: "Controle de ajustes; não representa apuração oficial, e-Lalur/e-Lacs ou geração de ECF.",
  },
  {
    id: "reform",
    name: "Reforma tributária",
    group: "Núcleo contábil",
    description:
      "Cenários separados das apurações oficiais, com parâmetros e fontes explícitos.",
    scope: "company",
    period: true,
    columns: ["title", "base", "rate", "source"],
    fields: [
      title,
      f("base", "Base simulada", "R$ 0,00", { mask: "money", required: true }),
      f("rate", "Alíquota simulada (%)", "Ex.: 12,50", { required: true }),
      f("source", "Fonte / premissa", "Link ou identificação da regra", {
        required: true,
      }),
      f("validFrom", "Vigência da premissa", "", {
        type: "date",
        required: true,
      }),
      note,
    ],
    note: "Simulação parametrizada. Não assume alíquotas legais nem substitui apuração validada.",
  },
  {
    id: "officeFinance",
    name: "Financeiro do escritório",
    group: "Gestão",
    description:
      "Receitas e despesas próprias, separadas dos movimentos das empresas clientes.",
    scope: "office",
    status: ["Aberto", "Liquidado"],
    columns: ["title", "type", "due", "amount", "status"],
    fields: [
      title,
      s("type", "Tipo", ["Receita", "Despesa"], { required: true }),
      f("due", "Vencimento", "", { type: "date", required: true }),
      amount,
      f("settledAt", "Data da liquidação", "", { type: "date" }),
      f("evidence", "Evidência do pagamento", "Referência do comprovante"),
      note,
    ],
  },
  {
    id: "clientFinance",
    name: "Financeiro dos clientes",
    group: "Operação",
    description:
      "Movimentos financeiros da empresa para conciliação e eventual BPO.",
    scope: "company",
    period: true,
    status: ["Pendente", "Conciliado"],
    columns: ["title", "direction", "date", "amount", "status"],
    fields: [
      title,
      s("direction", "Direção", ["Entrada", "Saída"], { required: true }),
      date,
      amount,
      f(
        "externalId",
        "Identificador da origem",
        "FITID bancário ou referência",
      ),
      f(
        "evidence",
        "Evidência da conciliação",
        "Referência de documento ou conferência",
      ),
      note,
    ],
  },
  {
    id: "fees",
    name: "Contratos e honorários",
    group: "Gestão",
    description:
      "Contratos vinculados à carteira e geração controlada de cobranças por competência.",
    scope: "company",
    columns: ["title", "amount", "start", "end"],
    fields: [
      title,
      amount,
      f("start", "Início do contrato", "", { type: "date", required: true }),
      f("end", "Fim do contrato", "", { type: "date" }),
      f("day", "Dia de vencimento", "Ex.: 10", {
        type: "number",
        required: true,
      }),
      f("services", "Serviços contratados", "Ex.: Contábil e Fiscal", {
        required: true,
      }),
      note,
    ],
  },
  {
    id: "collections",
    name: "Cobranças",
    group: "Gestão",
    description:
      "Títulos de honorários com registro manual de recebimento e evidência.",
    scope: "company",
    period: true,
    status: ["Aberto", "Liquidado"],
    columns: ["title", "due", "amount", "status"],
    fields: [
      title,
      f("due", "Vencimento", "", { type: "date", required: true }),
      amount,
      f("settledAt", "Data do recebimento", "", { type: "date" }),
      f("evidence", "Comprovante / referência", "Referência de pagamento"),
      note,
    ],
    note: "Não emite boleto ou Pix. A confirmação de recebimento depende de evidência; emissão depende de parceiro financeiro.",
  },
  {
    id: "team",
    name: "Equipe e capacidade",
    group: "Gestão",
    description:
      "Planejamento de responsáveis e capacidade mensal do escritório.",
    scope: "office",
    columns: ["title", "email", "role", "hours"],
    fields: [
      f("title", "Nome", "Nome completo", { required: true }),
      f("email", "E-mail", "nome@escritorio.com.br", {
        type: "email",
        required: true,
      }),
      s(
        "role",
        "Perfil de trabalho",
        ["Gestor", "Executor", "Revisor", "Financeiro", "Atendimento"],
        { required: true },
      ),
      f("hours", "Capacidade mensal (horas)", "Ex.: 160", {
        type: "number",
        required: true,
      }),
      note,
    ],
    note: "Cadastro operacional de equipe; não cria conta de acesso ou concede permissões de segurança.",
  },
  {
    id: "automation",
    name: "Automação de classificação",
    group: "Serviços",
    description:
      "Regras de sugestão para movimentos bancários, com revisão antes de contabilizar.",
    scope: "company",
    columns: ["title", "match", "debitAccount", "creditAccount"],
    fields: [
      title,
      f("match", "Descrição contém", "Ex.: aluguel", { required: true }),
      f("debitAccount", "Conta de débito", "", { required: true }),
      f("creditAccount", "Conta de crédito", "", { required: true }),
      note,
    ],
  },
  {
    id: "benefits",
    name: "Benefícios",
    group: "Serviços",
    description: "Concessões e valores informados por empregado e competência.",
    scope: "company",
    period: true,
    columns: ["title", "employeeId", "amount", "provider"],
    fields: [
      title,
      f("employeeId", "Empregado", "", { required: true }),
      amount,
      f("provider", "Fornecedor", "Nome do prestador", { required: true }),
      s("status", "Situação", ["Previsto", "Concedido", "Cancelado"], {
        required: true,
      }),
      note,
    ],
  },
  {
    id: "content",
    name: "Conteúdo tributário",
    group: "Serviços",
    description:
      "Base editorial com fonte, vigência e responsável pela revisão.",
    scope: "office",
    columns: ["title", "source", "validFrom", "reviewer"],
    fields: [
      title,
      f("source", "Fonte oficial / URL", "https://", {
        type: "url",
        required: true,
      }),
      f("validFrom", "Início da vigência", "", {
        type: "date",
        required: true,
      }),
      f("validTo", "Fim da vigência", "", { type: "date" }),
      f("reviewer", "Responsável editorial", "Nome", { required: true }),
      f("body", "Conteúdo", "Resumo com referências verificáveis.", {
        type: "textarea",
        required: true,
        wide: true,
      }),
      note,
    ],
  },
  {
    id: "messaging",
    name: "Atendimento",
    group: "Serviços",
    description:
      "Solicitações e respostas registradas no histórico interno da empresa.",
    scope: "company",
    status: ["Aberto", "Em atendimento", "Resolvido"],
    columns: ["title", "owner", "due", "status"],
    fields: [
      title,
      f("owner", "Responsável", "Nome", { required: true }),
      f("due", "Prazo", "", { type: "date", required: true }),
      f("body", "Solicitação", "Descreva o atendimento.", {
        type: "textarea",
        required: true,
        wide: true,
      }),
      note,
    ],
  },
  {
    id: "conventions",
    name: "Convenções coletivas",
    group: "Serviços",
    description:
      "Controle de instrumentos coletivos, enquadramento e revisão humana.",
    scope: "company",
    columns: ["title", "union", "start", "end"],
    fields: [
      title,
      f("union", "Sindicato / entidade", "Identificação", { required: true }),
      f("territory", "Abrangência territorial", "UF e municípios", {
        required: true,
      }),
      f("start", "Início da vigência", "", { type: "date", required: true }),
      f("end", "Fim da vigência", "", { type: "date", required: true }),
      f("source", "Fonte / URL", "https://", { type: "url", required: true }),
      f("reviewer", "Responsável pela validação", "Nome", { required: true }),
      note,
    ],
  },
  {
    id: "academy",
    name: "Academy",
    group: "Serviços",
    description:
      "Materiais de treinamento e acompanhamento local de conclusão.",
    scope: "office",
    status: ["Não iniciado", "Em andamento", "Concluído"],
    columns: ["title", "profile", "status"],
    fields: [
      title,
      s(
        "profile",
        "Público",
        ["Gestor", "Executor", "Revisor", "Cliente", "Empregado"],
        { required: true },
      ),
      f("source", "Material / URL", "https://", {
        type: "url",
        required: true,
      }),
      f("body", "Instruções", "Orientações para o treinamento.", {
        type: "textarea",
        wide: true,
      }),
      note,
    ],
  },
  {
    id: "integrationRequests",
    name: "Solicitações de integração",
    group: "Serviços",
    description: "Solicitações priorizadas para conectores externos.",
    scope: "office",
    status: ["Solicitado", "Em avaliação", "Planejado"],
    columns: ["title", "category", "status"],
    fields: [
      title,
      s("category", "Categoria", ["Fiscal", "Bancos", "Comunicação", "Dados"], {
        required: true,
      }),
      f("body", "Necessidade", "Descreva o fluxo desejado.", {
        type: "textarea",
        required: true,
        wide: true,
      }),
      note,
    ],
  },
];
for (const module of modules) {
  if (["tasks", "obligations"].includes(module.id))
    module.fields.push({
      key: "recurrence",
      label: "Recorrência",
      options: ["Não repetir", "Mensal"],
      hint: "A próxima ocorrência é gerada por ação explícita. Vencimentos após dia 28 são limitados ao dia 28 no próximo mês.",
    });
}
export const labelOf = (module: ModuleDef, key: string) =>
  module.fields.find((f) => f.key === key)?.label ||
  { status: "Situação", amount: "Valor" }[key] ||
  key;
