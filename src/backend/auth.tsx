import { loadPlatform, applyPlatform } from "../features/branding/storage";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/form-field";
import {
  cloud,
  clearWorkspace,
  recoveryFlow,
  assertUsernameSignupReady,
} from "./client";
import { defaultPlatform } from "../features/branding/model";
import { authErrorMessage } from "./auth-errors";
import { usernameIdentity, usernameHint } from "./username";
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
  const [mode, setMode] = useState<"login" | "signup" | "help" | "password">(
    "login",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [brand, setBrand] = useState(defaultPlatform);
  const [brandError, setBrandError] = useState(false);
  const [brandAttempt, setBrandAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (logout) {
          const { error } = await cloud!.auth.signOut();
          clearWorkspace();
          if (error) throw error;
        }
        const { data, error } = await cloud!.auth.getSession();
        if (error) throw error;
        if (!active) return;
        if (recoveryFlow) setMode("password");
        else if (data.session) {
          done();
          return;
        }
      } catch (error) {
        if (active) setMessage(authErrorMessage(error));
      } finally {
        if (active) setBusy(false);
      }
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
    let active = true;
    void loadPlatform()
      .then((value) => {
        if (active) {
          setBrand(value);
          setBrandError(false);
        }
      })
      .catch(() => {
        if (active) setBrandError(true);
      });
    return () => {
      active = false;
    };
  }, [brandAttempt]);
  useEffect(() => {
    applyPlatform(brand);
  }, [brand, busy, mode]);
  const submit = async () => {
    if (busy) return;
    setMessage("");
    let identity: ReturnType<typeof usernameIdentity> | undefined;
    if (mode !== "password") {
      try {
        identity = usernameIdentity(username);
      } catch {
        setMessage(usernameHint);
        return;
      }
    }
    if ((mode === "signup" || mode === "password") && password.length < 12) {
      setMessage("Use uma senha de pelo menos 12 caracteres.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await assertUsernameSignupReady();
        const { data, error } = await cloud!.auth.signUp({
          email: identity!.email,
          password,
          options: { data: { username: identity!.username } },
        });
        if (error) throw error;
        if (data.session) {
          done();
          return;
        }
        setMessage(
          authErrorMessage({ code: "username_signup_not_configured" }),
        );
      } else if (mode === "password") {
        const { error } = await cloud!.auth.updateUser({ password });
        if (error) throw error;
        history.replaceState(null, "", location.pathname);
        done();
        return;
      } else {
        const { error } = await cloud!.auth.signInWithPassword({
          email: identity!.email,
          password,
        });
        if (error) throw error;
        done();
        return;
      }
    } catch (error) {
      setMessage(authErrorMessage(error));
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
              : mode === "help"
                ? "Recuperar acesso"
                : mode === "password"
                  ? "Definir nova senha"
                  : brand.loginTitle}
          </h1>
          <p
            data-login-text={mode === "login" ? "loginSubtitle" : undefined}
            className="text-sm text-neutral-500 mb-7"
          >
            {mode === "login"
              ? brand.loginSubtitle
              : mode === "signup"
                ? "Crie sua conta para começar."
                : mode === "help"
                  ? "Solicite ao administrador a redefinição da sua senha. Nunca envie sua senha atual."
                  : "Escolha uma nova senha para acessar sua conta."}
          </p>
          {mode !== "help" && (
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
                    key: "cloudUsername",
                    label: "Nome de usuário",
                    type: "text",
                    placeholder: "Ex.: luiz.queiroz",
                    autoComplete: "username",
                    maxLength: 32,
                    hint: mode === "signup" ? usernameHint : undefined,
                    required: true,
                  }}
                  value={username}
                  onChange={setUsername}
                />
              )}
              {
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
              }
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
                      ? brand.loginButton === defaultPlatform.loginButton
                        ? "Entrar"
                        : brand.loginButton
                      : mode === "signup"
                        ? "Criar conta"
                        : mode === "password"
                          ? "Salvar senha"
                          : "Entrar"}
                </span>
              </button>
            </form>
          )}
          <div className="mt-5 flex flex-wrap gap-4 text-xs text-neutral-500">
            <button
              disabled={busy}
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
            >
              {mode === "login" ? "Criar conta" : "Voltar ao acesso"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setMode(mode === "help" ? "login" : "help");
                setMessage("");
              }}
            >
              {mode === "help"
                ? "Voltar ao login"
                : "Preciso de ajuda para entrar"}
            </button>
          </div>
          <p
            data-login-text="loginFormFooter"
            className="mt-6 text-center text-xs text-neutral-500"
          >
            {brand.loginFormFooter}
          </p>
          {brandError && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-neutral-200 p-3 text-xs leading-5 text-neutral-600"
            >
              Não foi possível carregar a personalização da entrada. Exibindo a
              apresentação padrão.
              <button
                type="button"
                className="mt-2 block underline"
                onClick={() => setBrandAttempt((value) => value + 1)}
              >
                Tentar carregar personalização novamente
              </button>
            </div>
          )}
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
          >
            {brand.loginEyebrow}
          </p>
          <h2
            data-login-text="loginHeadline"
            className="max-w-lg text-5xl font-medium leading-tight"
          >
            {brand.loginHeadline}
          </h2>
          <p
            data-login-text="loginDescription"
            className="mt-6 max-w-md text-sm opacity-80"
          >
            {brand.loginDescription}
          </p>
        </div>
        <p data-login-text="loginFooter" className="text-xs opacity-75">
          {brand.loginFooter}
        </p>
      </aside>
    </main>
  );
}
