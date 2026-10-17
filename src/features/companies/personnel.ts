import type { FieldSpec } from "@/components/ui/form-field";
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
export const phoneFields: FieldSpec[] = [
  s("type", "Tipo de telefone", ["Fixo", "Celular", "WhatsApp", "Outro"], {
    required: true,
  }),
  f("number", "Número com DDD", "(65) 99999-1234", {
    mask: "phone",
    required: true,
  }),
  f("contact", "Contato / setor", "Ex.: Financeiro"),
  s("primary", "Telefone principal", ["Sim", "Não"], { required: true }),
];
export const generalExtra: FieldSpec[] = [
  s("secondaryRegistrationType", "Inscrição complementar", [
    "CEI (histórico)",
    "CNO",
    "CAEPF",
  ]),
  f(
    "secondaryRegistration",
    "Número da inscrição complementar",
    "Informe somente o número",
    { maxLength: 20 },
  ),
  f("activityStart", "Início das atividades", "", { type: "date" }),
  f("activityEnd", "Término das atividades", "", { type: "date" }),
  f("inactiveAt", "Data de inativação no escritório", "", { type: "date" }),
];
export const addressExtra: FieldSpec[] = [
  f("floor", "Andar", "Ex.: 2º andar"),
  f("room", "Sala / conjunto", "Ex.: Sala 204"),
  f("poBox", "Caixa postal", "Ex.: 123"),
  s(
    "poBoxUf",
    "UF da caixa postal",
    "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
      " ",
    ),
  ),
  f("poBoxCep", "CEP da caixa postal", "00000-000", { mask: "cep" }),
];
export const registryExtra: FieldSpec[] = [
  f("boardRegisteredAt", "Data de registro na Junta", "", { type: "date" }),
  f("notary", "Cartório / termo", "Identificação do cartório ou termo"),
  f("notaryRegisteredAt", "Data de registro no cartório", "", { type: "date" }),
  f("book", "Livro", "Número do livro"),
  f("page", "Folha do registro", "Número da folha"),
];
export const personnelBase: FieldSpec[] = [
  s("payrollConfigStatus", "Situação da configuração de pessoal", [
    "Não configurado",
    "Em conferência",
    "Conferido",
  ]),
  f(
    "payrollNotes",
    "Observações de pessoal",
    "Anote particularidades e referências para revisão, sem senhas.",
    { type: "textarea", wide: true },
  ),
];
export const payrollFields: FieldSpec[] = [
  f("start", "Competência inicial da configuração", "", {
    type: "month",
    required: true,
  }),
  f("end", "Competência final da configuração", "", { type: "month" }),
  s("desoneration", "Desoneração da folha", ["Sim", "Não", "Em conferência"], {
    required: true,
  }),
  f("desonerationRate", "Alíquota de desoneração (%)", "Ex.: 2,50"),
  f(
    "indicator",
    "Indicativo de desoneração",
    "Código e descrição conforme leiaute vigente",
  ),
  s("basis", "Critério de desoneração", [
    "Produtos",
    "CNAE / faturamento",
    "Outro critério validado",
  ]),
  f(
    "darfCode",
    "Código DARF da desoneração",
    "Código de recolhimento aplicável",
  ),
  f("irrfCode", "Código de recolhimento IRRF", "Código aplicável"),
  f("pisCode", "Código de recolhimento PIS", "Código aplicável"),
  f("pisRate", "Alíquota de PIS (%)", "Ex.: 1,00"),
  s("centralize", "Centralizar recolhimento das filiais na matriz", [
    "Sim",
    "Não",
    "Em conferência",
  ]),
  s("simples", "Situação no Simples Nacional", [
    "Optante",
    "Não optante",
    "Em conferência",
  ]),
  f("simplesSince", "Competência de enquadramento no Simples", "", {
    type: "month",
  }),
  f("simplesAdhesion", "Competência de adesão ao Simples", "", {
    type: "month",
  }),
  s("annex", "Anexo aplicável à atividade", [
    "Anexo I",
    "Anexo II",
    "Anexo III",
    "Anexo IV",
    "Anexo V",
    "Em conferência",
  ]),
  f("cnae", "CNAE da atividade configurada", "0000-0/00", { mask: "cnae" }),
  s("concurrent", "Atividades concomitantes", ["Sim", "Não", "Em conferência"]),
  f("concurrentSince", "Início das atividades concomitantes", "", {
    type: "month",
  }),
  s("mei", "Condição MEI / SIMEI na folha", ["Sim", "Não", "Em conferência"]),
  f("meiRate", "Percentual MEI informado (%)", "Não há percentual padrão"),
  s("laborSize", "Porte para declarações trabalhistas", [
    "Microempresa",
    "Empresa de pequeno porte",
    "Demais / não classificada",
    "Em conferência",
  ]),
  f(
    "source",
    "Fonte / fundamentação",
    "Identifique a norma, versão ou documento conferido",
    { required: true },
  ),
  f("reviewer", "Responsável pela validação", "Nome do profissional", {
    required: true,
  }),
];
export const patFields: FieldSpec[] = [
  s("adherent", "Participa do PAT", ["Sim", "Não"], { required: true }),
  f("start", "Início da vigência do PAT", "", { type: "date", required: true }),
  f("end", "Fim da vigência do PAT", "", { type: "date" }),
  f("upToFive", "Participantes até 5 salários mínimos", "Ex.: 24", {
    type: "number",
  }),
  f("aboveFive", "Participantes acima de 5 salários mínimos", "Ex.: 0", {
    type: "number",
  }),
  s("countSource", "Origem das quantidades", [
    "Levantamento manual",
    "Relatório de vínculos conferido",
  ]),
  f("countPeriod", "Competência do levantamento", "", { type: "month" }),
  f("ownServicesRate", "Serviço próprio (%)", "Ex.: 0,00"),
  f("kitchenRate", "Administração de cozinha (%)", "Ex.: 0,00"),
  f("agreementMealRate", "Refeição por convênio (%)", "Ex.: 0,00"),
  f("transportMealRate", "Refeição transportada (%)", "Ex.: 0,00"),
  f("basketRate", "Cesta de alimentos (%)", "Ex.: 0,00"),
  f("foodAgreementRate", "Alimentação por convênio (%)", "Ex.: 0,00"),
  f("source", "Fonte / comprovação", "Documento ou relatório de referência", {
    required: true,
  }),
  f("reviewer", "Responsável pela validação", "Nome do profissional", {
    required: true,
  }),
];
export const esocialFields: FieldSpec[] = [
  f("start", "Início da vigência da configuração eSocial", "", {
    type: "date",
    required: true,
  }),
  f("end", "Fim da vigência da configuração eSocial", "", { type: "date" }),
  s(
    "group",
    "Grupo no eSocial",
    ["Grupo 1", "Grupo 2", "Grupo 3", "Grupo 4", "Em conferência"],
    { required: true },
  ),
  f("tablesAt", "Início de cadastros e tabelas", "", { type: "date" }),
  f("nonPeriodicAt", "Início dos eventos não periódicos", "", { type: "date" }),
  f("periodicAt", "Início dos eventos periódicos / folha", "", {
    type: "date",
  }),
  f("sefipAt", "Marco histórico de substituição da SEFIP", "", {
    type: "date",
  }),
  f("sstAt", "Início das informações de SST", "", { type: "date" }),
  f("fgtsAt", "Marco histórico de substituição GRF / GRRF / FGTS", "", {
    type: "date",
  }),
  f(
    "source",
    "Fonte / versão do cronograma",
    "Fonte oficial aplicável ao enquadramento",
    { required: true },
  ),
  f("reviewer", "Responsável pela validação", "Nome do profissional", {
    required: true,
  }),
];
export function visiblePayrollFields(values: Record<string, string>) {
  return payrollFields.filter((f) => {
    if (["desonerationRate", "indicator", "basis", "darfCode"].includes(f.key))
      return values.desoneration === "Sim";
    if (
      [
        "simplesSince",
        "simplesAdhesion",
        "annex",
        "cnae",
        "concurrent",
        "concurrentSince",
      ].includes(f.key)
    )
      return (
        values.simples === "Optante" &&
        (f.key !== "concurrentSince" || values.concurrent === "Sim")
      );
    if (f.key === "meiRate") return values.mei === "Sim";
    return true;
  });
}
export function visiblePatFields(values: Record<string, string>) {
  return patFields.filter(
    (f) =>
      values.adherent === "Sim" ||
      ["adherent", "start", "end", "source", "reviewer"].includes(f.key),
  );
}
