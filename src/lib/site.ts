/**
 * BASE_URL puede llegar con o sin barra final según la versión de Astro;
 * la normalizamos para componer URLs sin dobles barras.
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Prefija una ruta interna con el base del sitio (GitHub Pages de proyecto). */
export function withBase(path: string): string {
  return `${BASE}${path}`;
}
