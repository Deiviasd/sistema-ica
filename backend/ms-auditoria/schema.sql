create table if not exists public.auditoria_logs (
    id uuid primary key default gen_random_uuid(),
    id_usuario text,
    nombre_usuario text not null default 'Sistema',
    correo text not null default 'sistema@ica.gov.co',
    rol text not null default 'SISTEMA',
    tipo_accion text not null,
    modulo text not null default 'GENERAL',
    descripcion text not null default 'Accion registrada',
    ip text not null default '0.0.0.0',
    fecha_hora timestamptz not null default now()
);

create index if not exists auditoria_logs_fecha_hora_idx
    on public.auditoria_logs (fecha_hora desc);

create index if not exists auditoria_logs_tipo_accion_idx
    on public.auditoria_logs (tipo_accion);

create index if not exists auditoria_logs_rol_idx
    on public.auditoria_logs (rol);
