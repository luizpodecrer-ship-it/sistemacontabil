-- A private Vercel test entry uses ONE server-managed identity. Browser/anon
-- clients never receive permission to provision identities or bypass tenant RLS.
create table if not exists public.cloud_test_configuration (
  id boolean primary key default true check(id),
  owner_id uuid not null unique references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.cloud_test_configuration enable row level security;
revoke all on public.cloud_test_configuration from public,anon,authenticated;

create or replace function public.get_cloud_test_owner() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('user_id',u.id,'email',u.email)
  from auth.users u
  where u.email='nexopen-cloud-test@users.nexopen.invalid'
    and u.raw_app_meta_data->>'nexopen_cloud_test'='true'
    and (not exists(select 1 from public.cloud_test_configuration)
      or exists(select 1 from public.cloud_test_configuration c where c.owner_id=u.id))
  limit 1
$$;
revoke all on function public.get_cloud_test_owner() from public,anon,authenticated;
grant execute on function public.get_cloud_test_owner() to service_role;

create or replace function public.prepare_cloud_test_owner(test_owner uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare wid uuid; begin
  perform pg_advisory_xact_lock(hashtextextended('nexopen-cloud-test',0));
  if not exists(select 1 from auth.users u where u.id=test_owner
    and u.email='nexopen-cloud-test@users.nexopen.invalid'
    and u.raw_app_meta_data->>'nexopen_cloud_test'='true')
    then raise exception 'Invalid server-managed test identity';end if;
  if exists(select 1 from public.cloud_test_configuration c where c.owner_id<>test_owner)
    then raise exception 'Test identity already configured';end if;
  insert into public.cloud_test_configuration(id,owner_id) values(true,test_owner) on conflict(id) do nothing;
  insert into public.workspaces(owner_id,name) values(test_owner,'Escritório de testes') on conflict(owner_id) do nothing;
  insert into public.platform_admins(user_id) values(test_owner) on conflict do nothing;
  select id into wid from public.workspaces where owner_id=test_owner;
  return wid;
end;$$;
revoke all on function public.prepare_cloud_test_owner(uuid) from public,anon,authenticated;
grant execute on function public.prepare_cloud_test_owner(uuid) to service_role;

-- Restore all records in ONE transaction into an empty owned workspace.
-- Files are staged privately first; failed transactions never leave partial records.
create or replace function public.restore_workspace_backup(companies jsonb,operation jsonb,brands jsonb default '{}')
returns void language plpgsql security definer set search_path='' as $$
declare wid uuid; company jsonb; revision bigint; begin
  wid:=public.ensure_own_workspace();
  perform pg_advisory_xact_lock(hashtextextended(wid::text,0));
  if exists(select 1 from public.companies c where c.workspace_id=wid)
    or exists(select 1 from public.operational_state s where s.workspace_id=wid)
    then raise exception 'Restore requires an empty workspace';end if;
  if jsonb_typeof(companies) is distinct from 'array' or jsonb_array_length(companies)>5000
    or jsonb_typeof(operation) is distinct from 'object' or jsonb_typeof(brands) is distinct from 'object'
    then raise exception 'Invalid restore snapshot';end if;
  for company in select value from jsonb_array_elements(companies) loop
    perform public.save_company(company->>'id',company,'');
  end loop;
  perform public.save_operational_state(0,jsonb_set(operation,'{revision}','1'::jsonb));
  if brands ? 'office' then
    perform public.save_workspace_brand(brands->'office',0);
  end if;
  if brands ? 'platform' then
    if not public.is_platform_admin() then raise exception 'Platform administrator required';end if;
    select p.revision into revision from public.platform_branding p where p.id=true;
    if coalesce(revision,0)<>0 then raise exception 'System identity already configured';end if;
    perform public.save_platform_brand(brands->'platform',0);
  end if;
  insert into public.server_audit(workspace_id,actor,action,entity)
    values(wid,auth.uid(),'restore_workspace_backup',jsonb_array_length(companies)::text);
end;$$;
revoke all on function public.restore_workspace_backup(jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.restore_workspace_backup(jsonb,jsonb,jsonb) to authenticated;
