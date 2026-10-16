import { digits } from "@/lib/formats";
import type { Values } from "./model";
export async function lookupCep(
  cep: string,
  signal?: AbortSignal,
): Promise<Values> {
  const value = digits(cep);
  if (value.length !== 8) throw new Error("Informe os 8 dígitos do CEP.");
  let response: Response;
  try {
    response = await fetch(`https://viacep.com.br/ws/${value}/json/`, {
      signal,
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "Consulta de CEP indisponível. Preencha o endereço manualmente ou tente novamente.",
    );
  }
  if (!response.ok)
    throw new Error(
      "Consulta de CEP indisponível. Preencha o endereço manualmente ou tente novamente.",
    );
  const data = await response.json();
  if (data.erro)
    throw new Error(
      "CEP não encontrado. Confira o número ou preencha manualmente.",
    );
  return {
    street: data.logradouro || "",
    district: data.bairro || "",
    city: data.localidade || "",
    uf: data.uf || "",
    ibge: data.ibge || "",
    country: "Brasil",
  };
}
