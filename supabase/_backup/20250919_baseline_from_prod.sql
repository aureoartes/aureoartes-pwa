--
-- PostgreSQL database dump
--

\restrict mAf27yP9wgwlF5E2fwd0H7JRpgBpm7stpSqrNZ41rO8Ztkhp7RncdDFtUiEpqjO

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: usuario_idioma; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_idioma AS ENUM (
    'pt-BR',
    'en',
    'es'
);


--
-- Name: usuario_origem_aquisicao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_origem_aquisicao AS ENUM (
    'organico',
    'instagram',
    'amazon',
    'shopee',
    'mercadolivre',
    'indicacao',
    'google',
    'youtube',
    'tiktok',
    'site',
    'outro'
);


--
-- Name: usuario_paleta_tema; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_paleta_tema AS ENUM (
    'aureoartes',
    'nostalgico',
    'dark',
    'light'
);


--
-- Name: usuario_provedor_acesso; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_provedor_acesso AS ENUM (
    'email',
    'google',
    'apple'
);


--
-- Name: usuario_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usuario_status AS ENUM (
    'ativo',
    'teste',
    'cancelado',
    'suspenso',
    'atualizar'
);


--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: -
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: _delete_next_phase(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._delete_next_phase(p_campeonato_id uuid, p_etapa_atual text) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_etapa text := lower(p_etapa_atual);
  v_has_closed boolean;
begin
  if v_etapa = 'terceiro_lugar' then
    -- Reabrir 3º nunca mexe na final
    return;
  end if;

  if v_etapa = 'semifinal' then
    -- DEFESA: só apaga final + 3º se NÃO houver encerradas em nenhuma das duas
    select exists (
      select 1
      from public.partidas
      where campeonato_id = p_campeonato_id
        and is_mata_mata  = true
        and lower(etapa)  in ('final','terceiro_lugar')
        and coalesce(encerrada,false) = true
    ) into v_has_closed;

    if v_has_closed then
      raise exception 'Semifinal reaberta, mas há partidas encerradas em FINAL ou TERCEIRO_LUGAR: operação não pode apagar fases seguintes.';
    end if;

    delete from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata  = true
      and lower(etapa)  in ('final','terceiro_lugar');
    return;
  end if;

  -- Demais etapas: apaga apenas a próxima
  with mm as (
    select distinct lower(etapa) as etapa,
           case lower(etapa)
             when 'preliminar' then 1
             when '64-avos'    then 2
             when '32-avos'    then 3
             when '16-avos'    then 4
             when 'oitavas'    then 5
             when 'quartas'    then 6
             when 'semifinal'  then 7
             when 'terceiro_lugar' then 8
             when 'final'      then 9
             else 0 end as rk
    from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata  = true
  ),
  cur as (select rk from mm where etapa = v_etapa),
  nxt as (
    select etapa
    from mm, cur
    where mm.rk > cur.rk
    order by mm.rk asc
    limit 1
  )
  delete from public.partidas p
  using nxt
  where p.campeonato_id = p_campeonato_id
    and p.is_mata_mata  = true
    and lower(p.etapa)  = nxt.etapa;
end
$$;


--
-- Name: _etapa_nome(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._etapa_nome(p_t integer) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
select case
  when $1 = 2  then 'final'
  when $1 = 4  then 'semifinal'
  when $1 = 8  then 'quartas'
  when $1 = 16 then 'oitavas'
  when $1 = 32 then '16-avos'
  when $1 = 64 then '32-avos'
  when $1 = 128 then '64-avos'
  else 'fase_'||$1::text
end;
$_$;


--
-- Name: _etapa_rank(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._etapa_rank(p_etapa text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
  select case lower($1)
    when 'preliminar' then 1 when '64-avos' then 2 when '32-avos' then 3
    when '16-avos'    then 4 when 'oitavas'  then 5 when 'quartas' then 6
    when 'semifinal'  then 7 when 'terceiro_lugar' then 8 when 'final' then 9
    else 0 end
$_$;


--
-- Name: _force_usuario_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._force_usuario_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  new.usuario_id := public.current_usuario_id();
  return new;
end;
$$;


--
-- Name: _has_closed_next(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._has_closed_next(p_campeonato_id uuid, p_etapa_atual text) RETURNS boolean
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_etapa text := lower(p_etapa_atual);
  v_has boolean := false;
begin
  -- 3º lugar nunca valida a Final
  if v_etapa = 'terceiro_lugar' then
    return false;
  end if;

  if v_etapa = 'semifinal' then
    -- semifinal: se houver qualquer encerrada em final OU 3º, bloquear
    select exists (
      select 1
      from public.partidas
      where campeonato_id = p_campeonato_id
        and is_mata_mata  = true
        and lower(etapa)  in ('final','terceiro_lugar')
        and coalesce(encerrada,false) = true
    ) into v_has;
    return coalesce(v_has,false);
  end if;

  -- Demais etapas: só a PRÓXIMA etapa pelo rank
  with mm as (
    select distinct lower(etapa) as etapa,
           case lower(etapa)
             when 'preliminar' then 1
             when '64-avos'    then 2
             when '32-avos'    then 3
             when '16-avos'    then 4
             when 'oitavas'    then 5
             when 'quartas'    then 6
             when 'semifinal'  then 7
             when 'terceiro_lugar' then 8
             when 'final'      then 9
             else 0 end as rk
    from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata  = true
  ),
  cur as (select rk from mm where etapa = v_etapa),
  nxt as (
    select etapa
    from mm, cur
    where mm.rk > cur.rk
    order by mm.rk asc
    limit 1
  )
  select exists(
    select 1 from public.partidas p
    where p.campeonato_id = p_campeonato_id
      and p.is_mata_mata  = true
      and lower(p.etapa)  in (select etapa from nxt)
      and coalesce(p.encerrada,false) = true
  ) into v_has;

  return coalesce(v_has,false);
end
$$;


--
-- Name: _link_or_create_usuario_for_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._link_or_create_usuario_for_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
DECLARE
  v_usuario_id uuid;
  v_nome text;
BEGIN
  -- Tenta vincular por e-mail (caso usuário já exista)
  UPDATE public.usuarios u
     SET auth_uid = NEW.id
   WHERE lower(u.email) = lower(NEW.email)
     AND (u.auth_uid IS NULL OR u.auth_uid = NEW.id)
  RETURNING u.id INTO v_usuario_id;

  IF v_usuario_id IS NULL THEN
    -- Se não existe, cria um novo registro (perfil)
    -- tenta capturar nome do metadata (supabase oauth/email)
    v_nome := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.usuarios (id, nome, email, auth_uid, criado_em)
    VALUES (gen_random_uuid(), v_nome, NEW.email, NEW.id, now())
    RETURNING id INTO v_usuario_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: _lock_campeonato_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._lock_campeonato_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'UPDATE' and new.campeonato_id is distinct from old.campeonato_id then
    raise exception 'Nao é permitido alterar campeonato_id';
  end if;
  return new;
end;
$$;


--
-- Name: _max_teams_by_formato(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._max_teams_by_formato(p_formato text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
  select case replace(lower(coalesce($1,'')),'-','_')
    when 'mata_mata'       then 128
    when 'grupos'          then 64
    when 'pontos_corridos' then 32
    else 32  -- padrão conservador
  end
$_$;


--
-- Name: _next_etapa_existente(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._next_etapa_existente(p_campeonato_id uuid, p_etapa_atual text) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $_$
  with mm as (
    select distinct etapa, public._etapa_rank(etapa) rk
    from public.partidas
    where campeonato_id = $1 and is_mata_mata = true
  )
  select etapa from mm
  where rk > public._etapa_rank($2)
  order by rk asc
  limit 1
$_$;


--
-- Name: _sync_usuario_email_from_auth(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._sync_usuario_email_from_auth() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if coalesce(old.email,'') is distinct from coalesce(new.email,'') then
    update public.usuarios
       set email = new.email
     where auth_uid = new.id;
  end if;
  return new;
end;
$$;


--
-- Name: advance_bracket(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_bracket(p_campeonato_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_ida_volta boolean := false;

  v_etapa_atual text;
  v_prox_etapa  text;

  v_winners uuid[];
  v_losers  uuid[];
  v_byes   uuid[];
  v_participantes uuid[];
  v_n int;

  v_rodada_base int;
  v_rodada_final int;
  v_rodada_terceiro int;

  i int;
  j int;
  v_ch uuid;
begin
  /* 0) Config do campeonato */
  select coalesce(c.ida_volta,false) into v_ida_volta
  from public.campeonatos c
  where c.id = p_campeonato_id;

  /* 1) Etapa CONCLUÍDA mais adiantada (todas encerradas) */
  with etapas as (
    select etapa,
           case etapa
             when 'preliminar'     then 1
             when '64-avos'        then 2
             when '32-avos'        then 3
             when '16-avos'        then 4
             when 'oitavas'        then 5
             when 'quartas'        then 6
             when 'semifinal'      then 7
             when 'terceiro_lugar' then 8
             when 'final'          then 9
             else 0
           end as rk
    from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata = true
    group by etapa
  ),
  concluidas as (
    select e.etapa, e.rk
    from etapas e
    where e.rk > 0
      and not exists (
        select 1 from public.partidas p
        where p.campeonato_id = p_campeonato_id
          and p.is_mata_mata = true
          and p.etapa = e.etapa
          and coalesce(p.encerrada,false) = false
      )
  )
  select etapa into v_etapa_atual
  from concluidas
  order by rk desc
  limit 1;

  if v_etapa_atual is null then
    -- nada a fazer
    return;
  end if;

  /* 2) Winners/losers por chave: AGREGA POR TIME (corrige ida/volta com mando invertido) */
  with cur as (
    select *
    from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata = true
      and etapa = v_etapa_atual
  ),
  teams as (
    -- coleta os 2 times distintos da chave
    select chave_id,
           (array_agg(distinct time_id order by time_id))[1] as t1,
           (array_agg(distinct time_id order by time_id))[2] as t2
    from (
      select chave_id, time_a_id as time_id from cur
      union
      select chave_id, time_b_id as time_id from cur
    ) s
    group by chave_id
  ),
  agg as (
    select
      c.chave_id,
      t.t1, t.t2,
      -- gols a favor por time, independente de ser A ou B em cada perna
      sum( case
              when c.time_a_id = t.t1 then c.gols_time_a
              when c.time_b_id = t.t1 then c.gols_time_b
              else 0
           end ) as gf1,
      sum( case
              when c.time_a_id = t.t2 then c.gols_time_a
              when c.time_b_id = t.t2 then c.gols_time_b
              else 0
           end ) as gf2,
      -- última perna (para decidir pênaltis)
      (array_agg(c.id order by coalesce(c.perna,1) desc, coalesce(c.data_hora, c.criado_em) desc))[1] as last_leg_id
    from cur c
    join teams t using (chave_id)
    group by c.chave_id, t.t1, t.t2
  ),
  last_leg as (
    select a.*,
           p.time_a_id as last_a_id,
           p.time_b_id as last_b_id,
           p.penaltis_time_a as pen_a,
           p.penaltis_time_b as pen_b
    from agg a
    join public.partidas p on p.id = a.last_leg_id
  ),
  decisao as (
    select
      ll.chave_id,
      case
        when ll.gf1 > ll.gf2 then ll.t1
        when ll.gf2 > ll.gf1 then ll.t2
        else
          case
            when ll.pen_a is not null and ll.pen_b is not null and ll.pen_a <> ll.pen_b then
              -- quem estava como A no último jogo?
              case
                when ll.last_a_id = ll.t1 then case when ll.pen_a > ll.pen_b then ll.t1 else ll.t2 end
                when ll.last_a_id = ll.t2 then case when ll.pen_a > ll.pen_b then ll.t2 else ll.t1 end
                else null
              end
            else null
          end
      end as vencedor,
      case
        when ll.gf1 > ll.gf2 then ll.t2
        when ll.gf2 > ll.gf1 then ll.t1
        else
          case
            when ll.pen_a is not null and ll.pen_b is not null and ll.pen_a <> ll.pen_b then
              case
                when ll.last_a_id = ll.t1 then case when ll.pen_a > ll.pen_b then ll.t2 else ll.t1 end
                when ll.last_a_id = ll.t2 then case when ll.pen_a > ll.pen_b then ll.t1 else ll.t2 end
                else null
              end
            else null
          end
      end as perdedor
    from last_leg ll
  )
  select array_agg(vencedor order by vencedor),
         array_agg(perdedor order by perdedor)
    into v_winners, v_losers
  from decisao;

  -- Se algum vencedor está NULL, ainda não dá pra avançar; sai sem erro
  if v_winners is null
     or array_position(v_winners, null) is not null then
    return;
  end if;

  /* 3) Participantes da próxima etapa (idem sua versão atual) */
  if v_etapa_atual = 'preliminar' then
    with inscritos as (
      select time_id, seed
      from public.campeonato_times
      where campeonato_id = p_campeonato_id
    ),
    jogaram as (
      select distinct time_a_id as time_id from public.partidas
        where campeonato_id = p_campeonato_id and etapa = 'preliminar' and is_mata_mata = true
      union
      select distinct time_b_id as time_id from public.partidas
        where campeonato_id = p_campeonato_id and etapa = 'preliminar' and is_mata_mata = true
    ),
    part as (
      select unnest( array_agg(i.time_id order by i.seed nulls last, i.time_id) ) as time_id
      from inscritos i
      where not exists (select 1 from jogaram j where j.time_id = i.time_id)
      union all
      select unnest(v_winners)
    ),
    dedup as (
      select distinct ct.time_id, ct.seed
      from part
      join public.campeonato_times ct
        on ct.campeonato_id = p_campeonato_id and ct.time_id = part.time_id
    )
    select array_agg(dedup.time_id order by dedup.seed nulls last, dedup.time_id)
      into v_participantes
    from dedup;
  else
    select array_agg(ct.time_id order by ct.seed nulls last, ct.time_id)
      into v_participantes
    from unnest(v_winners) w(time_id)
    join public.campeonato_times ct
      on ct.campeonato_id = p_campeonato_id and ct.time_id = w.time_id;
  end if;

  v_n := coalesce(array_length(v_participantes,1),0);
  if v_n < 2 then return; end if;

  if v_n = 2 then
    v_prox_etapa := 'final';
  elsif (v_n % 4) = 0 then
    v_prox_etapa := public._etapa_nome(v_n);  -- 4=semi, 8=quartas, 16=oitavas...
  else
    return;
  end if;

  /* 4) SEMI → FINAL + 3º (use a sua lógica vigente; abaixo a básica) */
  if v_prox_etapa = 'final' and v_etapa_atual = 'semifinal' then
    -- winners (2) e losers (2) ordenados por seed
    select array_agg(ct.time_id order by ct.seed nulls last, ct.time_id)
      into v_participantes
    from unnest(v_winners) w(time_id)
    join public.campeonato_times ct on ct.campeonato_id = p_campeonato_id and ct.time_id = w.time_id;

    select array_agg(ct.time_id order by ct.seed nulls last, ct.time_id)
      into v_losers
    from unnest(v_losers) l(time_id)
    join public.campeonato_times ct on ct.campeonato_id = p_campeonato_id and ct.time_id = l.time_id;

    -- FINAL
    select coalesce(max(rodada),0)+1 into v_rodada_final
    from public.partidas
    where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = 'final';

    v_ch := gen_random_uuid();
    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_rodada_final, v_participantes[1], v_participantes[2],
       0, 0, false, null, null,
       null, null, false, true, 'final', 1, v_ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_final + 1, v_participantes[2], v_participantes[1],
         0, 0, false, null, null,
         null, null, false, true, 'final', 2, v_ch, null);
    end if;

    -- 3º LUGAR
    v_ch := gen_random_uuid();
    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_rodada_final, v_losers[1], v_losers[2],
       0, 0, false, null, null,
       null, null, false, true, 'terceiro_lugar', 1, v_ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_final + 1, v_losers[2], v_losers[1],
         0, 0, false, null, null,
         null, null, false, true, 'terceiro_lugar', 2, v_ch, null);
    end if;

    return;
  end if;

  /* 5) Próxima etapa “cheia” */
  select coalesce(max(rodada),0)+1 into v_rodada_base
  from public.partidas
  where campeonato_id = p_campeonato_id
    and is_mata_mata = true
    and etapa = v_prox_etapa;

  for i in 1..(v_n/2) loop
    j := v_n - i + 1;
    v_ch := gen_random_uuid();

    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_rodada_base, v_participantes[i], v_participantes[j],
       0, 0, false, null, null,
       null, null, false, true, v_prox_etapa, 1, v_ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_base + 1, v_participantes[j], v_participantes[i],
         0, 0, false, null, null,
         null, null, false, true, v_prox_etapa, 2, v_ch, null);
    end if;
  end loop;

  return;
end
$$;


--
-- Name: advance_bracket_auto(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.advance_bracket_auto(p_campeonato_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_ida_volta boolean := false;
begin
  select coalesce(c.ida_volta, false)
    into v_ida_volta
  from public.campeonatos c
  where c.id = p_campeonato_id;

  -- chama sua função existente (ela já trata semifinal -> final + 3º)
  perform public.advance_bracket(p_campeonato_id, v_ida_volta, false);
end
$$;


--
-- Name: current_usuario_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.current_usuario_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select u.id
    from public.usuarios u
   where u.auth_uid = auth.uid()
  limit 1
$$;


--
-- Name: ensure_final_and_third_from_semis(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_final_and_third_from_semis(p_campeonato_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_ida_volta boolean := false;
  v_winners uuid[];
  v_losers  uuid[];
  v_final_r int;
  v_terc_r  int;
  v_ch uuid;
begin
  -- 0) config
  select coalesce(c.ida_volta,false)
    into v_ida_volta
  from public.campeonatos c
  where c.id = p_campeonato_id;

  -- 1) winners/losers das semifinais (agregado + pênaltis se necessário)
  with semi as (
    select * from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata = true
      and etapa = 'semifinal'
  ),
  legs as (
    select
      chave_id,
      (array_agg(time_a_id order by coalesce(perna,1) asc, coalesce(data_hora, criado_em) asc))[1] as a_id,
      (array_agg(time_b_id order by coalesce(perna,1) asc, coalesce(data_hora, criado_em) asc))[1] as b_id,
      sum(gols_time_a) as sum_a,
      sum(gols_time_b) as sum_b,
      (array_agg(id      order by coalesce(perna,1) desc, coalesce(data_hora, criado_em) desc))[1] as last_leg_id
    from semi
    group by chave_id
  ),
  last_leg as (
    select l.*, p.penaltis_time_a as pen_a, p.penaltis_time_b as pen_b
    from legs l
    join public.partidas p on p.id = l.last_leg_id
  ),
  decisao as (
    select
      ll.chave_id,
      case
        when ll.sum_a > ll.sum_b then ll.a_id
        when ll.sum_b > ll.sum_a then ll.b_id
        else case
               when ll.pen_a is not null and ll.pen_b is not null and ll.pen_a <> ll.pen_b
                 then case when ll.pen_a > ll.pen_b then ll.a_id else ll.b_id end
               else null
             end
      end as vencedor,
      case
        when ll.sum_a > ll.sum_b then ll.b_id
        when ll.sum_b > ll.sum_a then ll.a_id
        else case
               when ll.pen_a is not null and ll.pen_b is not null and ll.pen_a <> ll.pen_b
                 then case when ll.pen_a > ll.pen_b then ll.b_id else ll.a_id end
               else null
             end
      end as perdedor
    from last_leg ll
  )
  select
    array_agg(vencedor order by vencedor),
    array_agg(perdedor order by perdedor)
  into v_winners, v_losers
  from decisao;

  if v_winners is null or array_length(v_winners,1) <> 2
     or array_position(v_winners, null) is not null then
    raise exception 'Semifinal sem dois vencedores definidos (verifique pênaltis).';
  end if;

  if v_losers is null or array_length(v_losers,1) <> 2
     or array_position(v_losers, null) is not null then
    raise exception 'Semifinal sem dois perdedores definidos (verifique pênaltis).';
  end if;

  -- 2) rodadas base independentes para FINAL e 3º
  select coalesce(max(rodada),0)+1 into v_final_r
  from public.partidas
  where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = 'final';

  select coalesce(max(rodada),0)+1 into v_terc_r
  from public.partidas
  where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = 'terceiro_lugar';

  -- 3) FINAL: cria se não existir nenhum jogo de FINAL ainda
  if not exists (
    select 1 from public.partidas
    where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = 'final'
  ) then
    v_ch := gen_random_uuid();
    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_final_r, v_winners[1], v_winners[2],
       0, 0, false, null, null,
       null, null, false, true, 'final', 1, v_ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_final_r + 1, v_winners[2], v_winners[1],
         0, 0, false, null, null,
         null, null, false, true, 'final', 2, v_ch, null);
    end if;
  end if;

  -- 4) 3º LUGAR: cria se não existir
  if not exists (
    select 1 from public.partidas
    where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = 'terceiro_lugar'
  ) then
    v_ch := gen_random_uuid();
    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_terc_r, v_losers[1], v_losers[2],
       0, 0, false, null, null,
       null, null, false, true, 'terceiro_lugar', 1, v_ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_terc_r + 1, v_losers[2], v_losers[1],
         0, 0, false, null, null,
         null, null, false, true, 'terceiro_lugar', 2, v_ch, null);
    end if;
  end if;
end
$$;


--
-- Name: enum_values(regtype); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enum_values(p_enum regtype) RETURNS TABLE(value text, sort_order real)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select e.enumlabel::text as value, e.enumsortorder
  from pg_enum e
  where e.enumtypid = p_enum
  order by e.enumsortorder;
$$;


--
-- Name: generate_knockout_after_groups(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_knockout_after_groups(p_campeonato_id uuid, p_limpar_abertas_etapa boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_tem_grupos boolean;
  v_abertas int;
  v_existe_mata boolean;
  v_participantes uuid[];
  v_n int;
  v_target int;
  v_etapa text;
  v_rodada_base int;
  v_qt_class int;         -- campeonatos.avancam_por_grupo
  v_ida_volta boolean;    -- campeonatos.ida_volta (vale p/ KO)
  i int; j int; ch uuid;
begin
  -- lê parâmetros do campeonato
  select
    coalesce(c.avancam_por_grupo, 0),
    coalesce(c.ida_volta, false)
  into v_qt_class, v_ida_volta
  from public.campeonatos c
  where c.id = p_campeonato_id;

  if v_qt_class is null or v_qt_class <= 0 then
    raise exception 'Campo campeonatos.avancam_por_grupo inválido (%) para campeonato %',
      v_qt_class, p_campeonato_id;
  end if;

  -- há grupos?
  select exists(
    select 1 from public.campeonato_times ct
    where ct.campeonato_id = p_campeonato_id and ct.grupo is not null
  ) into v_tem_grupos;
  if not v_tem_grupos then
    return; -- helper é para pós-grupos
  end if;

  -- existem partidas de grupos não encerradas?
  select count(*) into v_abertas
  from public.partidas p
  where p.campeonato_id = p_campeonato_id
    and coalesce(p.is_mata_mata,false) = false
    and coalesce(p.encerrada,false) = false;
  if v_abertas > 0 then
    return;
  end if;

  -- já existe mata-mata?
  select exists(
    select 1 from public.partidas
    where campeonato_id = p_campeonato_id and is_mata_mata = true
  ) into v_existe_mata;
  if v_existe_mata then
    return;
  end if;

  -- classificados: top-N por grupo via vw_classificacao
  with qual as (
    select
      c.grupo,
      c.time_id,
      row_number() over (partition by c.campeonato_id, c.grupo order by c.posicao asc, c.time_id) as rn
    from public.vw_classificacao c
    where c.campeonato_id = p_campeonato_id
  ),
  qual_filtrado as (
    select q.time_id
    from qual q
    where q.rn <= v_qt_class
  ),
  ordenado as (
    select ct.time_id
    from qual_filtrado q
    join public.campeonato_times ct on ct.campeonato_id = p_campeonato_id and ct.time_id = q.time_id
    order by ct.seed nulls last, ct.time_id
  )
  select array_agg(time_id) into v_participantes from ordenado;

  v_n := coalesce(array_length(v_participantes,1),0);
  if v_n < 2 then return; end if;

  -- alvo: 2 ou múltiplo de 4 (>=4)
  if v_n = 2 then
    v_target := 2;
  elsif (v_n % 4) = 0 then
    v_target := v_n;
  else
    v_target := (v_n / 4) * 4;
    if v_target < 4 then v_target := 2; end if;
  end if;

  if p_limpar_abertas_etapa then
    delete from public.partidas
    where campeonato_id = p_campeonato_id and is_mata_mata = true and encerrada = false;
  end if;

  -- PRELIMINAR se necessário
  if v_n <> v_target then
    declare
      prelim_part int := 2*(v_n - v_target);
      left_idx int := v_n - prelim_part + 1;
      right_idx int := v_n;
      x int := 0;
    begin
      v_etapa := 'preliminar';
      select coalesce(max(rodada),0)+1 into v_rodada_base
      from public.partidas
      where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = v_etapa;

      while (left_idx + x) <= (right_idx - x) loop
        ch := gen_random_uuid();

        -- perna 1
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base,
           v_participantes[left_idx + x], v_participantes[right_idx - x],
           0, 0, false, null, null,
           null, null, false, true, v_etapa, 1, ch, null);

        if v_ida_volta then
          insert into public.partidas
            (campeonato_id, rodada, time_a_id, time_b_id,
             gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
             data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
          values
            (p_campeonato_id, v_rodada_base + 1,
             v_participantes[right_idx - x], v_participantes[left_idx + x],
             0, 0, false, null, null,
             null, null, false, true, v_etapa, 2, ch, null);
        end if;

        x := x + 1;
        exit when (left_idx + x) > (right_idx - x);
      end loop;

      return; -- só preliminar; próximas fases via advance_bracket()
    end;
  end if;

  -- etapa “cheia”
  v_etapa := public._etapa_nome(v_target);
  select coalesce(max(rodada),0)+1 into v_rodada_base
  from public.partidas
  where campeonato_id = p_campeonato_id and is_mata_mata = true and etapa = v_etapa;

  i := 1; j := v_target;
  while i < j loop
    ch := gen_random_uuid();

    -- perna 1
    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_rodada_base, v_participantes[i], v_participantes[j],
       0, 0, false, null, null,
       null, null, false, true, v_etapa, 1, ch, null);

    if v_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_base + 1, v_participantes[j], v_participantes[i],
         0, 0, false, null, null,
         null, null, false, true, v_etapa, 2, ch, null);
    end if;

    i := i + 1; j := j - 1;
  end loop;
end
$$;


--
-- Name: generate_partidas(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_partidas(p_campeonato_id uuid, p_limpar_abertas boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_formato text;
  v_ida_volta boolean;
begin
  select formato, coalesce(ida_volta, false)
    into v_formato, v_ida_volta
  from public.campeonatos
  where id = p_campeonato_id;

  if v_formato is null then
    raise exception 'Campeonato % não encontrado.', p_campeonato_id;
  end if;

  if v_formato in ('pontos_corridos', 'grupos') then
    perform public.generate_partidas_pontos_corridos(p_campeonato_id, v_ida_volta, p_limpar_abertas);
    --raise notice 'teste pontos corridos ou grupos';

  elsif v_formato = 'mata_mata' then
    -- placeholder: plugar função de chave
    perform public.generate_partidas_mata_mata(p_campeonato_id, v_ida_volta, p_limpar_abertas);
    --raise notice 'Formato mata_mata detectado: faltando implementar generate_partidas_mata_mata.';
  else
    -- fallback seguro
    perform public.generate_partidas_pontos_corridos(p_campeonato_id, v_ida_volta, p_limpar_abertas);
  end if;
end
$$;


--
-- Name: generate_partidas_mata_mata(uuid, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_partidas_mata_mata(p_campeonato_id uuid, p_ida_volta boolean DEFAULT true, p_limpar_abertas_etapa boolean DEFAULT false) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_times uuid[];
  v_n int;
  v_target int;        -- 2 ou múltiplo de 4 (>=4)
  v_prelim_part int;   -- participantes da preliminar
  v_etapa text;
  v_i int;
  v_j int;
  v_left int;
  v_right int;
  v_chave uuid;
  v_rodada_base int;
begin
  -- inscritos ordenados por seed asc
  select array_agg(t.time_id order by t.seed nulls last, t.time_id)
    into v_times
  from public.campeonato_times t
  where t.campeonato_id = p_campeonato_id;

  v_n := coalesce(array_length(v_times,1), 0);
  if v_n < 2 then
    raise exception 'Campeonato % precisa de pelo menos 2 times (atual: %).', p_campeonato_id, v_n;
  end if;

  -- alvo: 2 ou múltiplo de 4 (>=4)
  if v_n = 2 then
    v_target := 2;
  elsif (v_n % 4) = 0 then
    v_target := v_n;
  else
    v_target := (v_n / 4) * 4;
    if v_target < 4 then
      v_target := 2;
    end if;
  end if;

  -- PRELIMINAR?
  if v_n <> v_target then
    v_etapa := 'preliminar';
    v_prelim_part := 2 * (v_n - v_target); -- ex.: n=10 -> 4 times (2 jogos)

    if p_limpar_abertas_etapa then
      delete from public.partidas
      where campeonato_id = p_campeonato_id
        and is_mata_mata = true
        and etapa = v_etapa
        and encerrada = false;
    end if;

    select coalesce(max(rodada), 0) + 1
      into v_rodada_base
    from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata = true
      and etapa = v_etapa;

    -- piores seeds no bloco final do array
    v_left  := v_n - v_prelim_part + 1;
    v_right := v_n;

    v_i := 0;
    while (v_left + v_i) <= (v_right - v_i) loop
      v_chave := gen_random_uuid();

      -- perna 1
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_base, v_times[v_left + v_i], v_times[v_right - v_i],
         0, 0, false, null, null,
         null, null, false, true, v_etapa, 1, v_chave, null);

      -- perna 2 (opcional)
      if p_ida_volta then
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + 1, v_times[v_right - v_i], v_times[v_left + v_i],
           0, 0, false, null, null,
           null, null, false, true, v_etapa, 2, v_chave, null);
      end if;

      v_i := v_i + 1;
      exit when (v_left + v_i) > (v_right - v_i);
    end loop;

    return; -- gera somente a preliminar agora
  end if;

  -- etapa "cheia"
  v_etapa := public._etapa_nome(v_target);

  if p_limpar_abertas_etapa then
    delete from public.partidas
    where campeonato_id = p_campeonato_id
      and is_mata_mata = true
      and etapa = v_etapa
      and encerrada = false;
  end if;

  select coalesce(max(rodada), 0) + 1
    into v_rodada_base
  from public.partidas
  where campeonato_id = p_campeonato_id
    and is_mata_mata = true
    and etapa = v_etapa;

  -- pareamento 1×N, 2×(N-1) ...
  v_i := 1;
  v_j := v_target;
  while v_i < v_j loop
    v_chave := gen_random_uuid();

    insert into public.partidas
      (campeonato_id, rodada, time_a_id, time_b_id,
       gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
       data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
    values
      (p_campeonato_id, v_rodada_base, v_times[v_i], v_times[v_j],
       0, 0, false, null, null,
       null, null, false, true, v_etapa, 1, v_chave, null);

    if p_ida_volta then
      insert into public.partidas
        (campeonato_id, rodada, time_a_id, time_b_id,
         gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
         data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
      values
        (p_campeonato_id, v_rodada_base + 1, v_times[v_j], v_times[v_i],
         0, 0, false, null, null,
         null, null, false, true, v_etapa, 2, v_chave, null);
    end if;

    v_i := v_i + 1;
    v_j := v_j - 1;
  end loop;
end
$$;


--
-- Name: generate_partidas_pontos_corridos(uuid, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_partidas_pontos_corridos(p_campeonato_id uuid, p_ida_volta boolean DEFAULT false, p_limpar_abertas boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  r record;
  v_tem_grupo boolean;
begin
  select exists (
    select 1 from public.campeonato_times
    where campeonato_id = p_campeonato_id and grupo is not null
  ) into v_tem_grupo;

  if v_tem_grupo then
    for r in
      select distinct grupo
      from public.campeonato_times
      where campeonato_id = p_campeonato_id
      order by grupo
    loop
      perform public.generate_partidas_pontos_corridos_grupo(p_campeonato_id, r.grupo, p_ida_volta, p_limpar_abertas);
    end loop;
  else
    perform public.generate_partidas_pontos_corridos_grupo(p_campeonato_id, null, p_ida_volta, p_limpar_abertas);
  end if;
end
$$;


--
-- Name: generate_partidas_pontos_corridos_grupo(uuid, integer, boolean, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_partidas_pontos_corridos_grupo(p_campeonato_id uuid, p_grupo integer, p_ida_volta boolean DEFAULT NULL::boolean, p_limpar_abertas boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_times uuid[];           -- times ordenados por seed; se ímpar, adiciona bye = NULL
  v_n int;
  v_rounds int;             -- número de rodadas na ida = v_n - 1
  r0 int;                   -- rodada 0-based
  k int;                    -- par do round
  idx_a int;
  idx_b int;
  t_a uuid;
  t_b uuid;
  v_rodada_base int;
  m int;                    -- m = v_n - 1 (tamanho do anel)
  v_ida_volta boolean;      -- lido de campeonatos.ida_volta
begin
  -- Lê o flag global do campeonato
  select coalesce(c.ida_volta, false)
    into v_ida_volta
  from public.campeonatos c
  where c.id = p_campeonato_id;

  -- Limpeza opcional (liga)
  if p_limpar_abertas then
    delete from public.partidas
    where campeonato_id = p_campeonato_id
      and coalesce(grupo, -1) is not distinct from coalesce(p_grupo, -1)
      and coalesce(is_mata_mata,false) = false
      and coalesce(encerrada,false) = false;
  end if;

  -- Carrega times do grupo (ordenados por seed asc, depois id)
  select array_agg(t.time_id order by t.seed nulls last, t.time_id)
    into v_times
  from public.campeonato_times t
  where t.campeonato_id = p_campeonato_id
    and coalesce(t.grupo, -1) is not distinct from coalesce(p_grupo, -1);

  if v_times is null or array_length(v_times,1) < 2 then
    return;
  end if;

  v_n := array_length(v_times,1);
  -- Se ímpar, adiciona bye (NULL). Se par, não existe bye por rodada.
  if (v_n % 2) = 1 then
    v_times := v_times || null;
    v_n := v_n + 1;
  end if;

  v_rounds := v_n - 1;
  m := v_n - 1;

  -- Continuar numeração de rodadas a partir do máximo existente
  select coalesce(max(rodada), 0) + 1
    into v_rodada_base
  from public.partidas
  where campeonato_id = p_campeonato_id
    and coalesce(grupo, -1) is not distinct from coalesce(p_grupo, -1)
    and coalesce(is_mata_mata,false) = false;

  -- === IDA === (método de Berger: rot(k) x rot(-k) + um fixo)
  for r0 in 0..(v_rounds - 1) loop
    -- par 0: rot(0) x fixo (posição v_n)
    idx_a := ((0 + r0) % m) + 1;
    idx_b := v_n;
    t_a := v_times[idx_a];
    t_b := v_times[idx_b];
    if t_a is not null and t_b is not null and t_a <> t_b then
      if (r0 % 2) = 0 then
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + r0, t_a, t_b,
           0, 0, false, null, null,
           null, null, false, false, null, 1, null, p_grupo);
      else
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + r0, t_b, t_a,
           0, 0, false, null, null,
           null, null, false, false, null, 1, null, p_grupo);
      end if;
    end if;

    -- Demais pares k = 1..(v_n/2 - 1): rot(k) × rot(-k)
    for k in 1..(v_n/2 - 1) loop
      idx_a := ((k + r0) % m) + 1;
      idx_b := ((r0 - k + m) % m) + 1;  -- CORRETO (rot(-k))
      t_a := v_times[idx_a];
      t_b := v_times[idx_b];

      if t_a is null or t_b is null or t_a = t_b then
        continue;
      end if;

      if (r0 % 2) = 0 then
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + r0, t_a, t_b,
           0, 0, false, null, null,
           null, null, false, false, null, 1, null, p_grupo);
      else
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + r0, t_b, t_a,
           0, 0, false, null, null,
           null, null, false, false, null, 1, null, p_grupo);
      end if;
    end loop;
  end loop;

  -- === VOLTA: espelho da ida com mando invertido — governado por v_ida_volta ===
  if v_ida_volta then
    for r0 in 0..(v_rounds - 1) loop
      -- par 0
      idx_a := ((0 + r0) % m) + 1;
      idx_b := v_n;
      t_a := v_times[idx_a];
      t_b := v_times[idx_b];
      if t_a is not null and t_b is not null and t_a <> t_b then
        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + v_rounds + r0, t_b, t_a,
           0, 0, false, null, null,
           null, null, false, false, null, 2, null, p_grupo);
      end if;

      for k in 1..(v_n/2 - 1) loop
        idx_a := ((k + r0) % m) + 1;
        idx_b := ((r0 - k + m) % m) + 1;  -- rot(-k)
        t_a := v_times[idx_a];
        t_b := v_times[idx_b];
        if t_a is null or t_b is null or t_a = t_b then
          continue;
        end if;

        insert into public.partidas
          (campeonato_id, rodada, time_a_id, time_b_id,
           gols_time_a, gols_time_b, prorrogacao, penaltis_time_a, penaltis_time_b,
           data_hora, "local", encerrada, is_mata_mata, etapa, perna, chave_id, grupo)
        values
          (p_campeonato_id, v_rodada_base + v_rounds + r0, t_b, t_a,
           0, 0, false, null, null,
           null, null, false, false, null, 2, null, p_grupo);
      end loop;
    end loop;
  end if;
end
$$;


--
-- Name: owns_campeonato(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.owns_campeonato(p_camp_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
      from public.campeonatos c
     where c.id = p_camp_id
       and c.usuario_id = public.current_usuario_id()
  )
$$;


--
-- Name: partidas_classificacao_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.partidas_classificacao_trigger() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_campeonato uuid := coalesce(NEW.campeonato_id, OLD.campeonato_id);
  v_time_a     uuid := coalesce(NEW.time_a_id,     OLD.time_a_id);
  v_time_b     uuid := coalesce(NEW.time_b_id,     OLD.time_b_id);
begin
  perform set_config('app.classificacao_write', 'on', true);
  if v_campeonato is not null then
    if v_time_a is not null then
      perform public.rebuild_classificacao_time(v_campeonato, v_time_a);
    end if;
    if v_time_b is not null then
      perform public.rebuild_classificacao_time(v_campeonato, v_time_b);
    end if;
  end if;

  return coalesce(NEW, OLD);
end $$;


--
-- Name: rebuild_classificacao_campeonato(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rebuild_classificacao_campeonato(p_campeonato_id uuid) RETURNS void
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  r record;
begin
  perform set_config('app.classificacao_write', 'on', true);
  for r in
    select distinct t as time_id
    from (
      select time_a_id as t from public.partidas where campeonato_id = p_campeonato_id
      union
      select time_b_id as t from public.partidas where campeonato_id = p_campeonato_id
    ) s
  loop
    perform public.rebuild_classificacao_time(p_campeonato_id, r.time_id);
  end loop;
end $$;


--
-- Name: rebuild_classificacao_time(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rebuild_classificacao_time(p_campeonato_id uuid, p_time_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r record;
  v_grupo       int;
  v_jogos       int;
  v_pontos      int;
  v_percentual  numeric(5,2);
begin
  -- ✅ Guard: se o campeonato não existe, sai sem tentar escrever em classificacao
  IF NOT EXISTS (
    SELECT 1 FROM public.campeonatos c WHERE c.id = p_campeonato_id
  ) THEN
    -- RAISE NOTICE 'Skip rebuild_classificacao_time: campeonato % não existe', p_campeonato_id;
    RETURN;
  END IF;

  perform set_config('app.classificacao_write', 'on', true);

  WITH partidas_alvo AS (
    SELECT campeonato_id, grupo, time_a_id, time_b_id, gols_time_a, gols_time_b
    FROM public.partidas
    WHERE encerrada = true
      AND coalesce(is_mata_mata, false) = false
      AND campeonato_id = p_campeonato_id
      AND (time_a_id = p_time_id OR time_b_id = p_time_id)
  ), normalizada AS (
    SELECT
      campeonato_id,
      grupo,
      CASE WHEN time_a_id = p_time_id THEN gols_time_a ELSE gols_time_b END AS gf,
      CASE WHEN time_a_id = p_time_id THEN gols_time_b ELSE gols_time_a END AS ga
    FROM partidas_alvo
  )
  SELECT
    p_campeonato_id::uuid                           AS campeonato_id,
    p_time_id::uuid                                 AS time_id,
    max(grupo) FILTER (WHERE grupo IS NOT NULL)     AS grupo,
    coalesce(sum(CASE WHEN gf>ga THEN 1 ELSE 0 END),0) AS vitorias,
    coalesce(sum(CASE WHEN gf=ga THEN 1 ELSE 0 END),0) AS empates,
    coalesce(sum(CASE WHEN gf<ga THEN 1 ELSE 0 END),0) AS derrotas,
    coalesce(sum(gf),0)                             AS gols_pro,
    coalesce(sum(ga),0)                             AS gols_contra
  INTO r
  FROM normalizada;

  -- Fallback do grupo via inscrição
  SELECT max(ct.grupo)
    INTO v_grupo
  FROM public.campeonato_times ct
  WHERE ct.campeonato_id = p_campeonato_id
    AND ct.time_id       = p_time_id;

  r.grupo := coalesce(r.grupo, v_grupo);

  -- Derivados
  v_jogos      := r.vitorias + r.empates + r.derrotas;
  v_pontos     := r.vitorias*3 + r.empates;
  v_percentual := CASE WHEN v_jogos > 0
                       THEN round((v_pontos::numeric / (v_jogos*3)::numeric)*100, 2)
                       ELSE 0 END;

  -- ✅ UPSERT apenas se o campeonato existir (cinturão e suspensório)
  INSERT INTO public.classificacao (
    campeonato_id, time_id, grupo,
    vitorias, empates, derrotas,
    gols_pro, gols_contra,
    percentual, atualizado_em
  )
  SELECT
    r.campeonato_id, r.time_id, r.grupo,
    r.vitorias, r.empates, r.derrotas,
    r.gols_pro, r.gols_contra,
    v_percentual, now()
  FROM public.campeonatos c
  WHERE c.id = r.campeonato_id
  ON CONFLICT (campeonato_id, time_id) DO UPDATE
    SET grupo         = EXCLUDED.grupo,
        vitorias      = EXCLUDED.vitorias,
        empates       = EXCLUDED.empates,
        derrotas      = EXCLUDED.derrotas,
        gols_pro      = EXCLUDED.gols_pro,
        gols_contra   = EXCLUDED.gols_contra,
        percentual    = EXCLUDED.percentual,
        atualizado_em = now();

END
$$;


--
-- Name: trg_bloqueia_formato_por_limite(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_bloqueia_formato_por_limite() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_nov_formato text;
  v_limite int;
  v_qt int;
begin
  if NEW.formato is distinct from OLD.formato then
    v_nov_formato := NEW.formato;
    v_limite := public._max_teams_by_formato(v_nov_formato);

    select count(*) into v_qt
    from public.campeonato_times
    where campeonato_id = NEW.id;

    if v_qt > v_limite then
      raise exception
        'Não é permitido alterar formato para "%" neste campeonato: % times associados (limite: %).',
        v_nov_formato, v_qt, v_limite;
    end if;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_ko_after_close_advance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_ko_after_close_advance() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_lock boolean;
  v_restantes int;
begin
  if coalesce(NEW.is_mata_mata,false) = false then
    return NEW;
  end if;

  -- Só quando FECHA: false -> true
  if coalesce(OLD.encerrada,false) = false and coalesce(NEW.encerrada,false) = true then
    v_lock := pg_try_advisory_xact_lock(hashtext(NEW.campeonato_id::text));
    if not v_lock then return NEW; end if;

    select count(*) into v_restantes
    from public.partidas p
    where p.campeonato_id = NEW.campeonato_id
      and p.is_mata_mata  = true
      and p.etapa         = NEW.etapa
      and coalesce(p.encerrada,false) = false;

    if v_restantes = 0 then
      begin
        perform public.advance_bracket(NEW.campeonato_id);
      exception when others then
        raise notice 'advance_bracket falhou: %', sqlerrm;
      end;
    end if;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_ko_after_reopen_cleanup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_ko_after_reopen_cleanup() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_lock boolean;
  v_abertas int;
  v_has_closed_next boolean;
begin
  if coalesce(NEW.is_mata_mata,false) = false then
    return NEW;
  end if;

  if coalesce(OLD.encerrada,false) = true and coalesce(NEW.encerrada,false) = false then
    v_lock := pg_try_advisory_xact_lock(hashtext(NEW.campeonato_id::text));
    if not v_lock then return NEW; end if;

    select count(*) into v_abertas
    from public.partidas p
    where p.campeonato_id = NEW.campeonato_id
      and p.is_mata_mata  = true
      and p.etapa         = NEW.etapa
      and coalesce(p.encerrada,false) = false;

    if v_abertas > 0 then
      v_has_closed_next := public._has_closed_next(NEW.campeonato_id, NEW.etapa);

      if v_has_closed_next then
        if lower(NEW.etapa) = 'semifinal' then
          raise exception 'Não é possível reabrir a semifinal: existem partidas encerradas em FINAL e/ou TERCEIRO_LUGAR.';
        else
          raise exception 'Não é possível reabrir a etapa "%": a próxima etapa possui partidas encerradas.', NEW.etapa;
        end if;
      end if;

      perform public._delete_next_phase(NEW.campeonato_id, NEW.etapa::text);
    end if;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_ko_enforce_leg_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_ko_enforce_leg_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_ida_encerrada boolean;
begin
  -- Só mata-mata e só quando está tentando ENCERRAR
  if coalesce(NEW.is_mata_mata,false) = true
     and coalesce(NEW.perna,1) = 2
     and coalesce(NEW.encerrada,false) = true then

    -- Confere a ida (mesma chave, perna 1) já encerrada
    select coalesce(max(p.encerrada), false)
      into v_ida_encerrada
    from public.partidas p
    where p.chave_id = NEW.chave_id
      and coalesce(p.perna,1) = 1
      and p.is_mata_mata = true;

    if not coalesce(v_ida_encerrada,false) then
      raise exception
        'Proibido encerrar a partida de VOLTA antes da IDA: a perna 1 da chave % ainda não está encerrada.',
        NEW.chave_id;
    end if;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_limite_times_campeonato_times(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_limite_times_campeonato_times() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_camp_dest uuid;
  v_camp_orig uuid;
  v_formato text;
  v_limite int;
  v_qt int;
begin
  if tg_op = 'INSERT' then
    v_camp_dest := NEW.campeonato_id;

    select c.formato into v_formato
    from public.campeonatos c where c.id = v_camp_dest;

    v_limite := public._max_teams_by_formato(v_formato);

    select count(*) into v_qt
    from public.campeonato_times
    where campeonato_id = v_camp_dest;

    if v_qt + 1 > v_limite then
      raise exception
        'Limite de % times para formato "%" excedido neste campeonato (atual: %, tentativa: %).',
        v_limite, v_formato, v_qt, v_qt + 1;
    end if;

    return NEW;

  elsif tg_op = 'UPDATE' then
    -- Se trocou de campeonato, valida destino
    if NEW.campeonato_id is distinct from OLD.campeonato_id then
      v_camp_dest := NEW.campeonato_id;
      v_camp_orig := OLD.campeonato_id;

      select c.formato into v_formato
      from public.campeonatos c where c.id = v_camp_dest;

      v_limite := public._max_teams_by_formato(v_formato);

      select count(*) into v_qt
      from public.campeonato_times
      where campeonato_id = v_camp_dest;

      if v_qt + 1 > v_limite then
        raise exception
          'Limite de % times para formato "%" excedido no campeonato de destino (atual: %, tentativa: %).',
          v_limite, v_formato, v_qt, v_qt + 1;
      end if;
    end if;

    -- Se não mudou o campeonato, não altera a cardinalidade: ok
    return NEW;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_on_groups_finished_generate_knockout(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_on_groups_finished_generate_knockout() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  -- só liga (pontos corridos)
  if coalesce(NEW.is_mata_mata,false) then
    return NEW;
  end if;

  -- quando a partida foi encerrada agora
  if coalesce(NEW.encerrada,false) = true and coalesce(OLD.encerrada,false) = false then
    perform public.generate_knockout_after_groups(
      NEW.campeonato_id,
      false   -- não limpar etapas abertas (normalmente não precisa)
    );
  end if;

  return NEW;
end
$$;


--
-- Name: trg_on_ko_stage_finished_advance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_on_ko_stage_finished_advance() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_restantes int;
begin
  if coalesce(NEW.is_mata_mata,false) = false then
    return NEW;
  end if;

  if coalesce(NEW.encerrada,false) = true
     and coalesce(OLD.encerrada,false) = false then

    select count(*) into v_restantes
    from public.partidas p
    where p.campeonato_id = NEW.campeonato_id
      and p.is_mata_mata = true
      and p.etapa = NEW.etapa
      and coalesce(p.encerrada,false) = false;

    if v_restantes = 0 then
      perform public.advance_bracket(NEW.campeonato_id);  -- sem ambiguidade
    end if;
  end if;

  return NEW;
end
$$;


--
-- Name: trg_phase_guard_and_reprocess(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_phase_guard_and_reprocess() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  v_phase_locked boolean;
  v_abertas_mesma_fase int;
  v_has_next_closed boolean;
  v_next_etapa text;
  v_grupos_concluidos boolean;
begin
  -- só reage a mudança relevante (placares/penaltis/encerrada)
  if row(NEW.gols_time_a, NEW.gols_time_b, NEW.penaltis_time_a, NEW.penaltis_time_b, NEW.encerrada)
     is not distinct from
     row(OLD.gols_time_a, OLD.gols_time_b, OLD.penaltis_time_a, OLD.penaltis_time_b, OLD.encerrada) then
    return NEW;
  end if;

  -- lock por campeonato (evita corrida entre updates simultâneos)
  v_phase_locked := pg_try_advisory_xact_lock(hashtext(NEW.campeonato_id::text));
  if not v_phase_locked then
    -- se não conseguiu o lock, não toma ação extra (mas permite o update)
    return NEW;
  end if;

  if coalesce(NEW.is_mata_mata,false) = false then
    ----------------------------------------------------------------------
    --  A) FASE DE GRUPOS
    ----------------------------------------------------------------------
    -- a fase de grupos do campeonato está concluída?
    select count(*) into v_abertas_mesma_fase
    from public.partidas p
    where p.campeonato_id = NEW.campeonato_id
      and coalesce(p.is_mata_mata,false) = false
      and coalesce(p.encerrada,false) = false;

    v_grupos_concluidos := (v_abertas_mesma_fase = 0);

    if v_grupos_concluidos then
      -- existe etapa de mata-mata (fase seguinte)? se sim, verificar encerradas
      with mm as (
        select etapa, public._etapa_rank(etapa) rk
        from public.partidas
        where campeonato_id = NEW.campeonato_id and is_mata_mata = true
        group by etapa
      ),
      proxima as (
        select etapa
        from mm
        where rk = (select min(rk) from mm)
      )
      select exists(
        select 1 from public.partidas p
        where p.campeonato_id = NEW.campeonato_id
          and p.is_mata_mata = true
          and p.etapa in (select etapa from proxima)
          and coalesce(p.encerrada,false) = true
      ) into v_has_next_closed;

      if coalesce(v_has_next_closed,false) then
        raise exception
          'Edição bloqueada: a fase de grupos já gerou mata-mata e a "primeira etapa" do mata-mata possui partidas encerradas. Ajuste manualmente ou reverta resultados da etapa seguinte antes de alterar a fase concluída.';
      end if;

      -- se não tem encerradas na próxima fase ⇒ reprocessa: apaga e regenera
      perform public._delete_next_phase(NEW.campeonato_id, 'grupos');
      perform public.generate_knockout_after_groups(NEW.campeonato_id, false); -- (p_limpar_abertas_etapa=false)
    end if;

    return NEW;

  else
    ----------------------------------------------------------------------
    --  B) FASE DE MATA-MATA
    ----------------------------------------------------------------------
    -- etapa (NEW.etapa) está concluída?
    select count(*) into v_abertas_mesma_fase
    from public.partidas p
    where p.campeonato_id = NEW.campeonato_id
      and p.is_mata_mata   = true
      and p.etapa          = NEW.etapa
      and coalesce(p.encerrada,false) = false;

    if v_abertas_mesma_fase = 0 then
      -- há próxima etapa?
      v_next_etapa := public._next_etapa_existente(NEW.campeonato_id, NEW.etapa);

      if v_next_etapa is not null then
        -- próxima etapa tem alguma encerrada?
        select exists(
          select 1 from public.partidas p
          where p.campeonato_id = NEW.campeonato_id
            and p.is_mata_mata  = true
            and p.etapa         = v_next_etapa
            and coalesce(p.encerrada,false) = true
        ) into v_has_next_closed;

        if v_has_next_closed then
          raise exception
            'Edição bloqueada: a etapa "%" está concluída e a próxima etapa ("%") possui partidas encerradas. Reverta resultados da etapa seguinte antes de alterar esta etapa.',
            NEW.etapa, v_next_etapa;
        end if;

        -- sem encerradas na próxima ⇒ reprocessa: apaga próxima e regenera com advance_bracket()
        perform public._delete_next_phase(NEW.campeonato_id, NEW.etapa);
        perform public.advance_bracket(NEW.campeonato_id);
      end if; -- se não há próxima, nada a reprocessar
    end if;

    return NEW;
  end if;
end
$$;


--
-- Name: add_prefixes(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.add_prefixes(_bucket_id text, _name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: delete_prefix(text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix(_bucket_id text, _name text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


--
-- Name: delete_prefix_hierarchy_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.delete_prefix_hierarchy_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


--
-- Name: get_level(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_level(name text) RETURNS integer
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


--
-- Name: get_prefix(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefix(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


--
-- Name: get_prefixes(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_prefixes(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: objects_insert_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_insert_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: objects_update_prefix_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.objects_update_prefix_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: prefixes_insert_trigger(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.prefixes_insert_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


--
-- Name: search_legacy_v1(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v1_optimised(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: search_v2(text, text, integer, integer, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_id text NOT NULL,
    client_secret_hash text NOT NULL,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048))
);


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: campeonato_times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campeonato_times (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campeonato_id uuid NOT NULL,
    time_id uuid NOT NULL,
    seed integer,
    criado_em timestamp without time zone DEFAULT now(),
    grupo integer,
    usuario_id uuid
);


--
-- Name: campeonatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campeonatos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    nome character varying(30) NOT NULL,
    formato character varying(20) NOT NULL,
    numero_equipes integer NOT NULL,
    ida_volta boolean DEFAULT false,
    numero_grupos integer,
    avancam_por_grupo integer,
    duracao_tempo integer NOT NULL,
    prorrogacao boolean DEFAULT false,
    duracao_prorrogacao integer,
    qtd_penaltis integer DEFAULT 5,
    criado_em timestamp without time zone DEFAULT now(),
    categoria_id uuid DEFAULT 'a7579001-e48e-4018-9c0a-a24cce0b4e6c'::uuid NOT NULL,
    CONSTRAINT campeonatos_duracao_tempo_check CHECK (((duracao_tempo >= 2) AND (duracao_tempo <= 45))),
    CONSTRAINT campeonatos_formato_chk CHECK (((formato)::text = ANY (ARRAY[('mata_mata'::character varying)::text, ('grupos'::character varying)::text, ('pontos_corridos'::character varying)::text]))),
    CONSTRAINT campeonatos_qtd_penaltis_check CHECK (((qtd_penaltis >= 1) AND (qtd_penaltis <= 5)))
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    descricao character varying(50) NOT NULL,
    criado_em timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: classificacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classificacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campeonato_id uuid NOT NULL,
    time_id uuid NOT NULL,
    grupo integer,
    vitorias integer DEFAULT 0 NOT NULL,
    empates integer DEFAULT 0 NOT NULL,
    derrotas integer DEFAULT 0 NOT NULL,
    gols_pro integer DEFAULT 0 NOT NULL,
    gols_contra integer DEFAULT 0 NOT NULL,
    percentual numeric(5,2),
    atualizado_em timestamp without time zone DEFAULT now(),
    usuario_id uuid
);


--
-- Name: jogadores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jogadores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    time_id uuid,
    usuario_id uuid,
    nome character varying(30) NOT NULL,
    apelido character varying(15),
    numero integer,
    posicao character varying(10) DEFAULT '-vazio-'::character varying,
    foto_url text,
    criado_em timestamp without time zone DEFAULT now(),
    CONSTRAINT jogadores_numero_chk CHECK (((numero >= 1) AND (numero <= 99)))
);


--
-- Name: partidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partidas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campeonato_id uuid,
    rodada integer,
    time_a_id uuid,
    time_b_id uuid,
    gols_time_a integer DEFAULT 0,
    gols_time_b integer DEFAULT 0,
    prorrogacao boolean DEFAULT false,
    penaltis_time_a integer,
    penaltis_time_b integer,
    data_hora timestamp without time zone,
    local character varying(100),
    encerrada boolean DEFAULT false,
    criado_em timestamp without time zone DEFAULT now(),
    is_mata_mata boolean DEFAULT false,
    etapa character varying(20),
    perna smallint,
    chave_id uuid,
    grupo integer,
    penmiss_time_a integer DEFAULT 0,
    penmiss_time_b integer DEFAULT 0,
    usuario_id uuid,
    CONSTRAINT partidas_time_a_diff_b_chk CHECK ((time_a_id IS DISTINCT FROM time_b_id))
);


--
-- Name: planos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    descricao character varying(20) NOT NULL,
    max_times integer NOT NULL,
    criado_em timestamp without time zone DEFAULT now(),
    CONSTRAINT planos_max_times_check CHECK (((max_times >= 1) AND (max_times <= 1000)))
);


--
-- Name: regioes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regioes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    descricao character varying(30) NOT NULL,
    criado_em timestamp without time zone DEFAULT now()
);


--
-- Name: times; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.times (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    nome character varying(30) NOT NULL,
    abreviacao character varying(5) NOT NULL,
    escudo_url text,
    criado_em timestamp without time zone DEFAULT now(),
    cor1 character varying(7) DEFAULT '#FFFFFF'::character varying NOT NULL,
    cor2 character varying(7) DEFAULT '#000000'::character varying NOT NULL,
    cor_detalhe character varying(7) DEFAULT '#000000'::character varying NOT NULL,
    regiao_id uuid,
    categoria_id uuid DEFAULT 'a7579001-e48e-4018-9c0a-a24cce0b4e6c'::uuid NOT NULL,
    CONSTRAINT times_cor1_hex_chk CHECK (((cor1)::text ~ '^#([0-9A-Fa-f]{6})$'::text)),
    CONSTRAINT times_cor2_hex_chk CHECK (((cor2)::text ~ '^#([0-9A-Fa-f]{6})$'::text)),
    CONSTRAINT times_cor_detalhe_diff_cor1_chk CHECK (((cor_detalhe)::text <> (cor1)::text)),
    CONSTRAINT times_cor_detalhe_hex_chk CHECK (((cor_detalhe)::text ~ '^#([0-9A-Fa-f]{6})$'::text))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(40) NOT NULL,
    email character varying(120) NOT NULL,
    time_coracao character varying(30),
    criado_em timestamp without time zone DEFAULT now(),
    plano_id uuid DEFAULT '1b7f4fba-90bd-489a-a611-93cd649e6a6e'::uuid NOT NULL,
    auth_uid uuid,
    avatar_url text,
    provedor_acesso public.usuario_provedor_acesso DEFAULT 'email'::public.usuario_provedor_acesso NOT NULL,
    status public.usuario_status DEFAULT 'atualizar'::public.usuario_status NOT NULL,
    data_renovacao date,
    categoria_preferida_id uuid,
    paleta_tema public.usuario_paleta_tema DEFAULT 'aureoartes'::public.usuario_paleta_tema NOT NULL,
    idioma public.usuario_idioma DEFAULT 'pt-BR'::public.usuario_idioma NOT NULL,
    notificacao_app boolean DEFAULT true NOT NULL,
    notificacao_email boolean DEFAULT true NOT NULL,
    notificacao_whatsapp boolean DEFAULT true NOT NULL,
    aceita_marketing boolean DEFAULT true NOT NULL,
    perfil_publico boolean DEFAULT true NOT NULL,
    cep character varying(10),
    cidade character varying(60),
    estado character varying(30),
    pais character varying(40) DEFAULT 'Brasil'::character varying NOT NULL,
    telefone_celular character varying(20),
    ultima_sessao_em timestamp with time zone,
    origem_aquisicao public.usuario_origem_aquisicao DEFAULT 'organico'::public.usuario_origem_aquisicao NOT NULL,
    codigo_indicacao character varying(20),
    indicado_por_id uuid,
    data_nasc date,
    instagram character varying(40),
    tiktok character varying(40),
    youtube character varying(50),
    CONSTRAINT usuarios_avatar_url_chk CHECK (((avatar_url IS NULL) OR (avatar_url ~* '^https?://'::text))),
    CONSTRAINT usuarios_cep_chk CHECK (((cep IS NULL) OR ((cep)::text ~ '^[0-9]{8}$'::text) OR ((cep)::text ~ '^[0-9]{5}-[0-9]{3}$'::text)))
);


--
-- Name: COLUMN usuarios.avatar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.avatar_url IS 'URL para avatar (http/https)';


--
-- Name: COLUMN usuarios.provedor_acesso; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.provedor_acesso IS 'Provedor de acesso (obrigatório): email, google, apple';


--
-- Name: COLUMN usuarios.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.status IS 'Status (obrigatório): ativo, teste, cancelado, suspenso';


--
-- Name: COLUMN usuarios.data_renovacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.data_renovacao IS 'Data de renovação (cobrança/assinatura)';


--
-- Name: COLUMN usuarios.categoria_preferida_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.categoria_preferida_id IS 'Categoria preferida (FK → categorias.id)';


--
-- Name: COLUMN usuarios.paleta_tema; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.paleta_tema IS 'Paleta de tema (obrigatório): aureoartes, nostalgico, dark, light';


--
-- Name: COLUMN usuarios.idioma; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.idioma IS 'Idioma (obrigatório): pt-BR, en, es';


--
-- Name: COLUMN usuarios.notificacao_app; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.notificacao_app IS 'Notificação por app (padrão: true)';


--
-- Name: COLUMN usuarios.notificacao_email; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.notificacao_email IS 'Notificação por email (padrão: true)';


--
-- Name: COLUMN usuarios.notificacao_whatsapp; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.notificacao_whatsapp IS 'Notificação por whatsapp (padrão: true)';


--
-- Name: COLUMN usuarios.aceita_marketing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.aceita_marketing IS 'Aceita receber marketing (padrão: true)';


--
-- Name: COLUMN usuarios.perfil_publico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.perfil_publico IS 'Perfil público (padrão: true)';


--
-- Name: COLUMN usuarios.cep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.cep IS 'CEP (BR), aceitar 8 dígitos ou formato nnnnn-nnn';


--
-- Name: COLUMN usuarios.cidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.cidade IS 'Cidade';


--
-- Name: COLUMN usuarios.estado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.estado IS 'Estado';


--
-- Name: COLUMN usuarios.pais; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.pais IS 'País (padrão: Brasil)';


--
-- Name: COLUMN usuarios.telefone_celular; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.telefone_celular IS 'Telefone celular';


--
-- Name: COLUMN usuarios.ultima_sessao_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.ultima_sessao_em IS 'Última sessão em (timestamp)';


--
-- Name: COLUMN usuarios.origem_aquisicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.origem_aquisicao IS 'Origem aquisição: organico, instagram, amazon, shopee, mercadolivre, indicacao, google, youtube, tiktok, site, outro';


--
-- Name: COLUMN usuarios.codigo_indicacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.codigo_indicacao IS 'Código para indicação (referral code)';


--
-- Name: COLUMN usuarios.indicado_por_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.indicado_por_id IS 'Indicado por (FK → usuarios.id)';


--
-- Name: COLUMN usuarios.data_nasc; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.data_nasc IS 'Data de nascimento';


--
-- Name: vw_classificacao; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_classificacao WITH (security_invoker='true') AS
 WITH resultados AS (
         SELECT p.campeonato_id,
            p.time_a_id AS time_id,
                CASE
                    WHEN (p.gols_time_a > p.gols_time_b) THEN 'V'::text
                    WHEN (p.gols_time_a = p.gols_time_b) THEN 'E'::text
                    ELSE 'D'::text
                END AS resultado,
            COALESCE(p.data_hora, p.criado_em) AS dh
           FROM public.partidas p
          WHERE ((p.encerrada = true) AND (COALESCE(p.is_mata_mata, false) = false))
        UNION ALL
         SELECT p.campeonato_id,
            p.time_b_id AS time_id,
                CASE
                    WHEN (p.gols_time_b > p.gols_time_a) THEN 'V'::text
                    WHEN (p.gols_time_b = p.gols_time_a) THEN 'E'::text
                    ELSE 'D'::text
                END AS resultado,
            COALESCE(p.data_hora, p.criado_em) AS dh
           FROM public.partidas p
          WHERE ((p.encerrada = true) AND (COALESCE(p.is_mata_mata, false) = false))
        ), ultimos AS (
         SELECT r.campeonato_id,
            r.time_id,
            (array_agg(r.resultado ORDER BY r.dh DESC))[1:5] AS ultimos5
           FROM resultados r
          GROUP BY r.campeonato_id, r.time_id
        )
 SELECT c.campeonato_id,
    c.grupo,
    dense_rank() OVER (PARTITION BY c.campeonato_id, c.grupo ORDER BY ((c.vitorias * 3) + c.empates) DESC, (c.gols_pro - c.gols_contra) DESC, c.gols_pro DESC, c.vitorias DESC, c.empates DESC, c.atualizado_em, c.time_id) AS posicao,
    c.time_id,
    t.nome,
    upper((t.abreviacao)::text) AS abreviacao,
    t.escudo_url,
    t.cor1,
    t.cor2,
    t.cor_detalhe,
    ((c.vitorias + c.empates) + c.derrotas) AS jogos,
    c.vitorias,
    c.empates,
    c.derrotas,
    c.gols_pro,
    c.gols_contra,
    (c.gols_pro - c.gols_contra) AS saldo,
    ((c.vitorias * 3) + c.empates) AS pontos,
    c.percentual,
    c.atualizado_em,
    COALESCE(u.ultimos5, '{}'::text[]) AS ultimos5
   FROM ((public.classificacao c
     JOIN public.times t ON ((t.id = c.time_id)))
     LEFT JOIN ultimos u ON (((u.campeonato_id = c.campeonato_id) AND (u.time_id = c.time_id))));


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets_analytics (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: prefixes; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    level integer GENERATED ALWAYS AS (storage.get_level(name)) STORED NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: campeonato_times campeonato_times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonato_times
    ADD CONSTRAINT campeonato_times_pkey PRIMARY KEY (id);


--
-- Name: campeonatos campeonatos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonatos
    ADD CONSTRAINT campeonatos_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_descricao_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_descricao_key UNIQUE (descricao);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: classificacao classificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classificacao
    ADD CONSTRAINT classificacao_pkey PRIMARY KEY (id);


--
-- Name: jogadores jogadores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jogadores
    ADD CONSTRAINT jogadores_pkey PRIMARY KEY (id);


--
-- Name: partidas partidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_pkey PRIMARY KEY (id);


--
-- Name: planos planos_descricao_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_descricao_key UNIQUE (descricao);


--
-- Name: planos planos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planos
    ADD CONSTRAINT planos_pkey PRIMARY KEY (id);


--
-- Name: regioes regioes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regioes
    ADD CONSTRAINT regioes_pkey PRIMARY KEY (id);


--
-- Name: times times_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.times
    ADD CONSTRAINT times_pkey PRIMARY KEY (id);


--
-- Name: classificacao uq_classificacao; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classificacao
    ADD CONSTRAINT uq_classificacao UNIQUE (campeonato_id, time_id);


--
-- Name: usuarios usuarios_auth_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_auth_uid_key UNIQUE (auth_uid);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: prefixes prefixes_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id, level, name);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_clients_client_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_client_id_idx ON auth.oauth_clients USING btree (client_id);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_campeonato_times_camp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campeonato_times_camp ON public.campeonato_times USING btree (campeonato_id);


--
-- Name: idx_campeonatos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campeonatos_usuario ON public.campeonatos USING btree (usuario_id);


--
-- Name: idx_camptimes_camp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_camptimes_camp ON public.campeonato_times USING btree (campeonato_id);


--
-- Name: idx_classif_campeonato_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classif_campeonato_time ON public.classificacao USING btree (campeonato_id, time_id);


--
-- Name: idx_classificacao_campeonato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classificacao_campeonato ON public.classificacao USING btree (campeonato_id);


--
-- Name: idx_classificacao_campeonato_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classificacao_campeonato_grupo ON public.classificacao USING btree (campeonato_id, grupo);


--
-- Name: idx_jogadores_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jogadores_usuario ON public.jogadores USING btree (usuario_id);


--
-- Name: idx_partidas_camp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_camp ON public.partidas USING btree (campeonato_id);


--
-- Name: idx_partidas_campeonato; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_campeonato ON public.partidas USING btree (campeonato_id);


--
-- Name: idx_partidas_campeonato_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_campeonato_grupo ON public.partidas USING btree (campeonato_id, grupo);


--
-- Name: idx_partidas_campeonato_times; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_campeonato_times ON public.partidas USING btree (campeonato_id, time_a_id, time_b_id);


--
-- Name: idx_partidas_chave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_chave ON public.partidas USING btree (chave_id);


--
-- Name: idx_partidas_flags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidas_flags ON public.partidas USING btree (encerrada, is_mata_mata);


--
-- Name: idx_regioes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regioes_usuario ON public.regioes USING btree (usuario_id);


--
-- Name: idx_times_regiao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_times_regiao ON public.times USING btree (regiao_id);


--
-- Name: idx_times_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_times_usuario ON public.times USING btree (usuario_id);


--
-- Name: idx_usuarios_categoria_preferida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_categoria_preferida ON public.usuarios USING btree (categoria_preferida_id);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (lower((email)::text));


--
-- Name: idx_usuarios_indicado_por; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_indicado_por ON public.usuarios USING btree (indicado_por_id);


--
-- Name: idx_usuarios_origem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_origem ON public.usuarios USING btree (origem_aquisicao);


--
-- Name: idx_usuarios_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_status ON public.usuarios USING btree (status);


--
-- Name: u_camp_time; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX u_camp_time ON public.campeonato_times USING btree (campeonato_id, time_id);


--
-- Name: uniq_regioes_usuario_descricao; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_regioes_usuario_descricao ON public.regioes USING btree (usuario_id, descricao);


--
-- Name: ux_usuarios_email_ci; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_usuarios_email_ci ON public.usuarios USING btree (lower((email)::text));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_name_bucket_level_unique; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: idx_objects_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);


--
-- Name: idx_prefixes_lower_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: objects_bucket_id_level_idx; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public._link_or_create_usuario_for_auth();


--
-- Name: users on_auth_user_updated; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION public._sync_usuario_email_from_auth();


--
-- Name: campeonato_times force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.campeonato_times FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: campeonatos force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.campeonatos FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: classificacao force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.classificacao FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: jogadores force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.jogadores FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: partidas force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.partidas FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: regioes force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.regioes FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: times force_usuario_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER force_usuario_id BEFORE INSERT OR UPDATE ON public.times FOR EACH ROW EXECUTE FUNCTION public._force_usuario_id();


--
-- Name: campeonato_times lock_campeonato_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_campeonato_id BEFORE UPDATE ON public.campeonato_times FOR EACH ROW EXECUTE FUNCTION public._lock_campeonato_id();


--
-- Name: partidas lock_campeonato_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER lock_campeonato_id BEFORE UPDATE ON public.partidas FOR EACH ROW EXECUTE FUNCTION public._lock_campeonato_id();


--
-- Name: campeonatos trg_bloqueia_formato_por_limite; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bloqueia_formato_por_limite BEFORE UPDATE OF formato ON public.campeonatos FOR EACH ROW EXECUTE FUNCTION public.trg_bloqueia_formato_por_limite();


--
-- Name: partidas trg_groups_autoknockout; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_groups_autoknockout AFTER UPDATE OF encerrada ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_on_groups_finished_generate_knockout();


--
-- Name: partidas trg_ko_after_close_advance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ko_after_close_advance AFTER UPDATE OF encerrada ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_ko_after_close_advance();


--
-- Name: partidas trg_ko_after_reopen_cleanup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ko_after_reopen_cleanup AFTER UPDATE OF encerrada ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_ko_after_reopen_cleanup();


--
-- Name: partidas trg_ko_leg_order_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ko_leg_order_ins BEFORE INSERT ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_ko_enforce_leg_order();


--
-- Name: partidas trg_ko_leg_order_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ko_leg_order_upd BEFORE UPDATE OF encerrada ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_ko_enforce_leg_order();


--
-- Name: campeonato_times trg_limite_times_campeonato_times_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_limite_times_campeonato_times_ins BEFORE INSERT ON public.campeonato_times FOR EACH ROW EXECUTE FUNCTION public.trg_limite_times_campeonato_times();


--
-- Name: campeonato_times trg_limite_times_campeonato_times_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_limite_times_campeonato_times_upd BEFORE UPDATE OF campeonato_id ON public.campeonato_times FOR EACH ROW EXECUTE FUNCTION public.trg_limite_times_campeonato_times();


--
-- Name: partidas trg_partidas_classificacao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_partidas_classificacao AFTER INSERT OR DELETE OR UPDATE OF gols_time_a, gols_time_b, encerrada, is_mata_mata, campeonato_id, time_a_id, time_b_id, grupo ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.partidas_classificacao_trigger();


--
-- Name: partidas trg_phase_guard_and_reprocess; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_phase_guard_and_reprocess BEFORE UPDATE ON public.partidas FOR EACH ROW EXECUTE FUNCTION public.trg_phase_guard_and_reprocess();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: objects objects_delete_delete_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects objects_insert_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();


--
-- Name: objects objects_update_create_prefix; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();


--
-- Name: prefixes prefixes_create_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();


--
-- Name: prefixes prefixes_delete_hierarchy; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: campeonato_times campeonato_times_campeonato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonato_times
    ADD CONSTRAINT campeonato_times_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id) ON DELETE CASCADE;


--
-- Name: campeonato_times campeonato_times_time_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonato_times
    ADD CONSTRAINT campeonato_times_time_id_fkey FOREIGN KEY (time_id) REFERENCES public.times(id) ON DELETE CASCADE;


--
-- Name: campeonato_times campeonato_times_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonato_times
    ADD CONSTRAINT campeonato_times_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: campeonatos campeonatos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonatos
    ADD CONSTRAINT campeonatos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: campeonatos campeonatos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campeonatos
    ADD CONSTRAINT campeonatos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: classificacao classificacao_campeonato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classificacao
    ADD CONSTRAINT classificacao_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id) ON DELETE CASCADE;


--
-- Name: classificacao classificacao_time_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classificacao
    ADD CONSTRAINT classificacao_time_id_fkey FOREIGN KEY (time_id) REFERENCES public.times(id) ON DELETE CASCADE;


--
-- Name: classificacao classificacao_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classificacao
    ADD CONSTRAINT classificacao_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: jogadores jogadores_time_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jogadores
    ADD CONSTRAINT jogadores_time_id_fkey FOREIGN KEY (time_id) REFERENCES public.times(id) ON DELETE CASCADE;


--
-- Name: jogadores jogadores_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jogadores
    ADD CONSTRAINT jogadores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: partidas partidas_campeonato_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_campeonato_id_fkey FOREIGN KEY (campeonato_id) REFERENCES public.campeonatos(id) ON DELETE CASCADE;


--
-- Name: partidas partidas_time_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_time_a_id_fkey FOREIGN KEY (time_a_id) REFERENCES public.times(id);


--
-- Name: partidas partidas_time_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_time_b_id_fkey FOREIGN KEY (time_b_id) REFERENCES public.times(id);


--
-- Name: partidas partidas_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidas
    ADD CONSTRAINT partidas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: regioes regioes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regioes
    ADD CONSTRAINT regioes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: times times_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.times
    ADD CONSTRAINT times_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- Name: times times_regiao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.times
    ADD CONSTRAINT times_regiao_id_fkey FOREIGN KEY (regiao_id) REFERENCES public.regioes(id) ON DELETE SET NULL;


--
-- Name: times times_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.times
    ADD CONSTRAINT times_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE RESTRICT;


--
-- Name: usuarios usuarios_auth_uid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_auth_uid_fkey FOREIGN KEY (auth_uid) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_categoria_preferida_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_categoria_preferida_fkey FOREIGN KEY (categoria_preferida_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_indicado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_indicado_por_fkey FOREIGN KEY (indicado_por_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: usuarios usuarios_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.planos(id) ON DELETE RESTRICT;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: prefixes prefixes_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.prefixes
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: campeonato_times; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campeonato_times ENABLE ROW LEVEL SECURITY;

--
-- Name: campeonato_times campeonato_times_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campeonato_times_select_own ON public.campeonato_times FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: campeonato_times campeonato_times_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campeonato_times_write_own ON public.campeonato_times TO authenticated USING ((usuario_id = public.current_usuario_id())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: campeonatos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campeonatos ENABLE ROW LEVEL SECURITY;

--
-- Name: campeonatos campeonatos_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campeonatos_select_own ON public.campeonatos FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: campeonatos campeonatos_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campeonatos_write_own ON public.campeonatos TO authenticated USING ((usuario_id = public.current_usuario_id())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: categorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias categorias_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categorias_select_public ON public.categorias FOR SELECT USING (true);


--
-- Name: classificacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classificacao ENABLE ROW LEVEL SECURITY;

--
-- Name: classificacao classificacao_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classificacao_select_own ON public.classificacao FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: classificacao classificacao_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classificacao_write_own ON public.classificacao TO authenticated USING ((usuario_id = public.current_usuario_id())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: jogadores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jogadores ENABLE ROW LEVEL SECURITY;

--
-- Name: jogadores jogadores_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jogadores_select_own ON public.jogadores FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: jogadores jogadores_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY jogadores_write_own ON public.jogadores TO authenticated USING ((usuario_id = public.current_usuario_id())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: partidas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;

--
-- Name: partidas partidas_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partidas_select_own ON public.partidas FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: partidas partidas_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY partidas_write_own ON public.partidas TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: planos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

--
-- Name: planos planos_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY planos_select_public ON public.planos FOR SELECT USING (true);


--
-- Name: regioes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regioes ENABLE ROW LEVEL SECURITY;

--
-- Name: regioes regioes_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY regioes_select_own ON public.regioes FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: regioes regioes_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY regioes_write_own ON public.regioes TO authenticated USING ((usuario_id = public.current_usuario_id())) WITH CHECK ((usuario_id = public.current_usuario_id()));


--
-- Name: times; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;

--
-- Name: times times_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY times_select_own ON public.times FOR SELECT TO authenticated USING ((usuario_id = public.current_usuario_id()));


--
-- Name: times times_write_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY times_write_own ON public.times TO authenticated USING ((usuario_id = auth.uid())) WITH CHECK (((usuario_id = public.current_usuario_id()) AND ((regiao_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.regioes r
  WHERE ((r.id = times.regiao_id) AND (r.usuario_id = public.current_usuario_id())))))));


--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios usuarios_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usuarios_select_self ON public.usuarios FOR SELECT TO authenticated USING ((auth.uid() = auth_uid));


--
-- Name: usuarios usuarios_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usuarios_update_self ON public.usuarios FOR UPDATE TO authenticated USING ((auth.uid() = auth_uid)) WITH CHECK ((auth.uid() = auth_uid));


--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: prefixes; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.prefixes ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict mAf27yP9wgwlF5E2fwd0H7JRpgBpm7stpSqrNZ41rO8Ztkhp7RncdDFtUiEpqjO

