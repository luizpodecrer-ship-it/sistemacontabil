export type LogoFormat = "square" | "horizontal";
export type OfficeBrand = {
  name: string;
  color: string;
  slug: string;
  logo: string;
  logoFormat: LogoFormat;
};
export type LoginSettings = {
  loginTitle: string;
  loginSubtitle: string;
  loginEyebrow: string;
  loginHeadline: string;
  loginDescription: string;
  loginFooter: string;
  loginFormFooter: string;
  loginButton: string;
  loginLogo: string;
  loginLogoFormat: LogoFormat;
  loginPanelColor: string;
  loginLogoBackground: string;
  iconBackground: string;
};
export const defaultLogin: LoginSettings = {
  loginTitle: "Bom ter você de volta.",
  loginSubtitle: "Um novo dia para simplificar a sua rotina.",
  loginEyebrow: "Menos dispersão. Mais clareza.",
  loginHeadline: "O seu escritório.\nA operação inteira.\nEm sintonia.",
  loginDescription:
    "Empresas, documentos e prazos conectados em um espaço pensado para quem cuida de cada detalhe.",
  loginFooter: "Clareza para decidir. Espaço para crescer.",
  loginFormFooter: "",
  loginButton: "Explorar a prévia",
  loginLogo: "",
  loginLogoFormat: "horizontal",
  loginPanelColor: "#171717",
  loginLogoBackground: "#ffffff",
  iconBackground: "#ffffff",
};
export const loginTexts = [
  { key: "loginTitle", label: "Título do formulário", max: 120 },
  { key: "loginSubtitle", label: "Subtítulo do formulário", max: 240 },
  { key: "loginButton", label: "Texto do botão de entrada", max: 60 },
  { key: "loginEyebrow", label: "Texto de destaque do painel", max: 120 },
  {
    key: "loginHeadline",
    label: "Título do painel lateral",
    max: 240,
    multiline: true,
  },
  {
    key: "loginDescription",
    label: "Descrição do painel lateral",
    max: 600,
    multiline: true,
  },
  { key: "loginFormFooter", label: "Texto abaixo do formulário", max: 200 },
  { key: "loginFooter", label: "Texto do rodapé do painel", max: 200 },
] as const;
export type PlatformBrand = LoginSettings & {
  name: string;
  color: string;
  logo: string;
  logoFormat: LogoFormat;
  icon: string;
};
export const defaultOffice: OfficeBrand = {
  name: "Queiroz Contabilidade",
  color: "#171717",
  slug: "queiroz",
  logo: "",
  logoFormat: "square",
};
export const defaultPlatform: PlatformBrand = {
  ...defaultLogin,
  name: "Nexo",
  color: "#171717",
  logo: "",
  logoFormat: "horizontal",
  icon: "",
};
export const colors = [
  "#171717",
  "#ffffff",
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0d9488",
  "#525252",
];
export const colorNames = [
  "Grafite",
  "Branco",
  "Verde",
  "Azul",
  "Âmbar",
  "Vermelho",
  "Violeta",
  "Verde-petróleo",
  "Cinza",
];
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
export function ink(color: string) {
  const rgb = (/^#[0-9a-f]{6}$/i.test(color) ? color : "#171717")
    .slice(1)
    .match(/../g)!
    .map((v) => {
      const n = parseInt(v, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.179
    ? "#171717"
    : "#ffffff";
}
export function normalizeBrand<T extends OfficeBrand | PlatformBrand>(
  input: unknown,
  defaults: T,
): T {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const v = value[key];
    if (typeof v !== "string") continue;
    if (
      (key === "color" ||
        ["loginPanelColor", "loginLogoBackground", "iconBackground"].includes(
          key,
        )) &&
      !/^#[0-9a-f]{6}$/i.test(v)
    )
      continue;
    if (
      ["logo", "icon", "loginLogo"].includes(key) &&
      v &&
      !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v)
    )
      continue;
    if (
      ["logoFormat", "loginLogoFormat"].includes(key) &&
      !["square", "horizontal"].includes(v)
    )
      continue;
    if (key === "name" && (!v.trim() || v.length > 80)) continue;
    const text = loginTexts.find((field) => field.key === key);
    if (
      text &&
      (v.length > text.max ||
        (["loginTitle", "loginButton"].includes(key) && !v.trim()))
    )
      continue;
    (result as Record<string, string>)[key] = v;
  }
  return result;
}
export function validateDimensions(
  width: number,
  height: number,
  format: LogoFormat,
) {
  const maxHeight = format === "square" ? 500 : 250;
  if (width < 1 || height < 1 || width > 500 || height > maxHeight)
    throw new Error(
      `A imagem deve ter no máximo 500 × ${maxHeight} px. Sua imagem tem ${width} × ${height} px.`,
    );
}
export async function readBrandImage(
  file: File,
  format: LogoFormat,
  squareIcon = false,
): Promise<string> {
  if (
    file.size > 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw new Error("Selecione uma imagem PNG, JPG ou WebP de até 1 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Não foi possível ler esta imagem."));
      image.src = url;
    });
    validateDimensions(image.naturalWidth, image.naturalHeight, format);
    if (squareIcon && image.naturalWidth !== image.naturalHeight)
      throw new Error(
        "O ícone deve ser quadrado, com largura e altura iguais.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Leitura de imagem indisponível.");
    ctx.drawImage(image, 0, 0);
    const data = canvas.toDataURL("image/png");
    if (data.length > 2 * 1024 * 1024)
      throw new Error(
        "A imagem convertida é muito grande. Use uma versão mais leve.",
      );
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
