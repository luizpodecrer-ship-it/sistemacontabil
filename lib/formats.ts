export const digits = (value: string) => value.replace(/\D/g, "");
export const cnpjKey = (value: string) =>
  value.replace(/[^a-z0-9]/gi, "").toUpperCase();
function pattern(value: string, mask: string) {
  let i = 0,
    out = "";
  for (const char of mask) {
    if (i >= value.length) break;
    out += char === "#" ? value[i++] : char;
  }
  return out;
}
export const formatCnpj = (value: string) =>
  pattern(cnpjKey(value).slice(0, 14), "##.###.###/####-##");
export const formatCpf = (value: string) =>
  pattern(digits(value).slice(0, 11), "###.###.###-##");
export const formatCep = (value: string) =>
  pattern(digits(value).slice(0, 8), "#####-###");
export const formatPhone = (value: string) => {
  const n = digits(value).slice(0, 11);
  return pattern(n, n.length > 10 ? "(##) #####-####" : "(##) ####-####");
};
export const formatCnae = (value: string) =>
  pattern(digits(value).slice(0, 7), "####-#/##");
export const formatCrc = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9/\-]/g, "")
    .slice(0, 20);
export const formatMoney = (value: string) => {
  const n = digits(value).slice(0, 15);
  return n
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(n) / 100)
    : "";
};
export function validCnpj(value: string) {
  const v = cnpjKey(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(v) || /^(.)\1+$/.test(v)) return false;
  const check = (base: string) => {
    const weights =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const remainder =
      [...base].reduce(
        (sum, c, i) => sum + (c.charCodeAt(0) - 48) * weights[i],
        0,
      ) % 11;
    return remainder < 2 ? "0" : String(11 - remainder);
  };
  const first = check(v.slice(0, 12));
  return v.slice(12) === first + check(v.slice(0, 12) + first);
}
export function validCpf(value: string) {
  const v = digits(value);
  if (v.length !== 11 || /^(.)\1+$/.test(v)) return false;
  const check = (length: number) => {
    const remainder =
      ([...v.slice(0, length)].reduce(
        (sum, n, i) => sum + Number(n) * (length + 1 - i),
        0,
      ) *
        10) %
      11;
    return (remainder === 10 ? 0 : remainder) === Number(v[length]);
  };
  return check(9) && check(10);
}
export function validPhone(value: string) {
  const n = digits(value);
  return /^(1[1-9]|2[12478]|3[1-578]|4[1-9]|5[13-5]|6[1-9]|7[134579]|8[1-9]|9[1-9])(?:[2-5]\d{7}|9\d{8})$/.test(
    n,
  );
}
export const validEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
export const masks = {
  cnpj: formatCnpj,
  cpf: formatCpf,
  cep: formatCep,
  phone: formatPhone,
  cnae: formatCnae,
  money: formatMoney,
  crc: formatCrc,
};
export type Mask = keyof typeof masks;
