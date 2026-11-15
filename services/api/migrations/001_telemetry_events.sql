-- ============================================================================
-- 001_telemetry_events.sql — almacenamiento de telemetría de Nexova
--
-- Cómo aplicarlo: Supabase → SQL Editor → pegar este archivo completo → Run.
-- Es idempotente: se puede ejecutar más de una vez sin romper nada.
--
-- Contrato de cada fila: docs/telemetry/telemetry-plan.md §9
-- (mapeo TelemetryEvent → columnas).
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid() (ya activa en Supabase)

create table if not exists public.telemetry_events (
    id          uuid        primary key default gen_random_uuid(),
    "timestamp" timestamptz not null,                  -- momento de la ocurrencia (envelope.timestamp, UTC)
    service     text        not null,                  -- backoffice | website | api | job (de envelope.context.source)
    event_type  text        not null,                  -- entidad_acción (envelope.event_type)
    level       text        not null default 'info',   -- info | warn | error
    value       numeric,                               -- métrica principal del evento, si aplica
    message     text,                                  -- resumen legible, sin PII
    tags        jsonb       not null default '{}'::jsonb, -- envelope.properties (allowlist) + "_envelope"
    constraint telemetry_events_level_chk      check (level in ('info', 'warn', 'error')),
    constraint telemetry_events_event_type_chk check (event_type ~ '^[a-z]+(_[a-z]+)+$'),
    constraint telemetry_events_tags_object_chk check (jsonb_typeof(tags) = 'object')
);

comment on table public.telemetry_events is
    'Eventos de telemetría de Nexova. Solo escritura (append-only): UPDATE/DELETE bloqueados por trigger.';

-- ----------------------------------------------------------------------------
-- Índices: los tres que sostienen las consultas analíticas del proyecto Reporte
-- ----------------------------------------------------------------------------
create index if not exists telemetry_events_timestamp_idx  on public.telemetry_events ("timestamp" desc);
create index if not exists telemetry_events_event_type_idx on public.telemetry_events (event_type);
create index if not exists telemetry_events_tags_gin_idx   on public.telemetry_events using gin (tags);  -- jsonb_ops: soporta @>, ?, ?| y ?&

-- ----------------------------------------------------------------------------
-- Inmutabilidad: los eventos son hechos; no se corrigen ni se borran.
-- 1) Trigger: rechaza UPDATE y DELETE para TODOS los roles (incluido service_role
--    y el usuario postgres de la API), con un error explícito.
-- 2) Revoke: los roles de la API pública de Supabase tampoco tienen el permiso.
-- La retención (borrado por antigüedad, plan §4.5) se hará en el futuro con un
-- procedimiento explícito que desactive el trigger dentro de una transacción
-- auditada; nunca desde la aplicación.
-- ----------------------------------------------------------------------------
create or replace function public.telemetry_events_immutable()
returns trigger
language plpgsql
as $$
begin
    raise exception 'telemetry_events es append-only: % no está permitido', tg_op
        using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists telemetry_events_no_update_delete on public.telemetry_events;
create trigger telemetry_events_no_update_delete
    before update or delete on public.telemetry_events
    for each row execute function public.telemetry_events_immutable();

drop trigger if exists telemetry_events_no_truncate on public.telemetry_events;
create trigger telemetry_events_no_truncate
    before truncate on public.telemetry_events
    for each statement execute function public.telemetry_events_immutable();

-- Roles expuestos por la API REST de Supabase: sin lectura ni escritura directa.
-- La única puerta de entrada es POST /telemetry/events del backend FastAPI.
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        execute 'revoke all on public.telemetry_events from anon';
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        execute 'revoke all on public.telemetry_events from authenticated';
    end if;
end;
$$;

-- RLS activado y sin políticas: deniega todo a anon/authenticated aunque alguien
-- vuelva a conceder permisos. El backend conecta como dueño de la tabla.
alter table public.telemetry_events enable row level security;
