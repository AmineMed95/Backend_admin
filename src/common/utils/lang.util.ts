const SUPPORTED = ['fr', 'en', 'ar'] as const;
export type SupportedLang = (typeof SUPPORTED)[number];
const DEFAULT: SupportedLang = 'fr';

/**
 * Extracts the primary language code from an Accept-Language header value.
 * Falls back to 'fr' when the header is absent or unsupported.
 *
 * Examples:
 *   'fr'           → 'fr'
 *   'fr-FR,fr;q=0.9,en;q=0.8' → 'fr'
 *   'ar'           → 'ar'
 *   'zh'           → 'fr'  (unsupported → default)
 *   undefined      → 'fr'
 */
export function resolveLang(header?: string): SupportedLang {
  if (!header) return DEFAULT;
  const primary = header.split(',')[0].split(';')[0].split('-')[0].trim().toLowerCase();
  return (SUPPORTED as readonly string[]).includes(primary)
    ? (primary as SupportedLang)
    : DEFAULT;
}
