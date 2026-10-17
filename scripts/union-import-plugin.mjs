import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export function unionImportPlugin() {
  function configure(server) {
    server.middlewares.use("/api/union_import", (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end();
        return;
      }
      let size = 0;
      const chunks = [];
      req.on("data", (chunk) => {
        size += chunk.length;
        if (size <= 4 * 1024 * 1024) chunks.push(chunk);
      });
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (!size || size > 4 * 1024 * 1024) {
          res.statusCode = 413;
          res.end(JSON.stringify({ error: "Excel deve ter até 4 MB." }));
          return;
        }
        const python =
          process.env.NEXO_PYTHON ||
          (existsSync(root + ".venv/bin/python")
            ? root + ".venv/bin/python"
            : "python3");
        const program =
          "import sys,json;from api.union_import import parse_excel\ntry: print(json.dumps(parse_excel(sys.stdin.buffer.read()),ensure_ascii=False))\nexcept Exception: print(json.dumps({'error':'Não foi possível ler o Excel. Confira o arquivo e as dependências Python ou use CSV.'}))";
        const child = spawn(python, ["-c", program], {
          cwd: root,
          stdio: ["pipe", "pipe", "pipe"],
        });
        let output = "",
          done = false;
        const finish = (code, body) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          res.statusCode = code;
          res.end(body);
        };
        const timer = setTimeout(() => {
          child.kill();
          finish(
            422,
            JSON.stringify({
              error: "A leitura excedeu o tempo limite. Exporte CSV.",
            }),
          );
        }, 30000);
        child.stdout.on("data", (chunk) => {
          output += chunk;
          if (output.length > 4 * 1024 * 1024) {
            child.kill();
            finish(
              413,
              JSON.stringify({ error: "Planilha excedeu o limite de dados." }),
            );
          }
        });
        child.stderr.on("data", () => {});
        child.stdin.on("error", () => {});
        child.on("error", () =>
          finish(
            503,
            JSON.stringify({
              error:
                "Leitor Excel indisponível. Instale requirements.txt ou use CSV.",
            }),
          ),
        );
        child.on("close", (code) => {
          try {
            const payload = JSON.parse(output);
            finish(
              code === 0 && !payload.error ? 200 : 422,
              JSON.stringify(payload),
            );
          } catch {
            finish(
              422,
              JSON.stringify({ error: "Não foi possível ler o Excel." }),
            );
          }
        });
        child.stdin.end(Buffer.concat(chunks));
      });
    });
  }
  return {
    name: "union-import",
    configureServer: configure,
    configurePreviewServer: configure,
  };
}
