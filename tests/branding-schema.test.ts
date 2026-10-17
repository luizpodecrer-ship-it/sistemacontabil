import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("Branding: administração global protegida no servidor, escritório isolado e versão concorrente", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create table storage.objects(bucket_id text,name text);create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`,
  );
  for (const name of [
    "001_workspace.sql",
    "004_branding.sql",
    "005_login_branding.sql",
    "006_login_branding_sides.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  const branding = {
    name: "Sistema Teste",
    color: "#ffffff",
    logo: "",
    logoFormat: "horizontal",
    icon: "",
  };
  await db.exec("set role anon");
  assert.equal(
    (
      await db.query<{ value: any }>(
        "select public.get_platform_brand() as value",
      )
    ).rows[0].value.branding.name,
    "Nexo",
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,0)", [
      JSON.stringify(branding),
    ]),
  );
  await db.exec(
    "set role authenticated;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)",
  );
  assert.equal(
    (
      await db.query<{ value: boolean }>(
        "select public.is_platform_admin() as value",
      )
    ).rows[0].value,
    false,
  );
  await assert.rejects(() =>
    db.query("insert into public.platform_admins(user_id)values(auth.uid())"),
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,0)", [
      JSON.stringify(branding),
    ]),
  );
  const office = {
    name: "Escritório A",
    slug: "escritorio-a",
    color: "#ffffff",
    logo: "",
    logoFormat: "square",
  };
  await db.query("select public.save_workspace_brand($1::jsonb,0)", [
    JSON.stringify(office),
  ]);
  await assert.rejects(() =>
    db.query("select public.save_workspace_brand($1::jsonb,0)", [
      JSON.stringify(office),
    ]),
  );
  await db.exec(
    "select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false)",
  );
  assert.equal(
    (
      await db.query<{ value: any }>(
        "select public.get_workspace_brand() as value",
      )
    ).rows[0].value.branding.name,
    "Meu escritório",
  );
  await assert.rejects(() =>
    db.query("select * from public.workspace_branding"),
  );
  await db.exec(
    "reset role;insert into public.platform_admins values('11111111-1111-4111-8111-111111111111');set role authenticated;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)",
  );
  await db.query("select public.save_platform_brand($1::jsonb,0)", [
    JSON.stringify(branding),
  ]);
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,0)", [
      JSON.stringify(branding),
    ]),
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,1)", [
      JSON.stringify({ ...branding, logo: "data:image/svg+xml,<svg/>" }),
    ]),
  );
  const png = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png);
  png.write("IHDR", 12);
  png.writeUInt32BE(501, 16);
  png.writeUInt32BE(250, 20);
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,1)", [
      JSON.stringify({
        ...branding,
        logo: "data:image/png;base64," + png.toString("base64"),
      }),
    ]),
  );
  const loginBrand = {
    ...branding,
    loginTitle: "Bem-vindo ao teste",
    loginButton: "Acessar",
    loginPanelColor: "#164e63",
    loginLogoBackground: "#ffffff",
    iconBackground: "#ffffff",
    loginLogo: "",
    loginLogoFormat: "horizontal",
    loginIcon: "",
    loginIconSize: "72",
    loginLogoSize: "232",
    loginIconAlign: "right",
    loginLogoAlign: "left",
    loginIconBackground: "#eeeeee",
  };
  await db.query("select public.save_platform_brand($1::jsonb,1)", [
    JSON.stringify(loginBrand),
  ]);
  assert.equal(
    (
      await db.query<{ value: any }>(
        "select public.get_platform_brand() as value",
      )
    ).rows[0].value.branding.loginTitle,
    "Bem-vindo ao teste",
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,2)", [
      JSON.stringify({ ...loginBrand, loginLogo: "data:image/svg+xml,<svg/>" }),
    ]),
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,2)", [
      JSON.stringify({ ...loginBrand, loginTitle: "x".repeat(121) }),
    ]),
  );
  await assert.rejects(() =>
    db.query("select public.save_platform_brand($1::jsonb,2)", [
      JSON.stringify({ ...loginBrand, loginPanelColor: "red;display:none" }),
    ]),
  );
  for (const invalid of [
    { loginIconSize: "999" },
    { loginLogoSize: "0" },
    { loginIconAlign: "bottom" },
    { loginIconBackground: "transparent" },
    { loginIcon: "data:image/svg+xml,<svg/>" },
  ]) {
    await assert.rejects(() =>
      db.query("select public.save_platform_brand($1::jsonb,2)", [
        JSON.stringify({ ...loginBrand, ...invalid }),
      ]),
    );
  }
  await db.query("select public.save_platform_brand($1::jsonb,2)", [
    JSON.stringify(branding),
  ]);
  assert.equal(
    (
      await db.query<{ value: any }>(
        "select public.get_platform_brand() as value",
      )
    ).rows[0].value.branding.loginTitle,
    "Bem-vindo ao teste",
  );
  const persisted = (
    await db.query<{ value: any }>(
      "select public.get_platform_brand() as value",
    )
  ).rows[0].value.branding;
  assert.equal(persisted.loginIconSize, "72");
  assert.equal(persisted.loginLogoSize, "232");
  assert.equal(persisted.loginIconAlign, "right");
  await db.exec("set role anon");
  assert.equal(
    (
      await db.query<{ value: any }>(
        "select public.get_platform_brand() as value",
      )
    ).rows[0].value.branding.name,
    "Sistema Teste",
  );
});
