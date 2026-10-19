// Local tests only. Never imported by the production API or frontend.
export const workspace = "11111111-1111-4111-8111-111111111111";
export const testAccess = "local_test_link_0123456789abcdef0123456789";
export const testSecret = "sb_secret_LOCAL_TEST_ONLY";
export const env = {
  SUPABASE_URL: "https://cloud-test.invalid",
  SUPABASE_SECRET_KEY: testSecret,
  NEXOPEN_TEST_ACCESS_KEY: testAccess,
};
export function fixture() {
  const files = new Map();
  const state = {
    companies: [],
    operation: null,
    office: null,
    platform: null,
    fail: false,
    requests: [],
    downloads: 0,
  };
  const storage = {
    from: () => ({
      async upload(path, bytes, options) {
        if (files.has(path) && !options.upsert)
          return { error: { statusCode: "409" } };
        files.set(path, Buffer.from(bytes));
        return { data: { path }, error: null };
      },
      async download(path) {
        return files.has(path)
          ? { data: new Blob([files.get(path)]), error: null }
          : { error: { message: "missing" } };
      },
      async remove(paths) {
        paths.forEach((path) => files.delete(path));
        return { error: null };
      },
    }),
  };
  const context = {
    workspace,
    token: "OWNER_JWT_TEST_ONLY",
    owner: { storage },
    admin: { storage },
  };
  const response = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  async function request(input, init = {}) {
    const url = new URL(input);
    const headers = new Headers(init.headers);
    state.requests.push({
      path: url.pathname,
      query: url.search,
      auth: headers.get("Authorization"),
      apikey: headers.get("apikey"),
    });
    if (state.fail)
      return response({ message: "Simulated database unavailable" }, 503);
    if (url.pathname.startsWith("/storage/v1/")) {
      const path = decodeURIComponent(
        url.pathname.split("workspace-files/")[1],
      );
      const bytes = files.get(path);
      if (!bytes) return response({ message: "missing" }, 404);
      if (init.method === "HEAD")
        return new Response(null, {
          headers: { "Content-Length": String(bytes.length) },
        });
      state.downloads++;
      const range = headers.get("Range")?.match(/bytes=(\d+)-(\d+)/);
      return new Response(
        range ? bytes.subarray(Number(range[1]), Number(range[2]) + 1) : bytes,
        { status: range ? 206 : 200 },
      );
    }
    if (url.pathname === "/rest/v1/companies")
      return response(
        [...state.companies]
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(
            Number(url.searchParams.get("offset") || 0),
            Number(url.searchParams.get("offset") || 0) +
              Number(url.searchParams.get("limit") || 1000),
          )
          .map((payload) => ({ payload })),
      );
    if (url.pathname === "/rest/v1/operational_state")
      return response(state.operation ? { payload: state.operation } : null);
    const name = url.pathname.split("/").at(-1);
    const body = JSON.parse(init.body || "{}");
    switch (name) {
      case "ensure_own_workspace":
        return response(workspace);
      case "get_workspace_brand":
        return response(
          state.office || {
            branding: {
              name: "Meu escritório",
              slug: "teste",
              color: "#171717",
              logo: "",
              logoFormat: "square",
            },
            revision: 0,
          },
        );
      case "get_platform_brand":
        return response(
          state.platform || {
            branding: {
              name: "Nexo",
              color: "#171717",
              logo: "",
              logoFormat: "horizontal",
              icon: "",
            },
            revision: 0,
          },
        );
      case "is_platform_admin":
        return response(true);
      case "platform_branding_version":
        return response(4);
      case "save_workspace_brand":
        state.office = {
          branding: body.branding,
          revision: (state.office?.revision || 0) + 1,
        };
        return response(null);
      case "save_platform_brand":
        state.platform = {
          branding: body.branding,
          revision: (state.platform?.revision || 0) + 1,
        };
        return response(null);
      case "save_operational_state":
        if ((state.operation?.revision || 0) !== body.expected_revision)
          return response({ message: "Revision conflict" }, 409);
        state.operation = body.body;
        return response(null);
      case "save_company": {
        const previous = state.companies.find((c) => c.id === body.company_id);
        if (previous && (previous.updatedAt || "") !== body.expected_version)
          return response({ message: "Company revision conflict" }, 409);
        state.companies = state.companies
          .filter((c) => c.id !== body.company_id)
          .concat(body.body);
        return response(null);
      }
      case "restore_workspace_backup":
        if (state.companies.length || state.operation)
          return response(
            { message: "Restore requires an empty workspace" },
            409,
          );
        state.companies = body.companies;
        state.operation = { ...body.operation, revision: 1 };
        if (body.brands.office)
          state.office = { branding: body.brands.office, revision: 1 };
        if (body.brands.platform)
          state.platform = { branding: body.brands.platform, revision: 1 };
        return response(null);
      default:
        return response({ message: "Unknown test RPC" }, 404);
    }
  }
  return {
    files,
    state,
    context,
    fetch: request,
    getOwner: async () => context,
  };
}
