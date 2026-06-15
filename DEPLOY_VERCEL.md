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

| Variable | Valor | Notas |
|----------|--------|-------|
| `BLOB_READ_WRITE_TOKEN` | *(auto)* | Vercel lo crea al conectar Blob. **No lo inventes.** |
| `BLOB_STORE_ID` | *(auto)* | Vercel lo añade al conectar Blob. Opcional copiar manualmente. |
| `MAX_FILE_SIZE_MB` | `25` | Solo el número 25. |
| `BLOB_ACCESS_MODE` | `public` | Recomendado para esta app. Usa `private` si quieres más seguridad. |
| `NEXT_PUBLIC_BLOB_ACCESS_MODE` | `public` | Debe coincidir con `BLOB_ACCESS_MODE`. |

### ¿Blob público o privado? (como Supabase buckets)

| Modo | Cuándo usarlo |
|------|----------------|
| **public** | Recomendado aquí. URLs aleatorias, archivos temporales (~1 h). Más simple. |
| **private** | Documentos sensibles. El servidor usa el token; el usuario descarga vía `/api/download`. |

Si Vercel te mostró `access: 'private'` en el ejemplo, puedes usar **private** — el código ya lo soporta. Solo añade las dos variables `BLOB_ACCESS_MODE` y `NEXT_PUBLIC_BLOB_ACCESS_MODE` con valor `private`.

**El token Blob NO causa el 404 en la página principal.** Solo afecta subir/convertir archivos.

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

## Si sigue el 404 — diagnóstico

Prueba estas URLs **después del redeploy**:

| URL | Si funciona | Significado |
|-----|-------------|-------------|
| `/health.txt` | Sí | Vercel sirve archivos estáticos; el problema es Next.js |
| `/api/health` | Sí | Las API routes funcionan; revisa la ruta `/` |
| Ambas 404 | No | Root Directory mal configurado o build vacío (~205 ms) |

En **Settings → General** verifica:
- **Root Directory:** `web` (con Save)
- **Framework Preset:** Next.js
- **Output Directory:** vacío (no pongas `.next` manualmente)

Desactiva temporalmente **Skip deployments when there are no changes to the root directory** si está activo.
