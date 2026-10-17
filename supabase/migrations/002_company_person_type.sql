create or replace function public.registration_is_valid(registration text, person_type text) returns boolean language plpgsql immutable set search_path='' as $$
declare value text; total int; remainder int; first_digit int; weights int[]; i int;begin
 value:=upper(regexp_replace(coalesce(registration,''),'[^A-Za-z0-9]','','g'));
 if value ~ '^(.)\1+$' then return false;end if;
 if person_type='Pessoa física' then
   if value !~ '^[0-9]{11}$' then return false;end if;
   total:=0;for i in 1..9 loop total:=total+substring(value,i,1)::int*(11-i);end loop;
   remainder:=(total*10)%11;if remainder=10 then remainder:=0;end if;
   if remainder<>substring(value,10,1)::int then return false;end if;
   total:=0;for i in 1..10 loop total:=total+substring(value,i,1)::int*(12-i);end loop;
   remainder:=(total*10)%11;if remainder=10 then remainder:=0;end if;
   return remainder=substring(value,11,1)::int;
 end if;
 if value !~ '^[A-Z0-9]{12}[0-9]{2}$' then return false;end if;
 weights:=array[5,4,3,2,9,8,7,6,5,4,3,2];total:=0;
 for i in 1..12 loop total:=total+(ascii(substring(value,i,1))-48)*weights[i];end loop;
 remainder:=total%11;if remainder<2 then first_digit:=0;else first_digit:=11-remainder;end if;
 if first_digit<>substring(value,13,1)::int then return false;end if;
 weights:=array[6,5,4,3,2,9,8,7,6,5,4,3,2];total:=0;
 for i in 1..13 loop total:=total+(ascii(substring(value,i,1))-48)*weights[i];end loop;
 remainder:=total%11;if remainder<2 then remainder:=0;else remainder:=11-remainder;end if;
 return remainder=substring(value,14,1)::int;
end;$$;
revoke all on function public.registration_is_valid(text,text) from public,anon;
grant execute on function public.registration_is_valid(text,text) to authenticated;
-- Apply after 001; preserves existing corporate registrations and adds CPF clients.
create or replace function public.save_company(company_id text,body jsonb,expected_version text default '') returns void language plpgsql security definer set search_path='' as $$
declare wid uuid; cnpj_value text; begin
 wid:=public.ensure_own_workspace();
 perform pg_advisory_xact_lock(hashtextextended(wid::text,0));
 if exists(select 1 from public.companies c where c.workspace_id=wid and c.id=company_id and coalesce(c.payload->>'updatedAt','')<>expected_version) then raise exception 'Company revision conflict';end if;
 if body->>'id' is distinct from company_id or length(coalesce(body->'values'->>'legalName',''))=0 then raise exception 'Invalid company';end if;
 cnpj_value:=upper(regexp_replace(body->'values'->>'cnpj','[^A-Za-z0-9]','','g'));
 if not public.registration_is_valid(cnpj_value,coalesce(body->'values'->>'personType','Pessoa jurídica')) then raise exception 'Invalid CPF/CNPJ';end if;
 insert into public.companies(workspace_id,id,cnpj,payload)values(wid,company_id,cnpj_value,body)
 on conflict(workspace_id,id)do update set cnpj=excluded.cnpj,payload=excluded.payload,updated_at=now();
 insert into public.server_audit(workspace_id,actor,action,entity)values(wid,auth.uid(),'save_company',company_id);
end;$$;
revoke all on function public.save_company(text,jsonb,text) from public,anon;
grant execute on function public.save_company(text,jsonb,text) to authenticated;
