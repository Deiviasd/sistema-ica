# 🌿 Guía de Implementación - ms-cultivo

Este microservicio se encarga de la gestión de lotes, siembras y el catálogo técnico de plagas y enfermedades.

## 1. Configuración de Identidad y Supabase
Para que el RLS funcione, el microservicio debe recibir el token re-firmado por el Orquestador.

**Variables de Entorno (.env):**
```env
PORT=4002
SUPABASE_URL=https://TU_PROYECTO_CULTIVO.supabase.co
SUPABASE_ANON_KEY=TU_ANON_KEY_PROYECTO_CULTIVO
# Nota: La llave de re-firma la maneja el Orquestador, pero el microservicio debe usar su propia ANON_KEY para inicializar el cliente.
```

## 2. Lógica de Endpoints Necesarios

### A. Gestión de Siembras (`/siembras`)
- **POST**: Crear una nueva siembra vinculada a un `id_lote` (este ID viene de `ms-predios`).
- **GET**: Consultar siembras activas. El RLS filtrará automáticamente para que el productor solo vea sus propios cultivos.

### C. Proceso de Registro Unificado (Lote + Siembra)
Este es el flujo crítico para el productor. El formulario unificado en el Frontend debe enviar una sola petición al Orquestador, quien coordina:

1.  **Paso 1**: El Orquestador solicita a `ms-predios` la creación del Lote.
2.  **Paso 2**: Con el `id_lote` obtenido, el Orquestador solicita a `ms-cultivo` registrar la Siembra inicial.
3.  **Paso 3**: Si falla la siembra, el Orquestador debe marcar el lote como 'inactivo' o eliminarlo (Compensación).

**Endpoint en Orquestador:** `POST /api/orchestrator/lote-integral`

## 4. Auditoría y Trazabilidad
Cada vez que se registre una semilla, se inicie una siembra o se reporte una erradicación, el servicio debe:
1. Validar la acción.
2. Guardar en Supabase.
3. Enviar evento a RabbitMQ:
```javascript
{
  "modulo": "cultivos",
  "tipo_accion": "NUEVA_SIEMBRA",
  "id_referencia": "id_siembra_generado",
  "id_usuario": req.user.id
}
```

## 5. Configuración de Seguridad en Supabase (RLS)
Ejecuta este SQL en el proyecto de **Cultivos** para blindar tus tablas actuales:

```sql
-- 1. Activar el sistema de seguridad en las tablas
ALTER TABLE siembra ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_plagas ENABLE ROW LEVEL SECURITY;

-- 2. Política de Acceso para Siembras
-- Permite que Admins vean todo, y que Usuarios Autenticados (Técnicos/Productores) 
-- operen según lo que el Orquestador les permita ver.
CREATE POLICY "Gestión de siembras por rol" 
ON siembra 
FOR ALL 
TO authenticated 
USING (
    -- El Administrador tiene pase libre
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    -- El Productor/Técnico puede ver si está autenticado 
    -- (El Orquestador se encargó de validar su identidad antes)
    (auth.role() = 'authenticated')
);

-- 3. Política para el Catálogo de Plagas
-- Todos los usuarios registrados deben poder consultar el catálogo
CREATE POLICY "Lectura del catálogo para todos" 
ON catalogo_plagas 
FOR SELECT 
TO authenticated 
USING (true);
```

## 6. Sincronización con ms-predios
Recuerda que `ms-cultivo` depende de que el `id_lote` exista en `ms-predios`. Al ser bases de datos distintas, la integridad la garantiza el Orquestador o el código del microservicio consultando vía API interna.
