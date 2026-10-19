import {
  defaultOffice,
  defaultPlatform,
  normalizeBrand,
  validateDimensions,
  type OfficeBrand,
  type PlatformBrand,
} from "./model";

export const identityFileLimit = 10 * 1024 * 1024;
type Scope = "platform" | "office";
const invalid = () =>
  new Error("Arquivo de identidade visual inválido ou incompatível.");

function validatePng(value: string, format: string, icon: boolean) {
  if (!value) return;
  if (value.length > 2 * 1024 * 1024) throw invalid();
  let bytes: string;
  try {
    bytes = atob(value.slice("data:image/png;base64,".length));
  } catch {
    throw invalid();
  }
  if (
    bytes.length < 24 ||
    bytes.slice(0, 8) !== "\x89PNG\r\n\x1a\n" ||
    bytes.slice(12, 16) !== "IHDR"
  )
    throw invalid();
  const dimension = (offset: number) =>
    [0, 1, 2, 3].reduce((n, i) => n * 256 + bytes.charCodeAt(offset + i), 0);
  const width = dimension(16),
    height = dimension(20);
  validateDimensions(
    width,
    height,
    format === "horizontal" ? "horizontal" : "square",
  );
  if (icon && width !== height)
    throw new Error("O ícone importado deve ser quadrado.");
}

function validateBrand(
  value: unknown,
  scope: Scope,
): OfficeBrand | PlatformBrand {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid();
  const input = value as Record<string, unknown>;
  const defaults = scope === "platform" ? defaultPlatform : defaultOffice;
  const brand = normalizeBrand(input, defaults);
  const fields = brand as Record<string, string>;
  // Validate before showing the imported draft; do not silently replace invalid values.
  for (const key of Object.keys(input)) {
    if (
      !Object.hasOwn(defaults, key) ||
      typeof input[key] !== "string" ||
      fields[key] !== input[key]
    )
      throw invalid();
  }
  for (const key of ["name", "color", "logoFormat", "logo"]) {
    if (!Object.hasOwn(input, key)) throw invalid();
  }
  if (
    scope === "office" &&
    !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(fields.slug)
  )
    throw invalid();
  validatePng(brand.logo, brand.logoFormat, false);
  if ("icon" in brand) {
    validatePng(brand.icon, "square", true);
    validatePng(brand.loginIcon, "square", true);
    validatePng(brand.loginLogo, brand.loginLogoFormat, false);
  }
  return brand;
}

export function exportIdentity(
  branding: OfficeBrand | PlatformBrand,
  scope: Scope,
): string {
  const value = validateBrand(branding, scope);
  return JSON.stringify(
    {
      format: "nexopen-identity-v1",
      scope,
      exportedAt: new Date().toISOString(),
      branding: value,
    },
    null,
    2,
  );
}

export function importIdentity(
  contents: string,
  scope: Scope,
): OfficeBrand | PlatformBrand {
  if (contents.length > identityFileLimit) throw invalid();
  let value;
  try {
    value = JSON.parse(contents.replace(/^\uFEFF/, ""));
  } catch {
    throw invalid();
  }
  if (value?.format !== "nexopen-identity-v1") throw invalid();
  if (value.scope !== scope)
    throw new Error(
      scope === "platform"
        ? "Selecione uma identidade do sistema. Este arquivo é de outro tipo."
        : "Selecione uma identidade do escritório. Este arquivo é de outro tipo.",
    );
  return validateBrand(value.branding, scope);
}
