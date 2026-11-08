/** Entrada de un repo en el catálogo generado por scripts/generate-catalog.mjs. */
export interface CatalogRepo {
  name: string;
  slug: string;
  /** URL del remote origin sin `.git`, o null si el repo no tiene remote. */
  url: string | null;
  description: string | null;
  stack: string[];
  category: string;
  /** Comando de verificación declarado en el AGENTS.md del repo, o null. */
  verify: string | null;
  meta: {
    hasTests: boolean;
    lastCommitDate: string | null;
  };
}

/** Estructura de src/data/catalog.json. */
export interface Catalog {
  generatedAt: string;
  generator: string;
  count: number;
  repos: CatalogRepo[];
}

/** Grupo de skills del CV. */
export interface ProfileSkill {
  name: string;
  items: string[];
}

/** Link de contacto del CV. */
export interface ProfileLink {
  label: string;
  url: string;
}

/** Entrada de experiencia laboral (vacía por defecto: no se inventa nada). */
export interface ProfileExperience {
  role: string;
  company: string;
  period: string;
  summary: string;
  highlights: string[];
}

/** Estructura de src/data/profile.json. */
export interface Profile {
  name: string;
  username: string;
  tagline: string;
  about: string;
  skills: ProfileSkill[];
  links: ProfileLink[];
  experience: ProfileExperience[];
}
