# 🚀 Hoja de Ruta de Desarrollo - Sistema ICA

Este documento detalla los pasos finales para completar la lógica de negocio y seguridad del sistema, aprovechando la infraestructura multi-cuenta ya establecida.

## 1. Responsabilidades de Seguridad
La seguridad del sistema está delegada en **Supabase** a través de **Row Level Security (RLS)**. El Orquestador simplemente facilita la identidad del usuario para que Supabase pueda aplicar las reglas.

### Jerarquía de Roles
| Rol | Alcance | Acceso Principal |
| :--- | :--- | :--- |
| **ADMIN** | **Auditoría y Control Total** | **ms-auditoria**, Supervisión de todos los procesos. |
| **TECNICO** | Operación en Campo | **ms-inspecciones**, Registro de hallazgos. |
| **PRODUCTOR** | Gestión de Predios | **ms-predios**, **ms-cultivo**, Consulta de estado. |

---

## 2. Desarrollo de ms-auth (El Motor de Identidad)
El microservicio de Auth debe ser el único capaz de emitir tokens.
- **Acceso Admin**: Al crear un usuario ADMIN, su payload JWT debe incluir `"role": "admin"`.
- **Firma de Token**: Usar la llave `7HX7Z92...` como texto plano.
- **Validación**: El Gateway permitirá el paso a `/auditoria` **solo si** el rol en el token es `admin`.

---

## 3. Configuración de Supabase (El Guardián Final)
Para que la seguridad sea efectiva, debes configurar lo siguiente en cada Dashboard de Supabase:

### Paso A: Activar RLS
```sql
ALTER TABLE inspeccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
```

### Paso B: Políticas de Ejemplo
**Para Auditoría (Solo Admins):**
```sql
CREATE POLICY "Solo los admins ven auditoria" 
ON auditoria 
FOR SELECT 
USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
```

**Para Predios (Dueño del predio):**
```sql
CREATE POLICY "Dueños ven sus predios" 
ON lugar_produccion 
FOR SELECT 
USING (productor_id = auth.uid());
```

---

## 4. Auditoría y Trazabilidad
- El rol **ADMIN** es el único con permisos para consultar los logs en el microservicio de auditoría a través del Orquestador (`/auditoria/*`).
- Todas las acciones críticas (crear lote, registrar inspección) deben enviar un mensaje a RabbitMQ, el cual será procesado por `ms-auditoria` y guardado bajo la seguridad RLS de su propio proyecto de Supabase.

---

## 5. Próximos Pasos Técnicos
1. Implementar `/login` en `ms-auth`.
2. Crear las tablas físicas en los 3 proyectos de Supabase.
3. Escribir las políticas RLS mencionadas arriba.
4. Desarrollar la lógica de "Consumo de Mensajes" en `ms-auditoria`.
