import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  categorize,
  detectStack,
  extractDescription,
  extractVerify,
  normalizeRepoUrl,
  slugify,
} from '../scripts/lib/parser.mjs';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const readmeFixture = readFileSync(path.join(fixturesDir, 'README-ejemplo.md'), 'utf8');
const agentsFixture = readFileSync(path.join(fixturesDir, 'AGENTS-ejemplo.md'), 'utf8');

describe('extractDescription', () => {
  it('extrae el blockquote tras el H1, ignorando HTML y badges', () => {
    expect(extractDescription(readmeFixture)).toBe(
      'Microherramienta de ejemplo del ecosistema G360 para probar el parser del catálogo.',
    );
  });

  it('toma un párrafo plano cuando no hay blockquote', () => {
    const readme = '# Título\n\nPárrafo plano de descripción.\n\n## Detalle\n\nMás texto.\n';
    expect(extractDescription(readme)).toBe('Párrafo plano de descripción.');
  });

  it('une líneas de un párrafo multilinea (blockquote envuelto)', () => {
    const readme = '# Título\n\n> Línea uno del resumen\n> que continúa acá.\n';
    expect(extractDescription(readme)).toBe('Línea uno del resumen que continúa acá.');
  });

  it('soporta finales de línea CRLF', () => {
    const readme = '# Título\r\n\r\n> Descripción con CRLF.\r\n';
    expect(extractDescription(readme)).toBe('Descripción con CRLF.');
  });

  it('devuelve null si no hay párrafo útil', () => {
    expect(extractDescription('# Solo título\n')).toBeNull();
  });

  it('devuelve null con entrada vacía o nula', () => {
    expect(extractDescription(null)).toBeNull();
    expect(extractDescription('')).toBeNull();
  });
});

describe('extractVerify', () => {
  it('extrae el bloque bajo ## Verificación y une las líneas con &&', () => {
    expect(extractVerify(agentsFixture)).toBe('npm ci && npm test');
  });

  it('es tolerante a nivel de heading, idioma y lenguaje del fence', () => {
    const agents = '### Verification\n\n```sh\nnpm test\n```\n';
    expect(extractVerify(agents)).toBe('npm test');
  });

  it('ignora bloques de código previos a la sección', () => {
    const agents = '# AGENTS\n\n```bash\nnpm run install-local\n```\n\n## Verificación\n\n```bash\nnpm test\n```\n';
    expect(extractVerify(agents)).toBe('npm test');
  });

  it('devuelve null si falta la sección Verificación', () => {
    expect(extractVerify('# AGENTS.md\n\n## Instalación\n\n```bash\nnpm ci\n```\n')).toBeNull();
  });

  it('devuelve null si la sección no tiene bloque de código', () => {
    expect(extractVerify('## Verificación\n\nCorré los tests manualmente.\n')).toBeNull();
  });

  it('devuelve null con entrada vacía o nula', () => {
    expect(extractVerify(null)).toBeNull();
    expect(extractVerify('')).toBeNull();
  });
});

describe('detectStack', () => {
  const cases = [
    { files: ['package.json'], pkg: null, expected: ['Node'] },
    { files: ['pyproject.toml', 'uv.lock'], pkg: null, expected: ['Python'] },
    { files: ['go.mod'], pkg: null, expected: ['Go'] },
    { files: ['Cargo.lock', 'src-tauri'], pkg: null, expected: ['Rust', 'Tauri'] },
    { files: ['package.json', 'pyproject.toml'], pkg: null, expected: ['Node', 'Python'] },
    { files: ['requirements.lock'], pkg: null, expected: [] },
  ];

  it.each(cases)('detecta $expected para $files', ({ files, pkg, expected }) => {
    expect(detectStack(files, pkg)).toEqual(expected);
  });

  it('detecta frameworks desde las dependencias de package.json', () => {
    const pkg = { dependencies: { solid: undefined }, devDependencies: { 'solid-js': '^1.0.0', vite: '^5.0.0' } };
    expect(detectStack(['package.json'], pkg)).toEqual(['Node', 'Solid', 'Vite']);
  });

  it('detecta Astro y React juntos', () => {
    const pkg = { dependencies: { astro: '^5.0.0', react: '^19.0.0' } };
    expect(detectStack(['package.json'], pkg)).toEqual(['Node', 'Astro', 'React']);
  });

  it('no duplica el framework si Tauri ya vino por src-tauri', () => {
    const pkg = { devDependencies: { tauri: '^2.0.0' } };
    expect(detectStack(['package.json', 'src-tauri'], pkg)).toEqual(['Node', 'Tauri']);
  });
});

describe('categorize', () => {
  it.each([
    ['g360-erp-stock-monitor', 'erp'],
    ['g360-ventas-api', 'ventas'],
    ['g360-stock-api', 'stock'],
    ['g360-order-xlsx', 'pedidos'],
    ['g360-cli', 'infra'],
    ['g360-master-data', 'infra'],
    ['g360-day-calculator', 'utilidades'],
    ['g360-textofix', 'utilidades'],
  ])('mapea %s → %s', (name, expected) => {
    expect(categorize(name)).toBe(expected);
  });
});

describe('slugify', () => {
  it('normaliza a kebab-case minúsculas', () => {
    expect(slugify('g360-ERP_NC_sustentor')).toBe('g360-erpncsustentor');
  });

  it('mantiene los nombres ya normalizados', () => {
    expect(slugify('g360-portfolio')).toBe('g360-portfolio');
  });
});

describe('normalizeRepoUrl', () => {
  it('quita el sufijo .git del remote', () => {
    expect(normalizeRepoUrl('https://github.com/carloscus/g360-cli.git')).toBe(
      'https://github.com/carloscus/g360-cli',
    );
  });

  it('devuelve null para remotes vacíos', () => {
    expect(normalizeRepoUrl(null)).toBeNull();
    expect(normalizeRepoUrl('   ')).toBeNull();
  });
});
