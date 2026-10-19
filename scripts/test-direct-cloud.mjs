import { createServer } from "vite";
import { createCloudHandler } from "../server/cloud-handler.mjs";
import { fixture, env } from "../tests/support/direct-cloud.mjs";
let mock = fixture(),
  handler = createCloudHandler(env, mock);
const server = await createServer({
  server: { host: "127.0.0.1", port: 5176, strictPort: true },
  plugins: [
    {
      name: "direct-cloud-test-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.startsWith("/__test/cloud")) {
            const url = new URL(req.url, "http://localhost");
            if (url.searchParams.has("reset")) {
              mock = fixture();
              handler = createCloudHandler(env, mock);
            }
            if (url.searchParams.has("seedCompanies"))
              mock.state.companies = Array.from({ length: 1501 }, (_, i) => ({
                id: `company-${String(i).padStart(4, "0")}`,
                values: {
                  legalName: `Empresa ${i}`,
                  cnpj: "11.222.333/0001-81",
                },
                attachments: [],
              }));
            if (url.searchParams.has("fail"))
              mock.state.fail = url.searchParams.get("fail") === "true";
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ ...mock.state, files: [...mock.files.keys()] }),
            );
            return;
          }
          if (req.url.startsWith("/api/cloud/")) {
            void handler(req, res);
            return;
          }
          next();
        });
      },
    },
  ],
});
await server.listen();
