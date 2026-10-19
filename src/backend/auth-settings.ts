export function publicAuthConfig(rawUrl: unknown, rawKey: unknown) {
  return {
    url: typeof rawUrl === "string" ? rawUrl.trim().replace(/\/+$/, "") : "",
    key: typeof rawKey === "string" ? rawKey.trim() : "",
  };
}

function failure(code: string): never {
  throw Object.assign(new Error("Authentication settings check failed"), {
    code,
  });
}

export async function checkUsernameSignup(
  url: string,
  key: string,
  request: typeof fetch = fetch,
) {
  const response = await request(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403)
      failure("auth_public_key_rejected");
    if (response.status === 404) failure("auth_endpoint_not_found");
    if (response.status === 429) failure("over_request_rate_limit");
    if (response.status >= 500) failure("auth_service_unavailable");
    failure("auth_configuration_invalid");
  }
  let settings;
  try {
    settings = await response.json();
  } catch {
    failure("auth_settings_invalid");
  }
  if (
    typeof settings?.disable_signup !== "boolean" ||
    typeof settings?.mailer_autoconfirm !== "boolean" ||
    typeof settings?.external?.email !== "boolean"
  )
    failure("auth_settings_invalid");
  if (settings.disable_signup) failure("signup_disabled");
  if (!settings.external.email) failure("email_provider_disabled");
  // Never create a pending account for a non-deliverable username identifier.
  if (!settings.mailer_autoconfirm) failure("username_signup_not_configured");
}
