import { directSession } from "./direct-transport";
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
  node.innerHTML = `<main class="min-h-dvh bg-white flex items-center justify-center p-6"><section class="max-w-lg w-full rounded-2xl border border-neutral-200 p-6"><h1 class="text-2xl font-semibold">Ambiente de testes em nuvem</h1><p class="mt-3 text-sm text-neutral-500" role="status">Conectando ao escritório de testes…</p><button type="button" class="action-button mt-5 rounded-lg border border-neutral-300 px-4 py-2" hidden>Tentar novamente</button></section></main>`;
  const message = node.querySelector<HTMLElement>('[role="status"]')!;
  const button = node.querySelector<HTMLButtonElement>("button")!;
  const connect = async () => {
    button.hidden = true;
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
      await done();
    } catch (error) {
      if (active !== generation) return;
      message.textContent =
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a nuvem.";
      button.hidden = false;
    }
  };
  button.onclick = () => {
    void connect();
  };
  const onHash = () => {
    if (location.hash.includes("test_access=")) void connect();
  };
  window.addEventListener("hashchange", onHash);
  clearListener = () => window.removeEventListener("hashchange", onHash);
  void connect();
}
