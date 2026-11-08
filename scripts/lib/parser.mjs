/**
 * Funciones puras de parseo para el generador de catálogo G360.
 *
 * Sin I/O y sin dependencias: las funciones reciben strings/objetos ya leídos,
 * así Vitest puede probarlas con fixtures sin tocar el disco ni el workspace.
 */

/** Categorías fijas del ecosistema, en el orden en que se muestran en el sitio. */
export const CATEGORIES = [
  { id: 'erp', label: 'ERP' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'stock', label: 'Stock' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'infra', label: 'Infraestructura' },
  { id: 'utilidades', label: 'Utilidades' },
];

/** Mapeo fijo nombre de repo → categoría. Lo que no entra, cae en utilidades. */
const CATEGORY_RULES = [
  { id: 'erp', matches: (name) => name.startsWith('g360-erp-') },
  { id: 'ventas', matches: (name) => name.startsWith('g360-ventas-') },
  { id: 'stock', matches: (name) => name.startsWith('g360-stock-') },
  { id: 'pedidos', matches: (name) => name.startsWith('g360-order-') },
  // Infraestructura compartida del ecosistema.
  { id: 'infra', matches: (name) => name === 'g360-cli' || name === 'g360-master-data' },
];

/**
 * Devuelve el id de categoría de un repo según su nombre de directorio.
 * @param {string} name Nombre del directorio (ej. "g360-erp-stock-monitor").
 * @returns {string} id de categoría ("erp" | "ventas" | "stock" | "pedidos" | "infra" | "utilidades").
 */
export function categorize(name) {
  for (const rule of CATEGORY_RULES) {
    if (rule.matches(name)) return rule.id;
  }
  return 'utilidades';
}

/**
 * Slug URL-safe a partir del nombre del repo. Los nombres g360-* ya son
 * kebab-case; normalizamos por robustez (minúsculas, espacios → guiones).
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Extrae el primer párrafo útil del README (tras el título H1).
 * Ignora bloques HTML (<picture>, <img>, ...), badges [![...]] e imágenes,
 * fences de código y headings. Toma blockquotes (`> ...`) y párrafos planos.
 * @param {string | null} readme Contenido completo del README.md.
 * @returns {string | null} Descripción, o null si no hay párrafo útil.
 */
export function extractDescription(readme) {
  if (!readme) return null;
  const lines = readme.split(/\r?\n/);

  // Arrancar después del H1 si existe; si no, desde el principio.
  let start = 0;
  const h1Index = lines.findIndex((line) => /^#\s+\S/.test(line));
  if (h1Index !== -1) start = h1Index + 1;

  const paragraph = [];
  let inFence = false;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      if (paragraph.length > 0) break;
      continue;
    }
    if (inFence) continue;
    // Fin de párrafo: línea en blanco.
    if (trimmed === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    // Ruido típico de READMEs con branding: HTML, badges, imágenes, reglas, headings.
    if (
      trimmed.startsWith('<') ||
      trimmed.startsWith('![') ||
      trimmed.startsWith('[!') ||
      /^(---|\*\*\*|___)$/.test(trimmed) ||
      trimmed.startsWith('#')
    ) {
      continue;
    }
    // Blockquote o texto plano: quitar el prefijo `> ` y acumular.
    paragraph.push(trimmed.replace(/^>\s?/, ''));
  }

  const text = paragraph.join(' ').trim();
  return text.length > 0 ? text : null;
}

/**
 * Extrae el comando de verificación del AGENTS.md: primer bloque de código
 * dentro de la sección `## Verificación` (tolerante a acentos/idioma y al
 * nivel del heading). Las líneas del bloque se unen con `&&`.
 * @param {string | null} agents Contenido completo del AGENTS.md.
 * @returns {string | null} Comando, o null si no hay sección o bloque.
 */
export function extractVerify(agents) {
  if (!agents) return null;
  const heading = agents.match(/^#{1,4}[ \t]*Verif\S*.*$/m);
  if (!heading || heading.index === undefined) return null;
  const afterHeading = agents.slice(heading.index + heading[0].length);
  const fence = afterHeading.match(/```[^\n]*\n([\s\S]*?)```/);
  if (!fence) return null;
  const command = fence[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' && ');
  return command.length > 0 ? command : null;
}

/** Frameworks detectables desde las dependencias de package.json. */
const FRAMEWORK_DEPS = [
  ['astro', 'Astro'],
  ['react', 'React'],
  ['svelte', 'Svelte'],
  ['solid-js', 'Solid'],
  ['lit', 'Lit'],
  ['vite', 'Vite'],
  ['tauri', 'Tauri'],
];

const BASE_STACK_FILES = [
  ['package.json', 'Node'],
  ['pyproject.toml', 'Python'],
  ['uv.lock', 'Python'],
  ['go.mod', 'Go'],
  ['Cargo.lock', 'Rust'],
];

/**
 * Detecta el stack de un repo a partir de la lista de archivos presentes
 * (manifiestos, lockfiles y dirs señalizados) y el package.json parseado.
 * Combina varios lenguajes si conviven y agrega frameworks desde deps.
 * @param {string[]} files Archivos/dirs presentes (ej. ["package.json", "src-tauri"]).
 * @param {{ dependencies?: Record<string, string>, devDependencies?: Record<string, string> } | null} packageJson
 * @returns {string[]} Stack detectado, sin duplicados.
 */
export function detectStack(files, packageJson) {
  const stack = [];

  for (const [file, label] of BASE_STACK_FILES) {
    if (files.includes(file) && !stack.includes(label)) stack.push(label);
  }

  if (packageJson) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    for (const [dep, label] of FRAMEWORK_DEPS) {
      if (deps[dep] && !stack.includes(label)) stack.push(label);
    }
  }

  // Los proyectos Rust de escritorio G360 usan Tauri vía src-tauri/.
  if (files.includes('src-tauri') && !stack.includes('Tauri')) stack.push('Tauri');

  return stack;
}

/**
 * Normaliza la URL del remote origin: quita `.git` final para mostrarla limpia.
 * @param {string | null} remoteUrl
 * @returns {string | null}
 */
export function normalizeRepoUrl(remoteUrl) {
  if (!remoteUrl) return null;
  const trimmed = remoteUrl.trim();
  if (trimmed.length === 0) return null;
  return trimmed.replace(/\.git$/, '');
}
