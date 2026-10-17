import { type PlatformBrand, loginTexts, ink } from "./model";
export function LoginSettingsEditor({
  brand,
  onChange,
  onUpload,
  busy,
}: {
  brand: PlatformBrand;
  onChange: (key: string, value: string) => void;
  onUpload: (file: File | undefined) => void;
  busy: boolean;
}) {
  return (
    <details className="rounded-xl border border-neutral-200 bg-white p-4" open>
      <summary className="cursor-pointer text-sm font-semibold">
        Personalizar área de login
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-neutral-500">
          Edite a apresentação da entrada. As funções de autenticação permanecem
          as mesmas.
        </p>
        {loginTexts.map((field) => (
          <label key={field.key} className="block text-xs font-medium">
            {field.label}
            {"multiline" in field ? (
              <textarea
                aria-label={field.label}
                className="form-control mt-1.5"
                rows={3}
                maxLength={field.max}
                value={brand[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            ) : (
              <input
                aria-label={field.label}
                className="form-control mt-1.5"
                required={["loginTitle", "loginButton"].includes(field.key)}
                maxLength={field.max}
                value={brand[field.key]}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            )}
          </label>
        ))}
        <label className="block text-xs font-medium">
          Formato do logo da entrada
          <select
            className="form-control mt-1.5"
            disabled={busy}
            value={brand.loginLogoFormat}
            onChange={(e) => {
              if (
                brand.loginLogo &&
                !window.confirm(
                  "Trocar o formato remove o logo da entrada da prévia. Continuar?",
                )
              )
                return;
              onChange("loginLogoFormat", e.target.value);
              onChange("loginLogo", "");
            }}
          >
            <option value="horizontal">Horizontal · até 500 × 250 px</option>
            <option value="square">Quadrado · até 500 × 500 px</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-xs">
            Enviar logo da entrada
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Enviar logo da entrada"
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                onUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            disabled={!brand.loginLogo || busy}
            onClick={() => onChange("loginLogo", "")}
            className="text-xs text-neutral-500 underline disabled:opacity-40"
          >
            Usar logo do sistema
          </button>
        </div>
        <p className="text-[11px] text-neutral-500">
          PNG, JPG ou WebP, até 1 MB. Sem imagem própria, a entrada usa o logo
          do sistema. A imagem mantém sua proporção.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "loginPanelColor", label: "Cor do painel lateral" },
            { key: "loginLogoBackground", label: "Fundo do logo na entrada" },
            { key: "iconBackground", label: "Fundo do ícone no menu" },
          ].map((field) => (
            <label key={field.key} className="text-xs font-medium">
              {field.label}
              <input
                aria-label={field.label}
                type="color"
                className="mt-2 block h-10 w-16 cursor-pointer rounded border border-neutral-200 bg-white p-1"
                value={brand[field.key as "loginPanelColor"]}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}
function Logo({ brand }: { brand: PlatformBrand }) {
  const image = brand.loginLogo || brand.logo || brand.icon;
  return (
    <div
      className="mb-4 grid h-14 max-w-48 place-items-center rounded-lg p-2"
      style={{
        backgroundColor: brand.loginLogoBackground,
        color: ink(brand.loginLogoBackground),
      }}
    >
      {image ? (
        <img
          src={image}
          alt="Logo na prévia de login"
          className="h-full max-h-10 w-full object-contain"
        />
      ) : (
        <span className="font-semibold">{brand.name}</span>
      )}
    </div>
  );
}
export function LoginPreview({ brand }: { brand: PlatformBrand }) {
  const foreground = ink(brand.loginPanelColor);
  return (
    <section className="mt-6" aria-label="Prévia da área de login">
      <h2 className="mb-3 text-sm font-semibold">Prévia da área de login</h2>
      <div className="grid overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-2">
        <div className="p-5 min-w-0">
          <Logo brand={brand} />
          <h3 className="break-words text-lg font-semibold">
            {brand.loginTitle}
          </h3>
          <p className="mt-2 break-words text-xs text-neutral-500">
            {brand.loginSubtitle}
          </p>
          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-neutral-200 p-3 text-[10px] text-neutral-400">
              E-mail
            </div>
            <div className="rounded-lg border border-neutral-200 p-3 text-[10px] text-neutral-400">
              Senha
            </div>
            <div className="break-words rounded-lg bg-neutral-900 p-3 text-center text-xs text-white">
              {brand.loginButton}
            </div>
          </div>
        </div>
        <div
          data-testid="login-preview-panel"
          className="min-w-0 p-5"
          style={{ backgroundColor: brand.loginPanelColor, color: foreground }}
        >
          <Logo brand={brand} />
          <p className="break-words text-[10px] uppercase tracking-wider opacity-75">
            {brand.loginEyebrow}
          </p>
          <h3 className="mt-4 whitespace-pre-line break-words text-xl font-medium">
            {brand.loginHeadline}
          </h3>
          <p className="mt-4 whitespace-pre-line break-words text-xs opacity-80">
            {brand.loginDescription}
          </p>
          <p className="mt-6 break-words text-[10px] opacity-70">
            {brand.loginFooter}
          </p>
        </div>
      </div>
    </section>
  );
}
