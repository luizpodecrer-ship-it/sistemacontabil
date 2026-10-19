export const usernameHint =
  "Use de 3 a 32 letras sem acentos, números, ponto, hífen ou sublinhado. Comece e termine com letra ou número.";

export function usernameIdentity(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username))
    throw new Error(usernameHint);
  // Supabase's password provider requires an email-shaped identifier. This
  // reserved, non-deliverable namespace never requires a person's email.
  // Encoding is injective, <=64 local-part bytes and avoids email punctuation rules.
  const alias = Array.from(username, (c) =>
    c.charCodeAt(0).toString(16).padStart(2, "0"),
  ).join("");
  return { username, email: `${alias}@users.nexopen.invalid` };
}
