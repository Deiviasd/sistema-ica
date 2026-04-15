# Guía de Configuración Inicial (Para Colaboradores)

Esta guía explica los pasos necesarios para configurar el entorno de desarrollo local, incluyendo las partes que no se encuentran en el repositorio por seguridad.

---

## 1. Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu máquina:
*   **Node.js** (Versión 18 o superior recomendada)
*   **Docker & Docker Desktop** (Indispensable para Supabase local y contenedores de backend)
*   **Supabase CLI** (Instalación: `npm install supabase --save-dev` o vía `scoop/brew`)
*   **Git**

---

## 2. Configuración de Supabase

El backend y el frontend dependen de Supabase. Sigue estos pasos para sincronizar el entorno local:

1.  **Iniciar Sesión:**
    ```bash
    npx supabase login
    ```
2.  **Vincular el Proyecto:** (Necesitarás el Project ID que te pasará el administrador)
    ```bash
    npx supabase link --project-ref tu-project-id
    ```
3.  **Levantar Supabase Local (Opcional si se usa el remoto):**
    ```bash
    npx supabase start
    ```

---

## 3. Configuración de Variables de Entorno (.env)

El proyecto utiliza múltiples archivos `.env` que **no están en GitHub**. Debes crearlos manualmente en las siguientes rutas basándote en los parámetros del equipo:

### Frontend (Next.js)
Crea un archivo `frontend/.env.local` con estas variables:
```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### Backend (Microservicios)
Crea un archivo `.env` dentro de cada una de estas carpetas:
*   `backend/api-gateway/.env`
*   `backend/ms-auth/.env`
*   `backend/ms-predios/.env`
*   `backend/ms-cultivo/.env`
*   `backend/ms-inspecciones/.env`
*   `backend/ms-auditoria/.env`

*(Pide al líder del proyecto los valores de DB_URL y JWT_SECRET para el backend).*

---

## 4. Instalación de Dependencias

Ejecuta los siguientes comandos desde la raíz del proyecto:

### Instalación General
```bash
npm install
```

### Instalación en Frontend (Next.js)
```bash
cd frontend
npm install
cd ..
```

### Instalación en Backend (Microservicios)
```bash
cd backend
npm install
```

---

## 5. Estructura de Docker en Microservicios

Para que el proyecto levante correctamente, **cada carpeta de microservicio en `backend/`** debe tener estos dos archivos (puedes copiarlos de `ms-auth` ya que todos usan Node.js por ahora):

### A. Dockerfile
Crea un archivo llamado `Dockerfile` (sin extensión) en cada carpeta:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]
```
*(Nota: Cambia el puerto en EXPOSE si el servicio usa uno diferente).*

### B. .dockerignore
Crea un archivo `.dockerignore` para evitar subir basura al contenedor:
```text
node_modules
npm-debug.log
.env
.git
```

---

## 6. Levantar el Proyecto

### Paso 1: Infraestructura (Docker)
Inicia los servicios base (DB, Redis, etc.):
```bash
docker-compose up -d
```

### Paso 2: Ejecución
*   **Frontend (Next.js):** `cd frontend && npm run dev`
*   **Backend:** Entra a la carpeta de cada microservicio y ejecuta `npm run dev`.

---

## Resumen de Soporte
Si el frontend no carga datos, verifica que `NEXT_PUBLIC_SUPABASE_URL` en `.env.local` sea correcto. Si los microservicios fallan al conectar a la DB, asegúrate de que Docker esté corriendo.
