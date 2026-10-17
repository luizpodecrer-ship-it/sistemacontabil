import { cloud, cloudConfigured } from "../../backend/client";
import {
  defaultOffice,
  defaultPlatform,
  normalizeBrand,
  type OfficeBrand,
  type PlatformBrand,
} from "./model";
let platformRevision = 0,
  officeRevision = 0;
export function localOffice() {
  try {
    return normalizeBrand(
      JSON.parse(localStorage.getItem("nexo-brand") || "{}"),
      defaultOffice,
    );
  } catch {
    return { ...defaultOffice };
  }
}
export function localPlatform() {
  try {
    return normalizeBrand(
      JSON.parse(localStorage.getItem("nexo-platform-brand") || "{}"),
      defaultPlatform,
    );
  } catch {
    return { ...defaultPlatform };
  }
}
export async function loadPlatform(): Promise<PlatformBrand> {
  if (!cloudConfigured) return localPlatform();
  const { data, error } = await cloud!.rpc("get_platform_brand");
  if (error)
    throw new Error(
      "Não foi possível carregar a identidade do sistema. Confira a migração 004.",
    );
  platformRevision = data?.revision || 0;
  return normalizeBrand(data?.branding, defaultPlatform);
}
export async function loadOffice(): Promise<OfficeBrand> {
  if (!cloudConfigured) return localOffice();
  const { data, error } = await cloud!.rpc("get_workspace_brand");
  if (error)
    throw new Error(
      "Não foi possível carregar a identidade do escritório. Confira a migração 004.",
    );
  officeRevision = data?.revision || 0;
  return normalizeBrand(data?.branding, defaultOffice);
}
export async function canAdmin() {
  if (!cloudConfigured) return true;
  const { data, error } = await cloud!.rpc("is_platform_admin");
  return !error && data === true;
}
export async function saveBrand(
  value: OfficeBrand | PlatformBrand,
  platform: boolean,
) {
  if (!cloudConfigured) {
    localStorage.setItem(
      platform ? "nexo-platform-brand" : "nexo-brand",
      JSON.stringify(value),
    );
    return;
  }
  const { error } = await cloud!.rpc(
    platform ? "save_platform_brand" : "save_workspace_brand",
    {
      branding: value,
      expected_revision: platform ? platformRevision : officeRevision,
    },
  );
  if (error)
    throw new Error(
      platform
        ? "Alteração não salva. Confira a permissão de administrador e recarregue a página."
        : "Alteração não salva. Confira sua sessão e recarregue a página.",
    );
  if (platform) platformRevision++;
  else officeRevision++;
}
export function applyPlatform(brand: PlatformBrand) {
  document.title = `${brand.name} — Gestão contábil`;
  document.documentElement.style.setProperty("--platform-accent", brand.color);
  let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.append(favicon);
  }
  favicon.type = "image/png";
  if (brand.icon) favicon.href = brand.icon;
  else {
    favicon.removeAttribute("href");
  }
  document
    .querySelectorAll<HTMLElement>("[data-platform-name]")
    .forEach((el) => {
      el.textContent = brand.name;
    });
  document
    .querySelectorAll<HTMLElement>("[data-platform-logo]")
    .forEach((el) => {
      el.replaceChildren();
      if (brand.logo) {
        const image = document.createElement("img");
        image.src = brand.logo;
        image.alt = `Logo ${brand.name}`;
        image.className = "h-full w-full object-contain";
        el.append(image);
      } else el.textContent = brand.name;
    });
  document
    .querySelectorAll<HTMLElement>("[data-platform-icon]")
    .forEach((el) => {
      el.replaceChildren();
      if (brand.icon) {
        const image = document.createElement("img");
        image.src = brand.icon;
        image.alt = `Ícone ${brand.name}`;
        image.className = "h-full w-full object-contain";
        el.append(image);
      } else el.textContent = brand.name.trim().charAt(0).toLowerCase();
    });
}
