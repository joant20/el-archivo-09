# Cómo Compartir y Publicar EL ARCHIVO 09

El proyecto está preparado en **modo híbrido**:
- Si corre con **Docker (Backend + MySQL)**, guarda todo en MySQL 8.4.
- Si lo publicas como **web pública gratuita** (sin servidor backend), activa automáticamente el **Modo Web Portátil** en el navegador conservando las mismas 3 capas (Investigación Permanente, Supervivencia Temporal y Checkpoints).

---

## Opción 1 (La más rápida — 15 segundos, GRATIS y sin que tus amigos instalen nada)

1. Abre **https://app.netlify.com/drop** en tu navegador.
2. Arrastra la carpeta **`frontend/dist`** (ya compilada y lista) dentro de la ventana de Netlify Drop.
3. En 10 segundos Netlify te dará un enlace público (`https://...netlify.app`) que puedes enviar por WhatsApp, Discord o redes para que cualquiera juegue en 3D desde su navegador.

---

## Opción 2 (Enlace permanente con Vercel o GitHub)

1. Sube la carpeta `el-archivo-09` a un repositorio de GitHub (el archivo `.gitignore` ya protege tu `.env`).
2. Entra a **https://vercel.com** → *Add New Project* → selecciona tu repositorio y coloca **Root Directory = `frontend`**.
3. Pulsa **Deploy**. El archivo `frontend/vercel.json` ya está configurado.

---

## Opción 3 (Publicar versión Full Stack con MySQL real en la nube — Railway)

1. Sube el proyecto a GitHub.
2. Crea un proyecto en **https://railway.app**:
   - Servicio 1: **MySQL** (ejecuta `database/init.sql`).
   - Servicio 2: **Backend** (carpeta `backend/`, variables `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`).
   - Servicio 3: **Frontend** (carpeta `frontend/`, variable de build `VITE_API_URL=https://tu-backend.up.railway.app/api`).

---

## Opción 4 (Compartir por Wi-Fi local o enviar el proyecto completo)

- **En tu mismo Wi-Fi (mientras Docker está encendido)**:
  1. Averigua tu IP local ejecutando `ipconfig` (ejemplo: `192.168.1.25`).
  2. Comparte `http://192.168.1.25:5173` con quien esté en tu red Wi-Fi.
- **Para que un amigo lo ejecute en su PC con Docker**:
  - Comparte el repositorio o el paquete ZIP (sin `.env` ni `node_modules`).
  - Tu amigo solo tiene que hacer doble clic en **`JUGAR.bat`** (Windows) o ejecutar **`./jugar.sh`** (Mac/Linux).
