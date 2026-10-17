import { LoginSettingsEditor, LoginPreview } from "./login-settings";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import { Upload, ShieldCheck, Building2, Save } from "lucide-react";
import { cloudConfigured } from "../../backend/client";
import { canAdmin, loadOffice, loadPlatform, saveBrand } from "./storage";
import {
  colors,
  colorNames,
  defaultOffice,
  defaultPlatform,
  ink,
  readBrandImage,
  slugify,
  type LogoFormat,
  type OfficeBrand,
  type PlatformBrand,
} from "./model";
let root: Root | undefined;
let dirty = false;
export const canLeaveBranding = () =>
  !dirty ||
  window.confirm(
    "Há alterações não salvas na identidade visual. Deseja descartá-las?",
  );
export function unmountBranding() {
  root?.unmount();
  root = undefined;
  dirty = false;
  document.body.classList.remove("branding-module");
}
export function mountBranding(
  node: HTMLElement,
  platform: boolean,
  onSaved: (value: OfficeBrand | PlatformBrand) => void,
) {
  unmountBranding();
  document.body.classList.add("branding-module");
  root = createRoot(node);
  root.render(<Branding platform={platform} onSaved={onSaved} />);
}
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-40";
function Branding({
  platform,
  onSaved,
}: {
  platform: boolean;
  onSaved: (value: OfficeBrand | PlatformBrand) => void;
}) {
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  const [draft, setDraft] = useState<OfficeBrand | PlatformBrand>(
      platform ? defaultPlatform : defaultOffice,
    ),
    [loading, setLoading] = useState(true),
    [allowed, setAllowed] = useState(!platform),
    [busy, setBusy] = useState(false),
    [changed, setChanged] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (platform && !(await canAdmin())) {
          if (active) {
            setAllowed(false);
            setMessage("Acesso restrito ao administrador da plataforma.");
          }
          return;
        }
        const value = await (platform ? loadPlatform() : loadOffice());
        if (active) {
          setDraft(value);
          setAllowed(true);
        }
      } catch (e) {
        if (active) {
          setMessage((e as Error).message);
          setFailed(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [platform]);
  useEffect(() => {
    dirty = changed;
    const prevent = (e: BeforeUnloadEvent) => {
      if (changed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => {
      dirty = false;
      window.removeEventListener("beforeunload", prevent);
    };
  }, [changed]);
  function change(key: string, value: string) {
    setDraft((old) => ({ ...old, [key]: value }));
    setChanged(true);
    setMessage("");
  }
  async function upload(
    file: File | undefined,
    key: "logo" | "icon" | "loginLogo",
  ) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await readBrandImage(
        file,
        key === "icon"
          ? "square"
          : key === "loginLogo"
            ? (draft as PlatformBrand).loginLogoFormat
            : draft.logoFormat,
        key === "icon",
      );
      change(key, data);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const next = { ...draft, name: draft.name.trim() };
      if (!next.name) throw new Error("Informe o nome.");
      if ("slug" in next) {
        next.slug = slugify(next.slug);
        if (!next.slug) throw new Error("Informe o endereço do escritório.");
      }
      await saveBrand(next, platform);
      if (mounted.current) {
        setChanged(false);
        dirty = false;
        onSaved(next);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <p role="status" className="text-sm text-neutral-500">
        Carregando identidade visual…
      </p>
    );
  if ((platform && !allowed) || failed)
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-xl font-semibold">
          {platform
            ? "Administração do sistema"
            : "Personalização do escritório"}
        </h1>
        <p role="alert" className="mt-3 text-sm text-neutral-600">
          {message}
        </p>
      </section>
    );
  const foreground = ink(draft.color);
  const office = draft as OfficeBrand;
  const system = draft as PlatformBrand;
  return (
    <div>
      <div className="mb-7">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {platform ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <Building2 className="h-5 w-5" />
          )}
          {platform
            ? "Identidade do sistema"
            : "Seu escritório, sua identidade."}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {platform
            ? "Personalize a marca da plataforma: nome, logo e ícone. A identidade de cada escritório permanece independente."
            : "Personalize a marca do seu escritório. A identidade do sistema é configurada na área administrativa."}
        </p>
        {!cloudConfigured && (
          <p className="mt-2 text-xs text-amber-800">
            {platform
              ? "Demonstração local da administração: alterações ficam neste navegador. Acesso administrativo autenticado e aplicação para todos os usuários dependem da ativação do banco em nuvem."
              : "As alterações ficam salvas apenas neste navegador."}
          </p>
        )}
      </div>
      <div className="grid gap-8 xl:grid-cols-2">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block text-xs font-medium">
            {platform ? "Nome do sistema" : "Nome do escritório"}
            <input
              required
              maxLength={80}
              className="form-control mt-2"
              value={draft.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <div>
            <label
              className="mb-2 block text-xs font-medium"
              htmlFor="logo-format"
            >
              Formato do logo
            </label>
            <select
              id="logo-format"
              className="form-control sm:max-w-xs"
              value={draft.logoFormat}
              disabled={busy}
              onChange={(e) => {
                if (
                  draft.logo &&
                  !window.confirm(
                    "Trocar o formato remove a imagem atual da prévia. Deseja continuar?",
                  )
                )
                  return;
                change("logoFormat", e.target.value as LogoFormat);
                change("logo", "");
              }}
            >
              <option value="square">Quadrado · até 500 × 500 px</option>
              <option value="horizontal">Horizontal · até 500 × 250 px</option>
            </select>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium">
              {platform ? "Logo do sistema" : "Logo do escritório"}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div
                data-testid="logo-upload-preview"
                className={`logo-checker grid shrink-0 place-items-center overflow-hidden rounded-xl border border-neutral-200 p-3 ${draft.logoFormat === "square" ? "h-32 w-32" : "h-28 w-56"}`}
              >
                {draft.logo ? (
                  <img
                    src={draft.logo}
                    alt={platform ? "Logo do sistema" : "Logo do escritório"}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span
                    style={{
                      color:
                        draft.color === "#ffffff" ? "#525252" : draft.color,
                    }}
                    className="text-4xl font-semibold"
                  >
                    {draft.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className={`${button} cursor-pointer`}>
                    <Upload className="h-3.5 w-3.5" />
                    Enviar imagem
                    <input
                      aria-label="Enviar logo"
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      onChange={(e) => {
                        void upload(e.target.files?.[0], "logo");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs text-neutral-500 underline disabled:opacity-40"
                    disabled={!draft.logo || busy}
                    onClick={() => change("logo", "")}
                  >
                    Remover logo
                  </button>
                </div>
                <p className="mt-2 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                  PNG, JPG ou WebP · até 1 MB.
                  <br />
                  Máximo de 500 ×{" "}
                  {draft.logoFormat === "square" ? "500" : "250"} px. A
                  proporção e a transparência são preservadas.
                </p>
              </div>
            </div>
          </div>
          {platform && (
            <div>
              <p className="mb-3 text-xs font-medium">Ícone do sistema</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="logo-checker grid h-20 w-20 place-items-center overflow-hidden rounded-xl border border-neutral-200 p-2">
                  {system.icon ? (
                    <img
                      src={system.icon}
                      alt="Ícone do sistema"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-3xl font-semibold">
                      {draft.name.charAt(0).toLowerCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className={`${button} cursor-pointer`}>
                    <Upload className="h-3.5 w-3.5" />
                    Enviar ícone
                    <input
                      aria-label="Enviar ícone"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        void upload(e.target.files?.[0], "icon");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="ml-3 text-xs underline text-neutral-500 disabled:opacity-40"
                    disabled={!system.icon || busy}
                    onClick={() => change("icon", "")}
                  >
                    Remover ícone
                  </button>
                  <p className="text-[11px] text-neutral-500">
                    Imagem quadrada, até 500 × 500 px e 1 MB. Usado no menu
                    recolhido e na aba do navegador.
                  </p>
                </div>
              </div>
            </div>
          )}
          <fieldset>
            <legend className="mb-3 text-xs font-medium">
              Cor de destaque
            </legend>
            <div className="flex flex-wrap gap-3">
              {colors.map((color, i) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`Cor ${colorNames[i]}`}
                  aria-pressed={draft.color === color}
                  onClick={() => change("color", color)}
                  className={`h-8 w-8 rounded-full border border-neutral-300 ring-offset-2 ${draft.color === color ? "ring-2 ring-neutral-900" : ""}`}
                  style={{ backgroundColor: color }}
                  title={colorNames[i]}
                />
              ))}
            </div>
          </fieldset>
          {platform && (
            <LoginSettingsEditor
              brand={system}
              onChange={change}
              busy={busy}
              onUpload={(file) => void upload(file, "loginLogo")}
            />
          )}
          {!platform && (
            <label className="block text-xs font-medium">
              Endereço do escritório
              <div className="mt-2 flex overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <input
                  required
                  maxLength={63}
                  className="min-w-0 flex-1 px-3 py-3 text-sm"
                  value={office.slug}
                  onChange={(e) => change("slug", slugify(e.target.value))}
                />
                <span className="border-l border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-400">
                  .exemplo.app
                </span>
              </div>
              <span className="mt-2 block text-[11px] font-normal text-neutral-400">
                Endereço ilustrativo. Nenhum domínio será criado.
              </span>
            </label>
          )}
          {message && (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              {message}
            </p>
          )}
          <button
            disabled={busy || !changed}
            className={`${button} !bg-neutral-900 !text-white w-full py-3`}
          >
            <Save className="h-4 w-4" />
            {busy
              ? "Processando…"
              : platform
                ? `Salvar identidade do sistema${cloudConfigured ? "" : " local"}`
                : `Salvar personalização${cloudConfigured ? "" : " local"}`}
          </button>
        </form>
        <div>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 p-3">
              <span className="text-xs tracking-widest text-neutral-300">
                ●●●
              </span>
              <span className="flex min-w-0 items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-1 text-[10px] text-neutral-400">
                {platform && system.icon && (
                  <img
                    src={system.icon}
                    alt="Ícone na aba da prévia"
                    className="h-4 w-4 object-contain"
                  />
                )}
                {platform
                  ? draft.name
                  : `${office.slug || "escritorio"}.exemplo.app`}
              </span>
            </div>
            <div
              data-testid="brand-preview-header"
              className="flex min-h-28 flex-wrap items-center gap-4 border-b border-neutral-200 p-5"
              style={{ backgroundColor: draft.color, color: foreground }}
            >
              {draft.logo ? (
                <img
                  src={draft.logo}
                  alt="Logo na prévia"
                  className={`${draft.logoFormat === "square" ? "h-20 w-20" : "h-20 w-48"} object-contain`}
                />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-xl border border-current text-3xl font-semibold">
                  {draft.name.charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <span className="break-words text-sm font-medium">
                {draft.name || "Sua marca"}
              </span>
            </div>
            <div className="space-y-4 p-6">
              <div className="h-3 w-2/3 rounded bg-neutral-100" />
              <div className="h-24 rounded-xl border border-neutral-200 bg-neutral-50" />
              <div className="h-3 w-1/2 rounded bg-neutral-100" />
              <div className="h-16 rounded-xl border border-neutral-200" />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-neutral-400">
            Prévia em tempo real · imagens sem cortes ou distorção
          </p>
          {platform && <LoginPreview brand={system} />}
          {platform && (
            <p className="mt-5 text-xs leading-relaxed text-neutral-500">
              O logo será exibido no menu expandido e na tela de entrada. O
              ícone será usado no menu recolhido e como favicon.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
