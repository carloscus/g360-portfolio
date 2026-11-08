#!/usr/bin/env node
/**
 * Genera src/data/catalog.json escaneando los repos g360-* del workspace.
 *
 * La ruta del workspace se deriva RELATIVAMENTE desde este archivo
 * (scripts/ → repo → projects/ → raíz del workspace) para que el repo no
 * contenga rutas absolutas de ninguna máquina. Se puede override con:
 *
 *   npm run catalog -- --root <ruta>     (flag)
 *   G360_ECOSYSTEM_ROOT=<ruta> npm run catalog   (variable de entorno)
 *
 * Es un paso de MANTENIMIENTO local: necesita el workspace G360 completo en
 * disco. El build del sitio NO lo ejecuta: usa el catalog.json versionado.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { categorize, detectStack, extractDescription, extractVerify, normalizeRepoUrl, slugify } from './lib/parser.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

/** Manifiestos/lockfiles que delatan el stack de un repo. */
const MANIFEST_FILES = ['package.json', 'package-lock.json', 'pyproject.toml', 'uv.lock', 'go.mod', 'Cargo.lock', 'requirements.txt', 'requirements.lock'];

/** Directorios que señalan stack o tests. */
const SIGNAL_DIRS = ['src-tauri', 'tests', 'test'];

function fail(message) {
  console.error(`ERROR: ${message}`);
  console.error('Cómo seguir: pasá --root <ruta> o exportá G360_ECOSYSTEM_ROOT apuntando a la raíz del workspace G360.');
  process.exit(1);
}

/** Resuelve la raíz del workspace: flag --root > env G360_ECOSYSTEM_ROOT > relativo ../../.. */
function resolveRoot(argv, env) {
  const flagIndex = argv.indexOf('--root');
  if (flagIndex !== -1 && argv[flagIndex + 1]) return path.resolve(argv[flagIndex + 1]);
  if (env.G360_ECOSYSTEM_ROOT) return path.resolve(env.G360_ECOSYSTEM_ROOT);
  // scripts/ → g360-portfolio → projects/ → raíz del workspace.
  return path.resolve(SCRIPT_DIR, '..', '..', '..');
}

/** Corre un subcomando git local (sin red). Silencioso: devuelve null si falla. */
function git(repoDir, args) {
  const result = spawnSync('git', ['-C', repoDir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (result.status !== 0 || typeof result.stdout !== 'string') return null;
  const output = result.stdout.trim();
  return output.length > 0 ? output : null;
}

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/** Lee y parsea package.json; devuelve null si falta o es inválido. */
function readPackageJson(repoDir) {
  const raw = readIfExists(path.join(repoDir, 'package.json'));
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Archivos/dirs señaladores presentes en el repo (para stack y hasTests). */
function collectSignalFiles(repoDir) {
  const signals = MANIFEST_FILES.filter((file) => fs.existsSync(path.join(repoDir, file)));
  for (const dir of SIGNAL_DIRS) {
    const full = path.join(repoDir, dir);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) signals.push(dir);
  }
  return signals;
}

/** Extrae todos los datos de un repo. */
function scanRepo(repoDir, name) {
  const signals = collectSignalFiles(repoDir);
  const packageJson = readPackageJson(repoDir);
  const readme = readIfExists(path.join(repoDir, 'README.md'));
  const agents = readIfExists(path.join(repoDir, 'AGENTS.md'));

  return {
    name,
    slug: slugify(name),
    url: normalizeRepoUrl(git(repoDir, ['remote', 'get-url', 'origin'])),
    description: extractDescription(readme),
    stack: detectStack(signals, packageJson),
    category: categorize(name),
    verify: extractVerify(agents),
    meta: {
      hasTests:
        signals.includes('tests') || signals.includes('test') || Boolean(packageJson?.scripts?.test),
      lastCommitDate: git(repoDir, ['log', '-1', '--format=%cs']),
    },
  };
}

function listRepoDirs(workspaceRoot) {
  const projectsDir = path.join(workspaceRoot, 'projects');
  if (!fs.existsSync(projectsDir)) {
    fail(`No existe ${projectsDir}. ¿Apunta --root a la raíz del workspace G360?`);
  }
  const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('g360-'))
    .map((entry) => path.join(projectsDir, entry.name))
    // El portafolio no se cataloga a sí mismo.
    .filter((dir) => dir !== REPO_ROOT)
    .sort();
}

function main() {
  const workspaceRoot = resolveRoot(process.argv, process.env);
  const repoDirs = listRepoDirs(workspaceRoot);
  if (repoDirs.length === 0) {
    fail(`No se encontraron repos g360-* en ${path.join(workspaceRoot, 'projects')}.`);
  }

  const repos = repoDirs.map((dir) => scanRepo(dir, path.basename(dir)));

  const catalog = {
    generator: 'scripts/generate-catalog.mjs',
    count: repos.length,
    repos,
  };

  const outputPath = path.join(REPO_ROOT, 'src', 'data', 'catalog.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);

  // Resumen por categoría para verificar el resultado de un vistazo.
  const byCategory = new Map();
  for (const repo of repos) {
    byCategory.set(repo.category, (byCategory.get(repo.category) ?? 0) + 1);
  }
  console.log(`Catálogo generado: ${outputPath}`);
  console.log(`Repos: ${repos.length}`);
  for (const [category, count] of [...byCategory.entries()].sort()) {
    console.log(`  ${category}: ${count}`);
  }
}

main();
