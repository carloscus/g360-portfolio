import rawCatalog from '../data/catalog.json';
import type { Catalog, CatalogRepo } from './types';

/** Catálogo versionado de los repos del ecosistema (generado, luego commiteado). */
export const CATALOG = rawCatalog as unknown as Catalog;

/** Orden de las categorías en el sitio (ids del generador). */
export const CATEGORY_ORDER = ['erp', 'ventas', 'stock', 'pedidos', 'infra', 'utilidades'] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  erp: 'ERP',
  ventas: 'Ventas',
  stock: 'Stock',
  pedidos: 'Pedidos',
  infra: 'Infraestructura',
  utilidades: 'Utilidades',
};

export function categoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id;
}

/** Conteo de repos por categoría, en el orden de CATEGORY_ORDER y sin vacías. */
export function countByCategory(repos: CatalogRepo[]): { id: string; label: string; count: number }[] {
  return CATEGORY_ORDER.map((id) => ({
    id,
    label: categoryLabel(id),
    count: repos.filter((repo) => repo.category === id).length,
  })).filter((entry) => entry.count > 0);
}
