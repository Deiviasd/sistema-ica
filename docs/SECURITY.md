# Arquitectura de Seguridad y Token Exchange - Sistema ICA 🛡️

Este documento describe el mecanismo de seguridad implementado para la interoperabilidad de múltiples cuentas y proyectos de Supabase dentro del Sistema ICA.

## 1. El Desafío de Multi-Cuenta
Debido a las limitaciones de los planes gratuitos de Supabase, el sistema utiliza múltiples proyectos independientes. Cada uno posee su propio `JWT Secret`, lo que impide que un token firmado por un proyecto sea válido en otro.

## 2. Solución: Token Exchange (Intercambio de Tokens)
El **API Gateway (Orquestador)** actúa como un centro de confianza y traducción:

1.  **Validación de Entrada**: Todas las peticiones entrantes se validan contra el `JWT_SECRET_AUTH`. Este es el "Token Maestro" generado por el microservicio de autenticación.
2.  **Traducción en Tiempo Real**: Al detectar el microservicio destino, el Gateway re-firma el payload del usuario utilizando la llave específica de ese proyecto de Supabase.
3.  **Seguridad RLS**: El microservicio recibe un token que su base de datos reconoce, permitiendo que las políticas de Row Level Security (RLS) funcionen correctamente.

## 3. Configuración de Secretos en Gateway (.env)
El Gateway centraliza las llaves necesarias para la traducción:
- `JWT_SECRET_AUTH`: Valida el inicio de sesión del usuario.
- `JWT_SECRET_PREDIOS`, `JWT_SECRET_INSPECCIONES`, `JWT_SECRET_CULTIVOS`, `JWT_SECRET_AUDITORIA`: Utilizadas para re-firmar hacia cada destino.

## 4. Mejores Prácticas Implementadas
- **Raw Secrets**: Las llaves de Supabase se manejan como texto plano (UTF-8) para garantizar compatibilidad con el motor de PostgREST.
- **Token Sanitization**: El Gateway limpia automáticamente espacios y saltos de línea en los tokens para evitar errores de malformación.
- **Context Fallback**: Los microservicios intentan usar la `ANON_KEY` y, en su defecto, la `SERVICE_ROLE_KEY` para asegurar la conectividad sin comprometer el RLS.

## 5. Pruebas de Desarrollo
Para simular el flujo completo sin el front-end, se utiliza el script disponible en `backend/debug-tools/generar-token.js`, el cual debe ser configurado con la llave de `ms-auth`.
