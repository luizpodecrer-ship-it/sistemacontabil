import { Unions } from "../unions/app";
import { loadJobsData } from "../jobs/storage";
import { Jobs } from "../jobs/app";
import { CompanyEmployees } from "../employees/company-employees";
import { cloudConfigured } from "../../backend/client";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Plus,
  Search,
  Download,
  ArrowLeft,
  Check,
  Archive,
  LoaderCircle,
  FileUp,
} from "lucide-react";
import { FormField, type FieldSpec } from "@/components/ui/form-field";
import { validateField, type Company } from "../companies/model";
import { listCompanies } from "../companies/storage";
import { RestoreBackup } from "./restore";
import { modules, labelOf, type ModuleDef } from "./modules";
import { loadData, mutateData } from "./storage";
import {
  initialData,
  newId,
  today,
  money,
  cents,
  addEntry,
  balance,
  assertOpen,
  transitionClosing,
  audit,
  depreciation,
  payrollSummary,
  generateNextTask,
  parseOfx,
  type Data,
  type Item,
  type Entry,
  type Line,
  type Values,
} from "./model";
const ignoreEmployeeEditing = (_value: boolean) => {};
let mounted: Root | undefined;
let dirty = false;
export const canLeaveWorkspace = () =>
  !dirty || window.confirm("Há alterações não salvas. Deseja descartá-las?");
export function unmountWorkspace() {
  mounted?.unmount();
  mounted = undefined;
  dirty = false;
  document.body.classList.remove("workspace-module");
}
export function mountWorkspace(container: HTMLElement, module: string) {
  unmountWorkspace();
  document.body.classList.add("workspace-module");
  mounted = createRoot(container);
  mounted.render(<Workspace moduleId={module} />);
}
const button =
  "btn fx-20 inline-flex items-center justify-center gap-2 disabled:opacity-40";
const input = "form-control";
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6 mb-5">
      <h2 className="font-semibold text-sm mb-5">{title}</h2>
      {children}
    </section>
  );
}
function csv(rows: unknown[][]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/^[=+@-]/, "\t$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
function download(name: string, body: string | Blob, type = "text/plain") {
  const url = URL.createObjectURL(
    body instanceof Blob ? body : new Blob([body], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function Workspace({ moduleId }: { moduleId: string }) {
  const [data, setData] = useState<Data>(initialData);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [companyId, setCompanyId] = useState(() => {
    try {
      return localStorage.getItem("nexo-company-context") || "";
    } catch {
      return "";
    }
  });
  const [period, setPeriod] = useState(() => {
    try {
      return localStorage.getItem("nexo-period-context") || today().slice(0, 7);
    } catch {
      return today().slice(0, 7);
    }
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [editor, setEditor] = useState<Item | null>(null);
  const [errors, setErrors] = useState<Values>({});
  const [changed, setChanged] = useState(false);
  const [entryEditor, setEntryEditor] = useState<Entry | null>(null);
  const [reason, setReason] = useState("");
  const [employee, setEmployee] = useState("");
  const [reply, setReply] = useState("");
  const [detail, setDetail] = useState<Item | null>(null);
  const [accountEditor, setAccountEditor] = useState(false);
  const [accountValues, setAccountValues] = useState<Values>({});
  const modal = useRef<HTMLDialogElement>(null);
  const def = modules.find((m) => m.id === moduleId);
  useEffect(() => {
    let active = true;
    Promise.all([loadJobsData(), listCompanies()])
      .then(([state, list]) => {
        if (active) {
          setData(state);
          setCompanies(list);
          if (!list.some((c) => c.id === companyId)) setCompanyId("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("nexo-company-context", companyId);
      localStorage.setItem("nexo-period-context", period);
    } catch {}
  }, [companyId, period]);
  useEffect(() => {
    dirty = changed;
    const stop = (e: BeforeUnloadEvent) => {
      if (changed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", stop);
    return () => {
      dirty = false;
      window.removeEventListener("beforeunload", stop);
    };
  }, [changed]);
  useEffect(() => {
    if (detail) modal.current?.showModal();
  }, [detail]);
  const act = async (change: (next: Data) => void, message: string) => {
    setBusy(true);
    setNotice("");
    try {
      const next = await mutateData(change);
      setData(next);
      setNotice(message);
      return true;
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível concluir.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const company = companies.find((c) => c.id === companyId);
  const closing = data.closings.find(
    (c) => c.companyId === companyId && c.period === period,
  );
  const allItems = data.items.filter((i) => !i.archived);
  const contextItems = allItems.filter(
    (i) => i.companyId === companyId && i.period === period,
  );
  const employees = allItems.filter(
    (i) => i.module === "employees" && i.companyId === companyId,
  );
  const fields = (definition: ModuleDef): FieldSpec[] =>
    definition.fields.map((f) => {
      if (f.key === "employeeId")
        return { ...f, options: employees.map((e) => e.id) };
      if (["debitAccount", "creditAccount"].includes(f.key))
        return { ...f, options: data.accounts.map((a) => a.id) };
      return f;
    });
  const read = (record: Item, key: string) => {
    const value = record.values[key] || "";
    if (["amount", "base", "salary", "residual", "tax"].includes(key))
      return money(cents(value));
    if (key === "employeeId")
      return (
        employees.find((e) => e.id === value)?.values.title ||
        "Empregado não encontrado"
      );
    if (key === "debitAccount" || key === "creditAccount") {
      const a = data.accounts.find((a) => a.id === value);
      return a ? `${a.code} · ${a.name}` : "Conta não encontrada";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
      return value.split("-").reverse().join("/");
    return value || "—";
  };
  const labeledField = (
    f: FieldSpec,
    value: string,
    onChange: (v: string) => void,
    errorMessage?: string,
  ) => {
    if (
      f.key === "employeeId" ||
      ["debitAccount", "creditAccount"].includes(f.key)
    )
      return (
        <div key={f.key}>
          <label
            htmlFor={`op-${f.key}`}
            className="block text-xs font-semibold mb-2"
          >
            {f.label}
            {f.required ? " *" : ""}
          </label>
          <select
            id={`op-${f.key}`}
            aria-label={f.label}
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? `op-error-${f.key}` : undefined}
            className={input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Selecione</option>
            {f.options?.map((id) => (
              <option key={id} value={id}>
                {f.key === "employeeId"
                  ? employees.find((e) => e.id === id)?.values.title
                  : data.accounts.find((a) => a.id === id)?.code +
                    " · " +
                    data.accounts.find((a) => a.id === id)?.name}
              </option>
            ))}
          </select>
          {errorMessage && (
            <p id={`op-error-${f.key}`} className="text-xs text-red-700 mt-2">
              {errorMessage}
            </p>
          )}
        </div>
      );
    return (
      <FormField
        key={f.key}
        spec={f}
        value={value}
        error={errorMessage}
        onChange={onChange}
      />
    );
  };
  const openNew = () => {
    if (!def) return;
    setEditor({
      id: newId(),
      module: def.id,
      companyId: def.scope === "office" ? "" : companyId,
      period: def.period ? period : "",
      values: {
        status: def.status?.[0] || "",
        date: period === today().slice(0, 7) ? today() : period + "-01",
        blocking: "Sim",
        priority: "Normal",
        disposed: "Em uso",
        audience: "Somente equipe",
      },
      createdAt: "",
      updatedAt: "",
    });
    setChanged(false);
    setErrors({});
    setNotice("");
  };
  const updateValue = (key: string, value: string) => {
    setEditor((old) =>
      old ? { ...old, values: { ...old.values, [key]: value } } : old,
    );
    setChanged(true);
    setErrors((old) => ({ ...old, [key]: "" }));
  };
  const validate = (draft: Item, definition: ModuleDef): Values => {
    const found: Values = {};
    fields(definition).forEach((f) => {
      const message = validateField(f, draft.values[f.key] || "", true);
      if (message) found[f.key] = message;
    });
    if (definition.scope === "company" && !draft.companyId)
      found.company = "Selecione uma empresa antes de cadastrar.";
    if (definition.period && !/^\d{4}-\d{2}$/.test(draft.period))
      found.period = "Selecione uma competência válida.";
    if (draft.values.amount && cents(draft.values.amount) <= 0)
      found.amount = "O valor deve ser maior que zero.";
    if (
      draft.values.date &&
      definition.period &&
      !draft.values.date.startsWith(draft.period)
    )
      found.date = "A data deve pertencer à competência selecionada.";
    if (
      draft.values.start &&
      draft.values.end &&
      draft.values.end < draft.values.start
    )
      found.end = "A data final não pode ser anterior à inicial.";
    if (
      draft.values.admission &&
      draft.values.termination &&
      draft.values.termination < draft.values.admission
    )
      found.termination = "Desligamento anterior à admissão.";
    if (
      draft.values.key &&
      definition.id === "fiscal" &&
      !/^\d{44}$/.test(draft.values.key)
    )
      found.key = "A chave NF-e deve conter 44 dígitos.";
    if (
      definition.id === "employees" &&
      allItems.some(
        (i) =>
          i.module === "employees" &&
          i.companyId === draft.companyId &&
          i.id !== draft.id &&
          i.values.cpf === draft.values.cpf,
      )
    )
      found.cpf = "CPF já cadastrado nesta empresa.";
    if (definition.id === "assets") {
      try {
        depreciation(
          cents(draft.values.amount),
          cents(draft.values.residual || ""),
          Number(draft.values.months),
        );
      } catch (e) {
        found.months = (e as Error).message;
      }
      if (draft.values.disposed === "Baixado" && !draft.values.disposalDate)
        found.disposalDate = "Informe a data da baixa.";
    }
    if (
      definition.id === "fees" &&
      (!Number.isInteger(Number(draft.values.day)) ||
        Number(draft.values.day) < 1 ||
        Number(draft.values.day) > 28)
    )
      found.day = "Use um dia de 1 a 28 para recorrência mensal.";
    if (
      definition.id === "team" &&
      (!Number.isFinite(Number(draft.values.hours)) ||
        Number(draft.values.hours) <= 0)
    )
      found.hours = "Informe uma quantidade positiva de horas.";
    if (
      definition.id === "reform" &&
      (!/^\d{1,3}([,.]\d{1,4})?$/.test(draft.values.rate) ||
        Number(draft.values.rate.replace(",", ".")) > 100)
    )
      found.rate = "Informe uma alíquota de 0 a 100%.";
    if (definition.id === "docs" && !draft.file)
      found.file = "Selecione o arquivo original.";
    if (draft.values.audience === "Empregado" && !draft.values.employeeId)
      found.employeeId = "Selecione o empregado destinatário.";
    if (
      ["payrollEvents", "benefits"].includes(definition.id) &&
      !employees.some((e) => e.id === draft.values.employeeId)
    )
      found.employeeId = "Cadastre e selecione um empregado desta empresa.";
    if (
      ["tasks", "obligations"].includes(definition.id) &&
      draft.values.status === "Concluído" &&
      !draft.values.evidence?.trim()
    )
      found.evidence = "Registre a evidência da conclusão.";
    if (
      definition.id === "obligations" &&
      draft.values.delivery === "Recepcionado" &&
      !draft.values.protocol?.trim()
    )
      found.protocol = "Informe o protocolo da recepção.";
    if (
      ["collections", "officeFinance"].includes(definition.id) &&
      draft.values.status === "Liquidado"
    ) {
      if (!draft.values.settledAt)
        found.settledAt = "Informe a data da liquidação.";
      if (!draft.values.evidence?.trim())
        found.evidence = "Informe a evidência do pagamento.";
    }
    if (
      definition.id === "clientFinance" &&
      draft.values.status === "Conciliado" &&
      !draft.values.evidence?.trim()
    )
      found.evidence = "Informe a evidência da conciliação.";
    if (
      definition.id === "automation" &&
      draft.values.debitAccount === draft.values.creditAccount
    )
      found.creditAccount = "Débito e crédito devem usar contas diferentes.";
    return found;
  };
  const save = async () => {
    if (!editor || !def) return;
    const found = validate(editor, def);
    setErrors(found);
    if (Object.keys(found).length) {
      setNotice("Revise os campos indicados.");
      return;
    }
    const ok = await act((next) => {
      if (def.scope === "company")
        assertOpen(next, editor.companyId, editor.period || period);
      const old = next.items.find((i) => i.id === editor.id);
      if (old && old.updatedAt !== editor.updatedAt)
        throw new Error(
          "Registro alterado em outra aba. Recarregue antes de editar.",
        );
      if (
        next.entries.some((e) => e.sourceId === editor.id) &&
        old &&
        JSON.stringify(old.values) !== JSON.stringify(editor.values)
      )
        throw new Error(
          "Registro já contabilizado. Preserve a origem e use estorno para corrigir.",
        );
      if (["fiscal", "clientFinance"].includes(def.id)) {
        const key = def.id === "fiscal" ? "key" : "externalId";
        if (
          editor.values[key] &&
          next.items.some(
            (i) =>
              !i.archived &&
              i.id !== editor.id &&
              i.module === def.id &&
              i.companyId === editor.companyId &&
              i.values[key] === editor.values[key],
          )
        )
          throw new Error("Identificador de origem já cadastrado.");
      }
      const at = new Date().toISOString();
      if (
        old?.values.status === "Liquidado" &&
        ["collections", "officeFinance"].includes(def.id) &&
        ["amount", "status", "settledAt", "evidence"].some(
          (k) => old.values[k] !== editor.values[k],
        )
      )
        throw new Error(
          "Liquidação já registrada. Preserve a evidência original e registre eventual ajuste financeiro separadamente.",
        );
      const record = {
        ...editor,
        updatedAt: at,
        createdAt: editor.createdAt || at,
      };
      next.items = next.items.filter((i) => i.id !== record.id);
      next.items.push(record);
      if (def.id === "collections" && record.values.status === "Liquidado") {
        const origin = `collection:${record.id}`;
        if (
          !next.items.some(
            (i) => i.module === "officeFinance" && i.values.origin === origin,
          )
        ) {
          next.items.push({
            id: newId(),
            module: "officeFinance",
            companyId: "",
            period: "",
            createdAt: at,
            updatedAt: at,
            values: {
              title: `Honorários: ${record.values.title}`,
              type: "Receita",
              amount: record.values.amount,
              due: record.values.due,
              status: "Liquidado",
              settledAt: record.values.settledAt,
              evidence: record.values.evidence,
              origin,
              notes: `Origem: cobrança ${record.id}, empresa ${record.companyId}`,
            },
          });
          audit(
            next,
            "Recebimento integrado ao financeiro do escritório",
            record.id,
            "",
            record.period,
          );
        }
      }
      audit(
        next,
        old ? "Registro atualizado" : "Registro criado",
        record.id,
        record.companyId,
        record.period,
        def.name,
      );
    }, "Registro salvo.");
    if (ok) {
      setEditor(null);
      setChanged(false);
    }
  };
  const archive = async (item: Item) => {
    if (!window.confirm("Arquivar este registro? O histórico será preservado."))
      return;
    await act((next) => {
      const old = next.items.find((i) => i.id === item.id);
      if (!old) throw new Error("Registro não encontrado.");
      if (old.companyId) assertOpen(next, old.companyId, old.period || period);
      if (next.entries.some((e) => e.sourceId === old.id))
        throw new Error("Não é possível arquivar uma origem contabilizada.");
      if (
        old.values.status === "Liquidado" &&
        ["collections", "officeFinance"].includes(old.module)
      )
        throw new Error(
          "Recebimentos e pagamentos liquidados permanecem preservados. Registre ajustes separadamente.",
        );
      old.archived = true;
      old.updatedAt = new Date().toISOString();
      audit(
        next,
        "Registro arquivado",
        old.id,
        old.companyId,
        old.period,
        old.module,
      );
    }, "Registro arquivado.");
  };
  const integrate = (item: Item) => {
    const incoming = item.values.direction === "Entrada";
    const fiscal = item.module === "fiscal";
    setEntryEditor({
      id: newId(),
      companyId: item.companyId,
      period: item.period,
      date: item.values.date || item.period + "-01",
      description: item.values.title,
      sourceId: item.id,
      createdAt: "",
      lines: [
        {
          accountId: fiscal
            ? incoming
              ? "expense"
              : "receivable"
            : incoming
              ? "cash"
              : "expense",
          debit: cents(item.values.amount),
          credit: 0,
        },
        {
          accountId: fiscal
            ? incoming
              ? "payable"
              : "revenue"
            : incoming
              ? "revenue"
              : "cash",
          debit: 0,
          credit: cents(item.values.amount),
        },
      ],
    });
    setNotice("Confira as contas antes de registrar a integração.");
    setChanged(true);
  };
  const generateFee = (item: Item) =>
    void act((next) => {
      assertOpen(next, item.companyId, period);
      const key = `fee:${item.id}:${period}`;
      if (next.items.some((i) => i.values.origin === key))
        throw new Error("Cobrança já gerada nesta competência.");
      if (
        item.values.start > period + "-31" ||
        (item.values.end && item.values.end < period + "-01")
      )
        throw new Error("Contrato fora da vigência.");
      const at = new Date().toISOString();
      next.items.push({
        id: newId(),
        module: "collections",
        companyId: item.companyId,
        period,
        values: {
          title: item.values.title,
          amount: item.values.amount,
          due: `${period}-${item.values.day.padStart(2, "0")}`,
          status: "Aberto",
          origin: key,
        },
        createdAt: at,
        updatedAt: at,
      });
      audit(
        next,
        "Cobrança de honorários gerada",
        item.id,
        item.companyId,
        period,
      );
    }, "Cobrança gerada. Consulte o módulo Cobranças.");
  const saveEntry = async () => {
    if (!entryEditor) return;
    const ok = await act(
      (next) =>
        addEntry(next, { ...entryEditor, createdAt: new Date().toISOString() }),
      "Lançamento registrado com partidas balanceadas.",
    );
    if (ok) {
      setEntryEditor(null);
      setChanged(false);
    }
  };
  const reverse = (entry: Entry) => {
    const why = window.prompt(
      "Motivo do estorno (o lançamento original será preservado):",
    );
    if (!why?.trim()) return;
    void act((next) => {
      addEntry(next, {
        ...entry,
        id: newId(),
        period,
        date: period === today().slice(0, 7) ? today() : period + "-01",
        sourceId: undefined,
        reverses: entry.id,
        description: `Estorno: ${entry.description}. ${why}`,
        lines: entry.lines.map((l) => ({
          ...l,
          debit: l.credit,
          credit: l.debit,
        })),
        createdAt: new Date().toISOString(),
      });
    }, "Estorno registrado; o lançamento original foi preservado.");
  };
  const importOfx = async (file: File) => {
    if (!companyId) return setNotice("Selecione uma empresa.");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("O arquivo deve ter até 5 MB.");
      const rows = parseOfx(await file.text());
      await act((next) => {
        assertOpen(next, companyId, period);
        let count = 0;
        for (const row of rows) {
          if (
            !row.date.startsWith(period) ||
            next.items.some(
              (i) =>
                i.module === "clientFinance" &&
                i.companyId === companyId &&
                i.values.externalId === row.externalId,
            )
          )
            continue;
          const at = new Date().toISOString();
          next.items.push({
            id: newId(),
            module: "clientFinance",
            companyId,
            period,
            values: {
              title: row.description,
              date: row.date,
              amount: money(Math.abs(row.amount)),
              direction: row.amount < 0 ? "Saída" : "Entrada",
              externalId: row.externalId,
              status: "Pendente",
            },
            createdAt: at,
            updatedAt: at,
          });
          count++;
        }
        if (!count)
          throw new Error("Nenhuma transação nova nesta competência.");
        audit(
          next,
          `${count} movimentos OFX importados`,
          file.name,
          companyId,
          period,
        );
      }, "Movimentos novos importados. Duplicidades e outras competências foram ignoradas.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const importXml = async (file: File) => {
    if (!companyId) return setNotice("Selecione uma empresa.");
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("O XML deve ter até 5 MB.");
      const text = await file.text();
      const xml = new DOMParser().parseFromString(text, "application/xml");
      if (xml.querySelector("parsererror")) throw new Error("XML inválido.");
      const info = xml.getElementsByTagName("infNFe")[0];
      if (!info)
        throw new Error(
          "Este importador aceita XML NF-e com infNFe; NFS-e exige leiaute específico.",
        );
      const tag = (n: string) =>
        info.getElementsByTagName(n)[0]?.textContent || "";
      const key = (info.getAttribute("Id") || "").replace(/^NFe/, "");
      const issued = (tag("dhEmi") || tag("dEmi")).slice(0, 10);
      if (!/^\d{44}$/.test(key) || !issued.startsWith(period))
        throw new Error("Chave inválida ou documento fora da competência.");
      const issuer = info.getElementsByTagName("emit")[0];
      const issuerCnpj =
        issuer?.getElementsByTagName("CNPJ")[0]?.textContent || "";
      const destination =
        info.getElementsByTagName("dest")[0]?.getElementsByTagName("CNPJ")[0]
          ?.textContent || "";
      const current = (company?.values.cnpj || "").replace(/\D/g, "");
      if (issuerCnpj !== current && destination !== current)
        throw new Error(
          "O CNPJ da empresa não aparece como emitente ou destinatário deste XML.",
        );
      const value = Number(tag("vNF"));
      if (!Number.isFinite(value) || value <= 0)
        throw new Error("Valor total da nota inválido.");
      await act((next) => {
        assertOpen(next, companyId, period);
        if (
          next.items.some(
            (i) =>
              i.module === "fiscal" &&
              i.companyId === companyId &&
              i.values.key === key,
          )
        )
          throw new Error("XML já importado para esta empresa.");
        const at = new Date().toISOString();
        next.items.push({
          id: newId(),
          module: "fiscal",
          companyId,
          period,
          file,
          values: {
            title: `NF-e ${tag("nNF")}`,
            key,
            date: issued,
            number: tag("nNF"),
            direction: issuerCnpj === current ? "Saída" : "Entrada",
            issuer: issuer?.getElementsByTagName("xNome")[0]?.textContent || "",
            amount: money(Math.round(value * 100)),
            status: "Importado",
          },
          createdAt: at,
          updatedAt: at,
        });
        audit(next, "XML NF-e importado", key, companyId, period);
      }, "XML NF-e importado com original preservado. A assinatura digital não foi validada.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const processAsset = (item: Item) =>
    void act((next) => {
      assertOpen(next, item.companyId, period);
      if (item.values.disposed === "Baixado")
        throw new Error("O bem está baixado.");
      if (item.values.date.slice(0, 7) >= period)
        throw new Error("A depreciação inicia no mês seguinte à aquisição.");
      const id = `depreciation:${item.id}:${period}`;
      const base =
        cents(item.values.amount) - cents(item.values.residual || "");
      const previous = next.items
        .filter(
          (i) =>
            i.module === "assetDepreciation" && i.values.assetId === item.id,
        )
        .reduce((s, i) => s + cents(i.values.amount), 0);
      const amount = Math.min(
        depreciation(
          cents(item.values.amount),
          cents(item.values.residual || ""),
          Number(item.values.months),
        ),
        base - previous,
      );
      if (amount <= 0)
        throw new Error("O valor depreciável já foi totalmente processado.");
      if (next.entries.some((e) => e.sourceId === id))
        throw new Error("Depreciação já contabilizada nesta competência.");
      addEntry(next, {
        id: newId(),
        companyId: item.companyId,
        period,
        date: period + "-01",
        description: `Depreciação linear: ${item.values.title}`,
        sourceId: id,
        createdAt: new Date().toISOString(),
        lines: [
          { accountId: "depExpense", debit: amount, credit: 0 },
          { accountId: "depreciation", debit: 0, credit: amount },
        ],
      });
      const at = new Date().toISOString();
      next.items.push({
        id: newId(),
        module: "assetDepreciation",
        companyId: item.companyId,
        period,
        values: {
          assetId: item.id,
          amount: money(amount),
          title: item.values.title,
        },
        createdAt: at,
        updatedAt: at,
      });
    }, "Depreciação contabilizada. Confira o lançamento e a memória de cálculo.");
  const backup = async () => {
    setBusy(true);
    try {
      const state = await loadData();
      const backupCompanies = await listCompanies();
      const encode = async (file: Blob) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let str = "";
        for (const b of bytes) str += String.fromCharCode(b);
        return btoa(str);
      };
      const files: Record<
        string,
        { name: string; type: string; base64: string }
      > = {};
      for (const i of state.items) {
        if (i.file) {
          files[i.id] = {
            name: i.file.name,
            type: i.file.type,
            base64: await encode(i.file),
          };
        }
      }
      const companyFiles: Record<
        string,
        { name: string; type: string; base64: string }
      > = {};
      for (const c of backupCompanies) {
        for (const a of c.attachments) {
          companyFiles[a.id] = {
            name: a.name,
            type: a.file.type,
            base64: await encode(a.file),
          };
        }
      }
      download(
        `nexo-backup-${today()}.json`,
        JSON.stringify({
          format: "nexo-backup-v1",
          exportedAt: new Date().toISOString(),
          data: state,
          companies: backupCompanies,
          files,
          companyFiles,
        }),
        "application/json",
      );
      setNotice(
        "Backup exportado com cadastros e arquivos. Guarde em local protegido.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const table = (headers: string[], rows: ReactNode[][]) => (
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full text-left text-xs bg-white">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="p-4 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-neutral-100">
              {row.map((cell, j) => (
                <td key={j} className="p-4 align-top min-w-24">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="bg-white p-8 text-sm text-neutral-400">
          Nenhum registro neste contexto.
        </p>
      )}
    </div>
  );
  const entryForm = () => {
    if (!entryEditor) return null;
    const debit = entryEditor.lines.reduce((s, l) => s + l.debit, 0),
      credit = entryEditor.lines.reduce((s, l) => s + l.credit, 0);
    return (
      <Section title="Lançamento contábil">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void saveEntry();
          }}
        >
          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              spec={{
                key: "entryDate",
                label: "Data",
                type: "date",
                required: true,
              }}
              value={entryEditor.date}
              onChange={(v) => {
                setEntryEditor({ ...entryEditor, date: v });
                setChanged(true);
              }}
            />
            <FormField
              spec={{
                key: "entryDescription",
                label: "Histórico",
                placeholder: "Descreva o fato contábil",
                required: true,
              }}
              value={entryEditor.description}
              onChange={(v) => {
                setEntryEditor({ ...entryEditor, description: v });
                setChanged(true);
              }}
            />
          </div>
          <div className="mt-5 space-y-4">
            {entryEditor.lines.map((l, index) => (
              <div
                key={index}
                className="grid sm:grid-cols-[1fr_160px_160px_auto] items-end gap-3 border-b border-neutral-100 pb-4"
              >
                <label className="text-xs">
                  Conta
                  <select
                    aria-label={`Conta da partida ${index + 1}`}
                    className={`${input} mt-2`}
                    value={l.accountId}
                    onChange={(e) => {
                      const lines = [...entryEditor.lines];
                      lines[index] = { ...l, accountId: e.target.value };
                      setEntryEditor({ ...entryEditor, lines });
                      setChanged(true);
                    }}
                  >
                    <option value="">Selecione</option>
                    {data.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                {(["debit", "credit"] as const).map((side) => (
                  <FormField
                    key={side}
                    spec={{
                      key: `${side}-${index}`,
                      label: side === "debit" ? "Débito" : "Crédito",
                      mask: "money",
                      placeholder: "R$ 0,00",
                    }}
                    value={l[side] ? money(l[side]) : ""}
                    onChange={(v) => {
                      const lines = [...entryEditor.lines];
                      lines[index] = { ...l, [side]: cents(v) };
                      setEntryEditor({ ...entryEditor, lines });
                      setChanged(true);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="text-xs p-3"
                  onClick={() => {
                    setEntryEditor({
                      ...entryEditor,
                      lines: entryEditor.lines.filter((_, i) => i !== index),
                    });
                    setChanged(true);
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-4 justify-between text-xs">
            <button
              type="button"
              className="underline"
              onClick={() => {
                setEntryEditor({
                  ...entryEditor,
                  lines: [
                    ...entryEditor.lines,
                    { accountId: "", debit: 0, credit: 0 },
                  ],
                });
                setChanged(true);
              }}
            >
              Adicionar partida
            </button>
            <span>
              Débitos: {money(debit)} · Créditos: {money(credit)} · Diferença:{" "}
              {money(debit - credit)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <button disabled={busy} className={button}>
              Registrar lançamento
            </button>
            <button
              type="button"
              className={button}
              onClick={() => {
                if (canLeaveWorkspace()) {
                  setEntryEditor(null);
                  setChanged(false);
                }
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Section>
    );
  };
  if (loading)
    return (
      <p role="status" className="flex gap-2 text-sm">
        <LoaderCircle className="w-4 h-4 animate-spin" />
        Carregando operação…
      </p>
    );
  if (error)
    return (
      <p role="alert">
        {error} Recarregue a página após conferir as permissões do navegador.
      </p>
    );
  const names: Record<string, string> = {
    home: "Visão geral",
    jobs: "Cargos",
    unions: "Sindicatos",
    chart: "Indicadores e relatórios",
    accounting: "Contabilidade",
    accounts: "Plano de contas",
    closing: "Revisão e fechamento",
    audit: "Histórico de operações",
    backup: "Backup e recuperação",
    clientPortal: "Portal do cliente · prévia interna",
    employeePortal: "Portal do empregado · prévia interna",
    invoiceSearch: "Importação NF-e",
    banking: "Conciliação e conta digital",
    searchAll: "Busca global",
  };
  const header = (
    <>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {def?.name || names[moduleId] || "Operação"}
          </h1>
          <p className="text-sm text-neutral-500 mt-2">
            {def?.description ||
              (["jobs", "unions"].includes(moduleId)
                ? "Cadastros compartilhados entre as empresas do escritório."
                : "Dados vinculados à empresa, competência e origem.")}
          </p>
        </div>
        {def && (
          <button
            disabled={busy || (def.scope === "company" && !companyId)}
            className={button}
            onClick={openNew}
          >
            <Plus className="w-4 h-4" />
            Novo registro
          </button>
        )}
      </div>
      <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
        {cloudConfigured
          ? "Banco conectado para validação. Acesso restrito à conta proprietária; convites de equipe e portais externos ainda não estão habilitados."
          : "Validação local: dados neste navegador, sem autenticação ou sincronização."}{" "}
        Não use dados reais de clientes. Integrações oficiais e cálculos legais
        não estão ativos.
      </div>
      {!["jobs", "unions"].includes(moduleId) && (
        <div className="grid sm:grid-cols-[1fr_180px_auto] gap-4 items-end rounded-xl border border-neutral-200 p-4 bg-white mb-6">
          <label className="text-xs font-medium">
            Empresa
            <select
              aria-label="Empresa em contexto"
              className={`${input} mt-2`}
              value={companyId}
              onChange={(e) => {
                if (!canLeaveWorkspace()) return;
                setCompanyId(e.target.value);
                setEditor(null);
                setEntryEditor(null);
                setChanged(false);
                setNotice("");
              }}
            >
              <option value="">Selecione uma empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.values.tradeName || c.values.legalName}
                </option>
              ))}
            </select>
          </label>
          <FormField
            spec={{ key: "contextPeriod", label: "Competência", type: "month" }}
            value={period}
            onChange={(v) => {
              if (!/^\d{4}-\d{2}$/.test(v) || !canLeaveWorkspace()) return;
              setPeriod(v);
              setEditor(null);
              setEntryEditor(null);
              setChanged(false);
            }}
          />
          <span
            className={`text-xs rounded-lg px-3 py-3 mb-1 ${closing?.state === "Fechado" ? "bg-emerald-50 text-emerald-800" : "bg-neutral-50 text-neutral-500"}`}
          >
            {closing?.state || "Aberto"}
          </span>
        </div>
      )}
      {!["jobs", "unions"].includes(moduleId) && !companies.length && (
        <p className="mb-6 text-sm text-neutral-500">
          Cadastre uma empresa em Empresas para iniciar os módulos operacionais.
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-neutral-200 bg-white p-4 text-sm mb-5"
        >
          {notice}
        </p>
      )}
    </>
  );
  if (editor && def)
    return (
      <div>
        {header}
        <button
          className="text-xs flex items-center gap-2 mb-5"
          onClick={() => {
            if (canLeaveWorkspace()) {
              setEditor(null);
              setChanged(false);
            }
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar à lista
        </button>
        <Section title={editor.createdAt ? "Editar registro" : "Novo registro"}>
          {def.note && (
            <p className="text-xs text-neutral-500 mb-6">{def.note}</p>
          )}
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              className="mb-5 rounded-lg bg-red-50 text-red-800 p-3 text-xs"
            >
              {Object.values(errors).filter(Boolean).join(" ")}
            </div>
          )}
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="grid md:grid-cols-2 gap-5">
              {fields(def).map((f) =>
                labeledField(
                  f,
                  editor.values[f.key] || "",
                  (v) => updateValue(f.key, v),
                  errors[f.key],
                ),
              )}
              {def.status && (
                <FormField
                  spec={{
                    key: "status",
                    label: "Situação",
                    options: def.status,
                    required: true,
                  }}
                  value={editor.values.status || ""}
                  onChange={(v) => updateValue("status", v)}
                />
              )}
            </div>
            {def.id === "docs" && (
              <div className="mt-5">
                <label className="block text-xs font-semibold">
                  Arquivo original · até 10 MB
                  <input
                    aria-label="Arquivo original"
                    type="file"
                    disabled={!!editor.file}
                    className={`${input} mt-2`}
                    accept=".pdf,.xml,.csv,.ofx,.png,.jpg,.jpeg,.xlsx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        setErrors((old) => ({
                          ...old,
                          file: "O arquivo deve ter até 10 MB.",
                        }));
                        return;
                      }
                      const hash = Array.from(
                        new Uint8Array(
                          await crypto.subtle.digest(
                            "SHA-256",
                            await file.arrayBuffer(),
                          ),
                        ),
                      )
                        .map((b) => b.toString(16).padStart(2, "0"))
                        .join("");
                      if (
                        data.items.some(
                          (i) =>
                            i.module === "docs" &&
                            i.companyId === companyId &&
                            i.values.hash === hash,
                        )
                      ) {
                        setErrors((old) => ({
                          ...old,
                          file: "Arquivo idêntico já cadastrado nesta empresa.",
                        }));
                        return;
                      }
                      setEditor((c) =>
                        c ? { ...c, file, values: { ...c.values, hash } } : c,
                      );
                      setChanged(true);
                      setErrors((old) => ({ ...old, file: "" }));
                    }}
                  />
                </label>
                {editor.file && (
                  <p className="text-xs mt-2 text-neutral-500">
                    {editor.file.name} · O original é preservado. Para nova
                    versão, crie outro registro.
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button className={button} disabled={busy}>
                <Check className="w-4 h-4" />
                Salvar registro
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  if (canLeaveWorkspace()) {
                    setEditor(null);
                    setChanged(false);
                  }
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Section>
      </div>
    );
  const rows = def
    ? allItems.filter(
        (i) =>
          i.module === def.id &&
          (def.scope === "office" || i.companyId === companyId) &&
          (!def.period || i.period === period) &&
          (status === "Todos" || i.values.status === status) &&
          normalize(Object.values(i.values).join(" ")).includes(
            normalize(query),
          ),
      )
    : [];
  const renderGeneric = () =>
    def && (
      <>
        {def.note && (
          <p className="text-xs text-neutral-500 leading-relaxed mb-5">
            {def.note}
          </p>
        )}
        {def.id === "fiscal" && (
          <label className={`${button} mb-5`}>
            <FileUp className="w-4 h-4" />
            Importar XML NF-e
            <input
              type="file"
              className="sr-only"
              accept=".xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importXml(f);
              }}
            />
          </label>
        )}
        {def.id === "clientFinance" && (
          <label className={`${button} mb-5`}>
            <FileUp className="w-4 h-4" />
            Importar OFX
            <input
              type="file"
              className="sr-only"
              accept=".ofx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importOfx(f);
              }}
            />
          </label>
        )}
        {def.id === "payrollEvents" && (
          <Section title="Resumo preliminar dos eventos informados">
            <div className="grid sm:grid-cols-3 gap-4">
              {Object.entries(
                payrollSummary(data.items, companyId, period),
              ).map(([key, n]) => (
                <div key={key}>
                  <p className="text-xs text-neutral-500">
                    {key === "earnings"
                      ? "Proventos"
                      : key === "deductions"
                        ? "Descontos"
                        : "Líquido preliminar"}
                  </p>
                  <p className="text-xl font-semibold mt-2">{money(n)}</p>
                </div>
              ))}
            </div>
          </Section>
        )}
        <div className="flex flex-wrap justify-between gap-3 mb-5">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
            <input
              className={`${input} !pl-10`}
              aria-label="Buscar registros"
              placeholder="Buscar registros…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {def.status && (
            <select
              className={`${input} !w-auto`}
              aria-label="Filtrar situação"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {["Todos", ...def.status].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
          <button
            className={button}
            onClick={() =>
              download(
                `${def.id}-${period}.csv`,
                csv([
                  def.columns.map((k) => labelOf(def, k)),
                  ...rows.map((r) => def.columns.map((k) => read(r, k))),
                ]),
                "text/csv",
              )
            }
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>
        <p className="text-xs text-neutral-400 mb-3">
          {rows.length} registro(s) ·{" "}
          {def.scope === "office"
            ? "Dados do escritório"
            : "Empresa selecionada"}
          {def.period ? ` · ${period}` : ""}
        </p>
        {table(
          [...def.columns.map((k) => labelOf(def, k)), "Ações"],
          rows.map((r) => [
            ...def.columns.map((k) => (
              <span
                key={k}
                className={
                  k === "status"
                    ? "rounded-md bg-neutral-100 px-2 py-1 whitespace-nowrap"
                    : ""
                }
              >
                {read(r, k)}
              </span>
            )),
            <div className="flex flex-wrap gap-3 text-xs">
              <button
                className="underline"
                onClick={() => {
                  setEditor(structuredClone(r));
                  setErrors({});
                  setChanged(false);
                }}
              >
                Editar
              </button>
              <button className="underline" onClick={() => setDetail(r)}>
                Detalhes
              </button>
              {["clientFinance", "fiscal"].includes(def.id) &&
                !data.entries.some((e) => e.sourceId === r.id) && (
                  <button className="underline" onClick={() => integrate(r)}>
                    Contabilizar
                  </button>
                )}
              {["tasks", "obligations"].includes(def.id) &&
                r.values.recurrence === "Mensal" && (
                  <button
                    className="underline"
                    onClick={() =>
                      void act((next) => {
                        const live = next.items.find((i) => i.id === r.id);
                        if (!live) throw new Error("Tarefa não encontrada.");
                        generateNextTask(next, live);
                      }, "Próxima ocorrência mensal gerada. Selecione a próxima competência para visualizar.")
                    }
                  >
                    Gerar próximo mês
                  </button>
                )}
              {def.id === "fees" && (
                <button className="underline" onClick={() => generateFee(r)}>
                  Gerar cobrança
                </button>
              )}
              {def.id === "assets" && (
                <button className="underline" onClick={() => processAsset(r)}>
                  Depreciar mês
                </button>
              )}
              <button
                aria-label={`Arquivar ${r.values.title}`}
                className="text-neutral-400"
                onClick={() => void archive(r)}
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>,
          ]),
        )}
      </>
    );
  const home = () => {
    const openTasks = contextItems.filter(
      (i) =>
        ["tasks", "obligations"].includes(i.module) &&
        i.values.status !== "Concluído",
    );
    const docs = contextItems.filter((i) => i.module === "docs");
    return (
      <>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            ["Empresas cadastradas", companies.length],
            ["Pendências na competência", openTasks.length],
            ["Documentos recebidos", docs.length],
            [
              "Lançamentos contábeis",
              data.entries.filter(
                (e) => e.companyId === companyId && e.period === period,
              ).length,
            ],
          ].map(([label, n]) => (
            <div
              key={label}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <p className="text-xs text-neutral-500">{label}</p>
              <p className="text-3xl font-semibold mt-3">{n}</p>
            </div>
          ))}
        </div>
        <Section title="Próximas ações">
          {table(
            ["Pendência", "Responsável", "Prazo", "Situação"],
            openTasks
              .sort((a, b) =>
                (a.values.due || "").localeCompare(b.values.due || ""),
              )
              .map((r) => [
                r.values.title,
                r.values.owner,
                r.values.due,
                r.values.status,
              ]),
          )}
        </Section>
        <Section title="Jornada da competência">
          <ol className="grid sm:grid-cols-4 gap-4 text-xs text-neutral-500">
            {[
              "1. Cadastrar empresa",
              "2. Receber documentos",
              "3. Processar e conferir",
              "4. Revisar e fechar",
            ].map((t) => (
              <li key={t} className="border border-neutral-200 p-4 rounded-xl">
                {t}
              </li>
            ))}
          </ol>
        </Section>
      </>
    );
  };
  const accounting = () => {
    const entries = data.entries.filter(
      (e) => e.companyId === companyId && e.period === period,
    );
    const report = balance(data, companyId, period);
    return (
      <>
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            disabled={!companyId}
            className={button}
            onClick={() => {
              setEntryEditor({
                id: newId(),
                companyId,
                period,
                date: period + "-01",
                description: "",
                createdAt: "",
                lines: [
                  { accountId: "", debit: 0, credit: 0 },
                  { accountId: "", debit: 0, credit: 0 },
                ],
              });
              setChanged(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Novo lançamento
          </button>
          <button
            className={button}
            onClick={() =>
              download(
                `balancete-${period}.csv`,
                csv([
                  [
                    "Conta",
                    "Descrição",
                    "Saldo anterior",
                    "Débito",
                    "Crédito",
                    "Saldo final",
                  ],
                  ...report.map((r) => [
                    r.code,
                    r.name,
                    money(r.opening),
                    money(r.debit),
                    money(r.credit),
                    money(r.closing),
                  ]),
                ]),
                "text/csv",
              )
            }
          >
            Exportar balancete
          </button>
          <button className={button} onClick={() => window.print()}>
            Imprimir
          </button>
        </div>
        <Section title="Diário contábil">
          {table(
            ["Data", "Histórico", "Partidas", "Ação"],
            entries.map((e) => [
              e.date.split("-").reverse().join("/"),
              <div>
                {e.description}
                {e.reverses && (
                  <p className="mt-2 text-neutral-400">
                    Estorno de {e.reverses.slice(0, 8)}
                  </p>
                )}
              </div>,
              <div className="space-y-2">
                {e.lines.map((l, i) => (
                  <p key={i}>
                    {data.accounts.find((a) => a.id === l.accountId)?.code} ·{" "}
                    {l.debit ? "D" : "C"} {money(l.debit || l.credit)}
                  </p>
                ))}
              </div>,
              <button
                className="underline"
                disabled={
                  !!e.reverses || data.entries.some((r) => r.reverses === e.id)
                }
                onClick={() => reverse(e)}
              >
                Estornar
              </button>,
            ]),
          )}
        </Section>
        <Section title="Balancete · saldo devedor positivo, credor negativo">
          {table(
            [
              "Conta",
              "Descrição",
              "Saldo anterior",
              "Débito",
              "Crédito",
              "Saldo final",
            ],
            report.map((r) => [
              r.code,
              r.name,
              money(r.opening),
              money(r.debit),
              money(r.credit),
              money(r.closing),
            ]),
          )}
        </Section>
        <Section title="Resultado preliminar dos movimentos da competência">
          <p className="text-sm">
            Receitas menos despesas:{" "}
            {money(
              report
                .filter((r) => r.kind === "Receita")
                .reduce((s, r) => s + r.credit - r.debit, 0) -
                report
                  .filter((r) => r.kind === "Despesa")
                  .reduce((s, r) => s + r.debit - r.credit, 0),
            )}
          </p>
          <p className="text-xs text-neutral-400 mt-3">
            Não representa demonstração oficial ou encerramento de contas de
            resultado.
          </p>
        </Section>
      </>
    );
  };
  const accounts = () => (
    <>
      <button
        className={`${button} mb-5`}
        onClick={() => {
          setAccountEditor(true);
          setAccountValues({ kind: "Ativo" });
        }}
      >
        Adicionar conta
      </button>
      {accountEditor && (
        <Section title="Nova conta">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act((next) => {
                if (!accountValues.code?.trim() || !accountValues.name?.trim())
                  throw new Error("Informe código e nome.");
                if (next.accounts.some((a) => a.code === accountValues.code))
                  throw new Error("Código de conta já utilizado.");
                next.accounts.push({
                  id: newId(),
                  code: accountValues.code,
                  name: accountValues.name,
                  kind: accountValues.kind as "Ativo",
                });
                audit(
                  next,
                  "Conta criada",
                  accountValues.code,
                  "",
                  "",
                  "Plano compartilhado de demonstração",
                );
              }, "Conta adicionada.").then((ok) => {
                if (ok) setAccountEditor(false);
              });
            }}
          >
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { key: "code", label: "Código", placeholder: "1.1.03" },
                { key: "name", label: "Nome", placeholder: "Nome da conta" },
                {
                  key: "kind",
                  label: "Grupo",
                  options: [
                    "Ativo",
                    "Passivo",
                    "Patrimônio líquido",
                    "Receita",
                    "Despesa",
                  ],
                },
              ].map((f) => (
                <FormField
                  key={f.key}
                  spec={f}
                  value={accountValues[f.key] || ""}
                  onChange={(v) =>
                    setAccountValues({ ...accountValues, [f.key]: v })
                  }
                />
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button className={button}>Salvar conta</button>
              <button
                type="button"
                className={button}
                onClick={() => setAccountEditor(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Section>
      )}
      {table(
        ["Código", "Conta", "Grupo"],
        data.accounts.map((a) => [a.code, a.name, a.kind]),
      )}
      <p className="mt-4 text-xs text-neutral-400">
        Plano compartilhado neste protótipo. Contas utilizadas permanecem
        preservadas.
      </p>
    </>
  );
  const close = () => (
    <Section title="Controle da competência">
      <p className="text-sm mb-5">
        Estado atual: <strong>{closing?.state || "Aberto"}</strong>
      </p>
      <FormField
        spec={{
          key: "closingReason",
          label: "Justificativa / revisão",
          type: "textarea",
          placeholder: "Registre a conferência ou o motivo da reabertura.",
        }}
        value={reason}
        onChange={setReason}
      />
      <div className="flex flex-wrap gap-3 mt-5">
        {(["Aberto", "Em revisão", "Fechado"] as const).map((state) => (
          <button
            disabled={busy || !companyId}
            className={button}
            key={state}
            onClick={() =>
              void act(
                (next) =>
                  transitionClosing(next, companyId, period, state, reason),
                `Competência atualizada: ${state}.`,
              )
            }
          >
            {state === "Aberto"
              ? "Abrir / reabrir"
              : state === "Em revisão"
                ? "Encaminhar à revisão"
                : "Aprovar fechamento"}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-neutral-400 mt-5">
        O fechamento exige lançamentos, revisão, justificativa e ausência de
        tarefas impeditivas. Ele bloqueia operações locais do período; não
        comprova transmissão ou pagamento de obrigações.
      </p>
    </Section>
  );
  const reports = () => {
    const payroll = payrollSummary(data.items, companyId, period);
    return (
      <>
        <Section title="Resumo da empresa e competência">
          {table(
            ["Indicador", "Valor"],
            [
              [
                "Lançamentos contábeis",
                data.entries.filter(
                  (e) => e.companyId === companyId && e.period === period,
                ).length,
              ],
              [
                "Documentos fiscais",
                contextItems.filter((i) => i.module === "fiscal").length,
              ],
              [
                "Cobranças em aberto",
                money(
                  contextItems
                    .filter(
                      (i) =>
                        i.module === "collections" &&
                        i.values.status === "Aberto",
                    )
                    .reduce((s, i) => s + cents(i.values.amount), 0),
                ),
              ],
              ["Líquido preliminar da folha", money(payroll.net)],
            ],
          )}
        </Section>
        {accounting()}
      </>
    );
  };
  const portal = (employeeMode: boolean) => {
    const visible = contextItems.filter(
      (i) =>
        i.module === "docs" &&
        i.values.status === "Aprovado" &&
        i.values.audience === (employeeMode ? "Empregado" : "Cliente") &&
        (!employeeMode || i.values.employeeId === employee),
    );
    return (
      <>
        <p className="text-sm text-neutral-500 mb-5">
          Visualização interna do que será disponibilizado. Não é um portal
          externo autenticado; a segregação por usuário depende do backend.
        </p>
        {employeeMode && (
          <label className="block text-xs mb-5">
            Empregado
            <select
              className={`${input} mt-2`}
              aria-label="Empregado do portal"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            >
              <option value="">Selecione</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.values.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {table(
          ["Documento", "Tipo", "Arquivo"],
          visible.map((i) => [
            i.values.title,
            i.values.kind,
            i.file ? (
              <button
                className="underline"
                onClick={() => download(i.file!.name, i.file!)}
              >
                Baixar documento
              </button>
            ) : (
              "Arquivo indisponível"
            ),
          ]),
        )}
      </>
    );
  };
  const bank = () => {
    const movements = contextItems.filter((i) => i.module === "clientFinance");
    return (
      <>
        <Section title="Importação e conciliação bancária">
          <p className="text-xs text-neutral-500 mb-5">
            Importe OFX no módulo Financeiro dos clientes. A conexão bancária
            online e operações financeiras exigem parceiro habilitado e
            consentimento.
          </p>
          <label className={button}>
            <FileUp className="w-4 h-4" />
            Importar OFX
            <input
              type="file"
              className="sr-only"
              accept=".ofx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importOfx(f);
              }}
            />
          </label>
        </Section>
        {table(
          ["Descrição", "Data", "Valor", "Situação", "Classificação"],
          movements.map((i) => {
            const rule = allItems.find(
              (r) =>
                r.module === "automation" &&
                r.companyId === companyId &&
                normalize(i.values.title).includes(normalize(r.values.match)),
            );
            return [
              i.values.title,
              i.values.date,
              money(cents(i.values.amount)),
              i.values.status,
              <button
                className="underline"
                onClick={() => {
                  integrate(i);
                  if (rule)
                    setEntryEditor((e) =>
                      e
                        ? {
                            ...e,
                            lines: [
                              {
                                accountId: rule.values.debitAccount,
                                debit: cents(i.values.amount),
                                credit: 0,
                              },
                              {
                                accountId: rule.values.creditAccount,
                                debit: 0,
                                credit: cents(i.values.amount),
                              },
                            ],
                          }
                        : e,
                    );
                }}
              >
                {rule ? "Revisar sugestão" : "Classificar"}
              </button>,
            ];
          }),
        )}
      </>
    );
  };
  return (
    <div>
      {header}
      {entryForm()}
      {def && moduleId !== "employees" && renderGeneric()}
      {moduleId === "employees" &&
        (companies.find((c) => c.id === companyId) ? (
          <CompanyEmployees
            key={companyId}
            company={companies.find((c) => c.id === companyId)!}
            onDirtyChange={setChanged}
            onEditingChange={ignoreEmployeeEditing}
          />
        ) : (
          <p className="text-sm text-neutral-500">
            Selecione uma empresa para consultar seus colaboradores.
          </p>
        ))}
      {moduleId === "searchAll" && (
        <Section title="Encontre empresas, documentos e tarefas">
          <label className="text-xs font-semibold">
            O que você procura?
            <input
              autoFocus
              className={`${input} mt-2 mb-6`}
              placeholder="Digite nome, assunto ou CNPJ…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {query.trim().length < 2 ? (
            <p className="text-sm text-neutral-400">
              Digite pelo menos dois caracteres. Resultados respeitam o contexto
              de empresa quando selecionado.
            </p>
          ) : (
            <>
              {table(
                ["Empresa", "CNPJ", "Ação"],
                companies
                  .filter(
                    (c) =>
                      (!companyId || c.id === companyId) &&
                      normalize(
                        [
                          c.values.legalName,
                          c.values.tradeName,
                          c.values.cnpj,
                        ].join(" "),
                      ).includes(normalize(query)),
                  )
                  .map((c) => [
                    c.values.legalName,
                    c.values.cnpj,
                    <button
                      className="underline"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("nexo:navigate", {
                            detail: "company",
                          }),
                        )
                      }
                    >
                      Abrir empresas
                    </button>,
                  ]),
              )}
              <div className="mt-5">
                {table(
                  ["Registro", "Módulo", "Competência", "Ação"],
                  allItems
                    .filter(
                      (i) =>
                        (!companyId ||
                          !i.companyId ||
                          i.companyId === companyId) &&
                        normalize(Object.values(i.values).join(" ")).includes(
                          normalize(query),
                        ),
                    )
                    .map((i) => [
                      i.values.title,
                      modules.find((m) => m.id === i.module)?.name || i.module,
                      i.period || "Geral",
                      <button
                        className="underline"
                        onClick={() => {
                          setDetail(i);
                          setReply("");
                        }}
                      >
                        Detalhes
                      </button>,
                    ]),
                )}
              </div>
            </>
          )}
        </Section>
      )}
      {moduleId === "home" && home()}
      {moduleId === "unions" && (
        <Unions data={data} onSaved={setData} onDirtyChange={setChanged} />
      )}
      {moduleId === "jobs" && (
        <Jobs data={data} onSaved={setData} onDirtyChange={setChanged} />
      )}
      {moduleId === "chart" && reports()}
      {moduleId === "accounting" && accounting()}
      {moduleId === "accounts" && accounts()}
      {moduleId === "closing" && close()}
      {moduleId === "audit" && (
        <>
          <p className="text-xs text-neutral-500 mb-5">
            Histórico local de operações. Não substitui auditoria autenticada de
            produção.
          </p>
          {table(
            ["Data", "Ação", "Registro", "Contexto", "Motivo"],
            data.audit
              .slice()
              .reverse()
              .filter(
                (a) =>
                  (!companyId || a.companyId === companyId) &&
                  (!a.period || a.period === period),
              )
              .map((a) => [
                new Date(a.at).toLocaleString("pt-BR"),
                a.action,
                a.entity,
                `${a.companyId ? companies.find((c) => c.id === a.companyId)?.values.legalName || "Empresa indisponível" : "Escritório"} · ${a.period || "Geral"}`,
                a.reason,
              ]),
          )}
        </>
      )}
      {moduleId === "backup" && (
        <Section title="Exportação completa local">
          <p className="text-sm text-neutral-500 leading-relaxed mb-5">
            Exporte empresas, registros operacionais e anexos para um arquivo
            JSON. Não é um backup automático em nuvem. A restauração precisa
            validar a versão e proteger os dados existentes.
          </p>
          <button
            disabled={busy}
            className={button}
            onClick={() => void backup()}
          >
            <Download className="w-4 h-4" />
            Exportar backup completo
          </button>
          <RestoreBackup
            onRestored={async () => {
              setData(await loadData());
              setCompanies(await listCompanies());
              setNotice(
                "Backup restaurado. Os dados locais foram atualizados.",
              );
            }}
            onError={setNotice}
          />
        </Section>
      )}
      {moduleId === "clientPortal" && portal(false)}
      {moduleId === "employeePortal" && portal(true)}
      {moduleId === "banking" && bank()}
      {moduleId === "invoiceSearch" && (
        <Section title="Recebimento autorizado de XML NF-e">
          <p className="text-sm text-neutral-500 leading-relaxed mb-5">
            Importe XML da empresa selecionada. Chave e competência são
            verificadas e duplicidades são bloqueadas. Busca automática em
            serviços fiscais depende de certificado, autorização e conector.
            Esta importação não valida assinatura digital.
          </p>
          <label className={button}>
            <FileUp className="w-4 h-4" />
            Importar XML NF-e
            <input
              type="file"
              className="sr-only"
              accept=".xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importXml(f);
              }}
            />
          </label>
        </Section>
      )}
      {detail && (
        <dialog
          ref={modal}
          onCancel={() => setDetail(null)}
          className="m-auto w-[min(92vw,650px)] max-h-[85dvh] overflow-y-auto rounded-2xl bg-white p-6 backdrop:bg-black/30"
          aria-labelledby="record-title"
        >
          <div className="flex justify-between gap-4 mb-5">
            <h2 id="record-title" className="text-lg font-semibold">
              {detail.values.title}
            </h2>
            <button
              aria-label="Fechar detalhes"
              onClick={() => setDetail(null)}
            >
              ✕
            </button>
          </div>
          <dl className="space-y-4">
            {Object.entries(detail.values)
              .filter(
                ([k, v]) => v && !["hash", "origin", "thread"].includes(k),
              )
              .map(([key]) => (
                <div key={key}>
                  <dt className="text-xs text-neutral-400">
                    {modules.find((m) => m.id === detail.module)
                      ? labelOf(
                          modules.find((m) => m.id === detail.module)!,
                          key,
                        )
                      : key}
                  </dt>
                  <dd className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {read(detail, key)}
                  </dd>
                </div>
              ))}
          </dl>
          {detail.module === "assets" && (
            <p className="mt-5 text-sm">
              Depreciação linear mensal:{" "}
              {money(
                depreciation(
                  cents(detail.values.amount),
                  cents(detail.values.residual || ""),
                  Number(detail.values.months),
                ),
              )}{" "}
              = (custo − residual) ÷ meses.
            </p>
          )}
          {detail.module === "reform" && (
            <p className="mt-5 text-sm">
              Resultado simulado:{" "}
              {money(
                Math.round(
                  (cents(detail.values.base) *
                    Number(detail.values.rate.replace(",", "."))) /
                    100,
                ),
              )}
              . Base × alíquota informada.
            </p>
          )}
          {detail.file && (
            <button
              className={`${button} mt-5`}
              onClick={() => download(detail.file!.name, detail.file!)}
            >
              Baixar original
            </button>
          )}
          {detail.module === "messaging" && (
            <div className="mt-6 border-t border-neutral-200 pt-5">
              <h3 className="font-semibold text-sm mb-4">
                Histórico de respostas internas
              </h3>
              <p className="text-xs whitespace-pre-wrap text-neutral-500">
                {detail.values.thread || "Nenhuma resposta registrada."}
              </p>
              <FormField
                spec={{
                  key: "reply",
                  label: "Resposta",
                  type: "textarea",
                  placeholder: "Escreva a resposta interna.",
                }}
                value={reply}
                onChange={setReply}
              />
              <button
                className={`${button} mt-4`}
                disabled={!reply.trim() || busy}
                onClick={() =>
                  void act((next) => {
                    const item = next.items.find((i) => i.id === detail.id);
                    if (!item) throw new Error("Atendimento não encontrado.");
                    assertOpen(next, item.companyId, item.period || period);
                    item.values.thread =
                      (item.values.thread || "") +
                      `\n${new Date().toLocaleString("pt-BR")}: ${reply.trim()}`;
                    item.updatedAt = new Date().toISOString();
                    audit(
                      next,
                      "Resposta interna registrada",
                      item.id,
                      item.companyId,
                      item.period,
                    );
                  }, "Resposta registrada.").then((ok) => {
                    if (ok) {
                      setDetail(null);
                      setReply("");
                    }
                  })
                }
              >
                Registrar resposta
              </button>
            </div>
          )}
          <p className="mt-6 text-[10px] text-neutral-400">
            Registro local · {detail.id} · Criado em{" "}
            {new Date(detail.createdAt).toLocaleString("pt-BR")}
          </p>
        </dialog>
      )}
    </div>
  );
}
