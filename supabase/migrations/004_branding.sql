-- Platform administrators are provisioned only through trusted database administration.
create table if not exists public.platform_admins(user_id uuid primary key references auth.users(id));
create table if not exists public.platform_branding(id boolean primary key default true check(id),branding jsonb not null,revision bigint not null default 1);
create table if not exists public.workspace_branding(workspace_id uuid primary key references public.workspaces(id),branding jsonb not null,revision bigint not null default 1);
create table if not exists public.platform_branding_audit(id bigint generated always as identity primary key,actor uuid not null,created_at timestamptz not null default now(),revision bigint not null);
alter table public.platform_admins enable row level security;
alter table public.platform_branding enable row level security;
alter table public.workspace_branding enable row level security;
alter table public.platform_branding_audit enable row level security;
revoke all on public.platform_admins,public.platform_branding,public.workspace_branding,public.platform_branding_audit from anon,authenticated;

create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.platform_admins a where a.user_id=auth.uid())$$;
revoke all on function public.is_platform_admin() from public,anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.valid_brand_png(value text,format text) returns boolean language plpgsql immutable set search_path='' as $$
declare bytes bytea;w bigint;h bigint;begin
 if value='' then return true;end if;
 if length(value)>2097152 or value !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' then return false;end if;
 begin bytes:=decode(split_part(value,',',2),'base64');exception when others then return false;end;
 if length(bytes)<24 or substring(bytes from 1 for 8)<>decode('89504e470d0a1a0a','hex') or substring(bytes from 13 for 4)<>convert_to('IHDR','UTF8') then return false;end if;
 w:=get_byte(bytes,16)::bigint*16777216+get_byte(bytes,17)*65536+get_byte(bytes,18)*256+get_byte(bytes,19);
 h:=get_byte(bytes,20)::bigint*16777216+get_byte(bytes,21)*65536+get_byte(bytes,22)*256+get_byte(bytes,23);
 return w between 1 and 500 and h between 1 and (case when format='horizontal' then 250 else 500 end) and (format<>'icon' or w=h);
end;$$;
revoke all on function public.valid_brand_png(text,text) from public,anon,authenticated;
create or replace function public.check_branding(body jsonb,is_platform boolean) returns void language plpgsql set search_path='' as $$begin
 if jsonb_typeof(body) is distinct from 'object' or jsonb_typeof(body->'name') is distinct from 'string' or length(trim(body->>'name')) not between 1 and 80 or coalesce(body->>'color','') !~ '^#[a-fA-F0-9]{6}$' or coalesce(body->>'logoFormat','') not in ('square','horizontal') or jsonb_typeof(body->'logo') is distinct from 'string' or not public.valid_brand_png(body->>'logo',body->>'logoFormat') then raise exception 'Invalid branding';end if;
 if is_platform then
  if jsonb_typeof(body->'icon') is distinct from 'string' or not public.valid_brand_png(body->>'icon','icon') then raise exception 'Invalid icon';end if;
 elsif coalesce(body->>'slug','') !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' then raise exception 'Invalid workspace slug';end if;
end;$$;
revoke all on function public.check_branding(jsonb,boolean) from public,anon,authenticated;

create or replace function public.get_platform_brand() returns jsonb language sql stable security definer set search_path='' as $$select coalesce((select jsonb_build_object('branding',p.branding,'revision',p.revision) from public.platform_branding p where p.id=true),jsonb_build_object('branding',jsonb_build_object('name','Nexo','color','#171717','logo','','logoFormat','horizontal','icon',''),'revision',0))$$;
revoke all on function public.get_platform_brand() from public;
grant execute on function public.get_platform_brand() to anon,authenticated;
create or replace function public.save_platform_brand(branding jsonb,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$
declare current_revision bigint;begin
 if not public.is_platform_admin() then raise exception 'Platform administrator required';end if;
 perform pg_advisory_xact_lock(hashtextextended('platform-branding',0));
 perform public.check_branding(branding,true);
 select p.revision into current_revision from public.platform_branding p where p.id=true;
 if expected_revision is null or expected_revision<>coalesce(current_revision,0) then raise exception 'Brand revision conflict';end if;
 insert into public.platform_branding(id,branding,revision)values(true,jsonb_build_object('name',trim(branding->>'name'),'color',branding->>'color','logo',branding->>'logo','logoFormat',branding->>'logoFormat','icon',branding->>'icon'),coalesce(current_revision,0)+1) on conflict(id) do update set branding=excluded.branding,revision=excluded.revision;
 insert into public.platform_branding_audit(actor,revision)values(auth.uid(),coalesce(current_revision,0)+1);
end;$$;
revoke all on function public.save_platform_brand(jsonb,bigint) from public,anon;
grant execute on function public.save_platform_brand(jsonb,bigint) to authenticated;
create or replace function public.get_workspace_brand() returns jsonb language plpgsql security definer set search_path='' as $$declare wid uuid;result jsonb;begin
 wid:=public.ensure_own_workspace();
 select jsonb_build_object('branding',w.branding,'revision',w.revision) into result from public.workspace_branding w where w.workspace_id=wid;
 return coalesce(result,jsonb_build_object('branding',jsonb_build_object('name','Meu escritório','color','#171717','slug','escritorio','logo','','logoFormat','square'),'revision',0));
end;$$;
revoke all on function public.get_workspace_brand() from public,anon;
grant execute on function public.get_workspace_brand() to authenticated;
create or replace function public.save_workspace_brand(branding jsonb,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$
declare wid uuid;current_revision bigint;begin
 wid:=public.ensure_own_workspace();perform pg_advisory_xact_lock(hashtextextended(wid::text,0));perform public.check_branding(branding,false);
 select w.revision into current_revision from public.workspace_branding w where w.workspace_id=wid;
 if expected_revision is null or expected_revision<>coalesce(current_revision,0) then raise exception 'Brand revision conflict';end if;
 insert into public.workspace_branding(workspace_id,branding,revision)values(wid,jsonb_build_object('name',trim(branding->>'name'),'color',branding->>'color','slug',branding->>'slug','logo',branding->>'logo','logoFormat',branding->>'logoFormat'),coalesce(current_revision,0)+1) on conflict(workspace_id) do update set branding=excluded.branding,revision=excluded.revision;
 insert into public.server_audit(workspace_id,actor,action,entity)values(wid,auth.uid(),'save_workspace_brand','branding');
end;$$;
revoke all on function public.save_workspace_brand(jsonb,bigint) from public,anon;
grant execute on function public.save_workspace_brand(jsonb,bigint) to authenticated;
