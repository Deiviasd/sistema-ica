1. Para el Frontend (Archivo .env.local)
Deben crear este archivo dentro de la carpeta frontend/:

env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_llave_anon_publica
2. Para los Microservicios (Archivo .env)
Este archivo debe ir dentro de cada carpeta de microservicio (ms-auth, ms-auditoria, etc.):

env
# Conexión a Supabase
SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_llave_service_role_secreta
# Configuración del servidor (cambia el puerto según el microservicio)
PORT=5001
3. Para el API Gateway (Archivo .env)
Dentro de la carpeta backend/api-gateway/:

env
PORT=5000
JWT_SECRET=tu_secreto_para_tokens (el mismo que usa Supabase)
# URLs de los microservicios (en desarrollo local)
AUTH_SERVICE_URL=http://localhost:5001
USERS_SERVICE_URL=http://localhost:5002
💡 Pro-tip: Si quieres ahorrarles trabajo, puedes crear archivos llamados .env.example en cada carpeta (estos SÍ se pueden subir a GitHub) que contengan solo los nombres de las variables pero vacíos, para que ellos solo tengan que llenarlos. ¿Te gustaría que los cree?

