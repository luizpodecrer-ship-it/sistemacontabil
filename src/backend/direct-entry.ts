import { directSession } from "./direct-transport";
import { defaultPlatform } from "../features/branding/model";
import { applyPlatform, loadPlatform } from "../features/branding/storage";
let generation = 0;
let clearListener: (() => void) | undefined;
export function unmountDirectEntry() {
  generation++;
  clearListener?.();
  clearListener = undefined;
}
export function mountDirectEntry(
  node: HTMLElement,
  done: () => void | Promise<void>,
  logout = false,
) {
  const active = ++generation;
  node.innerHTML = `<main class="flex min-h-dvh bg-white"><section class="w-full lg:w-1/2 flex items-center justify-center p-8"><div class="w-full max-w-[360px]"><div data-login-logo data-login-side="left" class="login-brand mb-8"></div><h1 data-login-text="loginTitle" class="text-3xl font-semibold tracking-tight"></h1><p data-login-text="loginSubtitle" class="text-sm text-neutral-500 mt-3 mb-8"></p><p class="text-sm text-neutral-500 leading-relaxed" role="status">Preparando o acesso ao ambiente de testes…</p><button type="button" class="action-button mt-6 rounded-lg bg-neutral-900 text-white w-full px-4 py-3" disabled>Acessar ambiente de testes</button><p data-login-text="loginFormFooter" class="mt-8 text-xs text-neutral-400"></p><p class="mt-8 text-xs text-neutral-400">Nexopen · Desenvolvido pela Astravox</p></div></section><section data-login-panel class="hidden lg:flex w-1/2 p-12 xl:p-16 flex-col justify-between gap-12"><div data-login-logo data-login-side="right" class="login-brand"></div><div><p data-login-text="loginEyebrow" class="text-xs tracking-widest uppercase mb-6 opacity-75"></p><h2 data-login-text="loginHeadline" class="text-4xl xl:text-5xl font-medium leading-tight tracking-tight max-w-lg"></h2><p data-login-text="loginDescription" class="text-sm leading-relaxed mt-7 max-w-sm opacity-80"></p></div><p data-login-text="loginFooter" class="text-xs opacity-75"></p></section></main>`;
  applyPlatform({ ...defaultPlatform, name: "Nexopen" });
  let authorized = false;
  const message = node.querySelector<HTMLElement>('[role="status"]')!;
  const button = node.querySelector<HTMLButtonElement>("button")!;
  const connect = async () => {
    authorized = false;
    button.disabled = true;
    message.textContent = "Conectando ao escritório de testes…";
    try {
      if (logout) {
        await directSession("", true);
        logout = false;
      }
      const params = new URLSearchParams(location.hash.slice(1));
      const access = params.get("test_access") || "";
      await directSession(access);
      if (active !== generation) return;
      if (access)
        history.replaceState(null, "", location.pathname + location.search);
      const platform = await loadPlatform();
      if (active !== generation) return;
      applyPlatform(platform);
      authorized = true;
      message.textContent =
        "Seu escritório está pronto. Os cadastros e arquivos são salvos na nuvem.";
    } catch (error) {
      if (active !== generation) return;
      message.textContent =
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a nuvem.";
    } finally {
      if (active === generation) button.disabled = false;
    }
  };
  button.onclick = () => {
    if (!authorized) {
      void connect();
      return;
    }
    button.disabled = true;
    void Promise.resolve()
      .then(done)
      .catch((error: unknown) => {
        if (active !== generation) return;
        message.textContent =
          error instanceof Error
            ? error.message
            : "Não foi possível abrir o escritório.";
        button.disabled = false;
      });
  };
  const onHash = () => {
    if (location.hash.includes("test_access=")) void connect();
  };
  window.addEventListener("hashchange", onHash);
  clearListener = () => window.removeEventListener("hashchange", onHash);
  void connect();
}
