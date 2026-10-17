import { useEffect, useRef, useState } from "react";
import { Building2, LoaderCircle } from "lucide-react";
import { cnpjKey, validCnpj } from "@/lib/formats";
import { lookupCnpj, type CnpjResult } from "./cnpj";
export function CnpjLookup({
  registration,
  onResult,
}: {
  registration: string;
  onResult: (result: CnpjResult) => void;
}) {
  const key = cnpjKey(registration);
  const initial = useRef(key);
  const callback = useRef(onResult);
  callback.current = onResult;
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState(
    "Ao completar um CNPJ válido, os dados públicos serão consultados.",
  );
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (key === initial.current && retry === 0) {
      setLoading(false);
      setMessage(
        key
          ? "Cadastro existente. Use Consultar CNPJ para conferir atualizações."
          : "Ao completar um CNPJ válido, os dados públicos serão consultados.",
      );
      return;
    }
    if (!validCnpj(key)) {
      setMessage("Complete um CNPJ válido para iniciar a consulta.");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setMessage("Consultando os dados públicos do CNPJ…");
      let timeout = false;
      const limit = setTimeout(() => {
        timeout = true;
        controller.abort();
      }, 12000);
      try {
        const result = await lookupCnpj(key, controller.signal);
        if (active) {
          callback.current(result);
          setMessage(
            "Consulta concluída. Campos vazios foram preenchidos; confira as informações.",
          );
        }
      } catch (error) {
        if (
          active &&
          (timeout || !(error instanceof Error) || error.name !== "AbortError")
        )
          setMessage(
            timeout
              ? "A consulta demorou demais. Continue manualmente ou tente novamente."
              : error instanceof Error
                ? error.message
                : "Consulta indisponível.",
          );
      } finally {
        clearTimeout(limit);
        if (active) setLoading(false);
      }
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, retry]);
  return (
    <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-500">
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Building2 className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
        )}
        <p role="status" className="flex-1 min-w-40">
          {message}
        </p>
        <button
          type="button"
          disabled={loading || !validCnpj(key)}
          className="underline underline-offset-4 disabled:opacity-40"
          onClick={() => setRetry((n) => n + 1)}
        >
          Consultar CNPJ
        </button>
      </div>
      <p className="mt-2 text-[11px] text-neutral-400">
        Somente o CNPJ é enviado à BrasilAPI. A consulta não comprova
        enquadramento tributário nem valida dados em tempo real na Receita
        Federal.
      </p>
    </div>
  );
}
