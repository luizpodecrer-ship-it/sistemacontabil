import { createRoot } from "react-dom/client";
import { DotPatternDemo } from "@/components/ui/demo";
import DemoOne from "@/components/ui/dock-demo";
import "./main.js";

// React island: retains the existing preview while enabling typed UI components.
const demoHost = document.createElement("div");
document.body.append(demoHost);
const root = createRoot(demoHost);
function renderDemo() {
  const dock = location.hash === "#dock";
  const open = dock || location.hash === "#dot-pattern";
  const app = document.getElementById("app");
  if (app) app.hidden = open;
  root.render(
    dock ? (
      <DemoOne />
    ) : open ? (
      <main className="min-h-dvh bg-neutral-50 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <a
            href="#"
            className="mb-8 inline-block text-sm text-neutral-600 underline underline-offset-4"
          >
            ← Voltar à prévia
          </a>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            Textura de fundo
          </h1>
          <p className="mb-8 text-sm text-neutral-500">
            Padrão vetorial decorativo com máscara radial. Adapta-se à largura
            disponível.
          </p>
          <DotPatternDemo />
        </div>
      </main>
    ) : null,
  );
}
window.addEventListener("hashchange", renderDemo);
renderDemo();
