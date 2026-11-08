# g360-portfolio

Sitio estático (Astro) que funciona como **catálogo/portafolio del ecosistema
G360** — los 24 repos `g360-*` — con secciones de **CV**. Público objetivo:
reclutadores.

- **Home** (`/`): hero + resumen + grilla de proyectos con filtro por categoría (client-side, script vanilla).
- **Detalle** (`/proyecto/[slug]`): descripción, stack, categoría, comando de verificación del repo y link a GitHub.
- **CV** (`/cv`): perfil editable desde `src/data/profile.json`.

## Stack

- Astro 7 + TypeScript (modo estricto)
- Vitest para los tests del parser del generador
- Sin frameworks CSS: una sola hoja con custom properties, dark mode por
  `prefers-color-scheme`, responsive mobile-first

## Verificación

```bash
npm ci
npm run check && npm test && npm run build
```

El build es **offline**: el catálogo (`src/data/catalog.json`) está versionado,
así que compilar no requiere escanear el workspace ni red.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run check` | Chequeo de tipos (`astro check`) |
| `npm test` | Tests del parser del generador (Vitest, fixtures locales) |
| `npm run build` | Build estático a `dist/` |
| `npm run catalog` | Regenera `src/data/catalog.json` (paso de **mantenimiento local**) |
| `npm run verify` | Todo junto: check + test + build |

## Regenerar el catálogo

El catálogo se genera escaneando los dirs `g360-*` de
`<workspace>/projects/`. La ruta del workspace se deriva **relativamente**
desde el propio script (`../../..` desde `scripts/`), así el repo no contiene
rutas absolutas de ninguna máquina.

```bash
npm run catalog
```

Overrides opcionales (equivalentes entre sí):

```bash
npm run catalog -- --root "C:/ruta/al/G360-ecosystem"
G360_ECOSYSTEM_ROOT="C:/ruta/al/G360-ecosystem" npm run catalog
```

> `G360_ECOSYSTEM_ROOT` es la única variable de entorno y es **opcional** (hay
> default relativo), por eso no existe `.env.example`.

Es un paso de mantenimiento: requiere el workspace G360 completo en disco
(usa `git remote get-url origin` y `git log` de cada repo, sin red). Luego de
regenerar, **commiteá** el nuevo `catalog.json` para que el build siga siendo
offline. Los overrides NO se versionan ni se commitean.

## Datos del CV (`src/data/profile.json`)

Archivo JSON editable a mano:

- `name`, `tagline`, `about`, `skills`, `links`: lo que se ve en `/cv`.
- `experience`: **array vacío a propósito** — no se inventa experiencia
  laboral. Para completarlo, usá este formato y la sección aparece sola:

```json
"experience": [
  {
    "role": "Puesto",
    "company": "Empresa",
    "period": "2024 — presente",
    "summary": "Una línea de contexto.",
    "highlights": ["Logro medible 1", "Logro medible 2"]
  }
]
```

## Desplegar a GitHub Pages

El workflow `.github/workflows/deploy.yml` está commiteado (Node 20,
`npm ci && npm run build`, actions oficiales `upload-pages-artifact` +
`deploy-pages`). Para activarlo:

1. Push a `main` en `github.com/carloscus/g360-portfolio`.
2. En **Settings → Pages → Source**, elegir **GitHub Actions**.
3. Cada push a `main` publica en `https://carloscus.github.io/g360-portfolio/`.

El `base: '/g360-portfolio'` de `astro.config.mjs` ya está preparado para esa
URL de repo de proyecto.

## Estructura

```
scripts/
  generate-catalog.mjs   # orquestador: escanea el workspace y escribe el JSON
  lib/parser.mjs         # funciones puras de parseo (README, AGENTS, stack, categoría)
src/
  data/catalog.json      # generado y versionado (fuente de datos del sitio)
  data/profile.json      # CV editable
  lib/                   # tipos + helpers (base URL, catálogo tipado)
  layouts/BaseLayout.astro
  components/            # Hero, CategoryFilter, ProjectCard, SkillsGrid
  pages/                 # index, cv, proyecto/[slug]
tests/
  fixtures/              # README y AGENTS de ejemplo
  generator.test.mjs     # tests del parser (sin tocar disco del workspace)
```

## Convenciones

- Sitio en español.
- Sin rutas absolutas de máquina ni secretos commiteados.
- Tests honestos: sin `skip`/`xfail`, con fixtures reales.
- Regenerar el catálogo es un commit de datos explícito; el sitio nunca lo
  regenera durante el build.
