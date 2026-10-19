import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Acesso direto: identidade reservada, permissão somente servidor e restauração atômica isolada", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const bot = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_app_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
    create table storage.objects(bucket_id text,name text);
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    insert into auth.users values('${bot}','nexopen-cloud-test@users.nexopen.invalid','{"nexopen_cloud_test":true}'),('${other}','other@example.invalid','{}');
  `);
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(folder))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, folder), "utf8"));
  await db.exec("set role anon");
  await assert.rejects(db.query("select public.get_cloud_test_owner()"));
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${other}',false)`,
  );
  await assert.rejects(
    db.query("select public.prepare_cloud_test_owner($1)", [other]),
  );
  await assert.rejects(
    db.query("select * from public.cloud_test_configuration"),
  );
  await db.exec("set role service_role");
  await assert.rejects(
    db.query("select public.prepare_cloud_test_owner($1)", [other]),
  );
  const first = await db.query<{ id: string }>(
    "select public.prepare_cloud_test_owner($1) as id",
    [bot],
  );
  assert.equal(
    (
      await db.query<{ id: string }>(
        "select public.prepare_cloud_test_owner($1) as id",
        [bot],
      )
    ).rows[0].id,
    first.rows[0].id,
  );
  const owner = await db.query<{ value: { user_id: string } }>(
    "select public.get_cloud_test_owner() as value",
  );
  assert.equal(owner.rows[0].value.user_id, bot);
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${bot}',false)`,
  );
  assert.equal(
    (
      await db.query<{ value: boolean }>(
        "select public.is_platform_admin() as value",
      )
    ).rows[0].value,
    true,
  );
  const company = {
    id: "restored",
    values: { cnpj: "11.222.333/0001-81", legalName: "Restaurada" },
  };
  const data = {
    schema: 1,
    revision: 84,
    items: [
      { id: "job", module: "jobs", values: { description: "Administrador" } },
    ],
    entries: [],
    accounts: [],
    closings: [],
    audit: [],
  };
  const restore = (
    cs: unknown[],
    operation: unknown = data,
    brands: unknown = {},
  ) =>
    db.query(
      "select public.restore_workspace_backup($1::jsonb,$2::jsonb,$3::jsonb)",
      [JSON.stringify(cs), JSON.stringify(operation), JSON.stringify(brands)],
    );
  await assert.rejects(
    restore([
      company,
      { id: "invalid", values: { legalName: "Inválida", cnpj: "123" } },
    ]),
  );
  await db.exec("reset role");
  assert.equal(
    (await db.query("select * from public.companies")).rows.length,
    0,
    "invalid snapshot rolls back every company",
  );
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${bot}',false)`,
  );
  await assert.rejects(
    restore([company], data, { platform: { name: "Inválida", color: "oops" } }),
  );
  await restore([company], data, {
    office: {
      name: "Meu escritório na nuvem",
      slug: "teste",
      color: "#ffffff",
      logo: "",
      logoFormat: "square",
    },
    platform: {
      name: "Nexopen Teste",
      color: "#111111",
      logo: "",
      logoFormat: "horizontal",
      icon: "",
    },
  });
  await assert.rejects(restore([company]));
  await db.exec("reset role");
  const stored = (
    await db.query<{ revision: number; payload: any }>(
      "select revision,payload from public.operational_state",
    )
  ).rows[0];
  assert.equal(stored.revision, 1);
  assert.equal(stored.payload.items[0].id, "job");
  assert.equal(
    (await db.query("select * from public.companies")).rows.length,
    1,
  );
  await db.exec(
    `grant select on public.companies,public.operational_state,public.workspaces to authenticated; set role authenticated; select set_config('request.jwt.claim.sub','${other}',false)`,
  );
  assert.equal(
    (await db.query("select * from public.companies")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.operational_state")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query<{ value: boolean }>(
        "select public.is_platform_admin() as value",
      )
    ).rows[0].value,
    false,
  );
});
