# MarkItDown Web (Vercel)

Interfaz web para convertir archivos a Markdown usando [Microsoft MarkItDown](https://github.com/microsoft/markitdown), desplegada en Vercel con subida directa a Vercel Blob.

## Características

- Drag-and-drop para subir archivos
- Soporta PDF, Office, HTML, CSV, EPUB, imágenes y más
- Subida directa a Vercel Blob (evita el límite de 4.5 MB de las Functions)
- Conversión en Python serverless con `markitdown[all]`
- Descarga del `.md` completo desde Blob + vista previa en pantalla

## Requisitos

- Cuenta [Vercel](https://vercel.com) (plan Hobby funciona; timeout máximo 5 min)
- Store **Vercel Blob** vinculado al proyecto
- Node.js 20+ para desarrollo local

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Token de lectura/escritura de Vercel Blob |
| `MAX_FILE_SIZE_MB` | Tamaño máximo por archivo (default: 25) |

En Vercel Dashboard → Project → Settings → Environment Variables, añade las mismas variables.

## Desarrollo local

```bash
cd web
npm install
npm run dev
```

Para probar subidas a Blob en local necesitas `BLOB_READ_WRITE_TOKEN` real. La conversión Python (`/api/convert`) requiere Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

> `next dev` solo sirve la UI y `/api/upload`. La ruta Python `/api/convert` funciona con `vercel dev`.

## Deploy en Vercel

1. Sube tu fork a GitHub.
2. Importa el repositorio en Vercel.
3. Configura **Root Directory**: `web`
4. Crea un store **Blob** en el proyecto (Vercel lo vincula y crea `BLOB_READ_WRITE_TOKEN`).
5. Deploy.

## Flujo técnico

```text
Usuario → UI (Next.js)
       → /api/upload (token Blob)
       → Vercel Blob (archivo original)
       → /api/convert (Python + MarkItDown)
       → Vercel Blob (resultado .md)
       → UI (preview + enlace de descarga)
```

## Limitaciones (Vercel Hobby)

| Aspecto | Límite |
|---------|--------|
| Tamaño de archivo | 25 MB (configurable) |
| Timeout de conversión | 300 s (5 min) |
| Audio mp3/wav | Puede fallar (sin `ffmpeg` en serverless) |
| PDFs escaneados | Poco texto sin Azure Document Intelligence |
| App pública | Riesgo de abuso; archivos temporales ~1 h |

Si PDFs de 400+ páginas agotan el timeout, considera Vercel Pro (800–1800 s) o desplegar el backend en Dokploy con el Dockerfile del repo.

## Pruebas recomendadas

### 1. Prueba local de conversión (sin Vercel)

Instala dependencias Python y convierte un PDF de prueba del monorepo:

```bash
cd web
pip install -r requirements.txt
python scripts/test-convert.py ../packages/markitdown/tests/test_files/movie-theater-booking-2024.pdf -o salida.md
```

### 2. Prueba completa en Vercel

1. PDF pequeño (~1–5 MB) desde la UI desplegada.
2. PDF grande (~20–25 MB, 100+ páginas).
3. DOCX/PPTX para validar formatos Office.

PDF de prueba incluido en el monorepo:

```text
packages/markitdown/tests/test_files/movie-theater-booking-2024.pdf
```

### 3. Build de Next.js

```bash
cd web
npm install
npm run build
```

## Estructura

```text
web/
├── app/                 # Next.js App Router
├── api/convert.py       # Función Python serverless
├── components/          # UI
├── lib/constants.ts     # Límites y formatos permitidos
├── requirements.txt     # markitdown[all]
└── vercel.json          # maxDuration 300s, 2048 MB RAM
```

## Licencia

MarkItDown es MIT © Microsoft. Esta capa web sigue la misma licencia del proyecto padre.
