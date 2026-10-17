-- Atomic batch import, scoped to the authenticated owner, without replacing other companies.
create or replace function public.import_companies(bodies jsonb,expected_versions jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb;wid uuid;begin
 wid:=public.ensure_own_workspace();
 if jsonb_typeof(bodies) is distinct from 'array' or jsonb_array_length(bodies)>1000 or jsonb_typeof(expected_versions) is distinct from 'object' then raise exception 'Invalid import batch';end if;
 perform pg_advisory_xact_lock(hashtextextended(wid::text,0));
 for item in select value from jsonb_array_elements(bodies) loop
   perform public.save_company(item->>'id',item,coalesce(expected_versions->>(item->>'id'),''));
 end loop;
 insert into public.server_audit(workspace_id,actor,action,entity) values(wid,auth.uid(),'import_companies',jsonb_array_length(bodies)::text);
end;$$;
revoke all on function public.import_companies(jsonb,jsonb) from public,anon;
grant execute on function public.import_companies(jsonb,jsonb) to authenticated;
