-- Independent sidebar logo height, preserving existing login and tenant rules.
create or replace function public.save_platform_brand(branding jsonb,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$
declare current_revision bigint;previous jsonb;result jsonb;key text;limit_length int;value text;begin
 if not public.is_platform_admin() then raise exception 'Platform administrator required';end if;
 perform pg_advisory_xact_lock(hashtextextended('platform-branding',0));
 perform public.check_branding(branding,true);
 select p.revision,p.branding into current_revision,previous from public.platform_branding p where p.id=true;
 if expected_revision is null or expected_revision<>coalesce(current_revision,0) then raise exception 'Brand revision conflict';end if;
 result:=jsonb_build_object('name',trim(branding->>'name'),'color',branding->>'color','logo',branding->>'logo','logoFormat',branding->>'logoFormat','icon',branding->>'icon');
 foreach key in array array['loginTitle','loginSubtitle','loginEyebrow','loginHeadline','loginDescription','loginFooter','loginFormFooter','loginButton','menuLogoSize','loginIcon','loginIconSize','loginIconAlign','loginIconBackground','loginLogoSize','loginLogoAlign','loginLogo','loginLogoFormat','loginPanelColor','loginLogoBackground','iconBackground'] loop
  if branding ? key then
   if jsonb_typeof(branding->key) is distinct from 'string' then raise exception 'Invalid login setting';end if;
   result:=jsonb_set(result,array[key],branding->key);
  elsif previous ? key then result:=jsonb_set(result,array[key],previous->key);end if;
 end loop;
 foreach key in array array['loginTitle','loginSubtitle','loginEyebrow','loginHeadline','loginDescription','loginFooter','loginFormFooter','loginButton'] loop
  value:=result->>key;
  limit_length:=case key when 'loginDescription' then 600 when 'loginSubtitle' then 240 when 'loginHeadline' then 240 when 'loginFooter' then 200 when 'loginFormFooter' then 200 when 'loginButton' then 60 else 120 end;
  if value is not null and (length(value)>limit_length or (key in ('loginTitle','loginButton') and length(trim(value))=0)) then raise exception 'Invalid login text';end if;
 end loop;
 foreach key in array array['loginPanelColor','loginLogoBackground','loginIconBackground','iconBackground'] loop
  if result ? key and coalesce(result->>key,'') !~ '^#[a-fA-F0-9]{6}$' then raise exception 'Invalid login color';end if;
 end loop;
 foreach key in array array['loginIconAlign','loginLogoAlign'] loop
  if result ? key and result->>key not in ('left','center','right') then raise exception 'Invalid login alignment';end if;
 end loop;
 foreach key in array array['loginIconSize','loginLogoSize'] loop
  if result ? key then
   value:=result->>key;
   if value !~ '^[0-9]{2,3}$' then raise exception 'Invalid login size';end if;
   if value::int < (case key when 'loginIconSize' then 32 else 80 end) or value::int > (case key when 'loginIconSize' then 160 else 400 end) then raise exception 'Invalid login size';end if;
  end if;
 end loop;
 if result ? 'menuLogoSize' and (coalesce(result->>'menuLogoSize','') !~ '^[0-9]{2,3}$' or (result->>'menuLogoSize')::int not between 32 and 112) then raise exception 'Invalid menu logo size';end if;
 if result ? 'loginIcon' and not public.valid_brand_png(result->>'loginIcon','icon') then raise exception 'Invalid login icon';end if;
 if result ? 'loginLogoFormat' and result->>'loginLogoFormat' not in ('square','horizontal') then raise exception 'Invalid login logo format';end if;
 if result ? 'loginLogo' and not public.valid_brand_png(result->>'loginLogo',coalesce(result->>'loginLogoFormat','horizontal')) then raise exception 'Invalid login logo';end if;
 insert into public.platform_branding(id,branding,revision)values(true,result,coalesce(current_revision,0)+1) on conflict(id) do update set branding=excluded.branding,revision=excluded.revision;
 insert into public.platform_branding_audit(actor,revision)values(auth.uid(),coalesce(current_revision,0)+1);
end;$$;
revoke all on function public.save_platform_brand(jsonb,bigint) from public,anon;
grant execute on function public.save_platform_brand(jsonb,bigint) to authenticated;

create or replace function public.platform_branding_version() returns int language sql immutable set search_path='' as $$select 4$$;
revoke all on function public.platform_branding_version() from public,anon;
grant execute on function public.platform_branding_version() to authenticated;
