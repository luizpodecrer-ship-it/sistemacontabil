import {
  phoneFields,
  generalExtra,
  addressExtra,
  registryExtra,
  personnelBase,
  visiblePayrollFields,
  visiblePatFields,
  esocialFields,
} from "./personnel";
import type { FieldSpec } from "@/components/ui/form-field";
import {
  cnpjKey,
  digits,
  validCnpj,
  validCpf,
  validEmail,
  validPhone,
} from "@/lib/formats";
export type Values = Record<string, string>;
export type Row = { id: string; values: Values };
export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  expires: string;
  addedAt: string;
  file: File;
};
export type Company = {
  id: string;
  values: Values;
  branches: Row[];
  activities: Row[];
  regimes: Row[];
  people: Row[];
  phones: Row[];
  payrollPeriods: Row[];
  patPeriods: Row[];
  esocialPeriods: Row[];
  attachments: Attachment[];
  history: { at: string; action: string; fields: string[] }[];
  status: "Rascunho" | "Concluído";
  updatedAt: string;
};
export const tabs = [
  "Identificação",
  "Endereço e contatos",
  "Atividades",
  "Enquadramentos",
  "Sócios e representantes",
  "Estabelecimentos",
  "Atendimento",
  "Configurações de pessoal",
  "Documentos",
  "Histórico",
];
const opts = (
  key: string,
  label: string,
  options: string[],
  extra: Partial<FieldSpec> = {},
): FieldSpec => ({ key, label, options, ...extra });
const field = (
  key: string,
  label: string,
  placeholder: string,
  extra: Partial<FieldSpec> = {},
): FieldSpec => ({ key, label, placeholder, ...extra });
export const ufs =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
export const identity: FieldSpec[] = [
  field("cnpj", "CNPJ", "00.000.000/0000-00", {
    mask: "cnpj",
    required: true,
    hint: "Aceita CNPJ numérico e alfanumérico; dígitos verificadores serão conferidos.",
  }),
  field("legalName", "Razão social", "Ex.: Queiroz Serviços Contábeis Ltda.", {
    required: true,
    autoComplete: "organization",
  }),
  field("tradeName", "Nome fantasia", "Ex.: Queiroz Contabilidade"),
  field("code", "Código interno", "Ex.: EMP-0001"),
  field("openedAt", "Data de abertura", "", { type: "date" }),
  field(
    "legalNature",
    "Natureza jurídica",
    "Ex.: 206-2 — Sociedade Empresária Limitada",
    {
      hint: "Informe código e descrição. Catálogo oficial ainda não integrado.",
    },
  ),
  opts("size", "Porte", ["ME", "EPP", "Demais", "Não informado"]),
  field("capital", "Capital social", "R$ 0,00", { mask: "money" }),
  opts("registryStatus", "Situação cadastral na Receita", [
    "Ativa",
    "Suspensa",
    "Inapta",
    "Baixada",
    "Nula",
  ]),
  field("registryDate", "Data da situação cadastral", "", { type: "date" }),
  opts("officeStatus", "Situação no escritório", [
    "Em implantação",
    "Ativa",
    "Inativa",
    "Suspensa",
    "Encerrada",
  ]),
  field("inactiveAt", "Data de inativação", "", { type: "date" }),
  field(
    "notes",
    "Observações cadastrais",
    "Informações complementares, sem senhas ou credenciais.",
    { type: "textarea", wide: true },
  ),
];
export const address: FieldSpec[] = [
  field("cep", "CEP", "00000-000", {
    mask: "cep",
    required: true,
    autoComplete: "postal-code",
    hint: "Busca automática ao completar 8 dígitos. Você pode corrigir os dados.",
  }),
  field("street", "Logradouro", "Ex.: Avenida das Flores", {
    required: true,
    autoComplete: "address-line1",
  }),
  field("number", "Número", "Ex.: 120 ou S/N", {
    required: true,
    maxLength: 20,
  }),
  field("complement", "Complemento", "Ex.: Sala 204", {
    autoComplete: "address-line2",
  }),
  field("district", "Bairro", "Ex.: Centro", { required: true }),
  field("city", "Município", "Ex.: Cuiabá", {
    required: true,
    autoComplete: "address-level2",
  }),
  opts("uf", "UF", ufs, { required: true }),
  field("ibge", "Código IBGE", "0000000", {
    maxLength: 7,
    hint: "Preenchido pela busca de CEP; pode ser informado manualmente.",
  }),
  field("country", "País", "Brasil"),
];
export const contacts: FieldSpec[] = [
  field("email", "E-mail principal", "contato@empresa.com.br", {
    type: "email",
    required: true,
    autoComplete: "email",
  }),
  field("financeEmail", "E-mail financeiro", "financeiro@empresa.com.br", {
    type: "email",
  }),
  field("docsEmail", "E-mail de documentos", "documentos@empresa.com.br", {
    type: "email",
  }),
  field("phone", "Telefone fixo", "(65) 0000-0000", {
    mask: "phone",
    autoComplete: "tel-national",
    hint: "Informe o DDD e o número, sem o código +55.",
  }),
  field("mobile", "Celular / WhatsApp", "(65) 00000-0000", {
    mask: "phone",
    hint: "Informe o DDD e os 9 dígitos do celular.",
  }),
  field("website", "Site", "https://www.empresa.com.br", { type: "url" }),
  opts("contactPreference", "Preferência de contato", [
    "E-mail",
    "Telefone",
    "WhatsApp",
    "Portal do cliente",
  ]),
];
export const activityFields: FieldSpec[] = [
  field("cnae", "CNAE", "0000-0/00", { mask: "cnae", required: true }),
  field(
    "description",
    "Descrição da atividade",
    "Ex.: Atividades de contabilidade",
    { required: true },
  ),
  opts("kind", "Classificação", ["Principal", "Secundária"], {
    required: true,
  }),
  field("start", "Início da atividade", "", { type: "date" }),
  field("end", "Fim da atividade", "", { type: "date" }),
  field(
    "registration",
    "Registro profissional específico",
    "Ex.: Conselho e número de registro",
  ),
];
export const regimes = [
  "Simples Nacional",
  "Lucro Presumido",
  "Lucro Real",
  "Em definição",
];
export const regimeFields: FieldSpec[] = [
  opts("regime", "Regime tributário", regimes, { required: true }),
  opts("mei", "Condição MEI / SIMEI", ["Sim", "Não", "Em conferência"], {
    required: true,
  }),
  field("start", "Início da vigência", "", { type: "date", required: true }),
  field("end", "Fim da vigência", "", { type: "date" }),
  field("optionDate", "Data da opção / exclusão", "", { type: "date" }),
  field("reviewer", "Responsável pela conferência", "Nome do responsável", {
    required: true,
  }),
  field(
    "reason",
    "Motivo / observações",
    "Ex.: Opção inicial ou alteração de enquadramento",
    { type: "textarea", wide: true },
  ),
];
export const peopleFields: FieldSpec[] = [
  opts("type", "Tipo de pessoa", ["Pessoa física", "Pessoa jurídica"], {
    required: true,
  }),
  field("name", "Nome / razão social", "Nome completo ou razão social", {
    required: true,
  }),
  field("document", "CPF", "000.000.000-00", { mask: "cpf", required: true }),
  opts(
    "role",
    "Qualificação",
    [
      "Sócio",
      "Sócio-administrador",
      "Administrador",
      "Representante legal",
      "Procurador",
    ],
    { required: true },
  ),
  field("share", "Participação no capital (%)", "Ex.: 50,00", { maxLength: 6 }),
  opts("legalRepresentative", "Responsável legal", ["Sim", "Não"]),
  field("email", "E-mail", "nome@empresa.com.br", { type: "email" }),
  field("phone", "Telefone / celular", "(65) 00000-0000", { mask: "phone" }),
  field("start", "Data de entrada / início", "", { type: "date" }),
  field("end", "Data de saída / fim", "", { type: "date" }),
];
export const branchFields: FieldSpec[] = [
  field("cnpj", "CNPJ da filial", "00.000.000/0000-00", {
    mask: "cnpj",
    required: true,
  }),
  field("tradeName", "Nome da filial", "Ex.: Unidade Centro", {
    required: true,
  }),
  field("openedAt", "Data de abertura", "", { type: "date" }),
  opts("registryStatus", "Situação cadastral", [
    "Ativa",
    "Suspensa",
    "Inapta",
    "Baixada",
    "Nula",
  ]),
  opts("ieType", "Condição da inscrição estadual", [
    "Contribuinte",
    "Isento",
    "Não contribuinte",
  ]),
  field("ie", "Inscrição estadual", "Informe a inscrição da UF"),
  field("im", "Inscrição municipal", "Informe a inscrição municipal"),
  field("nire", "NIRE", "Informe o registro, se aplicável"),
  field("suframa", "SUFRAMA", "Informe a inscrição, se aplicável"),
  ...address,
  field("cnae", "CNAE principal da filial", "0000-0/00", { mask: "cnae" }),
  field(
    "otherActivities",
    "CNAEs secundários / atividades",
    "Descreva as atividades próprias da filial",
    { type: "textarea", wide: true },
  ),
];
export const serviceFields: FieldSpec[] = [
  field("accountant", "Contador responsável", "Nome completo", {
    required: true,
  }),
  field("crc", "CRC do responsável", "Ex.: MT-000000/O-0", { mask: "crc" }),
  field("team", "Equipe responsável", "Ex.: Equipe de atendimento 01"),
  field("fiscalOwner", "Responsável Fiscal", "Nome do responsável"),
  field("accountingOwner", "Responsável Contábil", "Nome do responsável"),
  field(
    "payrollOwner",
    "Responsável Departamento Pessoal",
    "Nome do responsável",
  ),
  field("serviceStart", "Início da responsabilidade", "", {
    type: "date",
    required: true,
  }),
  field("firstPeriod", "Primeira competência", "", {
    type: "month",
    required: true,
  }),
  field("serviceEnd", "Encerramento do atendimento", "", { type: "date" }),
  field(
    "endReason",
    "Motivo do encerramento",
    "Ex.: Transferência de escritório",
  ),
  field("contract", "Referência do contrato", "Ex.: CT-2026-001"),
  opts("employees", "Possui empregados?", ["Sim", "Não", "Em levantamento"]),
  opts("migration", "Importar saldos e históricos?", [
    "Sim",
    "Não",
    "Em levantamento",
  ]),
  opts("implementation", "Situação da implantação", [
    "Pendente",
    "Em conferência",
    "Concluída",
  ]),
  field("chart", "Plano de contas", "Nome ou código do plano"),
  opts("costCenters", "Centros de custo", ["Habilitados", "Desabilitados"]),
  field("schedule", "Modelo de agenda", "Ex.: Prestadores de serviços"),
  field(
    "obligations",
    "Obrigações a revisar",
    "Liste as obrigações propostas para conferência.",
    { type: "textarea", wide: true },
  ),
  field(
    "internalNotes",
    "Observações internas",
    "Não registre senhas, certificados ou credenciais.",
    { type: "textarea", wide: true },
  ),
];
export const matrixFields: FieldSpec[] = branchFields.slice(4, 9);
identity.unshift(
  opts("personType", "Tipo de cliente", ["Pessoa jurídica", "Pessoa física"], {
    required: true,
  }),
);
identity.push(...generalExtra);
address.push(...addressExtra);
branchFields.push(...addressExtra);
// Legacy phone fields remain validated for compatibility but the UI uses phone rows.
export const contactFields = contacts.filter(
  (f) => !["phone", "mobile"].includes(f.key),
);
matrixFields.push(...registryExtra);
export function identityFields(values: Values): FieldSpec[] {
  const physical = values.personType === "Pessoa física";
  return identity
    .filter(
      (f) => !physical || !["legalNature", "capital", "size"].includes(f.key),
    )
    .map((f) =>
      f.key === "cnpj"
        ? {
            ...f,
            label: physical ? "CPF" : "CNPJ",
            mask: physical ? "cpf" : "cnpj",
            placeholder: physical ? "000.000.000-00" : "00.000.000/0000-00",
            hint: physical
              ? "CPF do cliente ou empregador pessoa física."
              : "Aceita CNPJ numérico e alfanumérico. Consulta automática disponível para inscrição numérica.",
          }
        : f.key === "legalName"
          ? {
              ...f,
              label: physical ? "Nome completo" : "Razão social",
              placeholder: physical
                ? "Nome completo do cliente"
                : f.placeholder,
            }
          : f,
    );
}
export function normalizeCompany(company: Company): Company {
  const values: Values = { personType: "Pessoa jurídica", ...company.values };
  const phones = Array.isArray(company.phones) ? company.phones : [];
  if (!Array.isArray(company.phones)) {
    if (values.phone)
      phones.push({
        id: company.id + "-legacy-phone",
        values: { type: "Fixo", number: values.phone, primary: "Sim" },
      });
    if (values.mobile)
      phones.push({
        id: company.id + "-legacy-mobile",
        values: {
          type: "Celular",
          number: values.mobile,
          primary: phones.length ? "Não" : "Sim",
        },
      });
  }
  delete values.phone;
  delete values.mobile;
  return {
    ...company,
    values,
    phones,
    payrollPeriods: company.payrollPeriods || [],
    patPeriods: company.patPeriods || [],
    esocialPeriods: company.esocialPeriods || [],
  };
}
export const predominantActivityFields: FieldSpec[] = [
  field("predominantCnae", "CNAE preponderante", "0000-0/00", {
    mask: "cnae",
    hint: "Informação própria; não presume o CNAE principal nem o regime tributário.",
  }),
  field(
    "predominantCnaeDescription",
    "Descrição do CNAE preponderante",
    "Descrição conforme cadastro ou arquivo de origem",
  ),
];
export const uid = () => crypto.randomUUID();
export function newCompany(): Company {
  return {
    id: uid(),
    values: {
      code: `EMP-${Date.now().toString().slice(-6)}`,
      personType: "Pessoa jurídica",
      officeStatus: "Em implantação",
      country: "Brasil",
      services: "",
    },
    phones: [],
    payrollPeriods: [],
    patPeriods: [],
    esocialPeriods: [],
    branches: [],
    activities: [],
    regimes: [],
    people: [],
    attachments: [],
    history: [],
    status: "Rascunho",
    updatedAt: "",
  };
}
export function validateField(
  spec: FieldSpec,
  value: string,
  required = false,
): string {
  const v = value.trim();
  if (!v) return required && spec.required ? "Preencha este campo." : "";
  if (spec.mask === "cnpj" && !validCnpj(v))
    return "Informe um CNPJ válido, incluindo os dígitos verificadores.";
  if (spec.mask === "cpf" && !validCpf(v)) return "Informe um CPF válido.";
  if (spec.mask === "cep" && digits(v).length !== 8)
    return "O CEP deve conter 8 dígitos.";
  if (spec.mask === "phone" && !validPhone(v))
    return "Informe um telefone válido com DDD, ex.: (65) 99999-1234.";
  if (spec.mask === "cnae" && digits(v).length !== 7)
    return "O CNAE deve conter 7 dígitos.";
  if (spec.type === "email" && !validEmail(v))
    return "Informe um e-mail válido, ex.: contato@empresa.com.br.";
  if (spec.type === "url") {
    try {
      const url = new URL(v);
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname.includes(".")
      )
        return "Use um endereço https:// válido.";
    } catch {
      return "Informe o site completo, ex.: https://empresa.com.br.";
    }
  }
  if (spec.key === "ibge" && !/^\d{7}$/.test(v))
    return "O código IBGE deve conter 7 dígitos.";
  if (
    spec.key === "share" &&
    (!/^\d{1,3}([,.]\d{1,2})?$/.test(v) || Number(v.replace(",", ".")) > 100)
  )
    return "Informe um percentual entre 0 e 100.";
  return "";
}
export function validateRows(
  rows: Row[],
  specs: FieldSpec[],
  prefix: string,
  complete: boolean,
  errors: Values,
) {
  rows.forEach((row) => {
    specs.forEach((spec) => {
      const e = validateField(spec, row.values[spec.key] || "", complete);
      if (e) errors[`${prefix}.${row.id}.${spec.key}`] = e;
    });
    if (row.values.start && row.values.end && row.values.end < row.values.start)
      errors[`${prefix}.${row.id}.end`] =
        "A data final deve ser igual ou posterior à inicial.";
  });
}
export function validateCompany(
  company: Company,
  others: Company[],
  complete: boolean,
): Values {
  const errors: Values = {};
  const v = company.values;
  const all = [
    ...identityFields(v),
    ...address,
    ...contacts,
    ...serviceFields,
    ...matrixFields,
    ...personnelBase,
    ...predominantActivityFields,
  ];
  all.forEach((spec) => {
    const e = validateField(
      spec,
      v[spec.key] || "",
      complete || ["cnpj", "legalName"].includes(spec.key),
    );
    if (e) errors[spec.key] = e;
  });
  if (
    others.some(
      (c) =>
        c.id !== company.id &&
        cnpjKey(c.values.cnpj || "") === cnpjKey(v.cnpj || ""),
    )
  )
    errors.cnpj = "Este CNPJ já está cadastrado neste navegador.";
  if (v.serviceStart && v.serviceEnd && v.serviceEnd < v.serviceStart)
    errors.serviceEnd = "O encerramento não pode ser anterior ao início.";
  if (v.ieType === "Contribuinte" && !v.ie?.trim() && complete)
    errors.ie = "Informe a inscrição estadual do contribuinte.";
  validateRows(
    company.activities,
    activityFields,
    "activities",
    complete,
    errors,
  );
  validateRows(company.regimes, regimeFields, "regimes", complete, errors);
  validateRows(company.people, peopleFields, "people", complete, errors);
  company.people.forEach((row) => {
    if (row.values.type === "Pessoa jurídica") {
      delete errors[`people.${row.id}.document`];
      if (row.values.document && !validCnpj(row.values.document))
        errors[`people.${row.id}.document`] = "Informe um CNPJ válido.";
      if (complete && !row.values.document)
        errors[`people.${row.id}.document`] = "Preencha este campo.";
    }
  });
  validateRows(company.branches, branchFields, "branches", complete, errors);
  const branchKeys = new Set([cnpjKey(v.cnpj || "")]);
  company.branches.forEach((b) => {
    const key = cnpjKey(b.values.cnpj || "");
    if (key && branchKeys.has(key))
      errors[`branches.${b.id}.cnpj`] = "CNPJ repetido entre matriz e filiais.";
    branchKeys.add(key);
    if (
      key.length === 14 &&
      key.slice(0, 8) !== cnpjKey(v.cnpj || "").slice(0, 8)
    )
      errors[`branches.${b.id}.cnpj`] =
        "A filial deve pertencer à mesma raiz de CNPJ da matriz.";
    if (complete && b.values.ieType === "Contribuinte" && !b.values.ie)
      errors[`branches.${b.id}.ie`] = "Informe a inscrição estadual.";
  });
  const principals = company.activities.filter(
    (r) => r.values.kind === "Principal",
  );
  if (complete && v.personType !== "Pessoa física" && principals.length !== 1)
    errors.activities =
      "Cadastre exatamente uma atividade principal para a matriz.";
  if (
    complete &&
    v.personType !== "Pessoa física" &&
    !company.regimes.some(
      (r) =>
        r.values.start && !r.values.end && r.values.regime !== "Em definição",
    )
  )
    errors.regimes = "Cadastre um enquadramento definido, sem data final.";
  const sorted = [...company.regimes]
    .filter((r) => r.values.start)
    .sort((a, b) => a.values.start.localeCompare(b.values.start));
  sorted.forEach((r, i) => {
    const prev = sorted[i - 1];
    if (prev && (!prev.values.end || prev.values.end >= r.values.start))
      errors[`regimes.${r.id}.start`] =
        "As vigências dos enquadramentos não podem se sobrepor.";
    if (r.values.mei === "Sim" && r.values.regime !== "Simples Nacional")
      errors[`regimes.${r.id}.mei`] =
        "A condição MEI/SIMEI exige Simples Nacional.";
  });
  const share = company.people.reduce(
    (sum, p) => sum + Number((p.values.share || "0").replace(",", ".")),
    0,
  );
  if (share > 100)
    errors.people = "A soma das participações não pode ultrapassar 100%.";
  if (v.personType === "Pessoa física" && company.branches.length)
    errors.branches =
      "Cadastro de pessoa física não admite filiais; mantenha os estabelecimentos apenas no cadastro PJ.";
  if (v.activityStart && v.activityEnd && v.activityEnd < v.activityStart)
    errors.activityEnd =
      "O término das atividades não pode ser anterior ao início.";
  const registrationLengths: Record<string, number> = {
    "CEI (histórico)": 12,
    CNO: 12,
    CAEPF: 14,
  };
  if (
    v.secondaryRegistration &&
    (!v.secondaryRegistrationType ||
      digits(v.secondaryRegistration).length !==
        registrationLengths[v.secondaryRegistrationType])
  )
    errors.secondaryRegistration =
      "Selecione o tipo e informe o número completo da inscrição complementar.";
  if (
    v.legalResponsibleId &&
    !company.people.some((p) => p.id === v.legalResponsibleId)
  )
    errors.legalResponsibleId =
      "Selecione uma pessoa vinculada a este cadastro.";
  validateRows(company.phones || [], phoneFields, "phones", complete, errors);
  if (
    (company.phones || []).filter((p) => p.values.primary === "Sim").length > 1
  )
    errors.phones = "Indique apenas um telefone principal.";
  if (
    complete &&
    company.phones?.length &&
    !company.phones.some((p) => p.values.primary === "Sim")
  )
    errors.phones =
      "Indique o telefone principal entre os contatos cadastrados.";
  for (const [group, getFields] of [
    ["payrollPeriods", visiblePayrollFields],
    ["patPeriods", visiblePatFields],
    ["esocialPeriods", () => esocialFields],
  ] as const) {
    const rows = company[group] || [];
    rows.forEach((row) => {
      validateRows([row], getFields(row.values), group, complete, errors);
      for (const [key, value] of Object.entries(row.values)) {
        if (!getFields(row.values).some((f) => f.key === key)) continue;
        if (
          key.endsWith("Rate") &&
          value &&
          (!/^\d{1,3}([,.]\d{1,4})?$/.test(value) ||
            Number(value.replace(",", ".")) > 100)
        )
          errors[`${group}.${row.id}.${key}`] =
            "Informe um percentual entre 0 e 100.";
        if (
          ["upToFive", "aboveFive"].includes(key) &&
          value &&
          (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))
        )
          errors[`${group}.${row.id}.${key}`] =
            "Informe uma quantidade inteira e não negativa.";
      }
      if (
        group === "payrollPeriods" &&
        row.values.mei === "Sim" &&
        row.values.simples !== "Optante"
      )
        errors[`${group}.${row.id}.mei`] =
          "A condição MEI/SIMEI exige opção pelo Simples Nacional.";
      if (
        group === "patPeriods" &&
        row.values.adherent === "Sim" &&
        (row.values.upToFive || row.values.aboveFive) &&
        !row.values.countSource
      )
        errors[`${group}.${row.id}.countSource`] =
          "Identifique a origem das quantidades informadas.";
    });
    // Payroll can have concomitant activities: only periods for the same CNAE conflict.
    const ordered = [...rows]
      .filter((r) => r.values.start)
      .sort((a, b) => a.values.start.localeCompare(b.values.start));
    ordered.forEach((row, index) => {
      if (
        ordered
          .slice(0, index)
          .some(
            (previous) =>
              (group !== "payrollPeriods" ||
                (previous.values.cnae || "") === (row.values.cnae || "")) &&
              (!previous.values.end || previous.values.end >= row.values.start),
          )
      )
        errors[`${group}.${row.id}.start`] =
          "Há vigências sobrepostas para esta configuração.";
    });
  }
  if (complete && !v.services)
    errors.services = "Selecione pelo menos uma área atendida.";
  return errors;
}
export function errorTab(key: string): number {
  if (key === "legalResponsibleId") return 4;
  if (key.startsWith("phones")) return 1;
  if (
    ["payrollPeriods", "patPeriods", "esocialPeriods"].some((g) =>
      key.startsWith(g),
    ) ||
    personnelBase.some((f) => f.key === key)
  )
    return 7;
  if (predominantActivityFields.some((f) => f.key === key)) return 2;
  if (key.startsWith("activities")) return 2;
  if (key.startsWith("regimes")) return 3;
  if (key.startsWith("people")) return 4;
  if (key.startsWith("branches") || matrixFields.some((s) => s.key === key))
    return 5;
  if ([...address, ...contacts].some((s) => s.key === key)) return 1;
  if (serviceFields.some((s) => s.key === key) || key === "services") return 6;
  return 0;
}
