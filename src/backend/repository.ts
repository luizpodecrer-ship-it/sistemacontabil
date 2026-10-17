import { cloud, workspaceId } from "./client";
import type { Company } from "../features/companies/model";
import { initialData, type Data } from "../features/workspace/model";
const companyVersions = new Map<string, string>();
type FileRef = { __nexoFile: true; path: string; name: string; type: string };
async function pack(value: unknown, workspace: string): Promise<unknown> {
  if (value instanceof Blob) {
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await value.arrayBuffer()),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const path = `${workspace}/${hash}`;
    const { error } = await cloud!.storage
      .from("workspace-files")
      .upload(path, value, {
        upsert: false,
        contentType: value.type || "application/octet-stream",
      });
    if (
      error &&
      String((error as { statusCode?: string }).statusCode) !== "409"
    )
      throw new Error("Não foi possível armazenar o anexo privado.");
    return {
      __nexoFile: true,
      path,
      name: value instanceof File ? value.name : "arquivo",
      type: value.type,
    } satisfies FileRef;
  }
  if (Array.isArray(value))
    return Promise.all(value.map((v) => pack(v, workspace)));
  if (value && typeof value === "object") {
    const pairs = await Promise.all(
      Object.entries(value).map(async ([k, v]) => [
        k,
        await pack(v, workspace),
      ]),
    );
    return Object.fromEntries(pairs);
  }
  return value;
}
async function unpack(value: unknown): Promise<unknown> {
  if (value && typeof value === "object" && (value as FileRef).__nexoFile) {
    const ref = value as FileRef;
    const { data, error } = await cloud!.storage
      .from("workspace-files")
      .download(ref.path);
    if (error || !data)
      throw new Error("Não foi possível recuperar um anexo privado.");
    return new File([data], ref.name, { type: ref.type });
  }
  if (Array.isArray(value)) return Promise.all(value.map(unpack));
  if (value && typeof value === "object")
    return Object.fromEntries(
      await Promise.all(
        Object.entries(value).map(async ([k, v]) => [k, await unpack(v)]),
      ),
    );
  return value;
}
export async function cloudCompanies(): Promise<Company[]> {
  const id = await workspaceId();
  const { data, error } = await cloud!
    .from("companies")
    .select("payload")
    .eq("workspace_id", id);
  if (error) throw new Error("Não foi possível ler as empresas em nuvem.");
  return await Promise.all(
    (data || []).map(async (row) => {
      const company = (await unpack(row.payload)) as Company;
      companyVersions.set(company.id, company.updatedAt || "");
      return company;
    }),
  );
}
export async function cloudSaveCompany(company: Company) {
  const id = await workspaceId();
  const payload = await pack(company, id);
  const { error } = await cloud!.rpc("save_company", {
    company_id: company.id,
    body: payload,
    expected_version: companyVersions.get(company.id) || "",
  });
  if (error)
    throw new Error(
      "Não foi possível salvar a empresa em nuvem. Confira a inscrição CPF/CNPJ duplicada, as migrações do banco e a conexão.",
    );
  companyVersions.set(company.id, company.updatedAt || "");
  return company.id;
}
export async function cloudLoadData(): Promise<Data> {
  const id = await workspaceId();
  const { data, error } = await cloud!
    .from("operational_state")
    .select("payload")
    .eq("workspace_id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível ler a operação em nuvem.");
  return data ? ((await unpack(data.payload)) as Data) : initialData();
}
export async function cloudMutate(change: (data: Data) => void): Promise<Data> {
  const previous = await cloudLoadData();
  const next = structuredClone(previous);
  change(next);
  next.revision = previous.revision + 1;
  const id = await workspaceId();
  const body = await pack(next, id);
  const { error } = await cloud!.rpc("save_operational_state", {
    expected_revision: previous.revision,
    body,
  });
  if (error)
    throw new Error(
      "Não foi possível salvar: conexão interrompida ou dados alterados em outra aba. Recarregue e tente novamente.",
    );
  return next;
}
