import { loadPlatform, applyPlatform } from "../features/branding/storage";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import { cloud, clearWorkspace, recoveryFlow } from "./client";
let root: Root | undefined;
export function unmountCloudAuth() {
  root?.unmount();
  root = undefined;
}
export function mountCloudAuth(
  node: HTMLElement,
  done: () => void,
  logout = false,
) {
  unmountCloudAuth();
  root = createRoot(node);
  root.render(<CloudAuth done={done} logout={logout} />);
}
function CloudAuth({ done, logout }: { done: () => void; logout: boolean }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "password">(
    "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      if (logout) {
        await cloud!.auth.signOut();
        clearWorkspace();
      }
      const { data } = await cloud!.auth.getSession();
      if (!active) return;
      if (recoveryFlow) setMode("password");
      else if (data.session) {
        done();
        return;
      }
      setBusy(false);
    })();
    const { data } = cloud!.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("password");
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    void loadPlatform()
      .then(applyPlatform)
      .catch(() => {});
  }, [busy, mode]);
  const submit = async () => {
    setMessage("");
    if (!email && mode !== "password") {
      setMessage("Informe seu e-mail.");
      return;
    }
    if ((mode === "signup" || mode === "password") && password.length < 12) {
      setMessage("Use uma senha de pelo menos 12 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await cloud!.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin,
        });
        if (error) throw error;
        setMessage(
          "Se houver uma conta para este e-mail, você receberá as instruções de recuperação.",
        );
      } else if (mode === "signup") {
        const { data, error } = await cloud!.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin },
        });
        if (error) throw error;
        if (data.session) {
          done();
          return;
        }
        setMessage("Confira seu e-mail para confirmar o cadastro.");
      } else if (mode === "password") {
        const { error } = await cloud!.auth.updateUser({ password });
        if (error) throw error;
        history.replaceState(null, "", location.pathname);
        done();
        return;
      } else {
        const { error } = await cloud!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        done();
        return;
      }
    } catch {
      setMessage(
        "Não foi possível concluir. Confira os dados, a confirmação de e-mail e a configuração de autenticação.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-dvh flex bg-white">
      <section className="w-full lg:w-1/2 flex items-center justify-center px-5 py-12">
        <div className="max-w-sm w-full">
          <div
            data-login-logo
            data-login-side="left"
            className="login-brand mb-8"
          />
          <h1
            data-login-text={mode === "login" ? "loginTitle" : undefined}
            className="text-2xl font-semibold mb-3"
          >
            {mode === "signup"
              ? "Crie seu escritório"
              : mode === "reset"
                ? "Recuperar acesso"
                : mode === "password"
                  ? "Definir nova senha"
                  : "Acesse seu escritório"}
          </h1>
          <p
            data-login-text={mode === "login" ? "loginSubtitle" : undefined}
            className="text-sm text-neutral-500 mb-7"
          >
            Conexão autenticada ao banco configurado. Cada conta administra seu
            próprio escritório.
          </p>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {mode !== "password" && (
              <FormField
                spec={{
                  key: "cloudEmail",
                  label: "E-mail",
                  type: "email",
                  placeholder: "voce@escritorio.com.br",
                  autoComplete: "username",
                  required: true,
                }}
                value={email}
                onChange={setEmail}
              />
            )}
            {mode !== "reset" && (
              <FormField
                spec={{
                  key: "cloudPassword",
                  label: "Senha",
                  type: "password",
                  placeholder:
                    mode === "signup" || mode === "password"
                      ? "Pelo menos 12 caracteres"
                      : "Sua senha",
                  autoComplete:
                    mode === "login" ? "current-password" : "new-password",
                  required: true,
                }}
                value={password}
                onChange={setPassword}
              />
            )}
            {message && (
              <p role="status" className="text-sm text-neutral-600">
                {message}
              </p>
            )}
            <button disabled={busy} className="btn fx-20 w-full">
              <span
                data-login-cloud
                data-login-text={
                  mode === "login" && !busy ? "loginButton" : undefined
                }
              >
                {busy
                  ? "Aguarde…"
                  : mode === "login"
                    ? "Entrar"
                    : mode === "signup"
                      ? "Criar conta"
                      : mode === "password"
                        ? "Salvar senha"
                        : "Enviar instruções"}
              </span>
            </button>
          </form>
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-neutral-500">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup" ? "Já tenho conta" : "Criar conta"}
            </button>
            <button
              onClick={() => {
                setMode(mode === "reset" ? "login" : "reset");
                setMessage("");
              }}
            >
              {mode === "reset" ? "Voltar ao login" : "Esqueci minha senha"}
            </button>
          </div>
          <p
            data-login-text="loginFormFooter"
            className="mt-6 text-center text-xs text-neutral-500"
          />
        </div>
      </section>
      <aside
        data-login-panel
        className="hidden w-1/2 flex-col justify-between bg-neutral-900 p-12 text-white lg:flex"
      >
        <div data-login-logo data-login-side="right" className="login-brand" />
        <div>
          <p
            data-login-text="loginEyebrow"
            className="mb-5 text-xs uppercase tracking-wider opacity-75"
          />
          <h2
            data-login-text="loginHeadline"
            className="max-w-lg text-5xl font-medium leading-tight"
          />
          <p
            data-login-text="loginDescription"
            className="mt-6 max-w-md text-sm opacity-80"
          />
        </div>
        <p data-login-text="loginFooter" className="text-xs opacity-75" />
      </aside>
    </main>
  );
}
