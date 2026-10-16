import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Migração PostgreSQL: autenticação, isolamento entre escritórios, revisão concorrente e arquivos privados", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
 create role anon; create role authenticated;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;
 insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
 `);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/001_workspace.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    "grant select,insert,update,delete on all tables in schema public to authenticated;set role authenticated;",
  );
  await assert.rejects(() => db.query("select public.ensure_own_workspace()"));
  await db.exec(
    "select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)",
  );
  const first = await db.query<{ id: string }>(
    "select public.ensure_own_workspace() as id",
  );
  const wid = first.rows[0].id;
  const body = {
    id: "c-1",
    values: { cnpj: "11.222.333/0001-81", legalName: "Empresa" },
  };
  await db.query("select public.save_company($1,$2::jsonb)", [
    "c-1",
    JSON.stringify(body),
  ]);
  assert.equal(
    (await db.query("select * from public.companies")).rows.length,
    1,
  );
  await assert.rejects(() =>
    db.query(
      "insert into public.companies(workspace_id,id,cnpj,payload)values($1,$2,$3,$4)",
      [wid, "bypass", "123", "{}"],
    ),
  );
  await db.query("select public.save_operational_state($1,$2::jsonb)", [
    0,
    JSON.stringify({
      schema: 1,
      revision: 1,
      items: [],
      entries: [],
      accounts: [],
      closings: [],
      audit: [],
    }),
  ]);
  await assert.rejects(() =>
    db.query("select public.save_operational_state($1,$2::jsonb)", [
      0,
      JSON.stringify({
        schema: 1,
        revision: 1,
        items: [],
        entries: [],
        accounts: [],
        closings: [],
        audit: [],
      }),
    ]),
  );
  await assert.rejects(() =>
    db.query("select public.save_operational_state($1,$2::jsonb)", [
      1,
      JSON.stringify({ schema: 1, revision: 2 }),
    ]),
  );
  await assert.rejects(() =>
    db.query("select public.save_operational_state($1,$2::jsonb)", [
      1,
      JSON.stringify({
        schema: 1,
        revision: 2,
        items: [],
        entries: [
          {
            companyId: "c-1",
            period: "2026-10",
            date: "2026-10-01",
            description: "Não balanceado",
            lines: [
              { accountId: "a", debit: 100, credit: 0 },
              { accountId: "b", debit: 0, credit: 99 },
            ],
          },
        ],
        accounts: [{ id: "a" }, { id: "b" }],
        closings: [],
        audit: [],
      }),
    ]),
  );
  await db.query(
    "insert into storage.objects(bucket_id,name)values('workspace-files',$1)",
    [wid + "/file"],
  );
  await db.exec(
    "select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)",
  );
  await db.query("select public.ensure_own_workspace()");
  assert.equal(
    (await db.query("select * from public.companies")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.operational_state")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from public.server_audit")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await assert.rejects(() =>
    db.query(
      "insert into storage.objects(bucket_id,name)values('workspace-files',$1)",
      [wid + "/foreign"],
    ),
  );
});
