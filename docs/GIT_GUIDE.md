# Guía de Git para Sistema ICA

Esta guía contiene los comandos esenciales para trabajar en el flujo de desarrollo del monorepo.

## 1. Comandos para cambiar de rama

Dependiendo de en qué parte del sistema vayas a trabajar, debes moverte a la rama correspondiente:

### Frontend
```bash
git checkout feature/frontend
```

### Backend (Microservicios)
git checkout main

*   **Auth:** `git checkout feature/backend-auth`
*   **Predios:** `git checkout feature/backend-predios`
*   **Cultivo:** `git checkout feature/backend-cultivo`
*   **Inspecciones:** `git checkout feature/backend-inspecciones`
*   **Auditoría:** `git checkout feature/backend-auditoria`
*   **API Gateway:** `git checkout feature/backend-gateway`

---

## 2. Flujo de Trabajo Diario

Una vez que estés en tu rama de trabajo, sigue estos pasos para guardar tus cambios:

### Paso 1: Bajar cambios recientes (Sincronizar)
Antes de empezar, asegúrate de tener lo último del servidor:
```bash
git pull origin <nombre-de-tu-rama>
```

### Paso 2: Guardar cambios locales
Cuando hayas terminado una tarea o parte del código:
```bash
git add .
git commit -m "feat: descripción corta de lo que hiciste"
```

### Paso 3: Subir cambios a GitHub
Para que tus cambios aparezcan en el repositorio remoto:
```bash
git push origin <nombre-de-tu-rama>
```

---

## 3. Integración con Main (Al terminar una tarea)

Cuando hayas terminado una funcionalidad completa y quieras llevarla a la rama principal (`main`):

1. Regresa a main:
   ```bash
   git checkout main
   ```
2. Asegúrate de que main esté actualizado:
   ```bash
   git pull origin main
   ```
3. Trae los cambios de tu rama a main:
   ```bash
   git merge feature/<tu-rama>
   ```
4. Sube los cambios integrados:
   ```bash
   git push origin main
   ```

---

## 4. Tip Pro: Ver en qué rama estás
Si tienes dudas de en qué rama te encuentras actualmente:
```bash
git branch
```
*(La que tenga el asterisco `*` es tu rama actual)*
