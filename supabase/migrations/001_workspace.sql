-- Execute in the SQL editor of a new Supabase project. Initial owner-only cloud mode.
create table if not exists public.workspaces (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id),
 name text not null default 'Meu escritório', created_at timestamptz not null default now()
);
create table if not exists public.companies (
 workspace_id uuid not null references public.workspaces(id), id text not null,
 cnpj text not null, payload jsonb not null, updated_at timestamptz not null default now(),
 primary key(workspace_id,id),unique(workspace_id,cnpj)
);
create table if not exists public.operational_state (
 workspace_id uuid primary key references public.workspaces(id), revision bigint not null default 0,
 payload jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists public.server_audit (
 id bigint generated always as identity primary key,workspace_id uuid not null references public.workspaces(id),
 actor uuid not null, action text not null, entity text,created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.companies enable row level security;
alter table public.operational_state enable row level security;
alter table public.server_audit enable row level security;
create policy workspace_owner_read on public.workspaces for select to authenticated using(owner_id=auth.uid());
create policy companies_owner_read on public.companies for select to authenticated using(exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
create policy state_owner_read on public.operational_state for select to authenticated using(exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
create policy audit_owner_read on public.server_audit for select to authenticated using(exists(select 1 from public.workspaces w where w.id=workspace_id and w.owner_id=auth.uid()));
-- No direct client writes: writes go through scoped functions.
create or replace function public.ensure_own_workspace() returns uuid language plpgsql security definer set search_path='' as $$
declare wid uuid; begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 insert into public.workspaces(owner_id) values(auth.uid()) on conflict(owner_id) do nothing;
 select id into wid from public.workspaces where owner_id=auth.uid();return wid;
end;$$;
create or replace function public.save_company(company_id text,body jsonb,expected_version text default '') returns void language plpgsql security definer set search_path='' as $$
declare wid uuid; cnpj_value text; begin
 wid:=public.ensure_own_workspace();
 perform pg_advisory_xact_lock(hashtextextended(wid::text,0));
 if exists(select 1 from public.companies c where c.workspace_id=wid and c.id=company_id and coalesce(c.payload->>'updatedAt','')<>expected_version) then raise exception 'Company revision conflict';end if;
 if body->>'id' is distinct from company_id or length(coalesce(body->'values'->>'legalName',''))=0 then raise exception 'Invalid company';end if;
 cnpj_value:=upper(regexp_replace(body->'values'->>'cnpj','[^A-Za-z0-9]','','g'));
 if cnpj_value !~ '^[A-Z0-9]{12}[0-9]{2}$' then raise exception 'Invalid CNPJ';end if;
 insert into public.companies(workspace_id,id,cnpj,payload)values(wid,company_id,cnpj_value,body)
 on conflict(workspace_id,id)do update set cnpj=excluded.cnpj,payload=excluded.payload,updated_at=now();
 insert into public.server_audit(workspace_id,actor,action,entity)values(wid,auth.uid(),'save_company',company_id);
end;$$;
create or replace function public.save_operational_state(expected_revision bigint,body jsonb) returns void language plpgsql security definer set search_path='' as $$
declare wid uuid; current_revision bigint; entry jsonb; line jsonb; total_debit numeric; total_credit numeric; begin
 wid:=public.ensure_own_workspace();
 perform pg_advisory_xact_lock(hashtextextended(wid::text,0));
 select revision into current_revision from public.operational_state where workspace_id=wid;
 if expected_revision is null or expected_revision<0 then raise exception 'Invalid revision';end if;
 if coalesce(current_revision,0)<>expected_revision then raise exception 'Revision conflict';end if;
 if (body->>'schema')::int is distinct from 1 or (body->>'revision')::bigint is distinct from expected_revision+1
 or jsonb_typeof(body->'items') is distinct from 'array' or jsonb_typeof(body->'entries') is distinct from 'array' or jsonb_typeof(body->'accounts') is distinct from 'array'
 or jsonb_typeof(body->'closings') is distinct from 'array' or jsonb_typeof(body->'audit') is distinct from 'array' then raise exception 'Invalid payload';end if;
 for entry in select value from jsonb_array_elements(body->'entries') loop
   if jsonb_typeof(entry->'lines') is distinct from 'array' or jsonb_array_length(entry->'lines')<2
   or not exists(select 1 from public.companies c where c.workspace_id=wid and c.id=entry->>'companyId')
   or coalesce(entry->>'period','') !~ '^[0-9]{4}-[0-9]{2}$'
   or left(coalesce(entry->>'date',''),7)<>entry->>'period' or length(coalesce(entry->>'description',''))=0 then raise exception 'Invalid journal entry';end if;
   total_debit:=0;total_credit:=0;
   for line in select value from jsonb_array_elements(entry->'lines') loop
     if jsonb_typeof(line->'debit') is distinct from 'number' or jsonb_typeof(line->'credit') is distinct from 'number'
     or not exists(select 1 from jsonb_array_elements(body->'accounts') a where a->>'id'=line->>'accountId') then raise exception 'Invalid journal line';end if;
     if (line->>'debit')::numeric<0 or (line->>'credit')::numeric<0 or ((line->>'debit')::numeric=0)=((line->>'credit')::numeric=0)
     or trunc((line->>'debit')::numeric)<>(line->>'debit')::numeric or trunc((line->>'credit')::numeric)<>(line->>'credit')::numeric then raise exception 'Invalid journal amounts';end if;
     total_debit:=total_debit+(line->>'debit')::numeric;total_credit:=total_credit+(line->>'credit')::numeric;
   end loop;
   if total_debit<>total_credit then raise exception 'Unbalanced journal entry';end if;
 end loop;
 insert into public.operational_state(workspace_id,revision,payload)values(wid,expected_revision+1,body)
 on conflict(workspace_id)do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 insert into public.server_audit(workspace_id,actor,action,entity)values(wid,auth.uid(),'save_operational_state',(expected_revision+1)::text);
end;$$;
revoke all on function public.ensure_own_workspace() from public,anon;
revoke all on function public.save_company(text,jsonb,text) from public,anon;
revoke all on function public.save_operational_state(bigint,jsonb) from public,anon;
grant execute on function public.ensure_own_workspace() to authenticated;
grant execute on function public.save_company(text,jsonb,text) to authenticated;
grant execute on function public.save_operational_state(bigint,jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('workspace-files','workspace-files',false,31457280) on conflict(id)do nothing;
create policy workspace_file_read on storage.objects for select to authenticated using(bucket_id='workspace-files' and exists(select 1 from public.workspaces w where w.id::text=(storage.foldername(objects.name))[1] and w.owner_id=auth.uid()));
create policy workspace_file_insert on storage.objects for insert to authenticated with check(bucket_id='workspace-files' and exists(select 1 from public.workspaces w where w.id::text=(storage.foldername(objects.name))[1] and w.owner_id=auth.uid()));
