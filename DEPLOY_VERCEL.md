# Despliegue en Vercel

El build de **205 ms** y el mensaje *"no files were prepared"* indican que Vercel desplegó la **raíz del monorepo**, no la app Next.js.

## Paso 1: Root Directory (obligatorio)

1. Abre [vercel.com](https://vercel.com) → tu proyecto **markitdown**
2. **Settings** → **General**
3. En **Root Directory**, escribe: `web`
4. Guarda y confirma el redeploy

Sin esto, Vercel no encuentra `package.json` ni Next.js y devuelve **404 NOT_FOUND**.

## Paso 2: Subir `web/lib/` a GitHub

El `.gitignore` del repo ignoraba `lib/` en cualquier carpeta. Por eso **`web/lib/constants.ts` no está en GitHub** y el build fallaría aunque configures el Root Directory.

Ya está corregido en `.gitignore`. Ejecuta en tu PC:

```powershell
cd "c:\Users\ralcantara\OneDrive - CCAF Los Heroes\Documents\GitHub\VPS\markitdown"

git add .gitignore web/lib/
git status
git commit -m "fix: incluir web/lib y corregir gitignore para deploy en Vercel"
git push origin main
```

Verifica en GitHub que exista:  
https://github.com/jagk16/markitdown/tree/main/web/lib

## Paso 3: Variables de entorno en Vercel

En **Settings → Environment Variables**:

| Variable | Valor | ¿Qué poner? |
|----------|--------|-------------|
| `BLOB_READ_WRITE_TOKEN` | *(generado por Vercel)* | **No lo inventes.** Vercel lo crea al conectar un store Blob (ver abajo). |
| `MAX_FILE_SIZE_MB` | `25` | Solo el número **25** (límite de MB por archivo). |

### ¿Qué es Vercel Blob?

Es el almacenamiento en la nube de Vercel para archivos (como un “disco” temporal). Tu app lo usa para:

1. Subir el PDF/archivo (hasta 25 MB, evitando el límite de 4.5 MB de las Functions)
2. Guardar el `.md` convertido y darte un enlace de descarga

**Importante:** si falta el token, la **página principal sí puede cargar**. Solo fallará al **subir o convertir** un archivo. Un **404 NOT_FOUND** en la home **no** se debe al token Blob.

### Cómo obtener `BLOB_READ_WRITE_TOKEN`

1. En Vercel, abre tu proyecto **markitdown**
2. Pestaña **Storage** (arriba)
3. **Create New** → elige **Blob**
4. Pon un nombre (ej. `markitdown-files`) → **Create**
5. **Connect to Project** → selecciona tu proyecto → confirma
6. Vercel añade solo la variable `BLOB_READ_WRITE_TOKEN` (empieza por `vercel_blob_rw_...`)

Para ver el valor: **Settings → Environment Variables** → icono del ojo junto a `BLOB_READ_WRITE_TOKEN`.  
Normalmente **no hace falta copiarlo a mano** si conectaste Blob al proyecto.

Luego añade manualmente:

- **Name:** `MAX_FILE_SIZE_MB`
- **Value:** `25`
- **Environments:** Production, Preview, Development

## Paso 4: Redeploy (obligatorio después de cambiar Root Directory)

Cambiar **Root Directory** a `web` **no actualiza** el sitio solo. Debes redeployar:

1. **Deployments**
2. En el último deploy → menú **⋯** → **Redeploy**
3. Desactiva *Use existing Build Cache* si aparece
4. Confirma

Un build correcto tarda **1–3 minutos** (npm install + next build), **no** 200 ms.

En **Settings → General** verifica también:

- **Framework Preset:** Next.js (no “Other”)
- **Root Directory:** `web`

## Build exitoso (referencia)

Deberías ver en los logs algo como:

```text
Running "install" command: npm install ...
Running "build" command: next build ...
✓ Compiled successfully
```

## Si sigue fallando

- Confirma **Root Directory = `web`**
- Confirma que `web/lib/constants.ts` está en GitHub
- Revisa el log de build (no el de deploy vacío)
