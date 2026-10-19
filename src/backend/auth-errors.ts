// Translate only known authentication failures. Never render a raw server message,
// which may contain internal configuration or an account identifier.
export function authErrorMessage(error: unknown): string {
  const value =
    error && typeof error === "object"
      ? (error as {
          code?: string;
          name?: string;
          status?: number;
          message?: string;
        })
      : {};
  // Older gateways may omit the API-version response header, so auth-js can
  // receive these legacy messages without a structured code.
  const legacy: Record<string, string> = {
    "Invalid login credentials": "invalid_credentials",
    "Email not confirmed": "email_not_confirmed",
    "Signups not allowed for this instance": "signup_disabled",
    "Email logins are disabled": "email_provider_disabled",
  };
  const code = value.code || legacy[value.message || ""];
  switch (code) {
    case "invalid_credentials":
      return "Nome de usuário ou senha inválidos. Confira os dados ou solicite ajuda ao administrador.";
    case "email_not_confirmed":
      return "Sua conta ainda não foi liberada para acesso. Solicite a liberação ao administrador.";
    case "username_signup_not_configured":
      return "O cadastro por nome de usuário ainda não está habilitado nesta instalação. Solicite a configuração ao administrador.";
    case "auth_configuration_invalid":
      return "O serviço de acesso não está configurado corretamente. Avise o administrador.";
    case "signup_disabled":
      return "A criação de contas está desativada nesta instalação. Solicite acesso ao administrador.";
    case "email_provider_disabled":
      return "O acesso por senha está desativado nesta instalação. Avise o administrador.";
    case "over_email_send_rate_limit":
      return "O serviço atingiu o limite de tentativas. Aguarde antes de tentar novamente.";
    case "over_request_rate_limit":
      return "Houve muitas tentativas de acesso. Aguarde antes de tentar novamente.";
    case "email_address_not_authorized":
      return "O cadastro por nome de usuário ainda não está habilitado nesta instalação. Solicite a configuração ao administrador.";
    case "email_address_invalid":
      return "Não foi possível registrar esse usuário. Avise o administrador.";
    case "weak_password":
      return "A senha não atende aos requisitos desta instalação. Use pelo menos 12 caracteres e evite senhas comuns.";
    case "email_exists":
    case "user_already_exists":
      return "Não foi possível criar a conta com esse nome de usuário. Se já possui uma conta, entre ou solicite ajuda ao administrador.";
    case "same_password":
      return "Escolha uma senha diferente da anterior.";
    case "captcha_failed":
      return "Não foi possível concluir a verificação de segurança. Avise o administrador.";
    case "session_expired":
    case "session_not_found":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Sua sessão expirou. Entre novamente com seu nome de usuário e senha.";
  }
  if (value.message === "Invalid API key")
    return "O serviço de acesso não está configurado corretamente. Avise o administrador.";
  if (
    value.message === "Error sending confirmation email" ||
    value.message === "Error sending recovery email"
  )
    return "O cadastro por nome de usuário ainda não está habilitado nesta instalação. Solicite a configuração ao administrador.";
  if (
    value.code === "request_timeout" ||
    value.name === "AuthRetryableFetchError" ||
    value.name === "TypeError"
  )
    return "Não foi possível conectar ao serviço de acesso. Confira sua conexão e tente novamente.";
  return "Não foi possível concluir o acesso. Tente novamente; se persistir, avise o administrador.";
}
