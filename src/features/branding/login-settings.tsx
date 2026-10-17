import { type PlatformBrand, loginTexts, ink, loginAsset } from "./model";
export function LoginSettingsEditor({
  brand,
  onChange,
  onUpload,
  busy,
}: {
  brand: PlatformBrand;
  onChange: (key: string, value: string) => void;
  onUpload: (file: File | undefined, key: "loginIcon" | "loginLogo") => void;
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
        {(["left", "right"] as const).map((side) => {
          const left = side === "left";
          const key = left ? "loginIcon" : "loginLogo";
          const sizeKey = left ? "loginIconSize" : "loginLogoSize";
          const alignKey = left ? "loginIconAlign" : "loginLogoAlign";
          const title = left
            ? "Lado esquerdo · ícone quadrado"
            : "Lado direito · logo horizontal";
          const label = left
            ? "Enviar ícone do lado esquerdo"
            : "Enviar logo do lado direito";
          const min = left ? 32 : 80,
            max = left ? 160 : 400;
          return (
            <fieldset
              key={side}
              className="space-y-3 rounded-xl border border-neutral-200 p-4"
              disabled={busy}
            >
              <legend className="px-1 text-sm font-semibold">{title}</legend>
              <Logo brand={brand} side={side} />
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-lg border border-neutral-300 px-3 py-2 text-xs">
                  {label}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-label={label}
                    className="sr-only"
                    onChange={(e) => {
                      onUpload(e.target.files?.[0], key);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={!brand[key]}
                  onClick={() => onChange(key, "")}
                  className="text-xs text-neutral-500 underline disabled:opacity-40"
                >
                  {left ? "Usar ícone do sistema" : "Usar logo do sistema"}
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                {left
                  ? "Imagem quadrada, até 500 × 500 px."
                  : "Logo horizontal, até 500 × 250 px."}{" "}
                PNG, JPG ou WebP, até 1 MB. A proporção e a transparência são
                preservadas.
              </p>
              <label className="block text-xs font-medium">
                Tamanho {left ? "do ícone esquerdo" : "do logo direito"}:{" "}
                {brand[sizeKey]} px
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`Diminuir ${left ? "ícone esquerdo" : "logo direito"}`}
                    disabled={Number(brand[sizeKey]) <= min}
                    className="action-button rounded-lg border px-3 py-2 disabled:opacity-40"
                    onClick={() =>
                      onChange(
                        sizeKey,
                        String(Math.max(min, Number(brand[sizeKey]) - 8)),
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    aria-label={
                      left
                        ? "Tamanho do ícone esquerdo"
                        : "Tamanho do logo direito"
                    }
                    className="min-w-0 flex-1"
                    type="range"
                    min={min}
                    max={max}
                    step="8"
                    value={brand[sizeKey]}
                    onChange={(e) => onChange(sizeKey, e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Aumentar ${left ? "ícone esquerdo" : "logo direito"}`}
                    disabled={Number(brand[sizeKey]) >= max}
                    className="action-button rounded-lg border px-3 py-2 disabled:opacity-40"
                    onClick={() =>
                      onChange(
                        sizeKey,
                        String(Math.min(max, Number(brand[sizeKey]) + 8)),
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </label>
              <div
                role="group"
                aria-label={
                  left
                    ? "Alinhamento do ícone esquerdo"
                    : "Alinhamento do logo direito"
                }
                className="flex flex-wrap gap-2"
              >
                {(
                  [
                    ["left", "Esquerda"],
                    ["center", "Centro"],
                    ["right", "Direita"],
                  ] as const
                ).map(([value, text]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={brand[alignKey] === value}
                    onClick={() => onChange(alignKey, value)}
                    className={`rounded-lg border px-3 py-2 text-xs ${brand[alignKey] === value ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "loginPanelColor", label: "Cor do painel lateral" },
            { key: "loginLogoBackground", label: "Fundo do logo direito" },
            { key: "loginIconBackground", label: "Fundo do ícone esquerdo" },
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
function Logo({
  brand,
  side,
}: {
  brand: PlatformBrand;
  side: "left" | "right";
}) {
  const asset = loginAsset(brand, side);
  return (
    <div
      data-testid={`login-preview-${side}`}
      className="login-brand mb-4"
      style={asset.style}
    >
      {asset.image ? (
        <img
          src={asset.image}
          alt={
            side === "left"
              ? "Ícone esquerdo na prévia"
              : "Logo direito na prévia"
          }
          className="h-full w-full object-contain"
        />
      ) : (
        <span>{asset.fallback}</span>
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
          <Logo brand={brand} side="left" />
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
          <Logo brand={brand} side="right" />
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
