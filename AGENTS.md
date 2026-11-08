# AGENTS.md — g360-portfolio

Sitio estático en Astro: catálogo/portafolio del ecosistema G360 (24 repos)
con secciones de CV. Público objetivo: reclutadores.

## Verificación

Un solo comando deja el repo listo y verifica que todo esté en verde:

```bash
npm run check && npm test && npm run build
```

(Tras un clon limpio, corré antes `npm ci` para instalar dependencias.)

- Stack: Astro 7 + TypeScript estricto + Vitest, Node >= 20.
- El build es offline: `src/data/catalog.json` está versionado y el sitio no
  escanea el workspace al compilar.

## Instalación

```bash
npm ci
```

## Estructura

- `scripts/generate-catalog.mjs` — genera `src/data/catalog.json` escaneando los repos `g360-*` del workspace (ruta relativa, override con `--root` o `G360_ECOSYSTEM_ROOT`).
- `scripts/lib/parser.mjs` — funciones puras de parseo (testeadas con Vitest).
- `src/data/profile.json` — contenido del CV editable a mano.
- `src/pages/` — `/` (catálogo con filtro), `/proyecto/[slug]`, `/cv`.
- `src/components/` — Hero, CategoryFilter, ProjectCard, SkillsGrid.
- `tests/` — fixtures + tests del parser.

## Convenciones

- Comentarios que expliquen el *por qué*, no el *qué*.
- El catálogo es un artefacto versionado: se regenera con `npm run catalog`
  (mantenimiento local, requiere el workspace en disco) y se commitea a mano.
- Funciones pequeñas: si un archivo acumula responsabilidades, dividirlo.

## Reglas de este repo

- **Autosuficiente**: `git clone` + `npm ci` + el comando de verificación deja
  build, types y tests en verde, sin red y sin ayuda de una persona.
- **Tests honestos**: nada de `it.skip`, `xfail` ni `assert true`.
- **Sin paths de tu máquina**: el generador deriva el workspace relativamente;
  prohibido commitear rutas absolutas.
- **Evidencia**: al entregar, reportá el comando que corriste y su salida.
