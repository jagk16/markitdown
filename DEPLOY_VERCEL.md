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

| Variable | Valor |
|----------|--------|
| `BLOB_READ_WRITE_TOKEN` | Token de tu store Vercel Blob |
| `MAX_FILE_SIZE_MB` | `25` |

Crea el store **Blob** en el proyecto si aún no lo tienes (Storage → Create Blob).

## Paso 4: Redeploy

**Deployments** → último deploy → **Redeploy** (o push nuevo a `main`).

Un build correcto debe tardar **varios minutos** (npm install + next build + Python deps), no 205 ms.

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
