# Sistema ICA - Documentación de Arquitectura

## Índice

1. [Descripción General](#descripción-general)
2. [Actores del Sistema](#actores-del-sistema)
3. [Arquitectura de Microservicios](#arquitectura-de-microservicios)
4. [Modelos de Datos](#modelos-de-datos)
5. [Relaciones Entre Microservicios](#relaciones-entre-microservicios)
6. [Consistencia en Microservicios](#consistencia-en-microservicios)
7. [API Gateway vs Orquestador](#api-gateway-vs-orquestador)
8. [APIs Entre Microservicios](#apis-entre-microservicios)
9. [Flujos de Orquestación](#flujos-de-orquestación)
10. [Plan de Desarrollo](#plan-de-desarrollo)

---

## Descripción General

**Sistema ICA** es una aplicación web para la gestión de inspecciones fitosanitarias del Instituto Colombiano Agropecuario (ICA). Permite registrar, consultar y gestionar inspecciones de predios agrícolas destinados a la exportación de alimentos.

### Funcionalidades Principales

| Funcionalidad | Descripción |
|---------------|-------------|
| Gestión de usuarios | Registro, aprobación y asignación de roles |
| Registro de lugares de producción | El productor registra lugares dentro de su predio |
| Registro de lotes y siembras | El productor registra lotes y cultivos sembrados |
| Solicitud de inspecciones | El productor solicita inspecciones fitosanitarias |
| Registro de inspecciones | El técnico realiza inspecciones y registra resultados |
| Historial de inspecciones | Consulta de inspecciones por predio, lugar o lote |
| Auditoría | Registro de todas las acciones del sistema |

### Consideraciones del Dominio

- **Predios**: No se modelan como entidad en el sistema. Su información es gestionada por un sistema externo del ICA. Se utiliza `numero_predial` como identificador externo.
- **Certificación ICA**: El predio ya debe estar certificado por el ICA para poder recibir inspecciones fitosanitarias.
- **Relación Productor-Predio**: Un productor puede estar asociado a múltiples predios (1:N). Esto permite que un solo usuario gestione diferentes fincas o certificaciones.

---

## Actores del Sistema

| Actor | Rol | Funcionalidades |
|-------|-----|-----------------|
| **Admin ICA** | Administrador del sistema | Gestión de usuarios, asignación de roles, aprobaciones, control del sistema |
| **Técnico** | Realiza inspecciones | Registrar inspecciones, ver historial, modificar/eliminar sus inspecciones, ver solicitudes de inspección |
| **Productor** | Dueño de predios | Solicitar inspecciones, registrar lugares de producción, registrar lotes y siembras, consultar historial |

---

## Arquitectura de Microservicios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                              │
│                                  Puerto 3000                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (Express)                             │
│                                  Puerto 5000                                 │
│  - Autenticación JWT                                                         │
│  - Enrutamiento a microservicios                                             │
│  - Orquestación de flujos complejos                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
        ┌───────────┼───────────┬────────┼────────────┬───────┼────────┐
        ▼           ▼           ▼        ▼            ▼       ▼        ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│MS Auth    │ │MS Predios │ │MS Cultivo │ │MS Inspec. │ │MS Auditoría│
│Puerto 4000│ │Puerto 4001│ │Puerto 4002│ │Puerto 4003│ │Puerto 4004 │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │             │             │
      ▼             ▼             ▼             ▼             ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Supabase  │ │ Supabase  │ │ Supabase  │ │ Supabase  │ │ Supabase  │
│  ms-auth  │ │ ms-predios│ │ ms-cultivo│ │ms-inspec. │ │ms-auditoría│
│ (BD #1)   │ │ (BD #2)   │ │ (BD #3)   │ │ (BD #4)   │ │ (BD #5)   │
└───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
```

### Lista de Microservicios

| Microservicio | Puerto | Responsabilidad | Base de Datos |
|---------------|--------|-----------------|---------------|
| **MS Autenticación** | 4000 | Gestión de usuarios, roles, regiones, autenticación | Supabase ms-auth |
| **MS Predios** | 4001 | Lugares de producción, lotes | Supabase ms-predios |
| **MS Cultivo** | 4002 | Plagas, especies, variedades, siembras | Supabase ms-cultivo |
| **MS Inspecciones** | 4003 | Inspecciones, detalle de inspecciones, solicitudes | Supabase ms-inspecciones |
| **MS Auditoría** | 4004 | Registro de logs de todas las acciones | Supabase ms-auditoria |

### Bases de Datos Separadas (Database per Service)

Cada microservicio tiene su **propia base de datos** en Supabase (proyecto separado). Esto garantiza:

- **Aislamiento total**: Cada servicio gestiona sus datos de forma independiente
- **Escalado independiente**: Cada base de datos puede escalarse según necesidad
- **Independencia de despliegue**: Cambios en un servicio no afectan a otros
- **Connection pools separados**: Cada servicio tiene su propio pool de conexiones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROYECTOS SUPABASE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  ms-auth        │     │  ms-predios     │     │  ms-cultivo     │       │
│  │  .supabase.co   │     │  .supabase.co   │     │  .supabase.co   │       │
│  │                 │     │                 │     │                 │       │
│  │  Tablas:        │     │  Tablas:        │     │  Tablas:        │       │
│  │  - usuario      │     │  - lugar_prod   │     │  - plaga        │       │
│  │  - rol          │     │  - lote         │     │  - especie      │       │
│  │  - region       │     │                 │     │  - variedad     │       │
│  │                 │     │                 │     │  - siembra      │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                              │
│  │  ms-inspec.     │     │  ms-auditoria   │                              │
│  │  .supabase.co   │     │  .supabase.co   │                              │
│  │                 │     │                 │                              │
│  │  Tablas:        │     │  Tablas:        │                              │
│  │  - inspeccion   │     │  - auditoria    │                              │
│  │  - detalle      │     │                 │                              │
│  └─────────────────┘     └─────────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Configuración por Microservicio

Cada microservicio tiene su propio archivo `.env` con las credenciales de su base de datos:

```env
# backend/ms-auth/.env
SUPABASE_URL=https://ms-auth.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
JWT_SECRET=supersecret123
PORT=4000

# backend/ms-predios/.env
SUPABASE_URL=https://ms-predios.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_ANON_KEY=xxx
JWT_SECRET=supersecret123
PORT=4001

# etc...
```

### Configuración de Supabase por Microservicio

```javascript
// backend/ms-auth/src/config/supabase.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

module.exports = { supabase }
```

**Nota:** Ya no es necesario especificar `{ db: { schema: 'ms_auth' } }` porque cada proyecto tiene su propia base de datos.

---

## Modelos de Datos

### MS Autenticación

```sql
-- Tabla: usuario (Estrategia Híbrida)
-- Esta tabla se sincroniza automáticamente mediante triggers con Supabase Auth
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  id_auth_supabase UUID NOT NULL UNIQUE, -- ID vinculado a auth.users de Supabase
  nombre VARCHAR(100), -- Opcional inicialmente, se puede actualizar después
  documento VARCHAR(50) UNIQUE,
  correo VARCHAR(100) NOT NULL UNIQUE,
  estado VARCHAR(20) DEFAULT 'ACTIVO', -- 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO'
  id_region VARCHAR(50),
  id_rol VARCHAR(50) DEFAULT 'PRODUCTOR', 
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: usuario_predio (NUEVA: Soporta múltiples predios por persona)
CREATE TABLE usuario_predio (
  id_usuario_predio SERIAL PRIMARY KEY,
  id_usuario INT REFERENCES usuario(id_usuario),
  numero_predial INT NOT NULL,
  fecha_asociacion TIMESTAMP DEFAULT NOW()
);

-- Tabla: rol
CREATE TABLE rol (
  id_rol VARCHAR(50) PRIMARY KEY,
  nombre_rol VARCHAR(50) NOT NULL UNIQUE
  -- Valores: 'ADMIN_ICA', 'TECNICO', 'PRODUCTOR'
);

-- Tabla: region
CREATE TABLE region (
  id_region VARCHAR(50) PRIMARY KEY,
  nombre_region VARCHAR(100) NOT NULL UNIQUE
);
```

### MS Predios

```sql
-- Tabla: lugar_produccion
CREATE TABLE lugar_produccion (
  id_lugar_produccion SERIAL PRIMARY KEY,
  nombre_lugar VARCHAR(100) NOT NULL,
  area_total INT NOT NULL,
  productor_id INT NOT NULL -- Referencia lógica a MS Autenticación
);

-- Tabla: lote
CREATE TABLE lote (
  id_lote SERIAL PRIMARY KEY,
  nombre_lote VARCHAR(100) NOT NULL,
  area INT NOT NULL,
  estado VARCHAR(20) NOT NULL, -- 'activo' | 'inactivo' | 'en_inspeccion'
  id_lugar_produccion INT NOT NULL
);
```

### MS Cultivo

```sql
-- Tabla: plaga
CREATE TABLE plaga (
  id_plaga SERIAL PRIMARY KEY,
  nombre_cientifico VARCHAR(150) NOT NULL UNIQUE,
  nombre_comun VARCHAR(100) NOT NULL
);

-- Tabla: especie
CREATE TABLE especie (
  id_especie SERIAL PRIMARY KEY,
  nombre_comun VARCHAR(100) NOT NULL UNIQUE,
  ciclo VARCHAR(50) NOT NULL -- 'corto' | 'mediano' | 'largo'
);

-- Tabla: plaga_especie (relación N:N)
CREATE TABLE plaga_especie (
  id_plaga INT PRIMARY KEY,
  id_especie INT PRIMARY KEY
);

-- Tabla: variedad
CREATE TABLE variedad (
  id_variedad SERIAL PRIMARY KEY,
  nombre_variedad VARCHAR(100) NOT NULL,
  id_especie INT NOT NULL
);

-- Tabla: siembra
CREATE TABLE siembra (
  id_siembra SERIAL PRIMARY KEY,
  fecha_siembra DATE NOT NULL,
  id_lote INT NOT NULL, -- Referencia lógica a MS Predios
  id_variedad INT NOT NULL
);
```

### MS Inspecciones

```sql
-- Tabla: inspeccion
CREATE TABLE inspeccion (
  id_inspeccion SERIAL PRIMARY KEY,
  fecha_programada DATE NOT NULL,
  observaciones_generales VARCHAR(255),
  estado VARCHAR(20) NOT NULL, -- 'programada' | 'en_proceso' | 'finalizada' | 'cancelada'
  tecnico_id INT NOT NULL, -- Referencia lógica a MS Autenticación
  id_lugar_produccion INT NOT NULL, -- Referencia lógica a MS Predios
  productor_id INT NOT NULL -- Referencia lógica a MS Autenticación
);

-- Tabla: detalle_inspeccion
CREATE TABLE detalle_inspeccion (
  id_detalle SERIAL PRIMARY KEY,
  cantidad_plantas_afectadas INT NOT NULL,
  porcentaje_infestacion FLOAT NOT NULL,
  observaciones_especificas VARCHAR(255),
  id_inspeccion INT NOT NULL,
  siembra_id INT NOT NULL, -- Referencia lógica a MS Cultivo
  plaga_id INT NOT NULL -- Referencia lógica a MS Cultivo
);
```

### MS Auditoría

```sql
-- Tabla: auditoria
CREATE TABLE auditoria (
  id_auditoria SERIAL PRIMARY KEY,
  modulo VARCHAR(50) NOT NULL, -- 'usuarios' | 'predios' | 'cultivo' | 'inspecciones'
  tipo_accion VARCHAR(50) NOT NULL, -- 'CREATE' | 'UPDATE' | 'DELETE'
  id_referencia INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha TIMESTAMP NOT NULL,
  descripcion VARCHAR(255)
);
```

---

## Relaciones Entre Microservicios

### Principio: Referencias Lógicas (No Foreign Keys Físicas)

En arquitectura de microservicios, **no se usan claves foráneas físicas** entre bases de datos de diferentes servicios. En su lugar, se utilizan **referencias lógicas mediante IDs externos**.

### ¿Por qué?

| Enfoque | Problema |
|---------|----------|
| **Foreign Key física** | Acopla los servicios. Si un servicio cae, el otro falla. |
| **Referencia lógica** | Desacopla los servicios. Se valida mediante API. |

### Ejemplo de Referencia Lógica

```
MS Inspecciones: inspeccion.tecnico_id = 5

Para validar que el técnico existe:
1. MS Inspecciones llama a MS Autenticación
2. GET /usuarios/5
3. MS Autenticación responde: { id: 5, rol: "TECNICO", estado: "activo" }
4. MS Inspecciones continúa con la operación
```

### Matriz de Referencias

| Servicio Origen | Campo | Referencia a | Validación |
|-----------------|-------|---------------|------------|
| MS Predios | lugar_produccion.productor_id | MS Autenticación.usuario | API call |
| MS Cultivo | siembra.id_lote | MS Predios.lote | API call |
| MS Inspecciones | inspeccion.tecnico_id | MS Autenticación.usuario | API call |
| MS Inspecciones | inspeccion.productor_id | MS Autenticación.usuario | API call |
| MS Inspecciones | inspeccion.id_lugar_produccion | MS Predios.lugar_produccion | API call |
| MS Inspecciones | detalle_inspeccion.siembra_id | MS Cultivo.siembra | API call |
| MS Inspecciones | detalle_inspeccion.plaga_id | MS Cultivo.plaga | API call |
| MS Auditoría | auditoria.id_usuario | MS Autenticación.usuario | No requiere (solo registro) |

### El Predio y el Sistema Externo

El **predio** no se modela como entidad en el sistema porque:

1. Su información es gestionada por un **sistema externo del ICA**
2. Se utiliza `numero_predial` como identificador externo
3. No se crea una tabla local para evitar duplicar datos oficiales
4. La validación del predio se hace mediante integración con el sistema externo

---

## Consistencia en Microservicios

### Estado Actual del Proyecto

| Patrón | Implementado |
|--------|--------------|
| Consistencia eventual | ❌ No implementada |
| Transacciones atómicas | ❌ No implementadas |
| ACID distribuido | ❌ No implementado |
| Saga Pattern | ❌ No implementado |
| Compensación | ❌ No implementada |

### ¿Qué es cada concepto?

#### ACID (Atomicity, Consistency, Isolation, Durability)

Propiedades de transacciones en bases de datos relacionales tradicionales.

| Propiedad | Descripción |
|-----------|-------------|
| **Atomicity** | La transacción se ejecuta completamente o no se ejecuta |
| **Consistency** | La base de datos pasa de un estado válido a otro estado válido |
| **Isolation** | Transacciones concurrentes no interfieren entre sí |
| **Durability** | Una vez confirmada, la transacción persiste |

**En microservicios**: Cada microservicio puede garantizar ACID dentro de su propia base de datos, pero **no** entre múltiples bases de datos.

#### Transacciones Atómicas

Una operación que involucra múltiples pasos y debe ejecutarse completamente o revertirse completamente.

**Ejemplo en monolito:**
```
BEGIN TRANSACTION
  INSERT INTO usuarios VALUES (...)
  INSERT INTO predios VALUES (...)
  INSERT INTO auditoria VALUES (...)
COMMIT
-- Si falla cualquiera, se revierte todo
```

**En microservicios**: No es posible una transacción atómica distribuida directa. Se requiere **Saga Pattern**.

#### Consistencia Eventual

Modelo donde el sistema llega a un estado consistente después de un tiempo, sin garantizar consistencia inmediata.

```
Usuario se crea en MS Autenticación
    │
    ▼ (evento publicado)
MS Auditoría recibe evento
    │
    ▼ (después de un tiempo)
Sistema consistente: usuario existe en ambos servicios
```

### Saga Pattern

Patrón para manejar transacciones distribuidas en microservicios.

#### Saga Coreografiada (Choreography)

Cada servicio publica eventos y reacciona a eventos de otros servicios.

```
MS Inspecciones: Crea inspección → Publica evento "InspeccionCreada"
                    │
                    ▼
MS Auditoría: Recibe evento → Registra en auditoría
                    │
                    ▼
MS Notificaciones: Recibe evento → Envía notificación
```

**Ventajas**: Desacoplado, simple
**Desventajas**: Difícil de depurar, flujos complejos

#### Saga Orquestada (Orchestration)

Un orquestador coordina los pasos y maneja compensaciones.

```
┌─────────────────────────────────────────────────────────────┐
│                      ORQUESTADOR                             │
│                                                              │
│  1. Crear inspección en MS Inspecciones                      │
│     └─ Si falla: ERROR, fin                                  │
│                                                              │
│  2. Registrar en MS Auditoría                                │
│     └─ Si falla: Compensar (eliminar inspección)            │
│                                                              │
│  3. Enviar notificación en MS Notificaciones                 │
│     └─ Si falla: Compensar (eliminar inspección, auditoría)  │
│                                                              │
│  4. Confirmar operación                                     │
└─────────────────────────────────────────────────────────────┘
```

**Ventajas**: Control centralizado, fácil de depurar
**Desventajas**: Acoplado al orquestador

### Cuándo Implementar

El proyecto **actualmente no requiere** Saga Pattern porque las operaciones son simples y no cruzan múltiples servicios de forma transaccional.

**Se recomienda implementar cuando**:
1. Una operación debe actualizar múltiples microservicios
2. La falla en uno requiere revertir los otros
3. Hay flujos de negocio complejos (ej: registro completo con múltiples servicios)

---

## API Gateway vs Orquestador

### Definiciones

#### API Gateway

Punto de entrada único para todas las peticiones del cliente.

**Responsabilidades:**
- Enrutar peticiones a microservicios
- Autenticación y autorización
- Rate limiting
- Cache
- Abstracción de la ubicación de servicios

#### Orquestador (Orchestrator)

Coordina múltiples servicios para completar un flujo de negocio.

**Responsabilidades:**
- Coordinar llamadas a múltiples servicios
- Manejar transacciones distribuidas
- Implementar compensaciones ante fallos
- Mantener estado del flujo

### Comparación

| Característica | API Gateway | Orquestador |
|---------------|-------------|-------------|
| Punto de entrada único | ✅ | ✅ |
| Enrutamiento | ✅ | ✅ |
| Autenticación | ✅ | ✅ |
| Coordinación entre servicios | ❌ | ✅ |
| Transacciones distribuidas | ❌ | ✅ |
| Compensación ante fallos | ❌ | ✅ |
| Event bus / Mensajería | ❌ | ✅ |

### Estado Actual del Proyecto

El **API Gateway actual** tiene:

| Característica | Estado |
|----------------|--------|
| Punto de entrada único | ✅ |
| Enrutamiento | ✅ |
| Autenticación JWT | ✅ |
| Abstracción de servicios | ✅ |
| Coordinación entre servicios | ❌ |
| Transacciones distribuidas | ❌ |
| Compensación | ❌ |
| Retry / Circuit breaker | ❌ |

**Conclusión**: El API Gateway actual **no es un orquestador**, pero tiene las bases para evolucionar hacia uno.

```

### Estrategia de Autenticación de Próxima Generación (Híbrida)

Para garantizar la máxima seguridad y velocidad de desarrollo, el sistema utiliza un modelo híbrido:

1. **Gestor de Identidad (Supabase Auth):** Maneja el almacenamiento seguro de contraseñas, hashing, MFA y emisión de JWT.
2. **Sincronización Automática (BD Triggers):** Un trigger en el esquema `auth` de Supabase detecta nuevos registros e inserta automáticamente una fila en la tabla `config.usuario` del microservicio MS-Auth.
3. **Orquestador (Validador):** El orquestador recibe el token de Supabase, verifica su firma con el `JWT_SECRET` y extrae el `id_auth_supabase` para realizar las validaciones de negocio en los demás microservicios.

---

## APIs Entre Microservicios

### Principio

Cada microservicio expone endpoints internos para que otros servicios puedan consultar datos sin acceder directamente a su base de datos.

### MS Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Autenticar usuario |
| POST | `/auth/register` | Registrar usuario |
| GET | `/usuarios/{id}` | Obtener usuario por ID |
| GET | `/usuarios?rol={rol}` | Obtener usuarios por rol |
| GET | `/usuarios/region/{id_region}?rol=TECNICO` | Técnicos por región |
| GET | `/roles` | Listar roles |
| GET | `/regiones` | Listar regiones |
| PATCH | `/usuarios/{id}` | Actualizar usuario |
| PATCH | `/usuarios/{id}/estado` | Cambiar estado de usuario |

### MS Predios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/lugares-produccion` | Crear lugar de producción |
| GET | `/lugares-produccion/{id}` | Obtener lugar por ID |
| GET | `/lugares-produccion?productor_id={id}` | Lugares por productor |
| PATCH | `/lugares-produccion/{id}` | Actualizar lugar |
| DELETE | `/lugares-produccion/{id}` | Eliminar lugar |
| POST | `/lotes` | Crear lote |
| GET | `/lotes/{id}` | Obtener lote por ID |
| GET | `/lotes?lugar_id={id}` | Lotes por lugar de producción |
| PATCH | `/lotes/{id}` | Actualizar lote |
| PATCH | `/lotes/{id}/estado` | Cambiar estado de lote |
| DELETE | `/lotes/{id}` | Eliminar lote |

### MS Cultivo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/plagas` | Listar plagas |
| GET | `/plagas/{id}` | Obtener plaga por ID |
| POST | `/plagas` | Crear plaga |
| GET | `/especies` | Listar especies |
| GET | `/especies/{id}` | Obtener especie por ID |
| POST | `/especies` | Crear especie |
| GET | `/variedades` | Listar variedades |
| GET | `/variedades?especie_id={id}` | Variedades por especie |
| POST | `/variedades` | Crear variedad |
| POST | `/siembras` | Crear siembra |
| GET | `/siembras/{id}` | Obtener siembra por ID |
| GET | `/siembras?lote_id={id}` | Siembras por lote |
| PATCH | `/siembras/{id}` | Actualizar siembra |
| DELETE | `/siembras/{id}` | Eliminar siembra |

### MS Inspecciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/inspecciones/solicitar` | Solicitar inspección |
| GET | `/inspecciones/{id}` | Obtener inspección por ID |
| GET | `/inspecciones?tecnico_id={id}` | Inspecciones por técnico |
| GET | `/inspecciones?productor_id={id}` | Inspecciones por productor |
| GET | `/inspecciones?lugar_id={id}` | Inspecciones por lugar |
| PATCH | `/inspecciones/{id}` | Actualizar inspección |
| PATCH | `/inspecciones/{id}/estado` | Cambiar estado |
| DELETE | `/inspecciones/{id}` | Eliminar inspección |
| POST | `/inspecciones/{id}/detalles` | Agregar detalle de inspección |
| GET | `/inspecciones/{id}/detalles` | Obtener detalles de inspección |

### MS Auditoría

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auditoria` | Registrar acción |
| GET | `/auditoria?modulo={modulo}` | Logs por módulo |
| GET | `/auditoria?usuario_id={id}` | Logs por usuario |
| GET | `/auditoria?fecha_inicio={f1}&fecha_fin={f2}` | Logs por rango de fechas |

---

## Flujos de Orquestación

### Flujo 1: Registro de Productor

**Servicios involucrados:** MS Autenticación + Sistema externo ICA

```
Frontend → Supabase SDK Auth Sign-Up
   │
   ▼
Supabase Auth Service:
┌─────────────────────────────────────────────────────────────┐
│ 1. Crea cuenta en esquema privado `auth.users`              │
│ 2. Encripta contraseña y genera JWT                         │
│ 3. Dispara DB Trigger interno                               │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
MS Autenticación (Trigger):
┌─────────────────────────────────────────────────────────────┐
│ 1. Recibe datos del nuevo usuario                           │
│ 2. Ejecuta INSERT en tabla `public.usuario`                 │
│ 3. Si incluye predial: INSERT en `public.usuario_predio`    │
│ 4. Asigna Rol por defecto (PRODUCTOR)                       │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
API Gateway / Orquestador:
┌─────────────────────────────────────────────────────────────┐
│ 1. Recibe confirmación de registro                          │
│ 2. Llama a MS Auditoría (POST /auditoria)                   │
│ 3. Retorna éxito al Frontend                                │
└─────────────────────────────────────────────────────────────┘
```

**Compensación si falla paso 3:**
- No requiere compensación (el usuario no se creó)

---

### Flujo 2: Registrar Siembra

**Servicios involucrados:** MS Cultivo + MS Predios

```
Frontend → POST /siembras

API Gateway:
┌─────────────────────────────────────────────────────────────┐
│ 1. Validar JWT y extraer productor_id                       │
│                                                             │
│ 2. Validar que lote existe y pertenece al productor         │
│    → GET /lotes/{id_lote} (MS Predios)                      │
│    → Si no existe: ERROR                                    │
│                                                             │
│ 3. Validar que variedad existe                              │
│    → GET /variedades/{id_variedad} (MS Cultivo)             │
│    → Si no existe: ERROR                                    │
│                                                             │
│ 4. Crear siembra                                            │
│    → POST /siembras (MS Cultivo)                            │
│                                                             │
│ 5. Registrar en auditoría                                   │
│    → POST /auditoria (MS Auditoría)                         │
│                                                             │
│ 6. Retornar confirmación                                    │
└─────────────────────────────────────────────────────────────┘
```

**Compensación si falla paso 4:**
- No requiere compensación (validaciones pasaron, error en creación)

---

### Flujo 3: Solicitar Inspección

**Servicios involucrados:** MS Inspecciones + MS Autenticación + MS Predios + MS Auditoría

```
Frontend → POST /inspecciones/solicitar

API Gateway:
┌─────────────────────────────────────────────────────────────┐
│ 1. Validar JWT y extraer productor_id                       │
│                                                             │
│ 2. Validar que productor existe y está activo              │
│    → GET /usuarios/{productor_id} (MS Autenticación)        │
│    → Si no existe o no es PRODUCTOR: ERROR                  │
│                                                             │
│ 3. Obtener región del productor                             │
│    → GET /usuarios/{productor_id} → id_region               │
│                                                             │
│ 4. Buscar técnicos disponibles en la región                 │
│    → GET /usuarios?rol=TECNICO&region={id_region}           │
│    → Filtrar por estado=activo                              │
│    → Si no hay técnicos: ERROR                              │
│                                                             │
│ 5. Asignar técnico automáticamente                          │
│    → Algoritmo de selección (round-robin, aleatorio, etc.) │
│                                                             │
│ 6. Validar lugar de producción                              │
│    → GET /lugares-produccion/{id} (MS Predios)              │
│                                                             │
│ 7. Crear inspección                                         │
│    → POST /inspecciones (MS Inspecciones)                   │
│    → estado: "programada"                                   │
│                                                             │
│ 8. Registrar en auditoría                                   │
│    → POST /auditoria (MS Auditoría)                         │
│                                                             │
│ 9. Retornar confirmación con tecnico_id asignado           │
└─────────────────────────────────────────────────────────────┘
```

**Compensación si fallan pasos posteriores:**
- Si falla paso 7 (auditoría): La inspección se creó, pero no hay log. Se puede registrar asíncronamente o reintentar.

---

### Flujo 4: Registrar Inspección (Técnico)

**Servicios involucrados:** MS Inspecciones + MS Cultivo + MS Predios + MS Auditoría

```
Frontend → POST /inspecciones/{id}/detalles

API Gateway:
┌─────────────────────────────────────────────────────────────┐
│ 1. Validar JWT y extraer tecnico_id                         │
│                                                             │
│ 2. Validar que la inspección existe y pertenece al técnico │
│    → GET /inspecciones/{id} (MS Inspecciones)               │
│    → Si no existe o tecnico_id no coincide: ERROR           │
│                                                             │
│ 3. Validar que siembra existe                               │
│    → GET /siembras/{siembra_id} (MS Cultivo)               │
│                                                             │
│ 4. Validar que plaga existe                                 │
│    → GET /plagas/{plaga_id} (MS Cultivo)                    │
│                                                             │
│ 5. Crear detalle de inspección                              │
│    → POST /inspecciones/{id}/detalles (MS Inspecciones)     │
│                                                             │
│ 6. Actualizar estado del lote a "en_inspeccion"             │
│    → PATCH /lotes/{id}/estado (MS Predios)                  │
│                                                             │
│ 7. Registrar en auditoría                                   │
│    → POST /auditoria (MS Auditoría)                         │
│                                                             │
│ 8. Retornar confirmación                                    │
└─────────────────────────────────────────────────────────────┘
```

---

### Flujo 5: Finalizar Inspección

**Servicios involucrados:** MS Inspecciones + MS Predios + MS Auditoría

```
Frontend → PATCH /inspecciones/{id}/estado

API Gateway:
┌─────────────────────────────────────────────────────────────┐
│ 1. Validar JWT y extraer tecnico_id                         │
│                                                             │
│ 2. Validar que la inspección existe y pertenece al técnico │
│    → GET /inspecciones/{id} (MS Inspecciones)               │
│                                                             │
│ 3. Cambiar estado de inspección a "finalizada"              │
│    → PATCH /inspecciones/{id}/estado (MS Inspecciones)      │
│                                                             │
│ 4. Actualizar estado de lotes a "activo"                     │
│    → Para cada lote inspeccionado:                          │
│      → PATCH /lotes/{id}/estado (MS Predios)                │
│                                                             │
│ 5. Registrar en auditoría                                   │
│    → POST /auditoria (MS Auditoría)                         │
│                                                             │
│ 6. Retornar confirmación                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Plan de Desarrollo

### Fase 1: MS Autenticación (Base)

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| CRUD Usuarios | Crear, leer, actualizar, eliminar usuarios | Ninguna |
| CRUD Roles | Gestión de roles | Ninguna |
| CRUD Regiones | Gestión de regiones | Ninguna |
| Autenticación | Login con JWT | CRUD Usuarios |
| Registro de usuarios | Registro con validación de predio externo | Autenticación |
| Middleware de autenticación | Validación de JWT en rutas protegidas | Autenticación |

**Endpoints:**
- POST /auth/login
- POST /auth/register
- GET /usuarios
- GET /usuarios/{id}
- PATCH /usuarios/{id}
- DELETE /usuarios/{id}
- GET /roles
- GET /regiones

---

### Fase 2: MS Predios

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| CRUD Lugares de producción | Gestión de lugares | MS Autenticación (validar productor) |
| CRUD Lotes | Gestión de lotes | CRUD Lugares |
| Validación de productor | Verificar que el productor existe | MS Autenticación API |
| Cambio de estado de lotes | Actualizar estado (activo/inactivo/en_inspeccion) | CRUD Lotes |

**Endpoints:**
- POST /lugares-produccion
- GET /lugares-produccion/{id}
- GET /lugares-produccion?productor_id={id}
- PATCH /lugares-produccion/{id}
- DELETE /lugares-produccion/{id}
- POST /lotes
- GET /lotes/{id}
- GET /lotes?lugar_id={id}
- PATCH /lotes/{id}
- PATCH /lotes/{id}/estado
- DELETE /lotes/{id}

---

### Fase 3: MS Cultivo

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| CRUD Plagas | Gestión de plagas | Ninguna |
| CRUD Especies | Gestión de especies y ciclo de cultivo | Ninguna |
| CRUD Variedades | Gestión de variedades por especie | CRUD Especies |
| CRUD Siembras | Gestión de siembras | MS Predios (validar lote) |
| Relación Plaga-Especie | Gestión de plagas por especie | CRUD Plagas, CRUD Especies |

**Endpoints:**
- POST /plagas
- GET /plagas
- GET /plagas/{id}
- POST /especies
- GET /especies
- GET /especies/{id}
- POST /variedades
- GET /variedades
- GET /variedades?especie_id={id}
- POST /siembras
- GET /siembras/{id}
- GET /siembras?lote_id={id}
- PATCH /siembras/{id}
- DELETE /siembras/{id}

---

### Fase 4: MS Inspecciones

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| Solicitud de inspección | Productor solicita inspección | MS Autenticación, MS Predios |
| Asignación automática de técnico | Algoritmo de asignación por región | MS Autenticación (buscar técnicos) |
| CRUD Inspecciones | Gestión de inspecciones | Todos los MS anteriores |
| CRUD Detalle de inspección | Registro de detalles por siembra | MS Cultivo |
| Cambio de estado | Flujo de estados de inspección | CRUD Inspecciones |
| Historial de inspecciones | Consulta por predio, lugar, lote | CRUD Inspecciones |

**Endpoints:**
- POST /inspecciones/solicitar
- GET /inspecciones/{id}
- GET /inspecciones?tecnico_id={id}
- GET /inspecciones?productor_id={id}
- GET /inspecciones?lugar_id={id}
- PATCH /inspecciones/{id}
- PATCH /inspecciones/{id}/estado
- DELETE /inspecciones/{id}
- POST /inspecciones/{id}/detalles
- GET /inspecciones/{id}/detalles

---

### Fase 5: MS Auditoría

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| Registro de acciones | Registrar logs de todos los módulos | Ninguna |
| Consulta de auditoría | Filtrar por módulo, usuario, fecha | Registro de acciones |

**Endpoints:**
- POST /auditoria
- GET /auditoria?modulo={modulo}
- GET /auditoria?usuario_id={id}
- GET /auditoria?fecha_inicio={f1}&fecha_fin={f2}

**Implementación:**
- Cada microservicio debe llamar a MS Auditoría después de cada operación importante
- Se recomienda implementar de forma asíncrona (cola de mensajes) en fases posteriores

---

### Fase 6: API Gateway (Orquestación)

| Tarea | Descripción | Dependencias |
|-------|-------------|--------------|
| Routing básico | Proxy a todos los microservicios | Todos los MS |
| Autenticación JWT | Middleware de validación | MS Autenticación |
| Validaciones de referencias | Validar IDs externos | Todos los MS |
| Flujos de orquestación | Implementar flujos complejos | Todos los MS |
| Manejo de errores | Compensaciones y retries | Flujos de orquestación |

---

### Roadmap Visual

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: MS Autenticación                                                │
│ ├── CRUD Usuarios, Roles, Regiones                                     │
│ └── Autenticación JWT                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: MS Predios                                                      │
│ ├── CRUD Lugares de producción                                          │
│ └── CRUD Lotes                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: MS Cultivo                                                      │
│ ├── CRUD Plagas, Especies, Variedades                                  │
│ └── CRUD Siembras                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 4: MS Inspecciones                                                 │
│ ├── Solicitud y asignación automática                                   │
│ ├── CRUD Inspecciones y Detalles                                        │
│ └── Historial de inspecciones                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 5: MS Auditoría                                                    │
│ └── Registro y consulta de logs                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 6: API Gateway (Orquestación)                                     │
│ ├── Validaciones de referencias                                         │
│ ├── Flujos de orquestación                                              │
│ └── Manejo de errores y compensaciones                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Notas Adicionales

### Decisiones de Diseño

1. **Database per Service (Bases de datos separadas)**: Cada microservicio tiene su propio proyecto Supabase con base de datos independiente. Esto garantiza aislamiento total, escalado independiente y evita el acoplamiento de datos entre servicios.

2. **Monorepo con Docker**: El proyecto utiliza un monorepo con Docker para desarrollo local. Todos los microservicios y el frontend se encuentran en un solo repositorio para facilitar la coordinación entre los 3 desarrolladores del equipo.

3. **Predio como referencia externa**: El predio no se modela como entidad porque su información proviene del sistema externo del ICA. Se usa `numero_predial` como identificador lógico.

4. **Sin claves foráneas físicas entre microservicios**: Todas las referencias entre servicios se manejan mediante IDs y validaciones por API.

5. **Un productor por predio**: Relación 1:1 entre productor y predio. Si se requiere múltiples predios en el futuro, se debe modificar el modelo.

6. **Asignación automática de técnico**: El técnico se asigna por región y disponibilidad. El algoritmo de selección puede mejorarse en el futuro.

7. **Auditoría asíncrona**: Se recomienda implementar auditoría de forma asíncrona (eventos) para no afectar el rendimiento de las operaciones principales.

### Consideraciones Futuras

1. **Event Bus**: Implementar RabbitMQ o Kafka para comunicación asíncrona entre microservicios.

2. **Circuit Breaker**: Implementar patrón Circuit Breaker para manejar fallos en servicios dependientes.

3. **Cache**: Implementar Redis para cachear datos de uso frecuente (catálogo de plagas, especies, etc.).

4. **Métricas y Monitoreo**: Implementar Prometheus + Grafana para monitoreo de microservicios.

5. **Documentación API**: Implementar OpenAPI/Swagger para documentación de endpoints.

---

### Estructura del Repositorio (Monorepo)

```
sistema-ica/
├── backend/
│   ├── ms-auth/                    # Microservicio de Autenticación
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── supabase.js     # Conexión a Supabase ms-auth
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── server.js
│   │   ├── .env                    # Variables de entorno (Supabase ms-auth)
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── ms-predios/                 # Microservicio de Predios
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── supabase.js     # Conexión a Supabase ms-predios
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── server.js
│   │   ├── .env                    # Variables de entorno (Supabase ms-predios)
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── ms-cultivo/                 # Microservicio de Cultivo
│   │   └── ... (estructura similar)
│   │
│   ├── ms-inspecciones/             # Microservicio de Inspecciones
│   │   └── ... (estructura similar)
│   │
│   ├── ms-auditoria/               # Microservicio de Auditoría
│   │   └── ... (estructura similar)
│   │
│   └── api-gateway/                # API Gateway / Orquestador
│       ├── src/
│       │   └── server.js
│       ├── .env
│       ├── package.json
│       └── Dockerfile
│
├── frontend/                       # Frontend Next.js
│   ├── app/
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── ...
│   ├── components/
│   ├── services/
│   ├── .env.local
│   └── Dockerfile
│
├── docs/
│   └── ARCHITECTURE.md             # Este documento
│
├── docker-compose.yml              # Orquestación de contenedores
├── .gitignore
└── README.md
```

---

### Variables de Entorno por Microservicio

#### MS Autenticación (.env)
```env
SUPABASE_URL=https://ms-auth-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=supersecret123
PORT=4000
```

#### MS Predios (.env)
```env
SUPABASE_URL=https://ms-predios-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=supersecret123
PORT=4001
MS_AUTH_URL=http://ms-auth:4000  # Para validar usuarios
```

#### MS Cultivo (.env)
```env
SUPABASE_URL=https://ms-cultivo-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=supersecret123
PORT=4002
MS_PREDIOS_URL=http://ms-predios:4001  # Para validar lotes
```

#### MS Inspecciones (.env)
```env
SUPABASE_URL=https://ms-inspecciones-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=supersecret123
PORT=4003
MS_AUTH_URL=http://ms-auth:4000        # Para validar técnicos/productores
MS_PREDIOS_URL=http://ms-predios:4001  # Para validar lugares de producción
MS_CULTIVO_URL=http://ms-cultivo:4002  # Para validar siembras/plagas
MS_AUDITORIA_URL=http://ms-auditoria:4004  # Para registrar logs
```

#### MS Auditoría (.env)
```env
SUPABASE_URL=https://ms-auditoria-xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
JWT_SECRET=supersecret123
PORT=4004
```

#### API Gateway (.env)
```env
PORT=5000
JWT_SECRET=supersecret123
MS_AUTH_URL=http://ms-auth:4000
MS_PREDIOS_URL=http://ms-predios:4001
MS_CULTIVO_URL=http://ms-cultivo:4002
MS_INSPECCIONES_URL=http://ms-inspecciones:4003
MS_AUDITORIA_URL=http://ms-auditoria:4004
```

---

*Documento generado el: 2026-03-25*
*Proyecto: Sistema ICA - Gestión de Inspecciones Fitosanitarias*